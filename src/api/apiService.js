import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // API capabilities
  getCapabilities: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/capabilities`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch API capabilities:', error);
      throw error;
    }
  },

  // Generate and train models
  generateAndTrain: async (params = {}) => {
    const { n_customers = 10, n_merchants = 5, n_transactions = 100, anomaly_ratio = 0.1 } = params;
    try {
      const response = await axios.post(`${API_URL}/dev/generate_and_train`, {
        n_customers,
        n_merchants,
        n_transactions,
        anomaly_ratio
      });
      return response.data;
    } catch (error) {
      console.error('Generate and train failed:', error);
      throw error;
    }
  },

  // Process transactions
  processTransactions: async (transactions) => {
    try {
      const response = await axios.post(`${API_URL}/transactions/process`, transactions);
      return response.data;
    } catch (error) {
      console.error('Transaction processing failed:', error);
      throw error;
    }
  },

  // Get transactions
  getTransactions: async (params = {}) => {
    const { page = 0, limit = 10, sortBy = 'timestamp', sortOrder = 'desc', filters = {} } = params;
    try {
      // Since the backend doesn't have a direct /transactions endpoint in the FastAPI example
      // We'll simulate one by fetching from the Neo4j database through a custom endpoint
      const response = await axios.get(`${API_URL}/transactions`, {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      // If the endpoint doesn't exist, we'll handle it gracefully
      console.error('Failed to fetch transactions:', error);
      // Return empty data instead of throwing
      return { transactions: [], total: 0 };
    }
  },

  // Get transaction by ID
  getTransactionById: async (transactionId) => {
    try {
      const response = await axios.get(`${API_URL}/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch transaction ${transactionId}:`, error);
      throw error;
    }
  },

  // Flag transaction
  flagTransaction: async (transactionId, reason) => {
    try {
      const response = await axios.post(`${API_URL}/transactions/${transactionId}/flag`, { reason });
      return response.data;
    } catch (error) {
      console.error(`Failed to flag transaction ${transactionId}:`, error);
      throw error;
    }
  },

  // Clear transaction flag
  clearTransactionFlag: async (transactionId) => {
    try {
      const response = await axios.post(`${API_URL}/transactions/${transactionId}/clear-flag`);
      return response.data;
    } catch (error) {
      console.error(`Failed to clear flag for transaction ${transactionId}:`, error);
      throw error;
    }
  },

  // Get transaction statistics
  getTransactionStats: async (params = {}) => {
    const { timeRange = '30d', category = null } = params;
    try {
      const response = await axios.get(`${API_URL}/transactions/stats`, {
        params: {
          timeRange,
          category
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch transaction statistics:', error);
      throw error;
    }
  },

  // Get customer behavior
  getCustomerBehavior: async (customerId) => {
    try {
      const response = await axios.get(`${API_URL}/customers/${customerId}/behavior`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch behavior for customer ${customerId}:`, error);
      throw error;
    }
  },

  // Get merchant risk
  getMerchantRisk: async (merchantId) => {
    try {
      const response = await axios.get(`${API_URL}/merchants/${merchantId}/risk`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch risk for merchant ${merchantId}:`, error);
      throw error;
    }
  },

  // Train models
  trainModels: async () => {
    try {
      const response = await axios.post(`${API_URL}/models/train`);
      return response.data;
    } catch (error) {
      console.error('Model training failed:', error);
      throw error;
    }
  },

  // WebSocket connection for real-time updates
  createWebSocketConnection: () => {
    return new WebSocket(`ws://${API_URL.replace('http://', '')}/ws`);
  }
};

export default apiService; 