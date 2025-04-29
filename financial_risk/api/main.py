from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from financial_risk.utils.data_generator import generate_test_data
from financial_risk.graph.models import get_or_create_customer, get_or_create_account, get_or_create_merchant
from typing import List, Dict, Any
import logging
from datetime import datetime
import yaml
from pathlib import Path
from dateutil.parser import isoparse
import asyncio
import json
import random
import uuid

from ..models.base import Transaction, Customer, Account, Merchant
from ..models.anomaly.isolation_forest import AnomalyDetector
from ..models.clustering.kmeans import BehavioralClusterer
from ..graph.models import GraphDatabase

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
        transactions = graph_db.get_customer_transactions(customer_id)
        
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
        
        return {
            "customer_id": customer_id,
            "behavioral_patterns": patterns,
            "cluster": cluster,
            "cluster_distance": distance
        }
    except Exception as e:
        logger.error(f"Error getting customer behavior: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/merchants/{merchant_id}/risk")
async def get_merchant_risk(merchant_id: str):
    """Get risk score and transaction patterns for a merchant."""
    try:
        # Get merchant transactions
        transactions = graph_db.get_merchant_transactions(merchant_id)
        
        # Calculate risk score
        risk_score = graph_db.get_merchant_risk_score(merchant_id)
        
        # Default to 0.5 if the risk score is None
        if risk_score is None:
            risk_score = 0.5
            logger.warning(f"No risk score found for merchant {merchant_id}, using default value of 0.5")
        
        return {
            "merchant_id": merchant_id,
            "risk_score": risk_score,
            "transaction_count": len(transactions)
        }
    except Exception as e:
        logger.error(f"Error getting merchant risk: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config['api']['host'],
        port=config['api']['port'],
        reload=config['api']['debug']
    ) 