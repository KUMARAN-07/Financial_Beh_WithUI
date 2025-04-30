import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Divider,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Paper,
  LinearProgress,
  useTheme,
  Avatar,
  Tooltip,
  Badge
} from '@mui/material';
import { 
  WarningAmber as WarningIcon,
  Timeline as TimelineIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Category as CategoryIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  DeveloperBoard as DeveloperBoardIcon,
  Alarm as AlarmIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import TransactionsTable from '../components/Transactions/TransactionsTable';
import LineChart from '../components/Dashboard/LineChart';

const AnomalyCard = ({ anomaly }) => {
  const theme = useTheme();
  
  const getFormattedDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  // Calculate time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  };
  
  // Calculate risk level
  const getRiskLevel = (score) => {
    if (!score) return { level: 'Medium', color: theme.palette.warning.main };
    
    const anomalyScore = parseFloat(score);
    if (anomalyScore >= 0.7) return { level: 'High', color: theme.palette.error.main };
    if (anomalyScore >= 0.4) return { level: 'Medium', color: theme.palette.warning.main };
    return { level: 'Low', color: theme.palette.success.main };
  };
  
  const risk = getRiskLevel(anomaly.anomaly_score);
  
  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2, 
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.12)'
      },
      position: 'relative',
      overflow: 'visible',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: 5,
        height: '100%',
        backgroundColor: risk.color,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
      }
    }}>
      <CardContent sx={{ pl: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ 
              bgcolor: `${risk.color}20`, 
              color: risk.color,
              width: 42,
              height: 42,
              mr: 1.5
            }}>
              <WarningIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" fontWeight="medium">
                {risk.level} Risk Anomaly
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getTimeAgo(anomaly.timestamp)}
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={`$${parseFloat(anomaly.amount).toFixed(2)}`} 
            color="error" 
            sx={{ 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              height: 32
            }}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                minWidth: 28, 
                color: theme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}>
                <HistoryIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {anomaly.id ? anomaly.id.substring(0, 8) + '...' : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                minWidth: 28, 
                color: theme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}>
                <ScheduleIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {getFormattedDate(anomaly.timestamp)}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                minWidth: 28, 
                color: theme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}>
                <CategoryIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Category</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {anomaly.category || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 100,
              mr: 1.5,
              position: 'relative',
              height: 6,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <Box 
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${(anomaly.anomaly_score || 0.5) * 100}%`,
                  bgcolor: risk.color,
                  borderRadius: 3
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight="medium" color={risk.color}>
              Score: {anomaly.anomaly_score ? parseFloat(anomaly.anomaly_score).toFixed(2) : 'N/A'}
            </Typography>
          </Box>
          <Tooltip title="View Details">
            <IconButton size="small" sx={{ 
              bgcolor: theme.palette.primary.main + '15',
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.main + '25',
              }
            }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

const Anomalies = () => {
  const { anomalies, loading, error } = useData();
  const [timeRange, setTimeRange] = useState('This Week');
  const theme = useTheme();
  
  const [anomalyChartData, setAnomalyChartData] = useState({
    series: [
      {
        name: 'Anomaly Score',
        data: [0.32, 0.56, 0.42, 0.78, 0.64, 0.35, 0.90],
      }
    ],
    xaxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  });
  
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  const anomalyStats = {
    total: anomalies.length,
    detectionRate: 6.4,
    avgScore: 0.73,
    highRisk: 12,
    mediumRisk: 20,
    lowRisk: anomalies.length - 12 - 20
  };
  
  if (loading) {
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
        <CircularProgress size={60} color="error" />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 500 }}>
          Loading anomaly data...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Analyzing transaction patterns
        </Typography>
        <Box sx={{ width: '50%', mt: 4 }}>
          <LinearProgress color="error" />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error"
        variant="filled"
        sx={{ 
          mb: 3,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
        }}
      >
        {error}
      </Alert>
    );
  }
  
  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: '16px',
          background: `linear-gradient(90deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
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
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
          }}
        />
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
              Anomaly Detection
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Monitor and analyze suspicious transaction patterns
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<DeveloperBoardIcon />}
            sx={{
              bgcolor: 'white',
              color: theme.palette.error.main,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)'
              }
            }}
          >
            Retrain Model
          </Button>
        </Box>
        
        {/* Anomaly Stats */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              p: 2, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <Badge
                badgeContent={anomalyStats.total}
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    bgcolor: 'white', 
                    color: theme.palette.error.main 
                  } 
                }}
              >
                <WarningIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              </Badge>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Anomalies
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {anomalyStats.total.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              p: 2, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <SecurityIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Detection Rate
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {anomalyStats.detectionRate}%
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              p: 2, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <AlarmIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  High Risk Anomalies
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {anomalyStats.highRisk.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ 
            height: '100%', 
            borderRadius: 3,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              px: 3, 
              py: 2, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              <Box display="flex" alignItems="center">
                <AssessmentIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="h6" component="div" fontWeight="medium">
                  Anomaly Score Trend
                </Typography>
              </Box>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  label="Time Range"
                >
                  <MenuItem value="Today">Today</MenuItem>
                  <MenuItem value="This Week">This Week</MenuItem>
                  <MenuItem value="This Month">This Month</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <LineChart 
                series={anomalyChartData.series}
                xaxis={anomalyChartData.xaxis}
                height={300}
              />
            </CardContent>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ 
            height: '100%', 
            borderRadius: 3,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ 
              px: 3, 
              py: 2, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              <SecurityIcon color="error" sx={{ mr: 1.5 }} />
              <Typography variant="h6" component="div" fontWeight="medium">
                Anomaly Summary
              </Typography>
            </Box>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ 
                my: 3, 
                textAlign: 'center', 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center' 
              }}>
                <Box sx={{ 
                  position: 'relative', 
                  width: '120px', 
                  height: '120px', 
                  mx: 'auto',
                  mb: 2
                }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={100} 
                    size={120} 
                    thickness={4} 
                    sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                  />
                  <CircularProgress 
                    variant="determinate" 
                    value={anomalyStats.detectionRate > 100 ? 100 : anomalyStats.detectionRate} 
                    size={120} 
                    thickness={4} 
                    sx={{ 
                      color: theme.palette.error.main,
                      position: 'absolute',
                      left: 0,
                      top: 0
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography variant="h4" component="div" color="error" fontWeight="bold">
                      {anomalyStats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Anomalies
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Detection Rate: {anomalyStats.detectionRate}%
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: theme.palette.error.main + '15',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      High Risk
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {anomalyStats.highRisk}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: theme.palette.warning.main + '15',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      Medium
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {anomalyStats.mediumRisk}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: theme.palette.success.main + '15',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      Low Risk
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {anomalyStats.lowRisk}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Paper>
        </Grid>
      </Grid>
      
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography 
            variant="h5" 
            component="h2" 
            fontWeight="medium" 
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <WarningIcon color="error" sx={{ mr: 1, fontSize: 24 }} />
            Recent Anomalies ({anomalies.length})
          </Typography>
          
          <Button 
            variant="text" 
            color="primary" 
            endIcon={<ArrowForwardIcon />}
            sx={{ fontWeight: 500 }}
          >
            View All
          </Button>
        </Box>
        
        {anomalies.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 5, 
              borderRadius: 3,
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              border: `1px dashed ${theme.palette.divider}`
            }}
          >
            <WarningIcon color="disabled" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" align="center">
              No anomalies detected
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, maxWidth: 400 }}>
              The system hasn't detected any suspicious transactions yet. This could mean your transactions are normal or the model needs more data.
            </Typography>
          </Paper>
        ) : (
          <Box>
            {anomalies.slice(0, 3).map((anomaly) => (
              <AnomalyCard key={anomaly.id} anomaly={anomaly} />
            ))}
          </Box>
        )}
      </Box>
      
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography 
            variant="h5" 
            component="h2" 
            fontWeight="medium"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <TimelineIcon color="primary" sx={{ mr: 1, fontSize: 24 }} />
            All Anomalous Transactions
          </Typography>
        </Box>
        
        <TransactionsTable transactions={anomalies} />
      </Box>
    </Box>
  );
};

export default Anomalies; 