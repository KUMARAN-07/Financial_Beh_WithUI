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
  Alert,
  Card,
  CardContent,
  Paper,
  Chip,
  Divider,
  InputLabel,
  Stack,
  Tooltip,
  Avatar,
  LinearProgress
} from '@mui/material';
import { 
  Payments as PaymentsIcon,
  Warning as WarningIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
  ShowChart as ShowChartIcon,
  PieChart as PieChartIcon
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

  // Calculate risk score status
  const getRiskStatus = (score) => {
    if (score > 0.7) return { label: 'High', color: 'error' };
    if (score > 0.3) return { label: 'Medium', color: 'warning' };
    return { label: 'Low', color: 'success' };
  };
  
  // Calculate the anomaly percentage
  const getAnomalyPercentage = () => {
    if (stats.totalTransactions === 0) return 0;
    return ((stats.anomaliesDetected / stats.totalTransactions) * 100).toFixed(1);
  };
  
  if (loading || isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '500px',
        background: `linear-gradient(${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        borderRadius: 4,
        p: 4
      }}>
        <CircularProgress size={60} color="primary" />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 500 }}>
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '500px',
        background: theme.palette.error.light,
        borderRadius: 4,
        p: 4
      }}>
        <WarningIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography color="error" variant="h6" align="center">{error || dashboardError}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      pb: 4,
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.01)',
      borderRadius: 2,
      minHeight: '100vh'
    }}>
      {/* Header Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: '16px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            opacity: 0.1,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
          }}
        />
        <Box display="flex" justifyContent="space-between" alignItems="center">
    <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
          Financial Risk Dashboard
        </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Monitor transactions, detect anomalies, and assess risk in real-time
            </Typography>
          </Box>
        <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              icon={<ShowChartIcon />} 
              label={webSocketConnected ? 'Live Connection' : 'Offline'}
              color={webSocketConnected ? 'success' : 'default'}
              variant="filled"
              sx={{ 
                px: 1,
                height: 36,
                '& .MuiChip-label': { fontWeight: 500 }
              }}
            />
          <Button 
            variant="contained" 
              color="secondary"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshData}
            disabled={!webSocketConnected}
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)'
                },
                borderRadius: '10px',
                py: 1
              }}
          >
            Refresh Data
          </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', mt: 2, opacity: 0.9 }}>
          <Typography variant="body2">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </Paper>
      
      {/* Stats Section */}
      <Grid container spacing={3} sx={{ px: 2, mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" color="text.secondary" fontWeight="normal" sx={{ mb: 3 }}>
                    Total Transactions
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats.totalTransactions.toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.light, p: 1 }}>
                  <PaymentsIcon color="primary" />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  15.3% increase 
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  from last period
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" color="text.secondary" fontWeight="normal" sx={{ mb: 3 }}>
                    Anomalies Detected
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats.anomaliesDetected.toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.light, p: 1 }}>
                  <WarningIcon color="error" />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Detection Rate
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" color="error.main">
                    {getAnomalyPercentage()}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(getAnomalyPercentage())} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }} 
            color="error"
          />
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" color="text.secondary" fontWeight="normal" sx={{ mb: 3 }}>
                    Active Customers
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats.activeCustomers.toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.light, p: 1 }}>
                  <GroupIcon color="success" />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  8.2% increase 
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  from last month
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" color="text.secondary" fontWeight="normal" sx={{ mb: 3 }}>
                    Risk Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {stats.riskScore < 1 ? stats.riskScore.toFixed(2) : stats.riskScore}
                    </Typography>
                    <Chip 
                      label={getRiskStatus(stats.riskScore).label} 
                      color={getRiskStatus(stats.riskScore).color}
                      size="small"
                      sx={{ height: 24 }}
                    />
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.light, p: 1 }}>
                  <SecurityIcon color="warning" />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Severity Level
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {(stats.riskScore * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.riskScore * 100} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }} 
                  color={getRiskStatus(stats.riskScore).color} 
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts Section */}
      <Box sx={{ px: 2 }}>
        <Paper elevation={0} sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center">
              <ShowChartIcon color="primary" sx={{ mr: 1.5 }} />
        <Typography variant="h5" component="h2" fontWeight="medium">
          Transaction Analysis
        </Typography>
            </Box>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
                labelId="time-range-label"
            value={timeRange}
            onChange={handleTimeRangeChange}
                label="Time Range"
          >
            <MenuItem value="Today">Today</MenuItem>
            <MenuItem value="This Week">This Week</MenuItem>
            <MenuItem value="This Month">This Month</MenuItem>
            <MenuItem value="This Year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
          <Grid container spacing={4}>
            <Grid item xs={12} lg={8}>
              <Paper 
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '14px',
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(180deg, rgba(45,55,72,0.3) 0%, rgba(17,25,40,0.2) 100%)' 
                    : 'linear-gradient(180deg, rgba(240,245,255,0.5) 0%, rgba(250,252,255,0.8) 100%)',
                  height: '100%',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="medium">
                      Transaction Volume & Anomalies
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      size="small" 
                      label="Transactions" 
                      sx={{ 
                        backgroundColor: theme.palette.primary.main + '20',
                        color: theme.palette.primary.main,
                        '& .MuiChip-label': { fontWeight: 500 }
                      }}
                    />
                    <Chip 
                      size="small" 
                      label="Anomalies" 
                      sx={{ 
                        backgroundColor: theme.palette.error.main + '20',
                        color: theme.palette.error.main,
                        '& .MuiChip-label': { fontWeight: 500 }
                      }}
                    />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 1, opacity: 0.6 }} />
                
                <Box sx={{ height: 350, mt: 2 }}>
          <LineChart 
            series={transactionData.series}
            xaxis={transactionData.xaxis}
                    height={350}
                  />
                </Box>
                
                {/* Key Stats for Transaction Analysis */}
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        background: theme.palette.primary.main + '15',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Volume
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {transactionData.series[0]?.data?.reduce((a, b) => a + b, 0) || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        background: theme.palette.error.main + '15',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Anomalies
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="error">
                          {transactionData.series[1]?.data?.reduce((a, b) => a + b, 0) || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        background: theme.palette.info.main + '15',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          Peak Day
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="info.dark">
                          {transactionData.series[0]?.data?.length > 0 
                            ? transactionData.xaxis[transactionData.series[0].data.indexOf(Math.max(...transactionData.series[0].data))]
                            : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        background: theme.palette.warning.main + '15',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          Anomaly Rate
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="warning.dark">
                          {transactionData.series[1]?.data?.reduce((a, b) => a + b, 0) > 0 && 
                           transactionData.series[0]?.data?.reduce((a, b) => a + b, 0) > 0 
                            ? ((transactionData.series[1].data.reduce((a, b) => a + b, 0) / 
                               transactionData.series[0].data.reduce((a, b) => a + b, 0)) * 100).toFixed(1) + '%'
                            : '0%'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
        </Grid>
            <Grid item xs={12} lg={4}>
              <Paper 
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '14px',
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(180deg, rgba(45,55,72,0.3) 0%, rgba(17,25,40,0.2) 100%)' 
                    : 'linear-gradient(180deg, rgba(240,245,255,0.5) 0%, rgba(250,252,255,0.8) 100%)',
                  height: '100%',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center">
                    <PieChartIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Transaction Categories
                    </Typography>
                  </Box>
                  <Chip 
                    size="small" 
                    label={`${categoryData.labels.length} Categories`}
                    sx={{ 
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      '& .MuiChip-label': { fontWeight: 500 }
                    }}
                  />
                </Box>
                
                <Divider sx={{ my: 1, opacity: 0.6 }} />
                
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  pt: 1
                }}>
          <DonutChart 
            series={categoryData.series}
            labels={categoryData.labels}
                    height={320}
                  />
                </Box>
                
                {/* Top Categories */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Top Categories
                  </Typography>
                  <Grid container spacing={1}>
                    {categoryData.series.map((value, index) => {
                      if (index < 3 && categoryData.labels[index]) {  // Show only top 3
                        // Calculate percentage of total
                        const total = categoryData.series.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                        
                        // Get color for this category
                        const colors = [
                          theme.palette.primary.main,
                          theme.palette.secondary.main,
                          theme.palette.info.main
                        ];
                        
                        return (
                          <Grid item xs={4} key={index}>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              p: 1.5, 
                              borderRadius: 2,
                              background: `${colors[index]}15`,
                              height: '100%',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                              }
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Box 
                                  sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    backgroundColor: colors[index],
                                    mr: 1
                                  }} 
                                />
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                  {categoryData.labels[index]}
                                </Typography>
                              </Box>
                              <Typography variant="body1" fontWeight="bold" color={colors[index].replace('main', 'dark')}>
                                {value.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {percentage}% of total
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      }
                      return null;
                    })}
                  </Grid>
                  
                  {/* Category Statistics */}
                  {categoryData.series.length > 0 && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}`, opacity: 0.7 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" color="text.secondary">
                              Total Categories
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="text.primary">
                              {categoryData.labels.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" color="text.secondary">
                              Biggest Category
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="text.primary">
                              {categoryData.series.length > 0 ? 
                                categoryData.labels[categoryData.series.indexOf(Math.max(...categoryData.series))] : 
                                'N/A'
                              }
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </Paper>
        </Grid>
      </Grid>
        </Paper>
      </Box>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard; 