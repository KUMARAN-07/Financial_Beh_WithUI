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
  IconButton
} from '@mui/material';
import { 
  WarningAmber as WarningIcon,
  Timeline as TimelineIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import TransactionsTable from '../components/Transactions/TransactionsTable';
import LineChart from '../components/Dashboard/LineChart';

const AnomalyCard = ({ anomaly }) => {
  const getFormattedDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2, 
      border: 1, 
      borderColor: 'error.light',
      position: 'relative',
      overflow: 'visible',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: 5,
        height: '100%',
        backgroundColor: 'error.main',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
      }
    }}>
      <CardContent sx={{ pl: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center">
            <WarningIcon color="error" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              Anomalous Transaction
            </Typography>
          </Box>
          <Chip 
            label={`$${parseFloat(anomaly.amount).toFixed(2)}`} 
            color="error" 
            variant="outlined"
          />
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
            <Typography variant="body1">{anomaly.id && anomaly.id.substring(0, 8)}...</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Timestamp</Typography>
            <Typography variant="body1">{getFormattedDate(anomaly.timestamp)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">Category</Typography>
            <Typography variant="body1">{anomaly.category}</Typography>
          </Grid>
        </Grid>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Box display="flex" alignItems="center">
            <TimelineIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Anomaly Score: {anomaly.anomaly_score ? parseFloat(anomaly.anomaly_score).toFixed(2) : 'N/A'}
            </Typography>
          </Box>
          <IconButton size="small" color="primary">
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

const Anomalies = () => {
  const { anomalies, loading, error } = useData();
  const [timeRange, setTimeRange] = useState('This Week');
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
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
    );
  }
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Anomaly Detection
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<RefreshIcon />}
        >
          Retrain Model
        </Button>
      </Box>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
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
              <LineChart 
                series={anomalyChartData.series}
                xaxis={anomalyChartData.xaxis}
                height={300}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Anomaly Summary
              </Typography>
              <Box sx={{ my: 3 }}>
                <Typography variant="h3" component="div" color="error" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {anomalies.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Total Anomalies Detected
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Detection Rate</Typography>
                  <Typography variant="body1" fontWeight="medium">6.4%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Avg. Score</Typography>
                  <Typography variant="body1" fontWeight="medium">0.73</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">High Risk</Typography>
                  <Typography variant="body1" fontWeight="medium" color="error">12</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Medium Risk</Typography>
                  <Typography variant="body1" fontWeight="medium" color="warning.main">20</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box mb={4}>
        <Typography variant="h5" component="h2" fontWeight="medium" mb={2}>
          Recent Anomalies ({anomalies.length})
        </Typography>
        
        {anomalies.length === 0 ? (
          <Alert severity="info">No anomalies detected yet.</Alert>
        ) : (
          <Box>
            {anomalies.slice(0, 3).map((anomaly) => (
              <AnomalyCard key={anomaly.id} anomaly={anomaly} />
            ))}
          </Box>
        )}
      </Box>
      
      <Box>
        <Typography variant="h5" component="h2" fontWeight="medium" mb={2}>
          All Anomalous Transactions
        </Typography>
        
        <TransactionsTable transactions={anomalies} />
      </Box>
    </Box>
  );
};

export default Anomalies; 