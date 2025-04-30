import logging
import json
from datetime import datetime, timedelta
from statistics import mean
import yaml
from pathlib import Path
import httpx

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

# Constants
OLLAMA_URL = ollama_config.get("api_url", "http://localhost:11434/api/generate")
DEFAULT_MODEL = "llama3"

class ChatbotService:
    """
    Service for enhancing the chatbot with financial risk data and insights.
    This service fetches data from Neo4j when needed to provide context-aware responses.
    """
    
    def __init__(self, graph_db):
        """Initialize with a Neo4j graph database connection."""
        self.graph_db = graph_db
        
    async def query_llm(self, user_query, model=DEFAULT_MODEL, include_data=True):
        """
        Query the LLM with enhanced context from the financial risk system.
        
        Args:
            user_query: The user's question
            model: The Ollama model to use
            include_data: Whether to include system data in the context
            
        Returns:
            The LLM response
        """
        try:
            # Get model config
            model_config = ollama_config.get("models", {}).get(model, {})
            if not model_config:
                logger.warning(f"Model {model} not found in config, using defaults")
                model_config = {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_tokens": 500
                }
            
            # Get financial context template
            system_prompt = ollama_config.get("contexts", {}).get("financial_risk", {}).get("system_prompt", "")
            
            # Determine if this is a data query and fetch relevant data
            data_context = ""
            if include_data:
                data_context = await self._get_relevant_data(user_query)
            
            # Format the full prompt
            prompt = f"{system_prompt}\n\n{data_context}\n\nUser query: {user_query}\n\nResponse:"
            
            # Call Ollama API
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    OLLAMA_URL,
                    json={
                        "model": model_config.get("name", model),
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": model_config.get("temperature", 0.7),
                            "top_p": model_config.get("top_p", 0.9),
                            "top_k": model_config.get("top_k", 40),
                            "max_tokens": model_config.get("max_tokens", 500)
                        }
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                    return "I'm having trouble connecting to the language model right now. Please try again later."
                
                response_data = response.json()
                return response_data.get("response", "").strip()
                
        except Exception as e:
            logger.error(f"Error in chatbot query: {str(e)}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    async def _get_relevant_data(self, query):
        """Get relevant data from Neo4j based on the user query."""
        
        # Initialize data context
        data_context = "Current system data:\n"
        
        # Check what kind of data might be relevant
        query_lower = query.lower()
        
        try:
            # Add transaction summary if relevant
            if any(term in query_lower for term in ["transaction", "volume", "spending", "anomaly", "fraud"]):
                data_context += await self._get_transaction_summary()
            
            # Add risk metrics if relevant
            if any(term in query_lower for term in ["risk", "score", "analysis", "metric", "performance"]):
                data_context += await self._get_risk_metrics()
                
            # Add customer data if relevant
            if any(term in query_lower for term in ["customer", "user", "client"]):
                data_context += await self._get_customer_summary()
                
            # Add merchant data if relevant
            if any(term in query_lower for term in ["merchant", "vendor", "seller", "business"]):
                data_context += await self._get_merchant_summary()
                
            if data_context == "Current system data:\n":
                # No specific data was added, just provide general system info
                data_context += "\n- System is monitoring financial transactions for risk and anomalies\n"
                data_context += "- Data includes customers, merchants, and their interactions\n"
                data_context += "- Risk scoring uses anomaly detection and machine learning models\n"
            
            return data_context
            
        except Exception as e:
            logger.error(f"Error fetching data for chatbot: {str(e)}")
            return ""
    
    async def _get_transaction_summary(self):
        """Get a summary of recent transactions from Neo4j."""
        try:
            # Date range for recent transactions (last 30 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # Query for transaction summary
            query = f"""
            MATCH (t:Transaction) 
            WHERE t.timestamp >= '{start_date.isoformat()}'
            RETURN 
                count(t) as total_transactions,
                sum(CASE WHEN t.is_anomaly = true THEN 1 ELSE 0 END) as anomaly_count,
                avg(t.amount) as avg_amount,
                max(t.amount) as max_amount,
                min(t.amount) as min_amount
            """
            
            result = self.graph_db.graph.run(query).data()
            
            if not result or len(result) == 0:
                return "\n- No recent transaction data available\n"
            
            stats = result[0]
            
            # Format the data
            summary = "\n- Transaction Summary (Last 30 Days):\n"
            summary += f"  * Total Transactions: {stats.get('total_transactions', 0)}\n"
            summary += f"  * Anomalous Transactions: {stats.get('anomaly_count', 0)}\n"
            summary += f"  * Average Transaction Amount: ${stats.get('avg_amount', 0):.2f}\n"
            summary += f"  * Maximum Transaction: ${stats.get('max_amount', 0):.2f}\n"
            
            # Get transaction categories
            category_query = """
            MATCH (t:Transaction)
            RETURN t.category as category, count(t) as count
            ORDER BY count DESC
            LIMIT 5
            """
            
            category_result = self.graph_db.graph.run(category_query).data()
            
            if category_result:
                summary += "  * Top Transaction Categories:\n"
                for cat in category_result:
                    summary += f"    - {cat.get('category', 'Unknown')}: {cat.get('count', 0)} transactions\n"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting transaction summary: {str(e)}")
            return "\n- Transaction data currently unavailable\n"
    
    async def _get_risk_metrics(self):
        """Get current risk metrics from Neo4j."""
        try:
            # Query for overall risk metrics
            query = """
            MATCH (t:Transaction)
            WHERE t.anomaly_score IS NOT NULL
            RETURN 
                avg(t.anomaly_score) as avg_risk,
                count(t) as total_scored,
                sum(CASE WHEN t.anomaly_score > 0.7 THEN 1 ELSE 0 END) as high_risk_count,
                sum(CASE WHEN t.anomaly_score > 0.3 AND t.anomaly_score <= 0.7 THEN 1 ELSE 0 END) as medium_risk_count,
                sum(CASE WHEN t.anomaly_score <= 0.3 THEN 1 ELSE 0 END) as low_risk_count
            """
            
            result = self.graph_db.graph.run(query).data()
            
            if not result or len(result) == 0:
                return "\n- No risk metrics available\n"
            
            stats = result[0]
            total = stats.get('total_scored', 0)
            
            # Format the data
            summary = "\n- Risk Analysis Metrics:\n"
            summary += f"  * Overall Average Risk Score: {stats.get('avg_risk', 0):.2f}\n"
            
            if total > 0:
                high_risk_pct = (stats.get('high_risk_count', 0) / total) * 100
                medium_risk_pct = (stats.get('medium_risk_count', 0) / total) * 100
                low_risk_pct = (stats.get('low_risk_count', 0) / total) * 100
                
                summary += "  * Risk Distribution:\n"
                summary += f"    - High Risk: {high_risk_pct:.1f}% ({stats.get('high_risk_count', 0)} transactions)\n"
                summary += f"    - Medium Risk: {medium_risk_pct:.1f}% ({stats.get('medium_risk_count', 0)} transactions)\n"
                summary += f"    - Low Risk: {low_risk_pct:.1f}% ({stats.get('low_risk_count', 0)} transactions)\n"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting risk metrics: {str(e)}")
            return "\n- Risk metrics currently unavailable\n"
    
    async def _get_customer_summary(self):
        """Get a summary of customer data from Neo4j."""
        try:
            # Query for customer summary
            query = """
            MATCH (c:Customer)
            RETURN count(c) as total_customers
            """
            
            result = self.graph_db.graph.run(query).data()
            
            if not result or len(result) == 0:
                return "\n- No customer data available\n"
            
            total_customers = result[0].get('total_customers', 0)
            
            # Get active customers (with transactions in last 30 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            active_query = f"""
            MATCH (c:Customer)-[:HAS_ACCOUNT]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
            WHERE t.timestamp >= '{start_date.isoformat()}'
            RETURN count(DISTINCT c) as active_customers
            """
            
            active_result = self.graph_db.graph.run(active_query).data()
            active_customers = active_result[0].get('active_customers', 0) if active_result else 0
            
            # Format the data
            summary = "\n- Customer Summary:\n"
            summary += f"  * Total Customers: {total_customers}\n"
            summary += f"  * Active Customers (Last 30 Days): {active_customers}\n"
            
            # Get high risk customers
            risk_query = """
            MATCH (t:Transaction)<-[:MADE_TRANSACTION]-(a:Account)<-[:HAS_ACCOUNT]-(c:Customer)
            WHERE t.anomaly_score > 0.7
            RETURN count(DISTINCT c) as high_risk_customers
            """
            
            risk_result = self.graph_db.graph.run(risk_query).data()
            high_risk_customers = risk_result[0].get('high_risk_customers', 0) if risk_result else 0
            
            if high_risk_customers > 0:
                summary += f"  * High Risk Customers: {high_risk_customers}\n"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting customer summary: {str(e)}")
            return "\n- Customer data currently unavailable\n"
    
    async def _get_merchant_summary(self):
        """Get a summary of merchant data from Neo4j."""
        try:
            # Query for merchant summary
            query = """
            MATCH (m:Merchant)
            RETURN count(m) as total_merchants
            """
            
            result = self.graph_db.graph.run(query).data()
            
            if not result or len(result) == 0:
                return "\n- No merchant data available\n"
            
            total_merchants = result[0].get('total_merchants', 0)
            
            # Get merchant categories
            category_query = """
            MATCH (m:Merchant)
            RETURN m.category as category, count(m) as count
            ORDER BY count DESC
            """
            
            category_result = self.graph_db.graph.run(category_query).data()
            
            # Format the data
            summary = "\n- Merchant Summary:\n"
            summary += f"  * Total Merchants: {total_merchants}\n"
            
            if category_result:
                summary += "  * Merchant Categories:\n"
                for cat in category_result:
                    summary += f"    - {cat.get('category', 'Unknown')}: {cat.get('count', 0)} merchants\n"
            
            # Get high risk merchants
            risk_query = """
            MATCH (t:Transaction)-[:TO]->(m:Merchant)
            WHERE t.anomaly_score > 0.7
            WITH m, count(t) as high_risk_txns
            WHERE high_risk_txns > 0
            RETURN count(DISTINCT m) as high_risk_merchants
            """
            
            risk_result = self.graph_db.graph.run(risk_query).data()
            high_risk_merchants = risk_result[0].get('high_risk_merchants', 0) if risk_result else 0
            
            if high_risk_merchants > 0:
                summary += f"  * High Risk Merchants: {high_risk_merchants}\n"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting merchant summary: {str(e)}")
            return "\n- Merchant data currently unavailable\n" 