import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import apiService from '../api/apiService';

// These would typically be replaced with proper chart components
// like recharts, chart.js, or visx
const MockBarChart = ({ data, height = 200, loading = false }) => {
  if (loading) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  // If no data is provided, show a message
  if (!data || data.length === 0) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.secondary">No data available</Typography>
      </Box>
    );
  }
  
  // If data contains no valid percentages or only zeros, show a message
  const hasValidData = data.some(item => item.value > 0);
  if (!hasValidData) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.secondary">No risk data available</Typography>
      </Box>
    );
  }
  
  // A very simple mock bar chart
  return (
    <Box height={height} display="flex" alignItems="flex-end">
      {data.map((item, index) => (
        <Box 
          key={index}
          mx={0.5}
          width={`${100 / data.length - 2}%`}
          height={`${Math.max(0.05, item.value) * 100}%`} // Ensure at least 5% height for visibility
          bgcolor={item.color || 'primary.main'}
          display="flex"
          flexDirection="column"
          justifyContent="flex-end"
          alignItems="center"
          borderRadius="4px 4px 0 0"
        >
          <Typography variant="caption" color="white" px={1} fontWeight="bold">
            {Math.round(item.value * 100)}%
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const MockLineChart = ({ data, height = 200, loading = false }) => {
  if (loading) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  // If no data is provided, show a message
  if (!data) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.secondary">No data available</Typography>
      </Box>
    );
  }
  
  // A very simple mock line chart
  return (
    <Box height={height} position="relative">
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        bottom={0}
        border="1px dashed rgba(0,0,0,0.1)"
        borderBottom="none"
      >
        {[0.25, 0.5, 0.75].map(level => (
          <Box 
            key={level}
            position="absolute"
            left={0}
            right={0}
            bottom={`${level * 100}%`}
            height="1px"
            bgcolor="rgba(0,0,0,0.1)"
          />
        ))}
      </Box>
      
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        bottom={0}
        display="flex"
        alignItems="flex-end"
      >
        <Box 
          width="100%"
          height="40%"
          bgcolor="rgba(25, 118, 210, 0.1)"
          borderTop="2px solid #1976d2"
          borderTopRightRadius="4px"
          borderTopLeftRadius="4px"
        />
      </Box>
    </Box>
  );
};

// A very simple mock pie chart with dynamic coloring
const MockPieChart = ({ data, height = 200, loading = false }) => {
  if (loading) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  // If no data is provided, show a message
  if (!data || data.length === 0) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.secondary">No category data available</Typography>
      </Box>
    );
  }
  
  // A very simple mock pie chart
  return (
    <Box height={height} display="flex" justifyContent="center" alignItems="center">
      <Box
        width="70%"
        height="70%"
        borderRadius="50%"
        position="relative"
        bgcolor="#f5f5f5"
        sx={{
          background: data && data.length >= 4 
            ? `conic-gradient(
                ${data[0].color || '#f44336'} 0% ${data[0].percentage * 100}%, 
                ${data[1].color || '#ff9800'} ${data[0].percentage * 100}% ${(data[0].percentage + data[1].percentage) * 100}%, 
                ${data[2].color || '#2196f3'} ${(data[0].percentage + data[1].percentage) * 100}% ${(data[0].percentage + data[1].percentage + data[2].percentage) * 100}%,
                ${data[3].color || '#4caf50'} ${(data[0].percentage + data[1].percentage + data[2].percentage) * 100}% 100%
              )`
            : data && data.length > 0 
              ? `conic-gradient(
                  ${data[0].color || '#f44336'} 0% ${data[0].percentage * 100}%,
                  ${data.length > 1 ? data[1].color || '#ff9800' : '#ff9800'} ${data[0].percentage * 100}% 100%
                )`
              : 'conic-gradient(#f5f5f5 0% 100%)'
        }}
      >
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width="60%"
          height="60%"
          bgcolor="white"
          borderRadius="50%"
          sx={{ transform: 'translate(-50%, -50%)' }}
        />
      </Box>
    </Box>
  );
};

const RiskAnalysis = () => {
  const { riskScore, loading: globalLoading, error: globalError, trainModels } = useData();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Calculate risk chart data - correctly handle actual data from Neo4j
  const riskChartData = useMemo(() => {
    if (!riskMetrics?.riskDistribution) return [];
    
    // Convert riskDistribution into the format expected by MockBarChart
    try {
      console.log("Processing risk distribution:", riskMetrics.riskDistribution);
      
      // Ensure riskDistribution is in expected format and sort by category
      const sortedDistribution = [...riskMetrics.riskDistribution].sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        return order[a.category] - order[b.category];
      });
      
      // Map to the format needed for charts
      return sortedDistribution.map(item => ({
        label: item.category,
        value: parseFloat(item.percentage) || 0,
        color: item.category === 'High' ? '#f44336' :
               item.category === 'Medium' ? '#ff9800' : '#4caf50'
      }));
    } catch (error) {
      console.error("Error processing risk distribution data:", error);
      // Fallback to empty array if data is malformed
      return [];
    }
  }, [riskMetrics]);

  // Format data for category pie chart
  const categoryChartData = useMemo(() => {
    if (!riskMetrics?.riskByCategory) return [];

    return riskMetrics.riskByCategory.map((item, index) => ({
      label: item.category,
      percentage: item.percentage,
      color: index === 0 ? '#f44336' : 
             index === 1 ? '#ff9800' :
             index === 2 ? '#2196f3' : '#4caf50'
    }));
  }, [riskMetrics]);

  // Fetch risk analytics data from backend
  const fetchRiskAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch risk analytics from the backend
      console.log('Fetching risk analytics with timeRange:', timeRange);
      const riskAnalyticsData = await apiService.getRiskAnalytics({ timeRange });
      console.log('Received risk analytics data:', JSON.stringify(riskAnalyticsData, null, 2));
      
      // If the backend API fails or returns no data, throw an error
      if (!riskAnalyticsData) {
        throw new Error('No data returned from server');
      }
      
      // Validate and normalize the risk distribution data
      if (riskAnalyticsData.riskDistribution) {
        // Ensure we have all three risk categories (High, Medium, Low)
        const categories = ['High', 'Medium', 'Low'];
        const existingCategories = riskAnalyticsData.riskDistribution.map(item => item.category);
        
        // Add any missing categories with zero counts
        categories.forEach(category => {
          if (!existingCategories.includes(category)) {
            riskAnalyticsData.riskDistribution.push({
              category,
              count: 0,
              percentage: 0
            });
          }
        });
        
        // Ensure percentages are properly formatted as numbers
        riskAnalyticsData.riskDistribution = riskAnalyticsData.riskDistribution.map(item => ({
          ...item,
          percentage: parseFloat(item.percentage) || 0,
          count: parseInt(item.count) || 0
        }));
        
        // Sort by category for consistent display
        riskAnalyticsData.riskDistribution.sort((a, b) => {
          const order = { High: 0, Medium: 1, Low: 2 };
          return order[a.category] - order[b.category];
        });
        
        // Log the normalized distribution for debugging
        console.log('Normalized risk distribution:', riskAnalyticsData.riskDistribution);
      } else {
        // Create default distribution if missing
        riskAnalyticsData.riskDistribution = [
          { category: 'High', count: 0, percentage: 0 },
          { category: 'Medium', count: 0, percentage: 0 },
          { category: 'Low', count: 0, percentage: 0 }
        ];
        console.warn('Risk distribution data missing, using defaults');
      }
      
      // Set fresh data, don't merge with old data
      setRiskMetrics(riskAnalyticsData);
      
      // Fetch high risk entities (merchants and customers)
      const highRiskEntities = await apiService.getHighRiskEntities();
      console.log('Received high risk entities:', JSON.stringify(highRiskEntities, null, 2));
      if (highRiskEntities) {
        setRiskMetrics(prev => ({
          ...prev,
          highRiskMerchants: highRiskEntities.merchants || [],
          highRiskCustomers: highRiskEntities.customers || []
        }));
      }
      
      // Fetch risk factors
      const riskFactors = await apiService.getRiskFactors();
      console.log('Received risk factors:', JSON.stringify(riskFactors, null, 2));
      if (riskFactors && riskFactors.factors) {
        setRiskMetrics(prev => ({
          ...prev,
          topRiskFactors: riskFactors.factors
        }));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching risk analytics:', error);
      
      // Show error message and set riskMetrics to null to indicate error state
      setSnackbar({
        open: true,
        message: 'Failed to load risk analytics: ' + error.message,
        severity: 'error'
      });
      
      setRiskMetrics(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!riskMetrics) {
      fetchRiskAnalytics();
    }
  }, []);

  useEffect(() => {
    fetchRiskAnalytics();
  }, [timeRange]);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleRefreshData = () => {
    setSnackbar({
      open: true,
      message: 'Refreshing risk analytics data...',
      severity: 'info'
    });
    
    // Force re-fetch of data - clear the metrics first to ensure complete refresh
    setRiskMetrics(null);
    fetchRiskAnalytics();
  };

  const handleTrainModels = async () => {
    setIsTraining(true);
    try {
      const result = await trainModels();
      
      // If successful, refresh the risk analytics data
      await fetchRiskAnalytics();
      
      setSnackbar({
        open: true,
        message: 'Models trained successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error training models:', error);
      setSnackbar({
        open: true,
        message: 'Failed to train models: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  if ((globalLoading || isLoading) && !riskMetrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Handle error states
  if ((globalError || !riskMetrics) && !isLoading) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleRefreshData}
            disabled={isLoading}
          >
            Retry
          </Button>
        }>
          Error loading risk analysis data. {globalError || "Failed to fetch data from the server."}
        </Alert>
        <Box mt={3} display="flex" justifyContent="center">
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleTrainModels}
            disabled={isTraining}
            startIcon={<TrendingUpIcon />}
          >
            Train Models
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Risk Analysis
        </Typography>
        <Box>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, mr: 2 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={handleRefreshData}
            disabled={isLoading}
            sx={{ mr: 2 }}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<TrendingUpIcon />}
            onClick={handleTrainModels}
            disabled={isTraining}
          >
            {isTraining ? 'Training...' : 'Train Models'}
          </Button>
        </Box>
      </Box>
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Overall Risk Score */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Risk Score
                </Typography>
                {riskMetrics?.overallRiskScore !== undefined ? (
                  <Box 
                    display="flex" 
                    flexDirection="column" 
                    alignItems="center" 
                    justifyContent="center" 
                    py={3}
                  >
                    <Box 
                      width={150} 
                      height={150} 
                      borderRadius="50%" 
                      border="10px solid" 
                      borderColor={
                        riskMetrics.overallRiskScore > 0.7 ? 'error.main' :
                        riskMetrics.overallRiskScore > 0.3 ? 'warning.main' : 'success.main'
                      }
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mb={1}
                    >
                      <Typography variant="h3" component="div" fontWeight="bold">
                        {Math.round(riskMetrics.overallRiskScore * 100)}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight="medium" color="textSecondary">
                      {riskMetrics.overallRiskScore > 0.7 ? 'High Risk' :
                      riskMetrics.overallRiskScore > 0.3 ? 'Medium Risk' : 'Low Risk'}
                    </Typography>
                    {riskMetrics.modelPerformance?.updatedAt && (
                      <Typography variant="body2" color="textSecondary" mt={1}>
                        Last updated: {new Date(riskMetrics.modelPerformance.updatedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box height={250} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">No risk score available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Risk Distribution */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Distribution
                </Typography>
                <MockBarChart data={riskChartData} height={150} loading={isLoading} />
                {riskMetrics?.riskDistribution && riskMetrics.riskDistribution.length > 0 ? (
                  <Box mt={2}>
                    <Grid container spacing={1}>
                      {riskMetrics.riskDistribution.map((item, index) => (
                        <Grid item xs={4} key={index}>
                          <Box 
                            bgcolor={
                              item.category === 'High' ? 'error.light' :
                              item.category === 'Medium' ? 'warning.light' : 'success.light'
                            }
                            p={1}
                            borderRadius={1}
                            textAlign="center"
                          >
                            <Typography variant="h6" fontWeight="bold">
                              {item.count}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {item.category} Risk
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {Math.round(item.percentage * 100)}%
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box height={100} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">No risk distribution data</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Risk Trend */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Trend ({timeRange})
                </Typography>
                <MockLineChart height={200} loading={isLoading} />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="body2" color="textSecondary">
                    {timeRange === '7d' ? '7 days ago' : 
                    timeRange === '30d' ? '30 days ago' :
                    timeRange === '90d' ? '90 days ago' : '1 year ago'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Today
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Top Risk Factors */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Risk Factors
                </Typography>
                {riskMetrics?.topRiskFactors && riskMetrics.topRiskFactors.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Risk Factor</TableCell>
                          <TableCell>Risk Score</TableCell>
                          <TableCell>Risk Level</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {riskMetrics.topRiskFactors.map((factor, index) => (
                          <TableRow key={index}>
                            <TableCell>{factor.factor}</TableCell>
                            <TableCell>{factor.score.toFixed(2)}</TableCell>
                            <TableCell>
                              <Box 
                                px={1.5} 
                                py={0.5} 
                                borderRadius={1} 
                                display="inline-block"
                                bgcolor={
                                  factor.score > 0.7 ? 'error.light' :
                                  factor.score > 0.3 ? 'warning.light' : 'success.light'
                                }
                              >
                                <Typography variant="body2" fontWeight="medium">
                                  {factor.score > 0.7 ? 'High' :
                                  factor.score > 0.3 ? 'Medium' : 'Low'}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box height={200} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">No risk factors available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Risk by Category */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk by Category
                </Typography>
                {riskMetrics?.riskByCategory && riskMetrics.riskByCategory.length > 0 ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <MockPieChart data={categoryChartData} height={180} loading={isLoading} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {riskMetrics.riskByCategory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <Box 
                                      width={12} 
                                      height={12} 
                                      bgcolor={
                                        index === 0 ? '#f44336' :
                                        index === 1 ? '#ff9800' :
                                        index === 2 ? '#2196f3' : '#4caf50'
                                      } 
                                      borderRadius="50%" 
                                      mr={1} 
                                    />
                                    <Typography variant="body2">{item.category}</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>{Math.round(item.percentage * 100)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                ) : (
                  <Box height={200} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">No category data available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* High Risk Entities */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {/* High Risk Merchants */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <WarningIcon color="error" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        High Risk Merchants
                      </Typography>
                    </Box>
                    {riskMetrics?.highRiskMerchants && riskMetrics.highRiskMerchants.length > 0 ? (
                      <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Category</TableCell>
                              <TableCell>Risk Score</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {riskMetrics.highRiskMerchants.map((merchant) => (
                              <TableRow key={merchant.id}>
                                <TableCell>{merchant.id}</TableCell>
                                <TableCell>{merchant.name}</TableCell>
                                <TableCell>{merchant.category}</TableCell>
                                <TableCell>
                                  <Box 
                                    px={1.5} 
                                    py={0.5} 
                                    borderRadius={1} 
                                    display="inline-block"
                                    bgcolor="error.light"
                                  >
                                    <Typography variant="body2" fontWeight="medium">
                                      {merchant.risk_score.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box height={200} display="flex" alignItems="center" justifyContent="center">
                        <Typography variant="body2" color="text.secondary">No high risk merchants found</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* High Risk Customers */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <WarningIcon color="error" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        High Risk Customers
                      </Typography>
                    </Box>
                    {riskMetrics?.highRiskCustomers && riskMetrics.highRiskCustomers.length > 0 ? (
                      <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Transactions</TableCell>
                              <TableCell>Risk Score</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {riskMetrics.highRiskCustomers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell>{customer.id}</TableCell>
                                <TableCell>{customer.name}</TableCell>
                                <TableCell>{customer.transactions}</TableCell>
                                <TableCell>
                                  <Box 
                                    px={1.5} 
                                    py={0.5} 
                                    borderRadius={1} 
                                    display="inline-block"
                                    bgcolor="error.light"
                                  >
                                    <Typography variant="body2" fontWeight="medium">
                                      {customer.risk_score.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box height={200} display="flex" alignItems="center" justifyContent="center">
                        <Typography variant="body2" color="text.secondary">No high risk customers found</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Model Performance */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Performance
                </Typography>
                {riskMetrics?.modelPerformance ? (
                  <>
                    <Grid container spacing={3}>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} borderRadius={1} bgcolor="background.paper">
                          <Typography variant="h5" color="primary" fontWeight="bold">
                            {riskMetrics.modelPerformance.accuracy.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Accuracy
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} borderRadius={1} bgcolor="background.paper">
                          <Typography variant="h5" color="primary" fontWeight="bold">
                            {riskMetrics.modelPerformance.precision.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Precision
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} borderRadius={1} bgcolor="background.paper">
                          <Typography variant="h5" color="primary" fontWeight="bold">
                            {riskMetrics.modelPerformance.recall.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Recall
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} borderRadius={1} bgcolor="background.paper">
                          <Typography variant="h5" color="primary" fontWeight="bold">
                            {riskMetrics.modelPerformance.f1Score.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            F1 Score
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    <Box mt={2} display="flex" justifyContent="flex-end">
                      <Typography variant="body2" color="textSecondary">
                        Last trained: {new Date(riskMetrics.modelPerformance.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box height={150} display="flex" alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">No model performance data available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default RiskAnalysis; 