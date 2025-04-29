import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../api/apiService';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const [webSocket, setWebSocket] = useState(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    anomaliesDetected: 0,
    activeCustomers: 0,
    riskScore: 0
  });

  // Initialize WebSocket connection
  useEffect(() => {
    let ws;
    
    const connectWebSocket = () => {
      ws = apiService.createWebSocketConnection();
      setWebSocket(ws);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWebSocketConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transactions') {
            setRealtimeData(prevData => {
              // Keep only the last 50 transactions for performance
              const updatedData = [...prevData, ...data.data].slice(-50);
              return updatedData;
            });
            
            // Update statistics if there are new transactions
            const newTransactions = data.data || [];
            const newAnomalies = newTransactions.filter(tx => tx.is_anomaly);
            
            if (newTransactions.length > 0) {
              setStats(prevStats => ({
                ...prevStats,
                totalTransactions: prevStats.totalTransactions + newTransactions.length,
                anomaliesDetected: prevStats.anomaliesDetected + newAnomalies.length
              }));
              
              setTransactions(prevTransactions => [...prevTransactions, ...newTransactions]);
              
              if (newAnomalies.length > 0) {
                setAnomalies(prevAnomalies => [...prevAnomalies, ...newAnomalies]);
              }
            }
          } else if (data.type === 'connection_established') {
            console.log('WebSocket ready:', data.message);
            setWebSocketConnected(true);
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWebSocketConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
        setWebSocketConnected(false);
        setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
      };
    };
    
    connectWebSocket();
    
    // Keep connection alive with ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    // Clean up function
    return () => {
      clearInterval(pingInterval);
      if (ws) {
        ws.close();
      }
    };
  }, []);
  
  // Function to manually fetch transactions via WebSocket
  const fetchTransactions = useCallback((limit = 10) => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(JSON.stringify({ 
        type: 'get_transactions',
        limit: limit
      }));
    } else {
      console.error('WebSocket not connected. Cannot fetch transactions.');
      setError('WebSocket not connected. Cannot fetch transactions. Please try again later.');
    }
  }, [webSocket]);

  // Get transaction statistics from backend
  const getTransactionStats = async (timeRange = '30d') => {
    try {
      const response = await apiService.getTransactionStats({ timeRange });
      return response;
    } catch (error) {
      console.error('Error fetching transaction statistics:', error);
      setError('Failed to fetch transaction statistics. Please try again later.');
      throw error;
    }
  };

  // Initial data loading
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // First check if the API is healthy
        await apiService.healthCheck();
        
        // Generate test data if needed
        const generatedData = await apiService.generateAndTrain({
          n_customers: 30,
          n_merchants: 15,
          n_transactions: 500,
          anomaly_ratio: 0.1
        });
        
        console.log('Generated data:', generatedData);
        
        try {
          // Fetch ALL historical transactions from the database
          const response = await apiService.getTransactions({
            page: 0,
            limit: 1000, // Fetch up to 1000 transactions for initial load
            sortBy: 'timestamp',
            sortOrder: 'desc'
          });
          
          if (response && response.transactions) {
            console.log(`Loaded ${response.transactions.length} historical transactions from database`);
            
            // Set the transactions in state
            setTransactions(response.transactions);
            setRealtimeData(response.transactions);
            
            // Count anomalies in historical data
            const historicalAnomalies = response.transactions.filter(tx => tx.is_anomaly);
            setAnomalies(historicalAnomalies);
            
            // Update statistics based on real data from database
            setStats({
              totalTransactions: response.total || generatedData.inserted_transactions || 0,
              anomaliesDetected: historicalAnomalies.length,
              activeCustomers: 30, // This could be calculated from unique customer IDs
              riskScore: 0.84  // Will be replaced with real data
            });
          } else {
            // Fallback to generated data stats if no transactions returned
            setStats({
              totalTransactions: generatedData.inserted_transactions || 0,
              anomaliesDetected: Math.round((generatedData.inserted_transactions || 0) * 0.1),
              activeCustomers: 30,
              riskScore: 0.84
            });
          }
          
          // Fetch merchant risk data
          try {
            const merchantRisk = await apiService.getMerchantRisk("merchant_1");
            if (merchantRisk && typeof merchantRisk.risk_score === 'number') {
              setRiskScore(merchantRisk.risk_score);
              setStats(prevStats => ({
                ...prevStats,
                riskScore: merchantRisk.risk_score
              }));
            }
          } catch (err) {
            console.warn("Could not fetch merchant risk data:", err);
          }
        } catch (err) {
          console.warn("Could not fetch transaction data:", err);
          
          // Use default values if API call fails
          setStats({
            totalTransactions: generatedData.inserted_transactions || 0,
            anomaliesDetected: Math.round((generatedData.inserted_transactions || 0) * 0.1),
            activeCustomers: 30,
            riskScore: 0.84
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load initial data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  const processNewTransactions = async (newTransactions) => {
    try {
      const results = await apiService.processTransactions(newTransactions);
      
      // Update state with new transactions
      setTransactions(prevTransactions => [...prevTransactions, ...results]);
      
      // Update anomalies
      const newAnomalies = results.filter(tx => tx.is_anomaly);
      setAnomalies(prevAnomalies => [...prevAnomalies, ...newAnomalies]);
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        totalTransactions: prevStats.totalTransactions + results.length,
        anomaliesDetected: prevStats.anomaliesDetected + newAnomalies.length
      }));
      
      return results;
    } catch (error) {
      console.error('Error processing transactions:', error);
      setError('Failed to process transactions. Please try again later.');
      throw error;
    }
  };

  const getCustomerBehavior = async (customerId) => {
    try {
      const behavior = await apiService.getCustomerBehavior(customerId);
      return behavior;
    } catch (error) {
      console.error(`Error fetching customer behavior for ${customerId}:`, error);
      setError(`Failed to fetch customer behavior. Please try again later.`);
      throw error;
    }
  };

  const getMerchantRisk = async (merchantId) => {
    try {
      const risk = await apiService.getMerchantRisk(merchantId);
      return risk;
    } catch (error) {
      console.error(`Error fetching merchant risk for ${merchantId}:`, error);
      setError(`Failed to fetch merchant risk. Please try again later.`);
      throw error;
    }
  };

  const trainModels = async () => {
    try {
      await apiService.trainModels();
    } catch (error) {
      console.error('Error training models:', error);
      setError('Failed to train models. Please try again later.');
      throw error;
    }
  };

  const value = {
    transactions,
    anomalies,
    customers,
    merchants,
    riskScore,
    loading,
    error,
    realtimeData,
    stats,
    webSocketConnected,
    processNewTransactions,
    getCustomerBehavior,
    getMerchantRisk,
    trainModels,
    getTransactionStats,
    fetchTransactions
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}; 