import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Box, 
  Typography, 
  MenuItem, 
  FormControl, 
  Select, 
  useTheme,
  CircularProgress,
  Button,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Payments as PaymentsIcon,
  Warning as WarningIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import StatCard from '../components/Dashboard/StatCard';
import LineChart from '../components/Dashboard/LineChart';
import DonutChart from '../components/Dashboard/DonutChart';
import { useData } from '../context/DataContext';
import apiService from '../api/apiService';

const Dashboard = () => {
  const { 
    stats, 
    loading, 
    error, 
    realtimeData, 
    getTransactionStats, 
    fetchTransactions, 
    webSocketConnected,
    transactions
  } = useData();
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('This Week');
  const [categoryData, setCategoryData] = useState({ series: [], labels: [] });
  const [transactionData, setTransactionData] = useState({ series: [], xaxis: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // Function to manually refresh transaction data
  const handleRefreshData = () => {
    try {
      if (webSocketConnected) {
        // Request 25 transactions from the server
        fetchTransactions(25);
        setSnackbarMessage('Fetching latest transactions...');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('WebSocket not connected. Please wait for connection to be established.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setSnackbarMessage('Failed to refresh data. Please try again later.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Callback for when data is loaded
  useEffect(() => {
    if (realtimeData.length > 0 && isLoading) {
      setIsLoading(false);
      setSnackbarMessage(`Loaded ${realtimeData.length} transactions from database`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  }, [realtimeData, isLoading]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Check if the API is healthy
        await apiService.healthCheck();
        
        // Get all available transactions
        const allTransactions = [...realtimeData, ...transactions];
        console.log(`Processing ${allTransactions.length} total transactions for dashboard`);
        
        // Extract unique categories from the actual transactions
        const uniqueCategories = [...new Set(allTransactions.map(tx => 
          tx.category ? tx.category.toUpperCase() : 'RETAIL'
        ))];
        console.log("Unique categories found:", uniqueCategories);
        
        // If no transactions or categories, use default categories
        if (uniqueCategories.length === 0) {
          uniqueCategories.push('EDUCATION', 'HEALTHCARE', 'TRAVEL', 'GROCERY', 'RESTAURANT', 'RETAIL', 'ENTERTAINMENT');
        }
        
        // Initialize counts for each category
        const categoryCounts = Array(uniqueCategories.length).fill(0);
        
        // Calculate category distribution based on transactions
        allTransactions.forEach(tx => {
          const category = tx.category ? tx.category.toUpperCase() : 'RETAIL';
          const index = uniqueCategories.indexOf(category);
          if (index >= 0) {
            categoryCounts[index]++;
          }
        });
        
        setCategoryData({
          series: categoryCounts,
          labels: uniqueCategories
        });
        
        // Create transaction volume data for the chart
        let days = [];
        let transactionCounts = [];
        let anomalyCounts = [];
        
        // Use real-time data if available
        if (allTransactions.length > 0) {
          // Group transactions by day
          const groupedByDay = {};
          const anomaliesByDay = {};
          
          // Get the appropriate time range based on selection
          const timeRangeMap = {
            'Today': 1,
            'This Week': 7,
            'This Month': 30,
            'This Year': 365
          };
          
          const daysCount = timeRangeMap[timeRange] || 7;
          
          // Initialize day arrays
          for (let i = 0; i < daysCount; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayKey = date.toISOString().split('T')[0];
            groupedByDay[dayKey] = 0;
            anomaliesByDay[dayKey] = 0;
            days.unshift(dayKey.slice(5)); // Format as MM-DD
          }
          
          // Count transactions and anomalies by day
          allTransactions.forEach(tx => {
            let txDate;
            if (typeof tx.timestamp === 'string') {
              txDate = tx.timestamp.split('T')[0];
            } else if (tx.timestamp instanceof Date) {
              txDate = tx.timestamp.toISOString().split('T')[0];
            }
            
            if (txDate && groupedByDay[txDate] !== undefined) {
              groupedByDay[txDate]++;
              if (tx.is_anomaly) {
                anomaliesByDay[txDate]++;
              }
            }
          });
          
          // Convert grouped data to arrays for the chart
          const sortedDays = Object.keys(groupedByDay).sort();
          transactionCounts = sortedDays.map(day => groupedByDay[day]);
          anomalyCounts = sortedDays.map(day => anomaliesByDay[day]);
          days = sortedDays.map(day => day.slice(5)); // Format as MM-DD
        } else {
          // Fallback to simulated data if no real data is available
          days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          transactionCounts = [
            Math.floor(stats.totalTransactions * 0.18),
            Math.floor(stats.totalTransactions * 0.15),
            Math.floor(stats.totalTransactions * 0.20),
            Math.floor(stats.totalTransactions * 0.20),
            Math.floor(stats.totalTransactions * 0.12),
            Math.floor(stats.totalTransactions * 0.10),
            stats.totalTransactions - Math.floor(stats.totalTransactions * 0.95)
          ];
          
          anomalyCounts = days.map((_, i) => {
            return Math.floor(transactionCounts[i] * (stats.anomaliesDetected / stats.totalTransactions));
          });
        }
        
        setTransactionData({
          series: [
            {
              name: 'Transactions',
              data: transactionCounts
            },
            {
              name: 'Anomalies',
              data: anomalyCounts
            }
          ],
          xaxis: days
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardError('Failed to load dashboard data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [stats, timeRange, realtimeData, transactions]);
  
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
  
  if (loading || isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '500px' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading transaction data...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {realtimeData.length > 0 
            ? `Processing ${realtimeData.length} transactions` 
            : 'Connecting to database'}
        </Typography>
      </Box>
    );
  }
  
  if (error || dashboardError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '500px' }}>
        <Typography color="error" variant="h6">{error || dashboardError}</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Financial Risk Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshData}
            disabled={!webSocketConnected}
          >
            Refresh Data
          </Button>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Transactions" 
            value={stats.totalTransactions}
            icon={<PaymentsIcon fontSize="large" />}
            change={15.3}
            changeType="positive"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Anomalies Detected" 
            value={stats.anomaliesDetected}
            icon={<WarningIcon fontSize="large" />}
            change={-3.6}
            changeType="negative"
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Customers" 
            value={stats.activeCustomers}
            icon={<GroupIcon fontSize="large" />}
            change={8.2}
            changeType="positive"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Risk Score" 
            value={stats.riskScore < 1 ? stats.riskScore.toFixed(2) : stats.riskScore}
            icon={<SecurityIcon fontSize="large" />}
            change={-0.5}
            changeType="neutral"
            color="warning"
          />
        </Grid>
      </Grid>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" fontWeight="medium">
          Transaction Analysis
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="Today">Today</MenuItem>
            <MenuItem value="This Week">This Week</MenuItem>
            <MenuItem value="This Month">This Month</MenuItem>
            <MenuItem value="This Year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <LineChart 
            title="Transaction Volume & Anomalies"
            series={transactionData.series}
            xaxis={transactionData.xaxis}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <DonutChart 
            title="Transaction Categories"
            series={categoryData.series}
            labels={categoryData.labels}
          />
        </Grid>
      </Grid>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard; 