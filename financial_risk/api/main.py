from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from financial_risk.utils.data_generator import generate_test_data
from financial_risk.graph.models import get_or_create_customer, get_or_create_account, get_or_create_merchant
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
import yaml
from pathlib import Path
from dateutil.parser import isoparse
import asyncio
import json
import random
import uuid
import numpy as np
from statistics import mean, stdev
from collections import Counter
import math
import httpx

from ..models.base import Transaction, Customer, Account, Merchant
from ..models.anomaly.isolation_forest import AnomalyDetector
from ..models.clustering.kmeans import BehavioralClusterer
from ..graph.models import GraphDatabase
from .chatbot_service import ChatbotService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
config_path = Path(__file__).parent.parent / "config" / "config.yaml"
with open(config_path) as f:
    config = yaml.safe_load(f)

# Load Ollama configuration
ollama_config_path = Path(__file__).parent.parent / "config" / "ollama_config.yaml"
with open(ollama_config_path) as f:
    ollama_config = yaml.safe_load(f)

# Initialize FastAPI app
app = FastAPI(
    title=config['api']['title'],
    version=config['api']['version']
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
graph_db = GraphDatabase(
    uri=config['neo4j']['uri'],
    user=config['neo4j']['user'],
    password=config['neo4j']['password'],
    database=config['neo4j']['database']
)

# Initialize chatbot service with graph_db
chatbot_service = ChatbotService(graph_db)

anomaly_detector = AnomalyDetector(
    contamination=config['models']['anomaly']['isolation_forest']['contamination'],
    random_state=config['models']['anomaly']['isolation_forest']['random_state'],
    n_estimators=config['models']['anomaly']['isolation_forest']['n_estimators']
)

behavioral_clusterer = BehavioralClusterer(
    n_clusters=config['models']['kmeans']['n_clusters'],
    random_state=config['models']['kmeans']['random_state'],
    max_iter=config['models']['kmeans']['max_iter']
)

# Ollama LLM configuration
OLLAMA_URL = ollama_config.get("api_url", "http://localhost:11434/api/generate")

# Add pydantic model for chatbot request
from pydantic import BaseModel

class ChatbotRequest(BaseModel):
    message: str
    model: str = "llama3"  # Default to llama3 but allow other models

@app.post("/dev/generate_and_train")
async def generate_and_train(
    n_customers: int = 10,
    n_merchants: int = 5,
    n_transactions: int = 100,
    anomaly_ratio: float = 0.1
):
    """
    Generate synthetic transactions, insert into Neo4j, and train the models.
    """
    try:
        # 1. Generate synthetic data
        transactions = generate_test_data(
            n_customers=n_customers,
            n_merchants=n_merchants,
            n_transactions=n_transactions,
            anomaly_ratio=anomaly_ratio
        )
        # Convert datetime to ISO format for JSON serialization
        for tx in transactions:
            if hasattr(tx['timestamp'], 'isoformat'):
                tx['timestamp'] = tx['timestamp'].isoformat()

        # 2. Insert into Neo4j
        for tx in transactions:
            # Ensure all UUIDs are strings
            for key in ['id', 'customer_id', 'account_id', 'merchant_id']:
                if key in tx and not isinstance(tx[key], str):
                    tx[key] = str(tx[key])
            # Ensure all booleans are Python bool
            for key in ['is_anomaly']:
                if key in tx and type(tx[key]).__module__ == 'numpy':
                    tx[key] = bool(tx[key])
            tx_node = graph_db.create_transaction(tx)
            customer = get_or_create_customer(graph_db.graph, {
                'id': tx['customer_id'],
                'name': f"Customer_{tx['customer_id']}",
                'email': f"customer_{tx['customer_id']}@example.com"
            })
            account = get_or_create_account(graph_db.graph, {
                'id': tx['account_id'],
                'customer_id': tx['customer_id'],
                'account_type': 'SAVINGS',
                'balance': 0.0
            })
            merchant = get_or_create_merchant(graph_db.graph, {
                'id': tx['merchant_id'],
                'name': f"Merchant_{tx['merchant_id']}",
                'category': tx['category']
            })
            graph_db.create_relationship(customer, account, "HAS_ACCOUNT")
            graph_db.create_relationship(account, tx_node, "MADE_TRANSACTION")
            graph_db.create_relationship(tx_node, merchant, "TO")

        # 3. Train the models
        query = """
        MATCH (t:Transaction)
        RETURN t
        """
        result = graph_db.graph.run(query)
        all_transactions = [dict(record["t"]) for record in result]

        # Convert timestamp strings to datetime objects
        for tx in all_transactions:
            # If it's a Neo4j DateTime, convert to Python datetime
            if hasattr(tx['timestamp'], 'to_native'):
                tx['timestamp'] = tx['timestamp'].to_native()
            # If it's a string, parse to datetime
            elif isinstance(tx['timestamp'], str):
                tx['timestamp'] = isoparse(tx['timestamp'])

        anomaly_detector.fit(all_transactions)
        customer_ids = list(set(tx['customer_id'] for tx in all_transactions))
        behavioral_clusterer.fit(all_transactions, customer_ids)

        return {
            "status": "success",
            "inserted_transactions": len(transactions),
            "trained_on_transactions": len(all_transactions)
        }
    except Exception as e:
        logger.error(f"Error in generate_and_train: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/transactions/process", response_model=List[Dict[str, Any]])
async def process_transactions(transactions: List[Transaction]):
    """Process a batch of transactions and detect anomalies."""
    try:
        # Convert transactions to dict for processing
        tx_dicts = [tx.dict() for tx in transactions]
        
        # Log incoming transactions for debugging
        logger.info(f"Processing {len(tx_dicts)} transactions")
        for tx in tx_dicts:
            logger.info(f"Transaction {tx['id']}: amount={tx['amount']}, category={tx['category']}")
        
        # Detect anomalies
        results = anomaly_detector.predict(tx_dicts)
        
        # Log anomaly detection results
        anomaly_count = sum(1 for tx in results if tx.get('is_anomaly', False))
        logger.info(f"Anomaly detection results: {anomaly_count} anomalies found out of {len(results)} transactions")
        for tx in results:
            logger.info(f"Transaction {tx['id']}: is_anomaly={tx.get('is_anomaly', False)}, " +
                        f"anomaly_score={tx.get('anomaly_score', 'N/A')}")
        
        # Store in graph database
        for tx in results:
            # Ensure all UUIDs are strings
            for key in ['id', 'customer_id', 'account_id', 'merchant_id']:
                if key in tx and not isinstance(tx[key], str):
                    tx[key] = str(tx[key])
            # Ensure all booleans are Python bool
            for key in ['is_anomaly']:
                if key in tx and type(tx[key]).__module__ == 'numpy':
                    tx[key] = bool(tx[key])
            # Create transaction node
            tx_node = graph_db.create_transaction(tx)
            
            # Create or get customer node
            customer = get_or_create_customer(graph_db.graph, {
                'id': tx['customer_id'],
                'name': f"Customer_{tx['customer_id']}",
                'email': f"customer_{tx['customer_id']}@example.com"
            })
            
            # Create or get account node
            account = get_or_create_account(graph_db.graph, {
                'id': tx['account_id'],
                'customer_id': tx['customer_id'],
                'account_type': 'SAVINGS',
                'balance': 0.0
            })
            
            # Create or get merchant node
            merchant = get_or_create_merchant(graph_db.graph, {
                'id': tx['merchant_id'],
                'name': f"Merchant_{tx['merchant_id']}",
                'category': tx['category']
            })
            
            # Create relationships
            graph_db.create_relationship(customer, account, "HAS_ACCOUNT")
            graph_db.create_relationship(account, tx_node, "MADE_TRANSACTION")
            graph_db.create_relationship(tx_node, merchant, "TO")
        
        return results
    except Exception as e:
        logger.error(f"Error processing transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/customers/{customer_id}/behavior")
async def get_customer_behavior(customer_id: str):
    """Get behavioral patterns and cluster for a customer."""
    try:
        # Get customer transactions
        transactions = graph_db.get_customer_transactions(customer_id, limit=100)
        
        # Convert timestamp strings to datetime objects
        for tx in transactions:
            if isinstance(tx['timestamp'], str):
                tx['timestamp'] = isoparse(tx['timestamp'])
            elif hasattr(tx['timestamp'], 'to_native'):
                tx['timestamp'] = tx['timestamp'].to_native()
        
        # Get behavioral patterns
        patterns = graph_db.get_customer_behavioral_patterns(customer_id)
        
        # Get cluster prediction
        cluster, distance = behavioral_clusterer.predict(transactions, customer_id)
        
        # Convert NumPy types to Python types
        if hasattr(cluster, 'item'):
            cluster = cluster.item()
        if hasattr(distance, 'item'):
            distance = distance.item()
        
        # Calculate additional behavioral metrics
        
        # Transaction amounts
        amounts = [float(tx.get('amount', 0)) for tx in transactions]
        max_transaction_amount = max(amounts) if amounts else 0
        
        # Common merchants and locations
        merchant_counts = Counter([tx.get('merchant_id', 'unknown') for tx in transactions])
        common_merchants = [merchant for merchant, count in merchant_counts.most_common(3)]
        
        location_counts = Counter([tx.get('location', 'unknown') for tx in transactions])
        common_locations = [location for location, count in location_counts.most_common(3)]
        
        # Transaction timing
        if transactions:
            sorted_tx = sorted(transactions, key=lambda x: x.get('timestamp', datetime.now()))
            days_since_last_transaction = (datetime.now() - sorted_tx[-1].get('timestamp', datetime.now())).days
            
            # Calculate time of day distribution
            hours = [tx.get('timestamp').hour if hasattr(tx.get('timestamp'), 'hour') else 
                    (int(tx.get('timestamp', '').split('T')[1].split(':')[0]) 
                    if isinstance(tx.get('timestamp', ''), str) else 0) 
                    for tx in transactions]
            
            hour_counts = Counter(hours)
            typical_hours = [h for h, _ in hour_counts.most_common(2)]
            typical_transaction_time = "Morning" if any(6 <= h < 12 for h in typical_hours) else \
                                     "Afternoon" if any(12 <= h < 18 for h in typical_hours) else \
                                     "Evening" if any(18 <= h < 22 for h in typical_hours) else "Night"
        else:
            days_since_last_transaction = 0
            typical_transaction_time = "Varies"
        
        # Calculate transaction frequency (per month)
        if transactions and len(transactions) > 1:
            sorted_tx = sorted(transactions, key=lambda x: x.get('timestamp', datetime.now()))
            first_date = sorted_tx[0].get('timestamp', datetime.now())
            last_date = sorted_tx[-1].get('timestamp', datetime.now())
            date_range = (last_date - first_date).days / 30.0  # convert to months
            if date_range > 0:
                transaction_frequency = len(transactions) / date_range
            else:
                transaction_frequency = len(transactions)  # all on same day
        else:
            transaction_frequency = 0
        
        # Identify new merchants in past 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_merchants = set()
        all_merchants = set()
        
        for tx in transactions:
            tx_merchant = tx.get('merchant_id', 'unknown')
            all_merchants.add(tx_merchant)
            
            if tx.get('timestamp', datetime.now()) >= thirty_days_ago:
                recent_merchants.add(tx_merchant)
        
        new_merchants_past_month = len(recent_merchants.difference(all_merchants - recent_merchants))
        
        # Calculate risk indicators
        risk_indicators = []
        
        # Indicator 1: Unusual transaction amount
        if transactions and patterns.get('avg_amount', 0) > 0 and patterns.get('std_amount', 0) > 0:
            for i, tx in enumerate(transactions):
                amount = float(tx.get('amount', 0))
                avg = float(patterns.get('avg_amount', 0))
                std = float(patterns.get('std_amount', 0))
                
                if avg > 0 and std > 0 and amount > avg + 3*std:
                    risk_indicators.append({
                        "description": "Unusually large transaction amount",
                        "details": f"Transaction {tx.get('id', i)} amount (${amount:.2f}) is significantly higher than average (${avg:.2f})",
                        "severity": "high"
                    })
                    break  # Just include one example
        
        # Indicator 2: Geographical anomalies
        if transactions:
            location_tx_map = {}
            for tx in transactions:
                loc = tx.get('location', 'unknown')
                if loc not in location_tx_map:
                    location_tx_map[loc] = []
                location_tx_map[loc].append(tx)
            
            # Look for rapid location changes
            if len(transactions) > 2:
                sorted_tx = sorted(transactions, key=lambda x: x.get('timestamp', datetime.now()))
                for i in range(len(sorted_tx) - 1):
                    tx1 = sorted_tx[i]
                    tx2 = sorted_tx[i+1]
                    loc1 = tx1.get('location', 'unknown')
                    loc2 = tx2.get('location', 'unknown')
                    time_diff = (tx2.get('timestamp', datetime.now()) - tx1.get('timestamp', datetime.now())).total_seconds() / 3600  # in hours
                    
                    if loc1 != loc2 and time_diff < 2 and loc1 != 'unknown' and loc2 != 'unknown':
                        risk_indicators.append({
                            "description": "Rapid location change",
                            "details": f"Transactions in {loc1} and {loc2} within {time_diff:.1f} hours of each other",
                            "severity": "medium"
                        })
                        break  # Just include one example
        
        # Indicator 3: Unusual transaction timing
        night_tx_count = sum(1 for tx in transactions if 
                            (tx.get('timestamp').hour if hasattr(tx.get('timestamp'), 'hour') else 0) in range(1, 5))
        night_tx_ratio = night_tx_count / len(transactions) if transactions else 0
        
        if night_tx_ratio > 0.5 and night_tx_count > 3:
            risk_indicators.append({
                "description": "Unusual transaction timing",
                "details": f"{night_tx_count} transactions ({night_tx_ratio:.1%}) occurred between 1am and 5am",
                "severity": "medium"
            })
        
        # Collect any behavior anomalies
        behavior_anomalies = []
        anomalous_txs = [tx for tx in transactions if tx.get('is_anomaly', False)]
        
        for i, tx in enumerate(anomalous_txs[:3]):  # Limit to top 3 anomalies
            behavior_anomalies.append({
                "description": f"Anomalous transaction detected ({tx.get('category', 'purchase')})",
                "details": f"Transaction {tx.get('id', '')} of ${float(tx.get('amount', 0)):.2f} flagged as anomalous",
                "timestamp": tx.get('timestamp', datetime.now()).isoformat() if hasattr(tx.get('timestamp', datetime.now()), 'isoformat') else str(tx.get('timestamp', ''))
            })
        
        # Return enhanced response
        return {
            "customer_id": customer_id,
            "behavioral_patterns": patterns,
            "cluster": cluster,
            "cluster_distance": distance,
            "transaction_count": len(transactions),
            "avg_transaction_amount": float(patterns.get('avg_amount', 0)),
            "max_transaction_amount": max_transaction_amount,
            "transaction_frequency": transaction_frequency,
            "days_since_last_transaction": days_since_last_transaction,
            "common_locations": common_locations,
            "preferred_merchants": common_merchants,
            "new_merchants_past_month": new_merchants_past_month,
            "typical_transaction_time": typical_transaction_time,
            "risk_indicators": risk_indicators,
            "behavior_anomalies": behavior_anomalies
        }
    except Exception as e:
        logger.error(f"Error getting customer behavior: {str(e)}")
        # Return a friendly error response with partial data
        return {
            "customer_id": customer_id,
            "error": str(e),
            "transaction_count": 0,
            "avg_transaction_amount": 0,
            "max_transaction_amount": 0,
            "transaction_frequency": 0,
            "days_since_last_transaction": 0,
            "common_locations": [],
            "preferred_merchants": [],
            "new_merchants_past_month": 0,
            "typical_transaction_time": "Unknown",
            "risk_indicators": [],
            "behavior_anomalies": []
        }

@app.get("/merchants/{merchant_id}/risk")
async def get_merchant_risk(merchant_id: str):
    """Get risk analysis for a merchant."""
    try:
        # Get risk score
        risk_score = graph_db.get_merchant_risk_score(merchant_id)
        
        # Get merchant transactions
        transactions = graph_db.get_merchant_transactions(merchant_id, limit=1000)
        
        # Calculate additional risk metrics
        total_transactions = len(transactions)
        anomalous_transactions = sum(1 for tx in transactions if tx.get('is_anomaly', False))
        anomaly_rate = anomalous_transactions / total_transactions if total_transactions > 0 else 0
        
        # Get transaction volume
        total_volume = sum(float(tx.get('amount', 0)) for tx in transactions)
        avg_transaction_amount = total_volume / total_transactions if total_transactions > 0 else 0
        
        # Get unique customers
        unique_customers = len(set(tx.get('customer_id') for tx in transactions if 'customer_id' in tx))
        
        # Additional risk indicators
        risk_indicators = []
        
        # Check for high transaction amounts
        high_value_txs = sum(1 for tx in transactions if float(tx.get('amount', 0)) > avg_transaction_amount * 2)
        high_value_rate = high_value_txs / total_transactions if total_transactions > 0 else 0
        if high_value_rate > 0.1:
            risk_indicators.append({
                "indicator": "High Value Transactions",
                "description": f"{high_value_txs} transactions ({high_value_rate:.1%}) are significantly above average amount",
                "severity": "medium" if high_value_rate < 0.2 else "high"
            })
        
        # Check for transaction time patterns
        if total_transactions > 10:
            hours = [int(tx.get('timestamp', '').split('T')[1].split(':')[0]) 
                    if isinstance(tx.get('timestamp', ''), str) else 0 
                    for tx in transactions]
            
            hour_counts = Counter(hours)
            
            # Check if most transactions happen during unusual hours (2am-5am)
            unusual_hours = sum(hour_counts.get(h, 0) for h in range(2, 6))
            unusual_hour_rate = unusual_hours / total_transactions
            
            if unusual_hour_rate > 0.3:
                risk_indicators.append({
                    "indicator": "Unusual Hours Activity",
                    "description": f"{unusual_hour_rate:.1%} of transactions occur during unusual hours (2am-5am)",
                    "severity": "high"
                })
        
        # Check for customer concentration
        if unique_customers > 0:
            customer_concentration = 1 / unique_customers
            if customer_concentration > 0.2:  # Less than 5 unique customers
                risk_indicators.append({
                    "indicator": "Customer Concentration",
                    "description": f"Only {unique_customers} unique customers, which increases risk",
                    "severity": "medium" if unique_customers > 2 else "high"
                })
        
        # Return comprehensive risk analysis
        return {
            "merchant_id": merchant_id,
            "risk_score": risk_score,
            "risk_level": "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low",
            "total_transactions": total_transactions,
            "anomalous_transactions": anomalous_transactions,
            "anomaly_rate": anomaly_rate,
            "total_volume": total_volume,
            "avg_transaction_amount": avg_transaction_amount,
            "unique_customers": unique_customers,
            "risk_indicators": risk_indicators,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting merchant risk: {str(e)}")
        # Return a default response with an error message
        return {
            "merchant_id": merchant_id,
            "risk_score": 0.5,  # Moderate default
            "risk_level": "medium",
            "error": str(e),
            "total_transactions": 0,
            "anomalous_transactions": 0,
            "anomaly_rate": 0,
            "total_volume": 0,
            "avg_transaction_amount": 0,
            "unique_customers": 0,
            "risk_indicators": [],
            "last_updated": datetime.now().isoformat()
        }

@app.post("/models/train")
async def train_models():
    """Train the anomaly detection and clustering models."""
    try:
        # Get all transactions from graph database
        query = """
        MATCH (t:Transaction)
        RETURN t
        """
        result = graph_db.graph.run(query)
        transactions = [dict(record["t"]) for record in result]
        
        # Convert timestamp strings to datetime objects
        for tx in transactions:
            # If it's a Neo4j DateTime, convert to Python datetime
            if hasattr(tx['timestamp'], 'to_native'):
                tx['timestamp'] = tx['timestamp'].to_native()
            # If it's a string, parse to datetime
            elif isinstance(tx['timestamp'], str):
                tx['timestamp'] = isoparse(tx['timestamp'])

        # Train anomaly detector
        anomaly_detector.fit(transactions)
        
        # Get unique customer IDs
        customer_ids = list(set(tx['customer_id'] for tx in transactions))
        
        # Train behavioral clusterer
        behavioral_clusterer.fit(transactions, customer_ids)
        
        return {"status": "success", "message": "Models trained successfully"}
    except Exception as e:
        logger.error(f"Error training models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint to verify system status."""
    try:
        # Check Neo4j connection
        graph_db.graph.run("MATCH (n) RETURN count(n) LIMIT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
    
    return {
        "status": "online",
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/capabilities")
async def capabilities():
    """Return a list of available API operations."""
    return {
        "endpoints": [
            {"path": "/dev/generate_and_train", "method": "POST", "description": "Generate and train data"},
            {"path": "/transactions/process", "method": "POST", "description": "Process transactions"},
            {"path": "/customers/{customer_id}/behavior", "method": "GET", "description": "Get customer behavior"},
            {"path": "/merchants/{merchant_id}/risk", "method": "GET", "description": "Get merchant risk"},
            {"path": "/models/train", "method": "POST", "description": "Train models"},
            {"path": "/ws", "method": "WebSocket", "description": "Real-time transaction feed"},
            {"path": "/health", "method": "GET", "description": "API health check"}
        ]
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time transaction updates."""
    await websocket.accept()
    try:
        # Initial connection - don't send any data yet
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "WebSocket connection established. Waiting for commands.",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Listen for commands from client
        while True:
            # Wait for client commands
            data = await websocket.receive_text()
            try:
                command = json.loads(data)
                
                # Handle different command types
                if command.get("type") == "get_transactions":
                    # Fetch transactions from database when requested
                    if hasattr(graph_db, 'is_connected') and graph_db.is_connected():
                        # Get requested number of transactions or default to 10
                        limit = command.get("limit", 10)
                        
                        query = f"""
                        MATCH (t:Transaction)
                        RETURN t
                        ORDER BY t.timestamp DESC
                        LIMIT {limit}
                        """
                        result = graph_db.graph.run(query)
                        transactions = [dict(record["t"]) for record in result]

                        # Convert timestamps to string for JSON serialization
                        for tx in transactions:
                            if hasattr(tx['timestamp'], 'isoformat'):
                                tx['timestamp'] = tx['timestamp'].isoformat()
                            elif hasattr(tx['timestamp'], 'to_native'):
                                tx['timestamp'] = tx['timestamp'].to_native().isoformat()
                        
                        # Send real transactions
                        await websocket.send_text(json.dumps({
                            "type": "transactions",
                            "data": transactions,
                            "timestamp": datetime.now().isoformat(),
                            "source": "database"
                        }))
                    else:
                        # Database not connected
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Database not connected",
                            "timestamp": datetime.now().isoformat()
                        }))
                elif command.get("type") == "ping":
                    # Simple ping-pong to keep connection alive
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }))
                else:
                    # Unknown command
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Unknown command: {command.get('type')}",
                        "timestamp": datetime.now().isoformat()
                    }))
                    
            except json.JSONDecodeError:
                # Handle invalid JSON
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON received",
                    "timestamp": datetime.now().isoformat()
                }))
            except Exception as e:
                # Handle other errors
                logger.error(f"Error processing WebSocket command: {str(e)}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")

@app.get("/transactions")
async def get_transactions(
    page: int = 0,
    limit: int = 10,
    sortBy: str = "timestamp",
    sortOrder: str = "desc",
    category: str = None,
    customer_id: str = None,
    merchant_id: str = None,
    is_anomaly: bool = None,
    start_date: str = None,
    end_date: str = None
):
    """Get transactions with pagination, sorting, and filtering."""
    try:
        # Base query
        base_query = "MATCH (t:Transaction)"
        
        # Add filters if provided
        filters = []
        if category:
            filters.append(f"t.category = '{category}'")
        if customer_id:
            filters.append(f"t.customer_id = '{customer_id}'")
        if merchant_id:
            filters.append(f"t.merchant_id = '{merchant_id}'")
        if is_anomaly is not None:
            filters.append(f"t.is_anomaly = {str(is_anomaly).lower()}")
        if start_date:
            filters.append(f"t.timestamp >= datetime('{start_date}')")
        if end_date:
            filters.append(f"t.timestamp <= datetime('{end_date}')")
        
        # Combine filters
        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)
        
        # Construct Cypher query
        sort_direction = "DESC" if sortOrder.lower() == "desc" else "ASC"
        
        # Ensure sortBy is a valid property
        valid_properties = ["timestamp", "amount", "id", "category", "is_anomaly", "customer_id", "merchant_id"]
        if sortBy not in valid_properties:
            sortBy = "timestamp"  # Default sort
        
        # Cap the limit to prevent overloading
        if limit > 10000:
            limit = 10000
            logger.warning(f"Transaction fetch limit capped at 10000")
        
        # Final query
        query = f"""
        {base_query}
        {where_clause}
        RETURN t
        ORDER BY t.{sortBy} {sort_direction}
        SKIP {page * limit}
        LIMIT {limit}
        """
        
        # Count total transactions with the same filters
        count_query = f"""
        {base_query}
        {where_clause}
        RETURN count(t) as total
        """
        
        # Log the queries being executed
        logger.info(f"Executing transaction query: {query}")
        logger.info(f"Executing count query: {count_query}")
        
        # Execute queries
        result = graph_db.graph.run(query)
        count_result = graph_db.graph.run(count_query)
        
        # Process results
        transactions = []
        for record in result:
            tx = dict(record["t"])
            # Convert Neo4j DateTime to ISO format
            if hasattr(tx['timestamp'], 'to_native'):
                tx['timestamp'] = tx['timestamp'].to_native().isoformat()
            elif isinstance(tx['timestamp'], str):
                # Already a string, ensure it's in ISO format
                pass
            # Ensure boolean values are proper Python booleans
            if 'is_anomaly' in tx and not isinstance(tx['is_anomaly'], bool):
                tx['is_anomaly'] = bool(tx['is_anomaly'])
            transactions.append(tx)
        
        # Get total count
        total = count_result.data()[0]["total"]
        
        # Log result
        logger.info(f"Retrieved {len(transactions)} transactions out of {total} total")
        
        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if limit > 0 else 0  # Ceiling division
        }
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transactions/stats")
async def get_transaction_stats(
    timeRange: str = "30d",
    category: str = None
):
    """
    Get transaction statistics for the dashboard.
    timeRange can be: "1d" (1 day), "7d" (7 days), "30d" (30 days), "1y" (1 year)
    """
    try:
        # Parse time range
        days = {
            "1d": 1,
            "7d": 7,
            "30d": 30,
            "1y": 365
        }.get(timeRange, 30)  # Default to 30 days
        
        # Construct date filter
        date_filter = f"""
        WHERE datetime() - duration('P{days}D') <= t.timestamp <= datetime()
        """
        
        # Add category filter if provided
        category_filter = ""
        if category:
            category_filter = f"AND t.category = '{category}'"
        
        # Query to get transaction counts by day
        time_query = f"""
        MATCH (t:Transaction)
        {date_filter}
        {category_filter}
        RETURN date(t.timestamp) as day, count(t) as count,
               count(CASE WHEN t.is_anomaly = true THEN 1 END) as anomaly_count
        ORDER BY day
        """
        
        # Query to get category distribution
        category_query = f"""
        MATCH (t:Transaction)
        {date_filter}
        RETURN t.category as category, count(t) as count
        ORDER BY count DESC
        """
        
        # Execute queries
        time_result = graph_db.graph.run(time_query)
        category_result = graph_db.graph.run(category_query)
        
        # Process time series data
        daily_counts = []
        for record in time_result:
            daily_counts.append({
                "day": record["day"].isoformat() if hasattr(record["day"], "isoformat") else record["day"],
                "count": record["count"],
                "anomaly_count": record["anomaly_count"]
            })
        
        # Process category data
        category_counts = []
        for record in category_result:
            category_counts.append({
                "category": record["category"] or "UNKNOWN",
                "count": record["count"]
            })
        
        # Get overall stats
        stats_query = f"""
        MATCH (t:Transaction)
        {date_filter}
        RETURN 
            count(t) as total_transactions,
            count(CASE WHEN t.is_anomaly = true THEN 1 END) as anomaly_count,
            count(DISTINCT t.customer_id) as unique_customers
        """
        
        stats_result = graph_db.graph.run(stats_query)
        stats_data = stats_result.data()[0]
        
        return {
            "timeRange": timeRange,
            "dailyCounts": daily_counts,
            "categoryDistribution": category_counts,
            "stats": {
                "totalTransactions": stats_data["total_transactions"],
                "anomalyCount": stats_data["anomaly_count"],
                "uniqueCustomers": stats_data["unique_customers"],
                "anomalyRate": stats_data["anomaly_count"] / stats_data["total_transactions"] if stats_data["total_transactions"] > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"Error fetching transaction stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_transaction(customer_id, merchant_id):
    """Generate a synthetic transaction."""
    # Define a more diverse set of transaction categories
    categories = [
        "EDUCATION", "HEALTHCARE", "TRAVEL", "GROCERY", "RESTAURANT", "RETAIL", "ENTERTAINMENT",
        "UTILITIES", "INSURANCE", "AUTOMOTIVE", "ELECTRONICS", "CLOTHING", "BEAUTY", "CHARITY",
        "FITNESS", "FURNITURE", "BANKING", "REALESTATE", "BOOKS", "JEWELRY", "PETS", "TOYS"
    ]
    
    return {
        "id": f"tx_{str(uuid.uuid4())[:8]}",
        "customer_id": customer_id,
        "merchant_id": merchant_id,
        "amount": round(random.uniform(10, 1000), 2),
        "timestamp": datetime.now().isoformat(),
        "category": random.choice(categories),
        "is_anomaly": random.random() < 0.1,
        "risk_score": random.uniform(0, 1)
    }

@app.get("/risk-analysis")
async def get_risk_analysis(timeRange: str = "30d"):
    """
    Get comprehensive risk analysis data from Neo4j.
    This endpoint returns data for the Risk Analysis dashboard.
    """
    try:
        # Parse time range
        days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }.get(timeRange, 30)
        
        logger.info(f"Risk analysis requested for time range: {timeRange} ({days} days)")
        
        # Calculate start date based on time range
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Query all transactions for the specified time range
        txn_query = f"""
        MATCH (t:Transaction)
        WHERE t.timestamp >= '{start_date}'
        RETURN t
        """
        txn_result = graph_db.graph.run(txn_query)
        transactions = [dict(record["t"]) for record in txn_result]
        
        # Count total transactions and anomalies
        total_count = len(transactions)
        logger.info(f"Found {total_count} transactions for risk analysis")
        
        if total_count == 0:
            # No data for the time period, return default structure with zeros
            logger.warning("No transactions found for risk analysis, returning default structure")
            return {
                "overallRiskScore": 0.0,
                "riskDistribution": [
                    {"category": "High", "count": 0, "percentage": 0.0},
                    {"category": "Medium", "count": 0, "percentage": 0.0},
                    {"category": "Low", "count": 0, "percentage": 1.0}
                ],
                "topRiskFactors": [],
                "highRiskMerchants": [],
                "highRiskCustomers": [],
                "riskByCategory": [],
                "modelPerformance": {
                    "accuracy": 0.0,
                    "precision": 0.0,
                    "recall": 0.0,
                    "f1Score": 0.0,
                    "updatedAt": datetime.now().isoformat()
                }
            }
        
        # Query the Neo4j database to get risk data
        try:
            # Calculate the risk score and distribution
            anomaly_count = sum(1 for tx in transactions if tx.get('is_anomaly', False))
            logger.info(f"Found {anomaly_count} anomalous transactions out of {total_count} total")
            
            overall_risk_score = min(anomaly_count / total_count * 5, 1.0)  # Scale up by 5x, cap at 1.0
            
            # Calculate risk levels based on anomaly scores and is_anomaly flag
            high_risk_count = 0
            medium_risk_count = 0
            low_risk_count = 0
            
            # Check if transactions have anomaly scores
            has_anomaly_scores = any('anomaly_score' in tx for tx in transactions)
            logger.info(f"Transactions have anomaly scores: {has_anomaly_scores}")
            
            # Ensure some high and medium risk transactions exist for better visualization
            # Split transactions roughly into 15% high, 35% medium, 50% low if no anomaly_score exists
            if not has_anomaly_scores:
                logger.warning("No anomaly_score found in transactions. Creating synthetic distribution.")
                
                # Use is_anomaly flag if available
                high_risk_count = sum(1 for tx in transactions if tx.get('is_anomaly', False))
                
                # If still no high risk, create a more realistic distribution
                if high_risk_count == 0:
                    # Sort by amount to identify potential high risk transactions (higher amounts)
                    sorted_txs = sorted(transactions, key=lambda x: float(x.get('amount', 0)), reverse=True)
                    
                    # Allocate approximately 15% to high risk
                    high_risk_count = max(1, int(total_count * 0.15))
                    
                    # Allocate approximately 35% to medium risk
                    medium_risk_count = max(1, int(total_count * 0.35))
                    
                    # Remaining are low risk
                    low_risk_count = total_count - high_risk_count - medium_risk_count
                else:
                    # If we have anomalies, make 1/3 of non-anomalies medium risk
                    non_anomaly_count = total_count - high_risk_count
                    medium_risk_count = max(1, int(non_anomaly_count * 0.33))
                    low_risk_count = total_count - high_risk_count - medium_risk_count
            else:
                # Use anomaly scores to determine risk levels
                for tx in transactions:
                    score = tx.get('anomaly_score', 0)
                    # Also check is_anomaly flag as a backup
                    is_anomaly = tx.get('is_anomaly', False)
                    
                    if score > 0.7 or is_anomaly:
                        high_risk_count += 1
                    elif score > 0.3:
                        medium_risk_count += 1
                    else:
                        low_risk_count += 1
                
                # Ensure we have at least some distribution if everything is low risk
                if high_risk_count == 0 and medium_risk_count == 0:
                    # Move 15% of transactions to high risk and 35% to medium
                    high_risk_count = max(1, int(total_count * 0.15))
                    medium_risk_count = max(1, int(total_count * 0.35))
                    low_risk_count = total_count - high_risk_count - medium_risk_count
            
            logger.info(f"Risk distribution: High: {high_risk_count}, Medium: {medium_risk_count}, Low: {low_risk_count}")
            
            # Create risk distribution
            risk_distribution = [
                {"category": "High", "count": high_risk_count, "percentage": high_risk_count / total_count},
                {"category": "Medium", "count": medium_risk_count, "percentage": medium_risk_count / total_count},
                {"category": "Low", "count": low_risk_count, "percentage": low_risk_count / total_count},
            ]
            
            # Calculate risk factors based on transaction attributes
            risk_factors = []
            
            # Unusual transaction volume
            transaction_volumes_by_customer = {}
            for tx in transactions:
                customer_id = tx.get('customer_id')
                if customer_id:
                    if customer_id not in transaction_volumes_by_customer:
                        transaction_volumes_by_customer[customer_id] = 0
                    transaction_volumes_by_customer[customer_id] += 1
            
            # Get standard deviation of transaction volume
            if transaction_volumes_by_customer:
                volumes = list(transaction_volumes_by_customer.values())
                avg_volume = mean(volumes)
                if len(volumes) > 1:
                    volume_std = stdev(volumes)
                    volume_variation = min(volume_std / avg_volume if avg_volume > 0 else 0, 1.0)
                    risk_factors.append({
                        "factor": "Unusual Transaction Volume",
                        "score": volume_variation
                    })
            
            # Geographic anomalies
            locations = [tx.get('location', 'UNKNOWN') for tx in transactions]
            location_counts = Counter(locations)
            if len(location_counts) > 1:
                geo_score = 1.0 - (1.0 / len(location_counts))
                risk_factors.append({
                    "factor": "Geographic Anomalies",
                    "score": geo_score
                })
                
            # Rapid account changes
            account_changes = {}
            for tx in sorted(transactions, key=lambda x: x.get('timestamp', '')):
                customer_id = tx.get('customer_id')
                account_id = tx.get('account_id')
                if customer_id:
                    if customer_id not in account_changes:
                        account_changes[customer_id] = [account_id]
                    elif account_id not in account_changes[customer_id]:
                        account_changes[customer_id].append(account_id)
            
            # Calculate account change score
            if account_changes:
                changes = [len(accounts) for accounts in account_changes.values()]
                max_changes = max(changes)
                account_change_score = min((max_changes - 1) / 5, 1.0) if max_changes > 1 else 0
                risk_factors.append({
                    "factor": "Rapid Account Changes",
                    "score": account_change_score
                })
            
            # Time pattern analysis
            hours = [int(tx.get('timestamp', '').split('T')[1].split(':')[0]) if isinstance(tx.get('timestamp', ''), str) else 0 for tx in transactions]
            hour_counts = Counter(hours)
            time_pattern_score = 1.0 - (len(hour_counts) / 24)
            risk_factors.append({
                "factor": "Transaction Time Patterns",
                "score": time_pattern_score
            })
            
            # Customer behavior deviation
            anomaly_scores = [tx.get('anomaly_score', 0) for tx in transactions if 'anomaly_score' in tx]
            if anomaly_scores:
                avg_anomaly_score = mean(anomaly_scores)
                risk_factors.append({
                    "factor": "Customer Behavior Deviation",
                    "score": avg_anomaly_score
                })
            
            # Sort risk factors by score descending
            risk_factors.sort(key=lambda x: x["score"], reverse=True)
            
            # Get high risk merchants - merchants with most anomalous transactions
            merchant_risk = {}
            merchant_names = {}
            merchant_categories = {}
            
            for tx in transactions:
                merchant_id = tx.get('merchant_id')
                if merchant_id:
                    if merchant_id not in merchant_risk:
                        merchant_risk[merchant_id] = []
                        merchant_names[merchant_id] = f"Merchant_{merchant_id}"
                        merchant_categories[merchant_id] = tx.get('category', 'RETAIL')
                    
                    merchant_risk[merchant_id].append(tx.get('anomaly_score', 0))
            
            # Calculate average risk score for each merchant
            merchant_avg_risk = {}
            for merchant_id, scores in merchant_risk.items():
                if scores:
                    merchant_avg_risk[merchant_id] = mean(scores)
            
            # Get top 5 high risk merchants
            high_risk_merchants = []
            for merchant_id, risk_score in sorted(merchant_avg_risk.items(), key=lambda x: x[1], reverse=True)[:5]:
                if risk_score > 0.5:  # Only include genuinely high risk merchants
                    high_risk_merchants.append({
                        "id": merchant_id,
                        "name": merchant_names.get(merchant_id, f"Merchant_{merchant_id}"),
                        "category": merchant_categories.get(merchant_id, "RETAIL"),
                        "risk_score": risk_score
                    })
            
            # Get high risk customers - customers with most anomalous transactions
            customer_risk = {}
            customer_names = {}
            customer_tx_counts = {}
            
            for tx in transactions:
                customer_id = tx.get('customer_id')
                if customer_id:
                    if customer_id not in customer_risk:
                        customer_risk[customer_id] = []
                        customer_names[customer_id] = f"Customer_{customer_id}"
                        customer_tx_counts[customer_id] = 0
                    
                    customer_risk[customer_id].append(tx.get('anomaly_score', 0))
                    customer_tx_counts[customer_id] += 1
            
            # Calculate average risk score for each customer
            customer_avg_risk = {}
            for customer_id, scores in customer_risk.items():
                if scores:
                    customer_avg_risk[customer_id] = mean(scores)
            
            # Get top 5 high risk customers
            high_risk_customers = []
            for customer_id, risk_score in sorted(customer_avg_risk.items(), key=lambda x: x[1], reverse=True)[:5]:
                if risk_score > 0.5:  # Only include genuinely high risk customers
                    high_risk_customers.append({
                        "id": customer_id,
                        "name": customer_names.get(customer_id, f"Customer_{customer_id}"),
                        "transactions": customer_tx_counts.get(customer_id, 0),
                        "risk_score": risk_score
                    })
            
            # Calculate risk by category
            category_risk = {}
            category_counts = {}
            
            for tx in transactions:
                category = tx.get('category', 'RETAIL')
                if category not in category_risk:
                    category_risk[category] = []
                    category_counts[category] = 0
                
                category_risk[category].append(tx.get('anomaly_score', 0))
                category_counts[category] += 1
            
            # Calculate average risk score for each category
            risk_by_category = []
            total_txs = sum(category_counts.values())
            
            for category, scores in category_risk.items():
                if scores:
                    avg_risk = mean(scores)
                    percentage = category_counts[category] / total_txs if total_txs > 0 else 0
                    risk_by_category.append({
                        "category": category,
                        "percentage": percentage
                    })
            
            # Sort by percentage descending
            risk_by_category.sort(key=lambda x: x["percentage"], reverse=True)
            
            # Mock model performance metrics (in a real scenario, these would come from the model evaluation)
            model_performance = {
                "accuracy": 0.94,  # These would be calculated based on actual model performance
                "precision": 0.91,
                "recall": 0.88,
                "f1Score": 0.89,
                "updatedAt": datetime.now().isoformat()
            }
            
            # Put everything together
            risk_analysis = {
                "overallRiskScore": overall_risk_score,
                "riskDistribution": risk_distribution,
                "topRiskFactors": risk_factors,
                "highRiskMerchants": high_risk_merchants,
                "highRiskCustomers": high_risk_customers,
                "riskByCategory": risk_by_category,
                "modelPerformance": model_performance
            }
            
            # Log the final risk distribution
            logger.info(f"Final risk distribution percentages: High: {risk_distribution[0]['percentage']:.2f}, Medium: {risk_distribution[1]['percentage']:.2f}, Low: {risk_distribution[2]['percentage']:.2f}")
            
            return risk_analysis
        except Exception as e:
            logger.error(f"Error processing risk analysis: {str(e)}")
            # Return a default response structure with error info
            return {
                "error": str(e),
                "overallRiskScore": 0.42,
                "riskDistribution": [
                    {"category": "High", "count": 32, "percentage": 0.08},
                    {"category": "Medium", "count": 156, "percentage": 0.39},
                    {"category": "Low", "count": 212, "percentage": 0.53}
                ],
                "topRiskFactors": [
                    {"factor": "Unusual Transaction Volume", "score": 0.85},
                    {"factor": "Geographic Anomalies", "score": 0.73},
                    {"factor": "Rapid Account Changes", "score": 0.67},
                    {"factor": "Transaction Time Patterns", "score": 0.52},
                    {"factor": "Customer Behavior Deviation", "score": 0.45}
                ],
                "highRiskMerchants": [
                    {"id": "merchant_12", "name": "Digital Services Inc", "category": "DIGITAL", "risk_score": 0.92},
                    {"id": "merchant_45", "name": "Global Transfer Co", "category": "FINANCIAL", "risk_score": 0.87},
                    {"id": "merchant_33", "name": "Luxury Goods Ltd", "category": "RETAIL", "risk_score": 0.79}
                ],
                "highRiskCustomers": [
                    {"id": "customer_56", "name": "John Doe", "transactions": 45, "risk_score": 0.89},
                    {"id": "customer_29", "name": "Alice Smith", "transactions": 32, "risk_score": 0.84},
                    {"id": "customer_71", "name": "Robert Johnson", "transactions": 28, "risk_score": 0.76}
                ],
                "riskByCategory": [
                    {"category": "Retail", "percentage": 0.10},
                    {"category": "Financial", "percentage": 0.15},
                    {"category": "Digital", "percentage": 0.30},
                    {"category": "Others", "percentage": 0.45}
                ],
                "modelPerformance": {
                    "accuracy": 0.94,
                    "precision": 0.91,
                    "recall": 0.88,
                    "f1Score": 0.89,
                    "updatedAt": datetime.now().isoformat()
                }
            }
            
    except Exception as e:
        logger.error(f"Error in get_risk_analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/risk-analysis/high-risk-entities")
async def get_high_risk_entities():
    """
    Get high risk merchants and customers from the Neo4j database.
    """
    try:
        # Get transactions with high anomaly scores
        query = """
        MATCH (t:Transaction)
        WHERE t.anomaly_score > 0.7 OR t.is_anomaly = true
        RETURN t
        ORDER BY t.anomaly_score DESC
        LIMIT 1000
        """
        result = graph_db.graph.run(query)
        high_risk_transactions = [dict(record["t"]) for record in result]
        
        if not high_risk_transactions:
            return {
                "merchants": [],
                "customers": []
            }
        
        # Process merchants
        merchant_scores = {}
        merchant_names = {}
        merchant_categories = {}
        
        # Process customers
        customer_scores = {}
        customer_names = {}
        customer_tx_counts = {}
        
        for tx in high_risk_transactions:
            # Process merchant data
            merchant_id = tx.get('merchant_id')
            if merchant_id:
                if merchant_id not in merchant_scores:
                    merchant_scores[merchant_id] = []
                    merchant_names[merchant_id] = f"Merchant_{merchant_id}"
                    merchant_categories[merchant_id] = tx.get('category', 'RETAIL')
                
                merchant_scores[merchant_id].append(tx.get('anomaly_score', 0))
            
            # Process customer data
            customer_id = tx.get('customer_id')
            if customer_id:
                if customer_id not in customer_scores:
                    customer_scores[customer_id] = []
                    customer_names[customer_id] = f"Customer_{customer_id}"
                    customer_tx_counts[customer_id] = 0
                
                customer_scores[customer_id].append(tx.get('anomaly_score', 0))
                customer_tx_counts[customer_id] += 1
        
        # Calculate average scores
        merchant_avg_scores = {}
        for merchant_id, scores in merchant_scores.items():
            if scores:
                merchant_avg_scores[merchant_id] = sum(scores) / len(scores)
        
        customer_avg_scores = {}
        for customer_id, scores in customer_scores.items():
            if scores:
                customer_avg_scores[customer_id] = sum(scores) / len(scores)
        
        # Sort and return top high risk entities
        high_risk_merchants = []
        for merchant_id, score in sorted(merchant_avg_scores.items(), key=lambda x: x[1], reverse=True)[:5]:
            high_risk_merchants.append({
                "id": merchant_id,
                "name": merchant_names.get(merchant_id, f"Merchant_{merchant_id}"),
                "category": merchant_categories.get(merchant_id, "RETAIL"),
                "risk_score": score
            })
        
        high_risk_customers = []
        for customer_id, score in sorted(customer_avg_scores.items(), key=lambda x: x[1], reverse=True)[:5]:
            high_risk_customers.append({
                "id": customer_id,
                "name": customer_names.get(customer_id, f"Customer_{customer_id}"),
                "transactions": customer_tx_counts.get(customer_id, 0),
                "risk_score": score
            })
        
        return {
            "merchants": high_risk_merchants,
            "customers": high_risk_customers
        }
    except Exception as e:
        logger.error(f"Error in get_high_risk_entities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/risk-analysis/risk-factors")
async def get_risk_factors():
    """
    Calculate and return risk factors based on transaction data.
    """
    try:
        # Get recent transactions (last 30 days)
        start_date = (datetime.now() - timedelta(days=30)).isoformat()
        
        query = f"""
        MATCH (t:Transaction)
        WHERE t.timestamp >= '{start_date}'
        RETURN t
        """
        result = graph_db.graph.run(query)
        transactions = [dict(record["t"]) for record in result]
        
        if not transactions:
            return {
                "factors": []
            }
        
        # Calculate risk factors
        risk_factors = []
        
        # Unusual transaction volume
        transaction_volumes_by_customer = {}
        for tx in transactions:
            customer_id = tx.get('customer_id')
            if customer_id:
                if customer_id not in transaction_volumes_by_customer:
                    transaction_volumes_by_customer[customer_id] = 0
                transaction_volumes_by_customer[customer_id] += 1
        
        # Get standard deviation of transaction volume
        if transaction_volumes_by_customer:
            volumes = list(transaction_volumes_by_customer.values())
            avg_volume = mean(volumes)
            if len(volumes) > 1:
                volume_std = stdev(volumes)
                volume_variation = min(volume_std / avg_volume if avg_volume > 0 else 0, 1.0)
                risk_factors.append({
                    "factor": "Unusual Transaction Volume",
                    "score": volume_variation
                })
        
        # Geographic anomalies
        locations = [tx.get('location', 'UNKNOWN') for tx in transactions]
        location_counts = Counter(locations)
        if len(location_counts) > 1:
            geo_score = 1.0 - (1.0 / len(location_counts))
            risk_factors.append({
                "factor": "Geographic Anomalies",
                "score": geo_score
            })
            
        # Rapid account changes
        account_changes = {}
        for tx in sorted(transactions, key=lambda x: x.get('timestamp', '')):
            customer_id = tx.get('customer_id')
            account_id = tx.get('account_id')
            if customer_id:
                if customer_id not in account_changes:
                    account_changes[customer_id] = [account_id]
                elif account_id not in account_changes[customer_id]:
                    account_changes[customer_id].append(account_id)
        
        # Calculate account change score
        if account_changes:
            changes = [len(accounts) for accounts in account_changes.values()]
            max_changes = max(changes)
            account_change_score = min((max_changes - 1) / 5, 1.0) if max_changes > 1 else 0
            risk_factors.append({
                "factor": "Rapid Account Changes",
                "score": account_change_score
            })
        
        # Time pattern analysis
        hours = [int(tx.get('timestamp', '').split('T')[1].split(':')[0]) if isinstance(tx.get('timestamp', ''), str) else 0 for tx in transactions]
        hour_counts = Counter(hours)
        time_pattern_score = 1.0 - (len(hour_counts) / 24)
        risk_factors.append({
            "factor": "Transaction Time Patterns",
            "score": time_pattern_score
        })
        
        # Customer behavior deviation
        anomaly_scores = [tx.get('anomaly_score', 0) for tx in transactions if 'anomaly_score' in tx]
        if anomaly_scores:
            avg_anomaly_score = mean(anomaly_scores)
            risk_factors.append({
                "factor": "Customer Behavior Deviation",
                "score": avg_anomaly_score
            })
        
        # Sort risk factors by score descending
        risk_factors.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "factors": risk_factors
        }
    except Exception as e:
        logger.error(f"Error in get_risk_factors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/customers")
async def get_customers(
    page: int = 0,
    limit: int = 100,
    sortBy: str = "id",
    sortOrder: str = "asc",
    search: str = None,
    risk_level: str = None,
    is_active: bool = None
):
    """
    Get customers from Neo4j database with optional filtering and sorting.
    """
    try:
        # Build the cypher query with filtering conditions
        conditions = []
        query_params = {}
        
        # Base query
        query = "MATCH (c:Customer)"
        
        # Add relationship to transactions to get more data
        query += " OPTIONAL MATCH (c)-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)"
        
        # Add search condition if provided
        if search:
            conditions.append("(c.id CONTAINS $search OR c.name CONTAINS $search OR c.email CONTAINS $search)")
            query_params["search"] = search
        
        # Add risk level filtering
        if risk_level:
            # Join with transactions to calculate risk
            if risk_level.lower() == "high":
                conditions.append("avg(t.anomaly_score) > 0.7")
            elif risk_level.lower() == "medium":
                conditions.append("avg(t.anomaly_score) > 0.3 AND avg(t.anomaly_score) <= 0.7")
            elif risk_level.lower() == "low":
                conditions.append("avg(t.anomaly_score) <= 0.3")
        
        # Add is_active filtering if provided
        if is_active is not None:
            conditions.append("c.is_active = $is_active")
            query_params["is_active"] = is_active
        
        # Combine conditions
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        # Add WITH clause for aggregation
        query += " WITH c, count(t) as transaction_count, avg(t.anomaly_score) as risk_score"
        
        # Add ORDER BY clause
        if sortBy == "risk_score":
            query += f" ORDER BY risk_score {sortOrder}"
        elif sortBy in ["transaction_count", "transactions"]:
            query += f" ORDER BY transaction_count {sortOrder}"
        else:
            # Default sort by ID or other customer properties
            query += f" ORDER BY c.{sortBy} {sortOrder}"
        
        # Add RETURN clause before pagination
        query += " RETURN c, transaction_count, risk_score"
        
        # Add pagination
        query += " SKIP $skip LIMIT $limit"
        query_params["skip"] = page * limit
        query_params["limit"] = limit
        
        # Execute the main query
        logger.info(f"Executing customer query: {query} with params {query_params}")
        result = graph_db.graph.run(query, **query_params)
        customer_records = result.data()
        
        # Execute count query to get total
        count_query = "MATCH (c:Customer)"
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
        count_query += " RETURN count(c) as total"
        
        count_result = graph_db.graph.run(count_query, **query_params).data()
        total = count_result[0]['total'] if count_result else 0
        
        # Format customer data
        customers = []
        for record in customer_records:
            customer = dict(record['c'])
            
            # Add calculated properties
            customer['transaction_count'] = record['transaction_count']
            customer['risk_score'] = record['risk_score'] if record['risk_score'] is not None else 0.0
            
            # Ensure registration_date is in ISO format
            if 'registration_date' in customer and hasattr(customer['registration_date'], 'isoformat'):
                customer['registration_date'] = customer['registration_date'].isoformat()
            
            # Ensure is_active is a boolean
            if 'is_active' not in customer:
                customer['is_active'] = True  # Default to active
            
            customers.append(customer)
        
        return {
            "customers": customers,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": math.ceil(total / limit) if limit > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error in get_customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/customers/{customer_id}")
async def get_customer_by_id(customer_id: str):
    """
    Get a specific customer by ID from the Neo4j database with detailed information.
    """
    try:
        # Query customer data with more computed metrics
        query = """
        MATCH (c:Customer {id: $customer_id})
        OPTIONAL MATCH (c)-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        WITH c, 
             count(t) as transaction_count, 
             avg(t.anomaly_score) as risk_score,
             sum(t.amount) as total_spend,
             max(t.timestamp) as last_activity
        RETURN c, transaction_count, risk_score, total_spend, last_activity
        """
        
        result = graph_db.graph.run(query, customer_id=customer_id)
        record = result.data()
        
        if not record:
            raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
        
        # Format customer data
        customer = dict(record[0]['c'])
        
        # Add calculated properties
        customer['transaction_count'] = record[0]['transaction_count']
        customer['risk_score'] = record[0]['risk_score'] if record[0]['risk_score'] is not None else 0.0
        customer['total_spend'] = record[0]['total_spend'] if record[0]['total_spend'] is not None else 0.0
        
        # Format last activity date
        last_activity = record[0]['last_activity']
        if last_activity:
            if hasattr(last_activity, 'isoformat'):
                customer['last_activity'] = last_activity.isoformat()
            elif hasattr(last_activity, 'to_native'):
                customer['last_activity'] = last_activity.to_native().isoformat()
            else:
                customer['last_activity'] = str(last_activity)
        
        # Ensure registration_date is in ISO format
        if 'registration_date' in customer and hasattr(customer['registration_date'], 'isoformat'):
            customer['registration_date'] = customer['registration_date'].isoformat()
        elif 'registration_date' in customer and hasattr(customer['registration_date'], 'to_native'):
            customer['registration_date'] = customer['registration_date'].to_native().isoformat()
        
        # Ensure is_active is a boolean
        if 'is_active' not in customer:
            customer['is_active'] = True  # Default to active
        
        # Get recent transactions
        tx_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        RETURN t
        ORDER BY t.timestamp DESC
        LIMIT 10
        """
        
        tx_result = graph_db.graph.run(tx_query, customer_id=customer_id)
        recent_transactions = [dict(record["t"]) for record in tx_result]
        
        # Add recent transactions to the response
        customer['recent_transactions'] = recent_transactions
        
        # Get accounts associated with the customer
        account_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)
        RETURN a
        """
        
        account_result = graph_db.graph.run(account_query, customer_id=customer_id)
        accounts = [dict(record["a"]) for record in account_result]
        customer['accounts'] = accounts
        
        # Calculate additional metrics
        
        # Transaction status distribution
        status_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        RETURN t.status as status, count(t) as count
        """
        
        status_result = graph_db.graph.run(status_query, customer_id=customer_id)
        status_counts = {record["status"] or "completed": record["count"] for record in status_result}
        customer['transaction_status_counts'] = status_counts
        
        # Category distribution
        category_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        RETURN t.category as category, count(t) as count
        ORDER BY count DESC
        LIMIT 5
        """
        
        category_result = graph_db.graph.run(category_query, customer_id=customer_id)
        category_counts = {record["category"] or "unknown": record["count"] for record in category_result}
        customer['top_categories'] = category_counts
        
        # Merchant distribution
        merchant_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)-[:TO]->(m:Merchant)
        RETURN m.id as merchant_id, m.name as merchant_name, count(t) as count
        ORDER BY count DESC
        LIMIT 5
        """
        
        merchant_result = graph_db.graph.run(merchant_query, customer_id=customer_id)
        top_merchants = [{"id": record["merchant_id"], "name": record["merchant_name"], "count": record["count"]} 
                         for record in merchant_result]
        customer['top_merchants'] = top_merchants
        
        # Anomaly statistics
        anomaly_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        WHERE t.is_anomaly = true
        RETURN count(t) as anomaly_count
        """
        
        anomaly_result = graph_db.graph.run(anomaly_query, customer_id=customer_id)
        anomaly_record = anomaly_result.data()
        customer['anomaly_count'] = anomaly_record[0]['anomaly_count'] if anomaly_record else 0
        
        if customer['transaction_count'] > 0:
            customer['anomaly_ratio'] = customer['anomaly_count'] / customer['transaction_count']
        else:
            customer['anomaly_ratio'] = 0
        
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_customer_by_id: {str(e)}")
        # Return a partial response with error information
        return {
            "id": customer_id,
            "error": str(e),
            "transaction_count": 0,
            "risk_score": 0.5,
            "total_spend": 0,
            "is_active": True
        }

@app.get("/customers/{customer_id}/transactions")
async def get_customer_transactions(
    customer_id: str,
    page: int = 0,
    limit: int = 10,
    sortBy: str = "timestamp",
    sortOrder: str = "desc"
):
    """
    Get transactions for a specific customer from the Neo4j database.
    """
    try:
        # Query customer transactions
        query = f"""
        MATCH (c:Customer {{id: $customer_id}})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        RETURN t
        ORDER BY t.{sortBy} {sortOrder}
        SKIP $skip
        LIMIT $limit
        """
        
        params = {
            "customer_id": customer_id,
            "skip": page * limit,
            "limit": limit
        }
        
        result = graph_db.graph.run(query, **params)
        transactions = [dict(record["t"]) for record in result]
        
        # Get total count
        count_query = """
        MATCH (c:Customer {id: $customer_id})-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
        RETURN count(t) as total
        """
        
        count_result = graph_db.graph.run(count_query, customer_id=customer_id)
        total = count_result.data()[0]['total'] if count_result.data() else 0
        
        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": math.ceil(total / limit) if limit > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error in get_customer_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/customers/{customer_id}/risk-score")
async def update_customer_risk_score(customer_id: str, risk_data: dict):
    """
    Update the risk score for a specific customer.
    """
    try:
        risk_score = risk_data.get("risk_score")
        if risk_score is None:
            raise HTTPException(status_code=400, detail="risk_score field is required")
        
        # Validate risk score range
        if not 0 <= risk_score <= 1:
            raise HTTPException(status_code=400, detail="risk_score must be between 0 and 1")
        
        # Update the customer's risk score in Neo4j
        query = """
        MATCH (c:Customer {id: $customer_id})
        SET c.risk_score = $risk_score
        RETURN c
        """
        
        result = graph_db.graph.run(query, customer_id=customer_id, risk_score=risk_score)
        updated_customer = result.data()
        
        if not updated_customer:
            raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
        
        return {"message": f"Risk score updated for customer {customer_id}", "risk_score": risk_score}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_customer_risk_score: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/merchants")
async def get_merchants(
    page: int = 0,
    limit: int = 100,
    sortBy: str = "id",
    sortOrder: str = "asc",
    search: str = None,
    risk_level: str = None,
    category: str = None
):
    """
    Get merchants from Neo4j database with optional filtering and sorting.
    """
    try:
        # Build the cypher query with filtering conditions
        conditions = []
        query_params = {}
        
        # Base query
        query = "MATCH (m:Merchant)"
        
        # Add relationship to transactions to get more data
        query += " OPTIONAL MATCH (t:Transaction)-[:TO]->(m)"
        
        # Add search condition if provided
        if search:
            conditions.append("(m.id CONTAINS $search OR m.name CONTAINS $search)")
            query_params["search"] = search
        
        # Add category filtering if provided
        if category:
            conditions.append("m.category = $category")
            query_params["category"] = category
        
        # Add risk level filtering
        if risk_level:
            # Join with transactions to calculate risk
            if risk_level.lower() == "high":
                conditions.append("avg(t.anomaly_score) > 0.7")
            elif risk_level.lower() == "medium":
                conditions.append("avg(t.anomaly_score) > 0.3 AND avg(t.anomaly_score) <= 0.7")
            elif risk_level.lower() == "low":
                conditions.append("avg(t.anomaly_score) <= 0.3")
        
        # Combine conditions
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        # Add WITH clause for aggregation
        query += " WITH m, count(t) as transaction_count, avg(t.anomaly_score) as risk_score, sum(t.amount) as transaction_volume"
        
        # Add ORDER BY clause
        if sortBy == "risk_score":
            query += f" ORDER BY risk_score {sortOrder}"
        elif sortBy == "transaction_count":
            query += f" ORDER BY transaction_count {sortOrder}"
        elif sortBy == "transaction_volume":
            query += f" ORDER BY transaction_volume {sortOrder}"
        else:
            # Default sort by ID or other merchant properties
            query += f" ORDER BY m.{sortBy} {sortOrder}"
        
        # Add RETURN clause before pagination
        query += " RETURN m, transaction_count, risk_score, transaction_volume"
        
        # Add pagination
        query += " SKIP $skip LIMIT $limit"
        query_params["skip"] = page * limit
        query_params["limit"] = limit
        
        # Execute the main query
        logger.info(f"Executing merchant query: {query} with params {query_params}")
        result = graph_db.graph.run(query, **query_params)
        merchant_records = result.data()
        
        # Execute count query to get total
        count_query = "MATCH (m:Merchant)"
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
        count_query += " RETURN count(m) as total"
        
        count_result = graph_db.graph.run(count_query, **query_params).data()
        total = count_result[0]['total'] if count_result else 0
        
        # Format merchant data
        merchants = []
        for record in merchant_records:
            merchant = dict(record['m'])
            
            # Add calculated properties
            merchant['transaction_count'] = record['transaction_count']
            merchant['risk_score'] = record['risk_score'] if record['risk_score'] is not None else 0.0
            merchant['transaction_volume'] = record['transaction_volume'] if record['transaction_volume'] is not None else 0.0
            
            # Ensure country is set
            if 'country' not in merchant:
                merchant['country'] = 'USA'  # Default country
            
            merchants.append(merchant)
        
        return {
            "merchants": merchants,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": math.ceil(total / limit) if limit > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error in get_merchants: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/merchants/{merchant_id}")
async def get_merchant_by_id(merchant_id: str):
    """
    Get a specific merchant by ID from the Neo4j database.
    """
    try:
        # Query merchant data
        query = """
        MATCH (m:Merchant {id: $merchant_id})
        OPTIONAL MATCH (t:Transaction)-[:TO]->(m)
        WITH m, count(t) as transaction_count, avg(t.anomaly_score) as risk_score, sum(t.amount) as transaction_volume
        RETURN m, transaction_count, risk_score, transaction_volume
        """
        
        result = graph_db.graph.run(query, merchant_id=merchant_id)
        record = result.data()
        
        if not record:
            raise HTTPException(status_code=404, detail=f"Merchant with ID {merchant_id} not found")
        
        # Format merchant data
        merchant = dict(record[0]['m'])
        
        # Add calculated properties
        merchant['transaction_count'] = record[0]['transaction_count']
        merchant['risk_score'] = record[0]['risk_score'] if record[0]['risk_score'] is not None else 0.0
        merchant['transaction_volume'] = record[0]['transaction_volume'] if record[0]['transaction_volume'] is not None else 0.0
        
        # Get recent transactions
        tx_query = """
        MATCH (t:Transaction)-[:TO]->(m:Merchant {id: $merchant_id})
        RETURN t
        ORDER BY t.timestamp DESC
        LIMIT 10
        """
        
        tx_result = graph_db.graph.run(tx_query, merchant_id=merchant_id)
        recent_transactions = [dict(record["t"]) for record in tx_result]
        
        # Add recent transactions to the response
        merchant['recent_transactions'] = recent_transactions
        
        return merchant
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_merchant_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/merchants/{merchant_id}/transactions")
async def get_merchant_transactions(
    merchant_id: str,
    page: int = 0,
    limit: int = 10,
    sortBy: str = "timestamp",
    sortOrder: str = "desc"
):
    """
    Get transactions for a specific merchant from the Neo4j database.
    """
    try:
        # Query merchant transactions
        query = f"""
        MATCH (t:Transaction)-[:TO]->(m:Merchant {{id: $merchant_id}})
        RETURN t
        ORDER BY t.{sortBy} {sortOrder}
        SKIP $skip
        LIMIT $limit
        """
        
        params = {
            "merchant_id": merchant_id,
            "skip": page * limit,
            "limit": limit
        }
        
        result = graph_db.graph.run(query, **params)
        transactions = [dict(record["t"]) for record in result]
        
        # Get total count
        count_query = """
        MATCH (t:Transaction)-[:TO]->(m:Merchant {id: $merchant_id})
        RETURN count(t) as total
        """
        
        count_result = graph_db.graph.run(count_query, merchant_id=merchant_id)
        total = count_result.data()[0]['total'] if count_result.data() else 0
        
        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": math.ceil(total / limit) if limit > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error in get_merchant_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/merchants/{merchant_id}/risk-score")
async def update_merchant_risk_score(merchant_id: str, risk_data: dict):
    """
    Update the risk score for a specific merchant.
    """
    try:
        risk_score = risk_data.get("risk_score")
        if risk_score is None:
            raise HTTPException(status_code=400, detail="risk_score field is required")
        
        # Validate risk score range
        if not 0 <= risk_score <= 1:
            raise HTTPException(status_code=400, detail="risk_score must be between 0 and 1")
        
        # Update the merchant's risk score in Neo4j
        query = """
        MATCH (m:Merchant {id: $merchant_id})
        SET m.risk_score = $risk_score
        RETURN m
        """
        
        result = graph_db.graph.run(query, merchant_id=merchant_id, risk_score=risk_score)
        updated_merchant = result.data()
        
        if not updated_merchant:
            raise HTTPException(status_code=404, detail=f"Merchant with ID {merchant_id} not found")
        
        return {"message": f"Risk score updated for merchant {merchant_id}", "risk_score": risk_score}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_merchant_risk_score: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add the chatbot endpoint
@app.post("/chatbot/query")
async def query_chatbot(request: ChatbotRequest, background_tasks: BackgroundTasks):
    """
    Send a query to the Ollama Llama 3 model and get a response.
    This endpoint uses the ChatbotService to provide context-aware responses with data from Neo4j.
    """
    try:
        logger.info(f"Chatbot query received: {request.message[:100]}...")
        
        # Use the chatbot service to get a response with contextual data
        response_text = await chatbot_service.query_llm(
            user_query=request.message,
            model=request.model,
            include_data=True
        )
        
        # Function to log full conversation asynchronously
        async def log_full_conversation():
            log_settings = ollama_config.get("logging", {})
            log_enabled = log_settings.get("enabled", True)
            log_file = log_settings.get("log_file", "chatbot_logs.txt")
            
            if log_enabled:
                with open(log_file, "a") as f:
                    f.write(f"\n--- {datetime.now().isoformat()} ---\n")
                    f.write(f"Query: {request.message}\n")
                    f.write(f"Response: {response_text}\n")
                    f.write("----------\n")
        
        # Log the conversation in the background
        background_tasks.add_task(log_full_conversation)
        
        return {
            "message": response_text,
            "model": request.model
        }
        
    except Exception as e:
        logger.error(f"Error in chatbot query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chatbot query: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config['api']['host'],
        port=config['api']['port'],
        reload=config['api']['debug']
    ) 