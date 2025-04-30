import React, { useState, useEffect } from 'react';
import {
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  ShowChart as ShowChartIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import apiService from '../api/apiService';

const Customers = () => {
  const { customers, loading: globalLoading, error: globalError, getCustomerBehavior } = useData();
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [behaviorData, setBehaviorData] = useState(null);
  const [showBehavior, setShowBehavior] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // Fetch customers if they're not already in context
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getCustomers();
        setFilteredCustomers(response.customers || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load customers: ' + error.message,
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (customers && customers.length > 0) {
      setFilteredCustomers(customers);
    } else {
      fetchCustomers();
    }
  }, [customers]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (customerId) => {
    try {
      setIsLoading(true);
      const customerData = await apiService.getCustomerById(customerId);
      setCustomerDetails(customerData);
      setShowDetails(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: `Failed to load details for customer ${customerId}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleViewBehavior = async (customerId) => {
    try {
      setIsLoading(true);
      const behavior = await getCustomerBehavior(customerId);
      const transactions = await apiService.getCustomerTransactions(customerId, {
        limit: 20,
        sortOrder: 'desc'
      });
      
      setBehaviorData(behavior);
      setCustomerTransactions(transactions.transactions || []);
      setShowBehavior(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: `Failed to load behavior for customer ${customerId}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCloseBehavior = () => {
    setShowBehavior(false);
    setBehaviorData(null);
    setCustomerTransactions([]);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setCustomerDetails(null);
  };

  const handleApplyFilters = () => {
    let filtered = [...(customers || [])];
    
    if (searchQuery) {
      filtered = filtered.filter(customer => 
        customer.id.includes(searchQuery) || 
        (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (riskLevel) {
      filtered = filtered.filter(customer => {
        if (riskLevel === 'high') return customer.risk_score > 0.7;
        if (riskLevel === 'medium') return customer.risk_score > 0.3 && customer.risk_score <= 0.7;
        if (riskLevel === 'low') return customer.risk_score <= 0.3;
        return true;
      });
    }
    
    if (activeStatus !== '') {
      const isActive = activeStatus === 'active';
      filtered = filtered.filter(customer => customer.is_active === isActive);
    }
    
    setFilteredCustomers(filtered);
    setIsFiltered(true);
    
    setSnackbar({
      open: true,
      message: `Showing ${filtered.length} filtered customers`,
      severity: 'info'
    });
  };
  
  const handleResetFilters = () => {
    setSearchQuery('');
    setRiskLevel('');
    setActiveStatus('');
    setIsFiltered(false);
    setFilteredCustomers(customers || []);
    
    setSnackbar({
      open: true,
      message: 'Filters have been reset',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getRiskChip = (score) => {
    if (!score && score !== 0) return <Chip label="Unknown" color="default" size="small" />;
    
    if (score > 0.7) {
      return <Chip label="High Risk" color="error" size="small" />;
    } else if (score > 0.3) {
      return <Chip label="Medium Risk" color="warning" size="small" />;
    } else {
      return <Chip label="Low Risk" color="success" size="small" />;
    }
  };

  const getStatusChip = (isActive) => {
    if (isActive === undefined) return <Chip label="Unknown" color="default" size="small" />;
    
    return isActive ? 
      <Chip label="Active" color="success" size="small" /> : 
      <Chip label="Inactive" color="error" size="small" />;
  };

  if (globalLoading && !isFiltered) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (globalError && !filteredCustomers.length) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading customers: {globalError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Customers
        </Typography>
      </Box>
      
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div" fontWeight="medium">
                  Filter Customers
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Search"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ID, Name or Email"
                    InputProps={{
                      startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} fontSize="small" />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Risk Level</InputLabel>
                    <Select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value)}
                      label="Risk Level"
                    >
                      <MenuItem value="">All Levels</MenuItem>
                      <MenuItem value="high">High Risk</MenuItem>
                      <MenuItem value="medium">Medium Risk</MenuItem>
                      <MenuItem value="low">Low Risk</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={activeStatus}
                      onChange={(e) => setActiveStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button 
                      variant="outlined" 
                      onClick={handleResetFilters}
                      sx={{ mr: 1 }}
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleApplyFilters}
                      startIcon={<FilterIcon />}
                    >
                      Apply
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Box mb={2}>
            <Typography variant="h6" component="div" fontWeight="medium">
              Customer List
            </Typography>
            {isLoading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
          
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Registration Date</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>{customer.id}</TableCell>
                        <TableCell>{customer.name || 'N/A'}</TableCell>
                        <TableCell>{customer.email || 'N/A'}</TableCell>
                        <TableCell>
                          {customer.registration_date ? 
                            new Date(customer.registration_date).toLocaleDateString() : 
                            'N/A'}
                        </TableCell>
                        <TableCell>{getRiskChip(customer.risk_score)}</TableCell>
                        <TableCell>{getStatusChip(customer.is_active)}</TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewDetails(customer.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Behavior">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleViewBehavior(customer.id)}
                            >
                              <ShowChartIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {isLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No customers found
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredCustomers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>
      
      {/* Customer Details Modal */}
      <Dialog
        open={showDetails}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Customer Details
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseDetails} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {customerDetails ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <PersonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">Basic Information</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Customer ID" 
                          secondary={customerDetails.id || 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Name" 
                          secondary={customerDetails.name || 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Email" 
                          secondary={customerDetails.email || 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Registration Date" 
                          secondary={customerDetails.registration_date ? 
                            new Date(customerDetails.registration_date).toLocaleDateString() : 
                            'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Status" 
                          secondary={
                            <Chip 
                              label={customerDetails.is_active ? "Active" : "Inactive"} 
                              color={customerDetails.is_active ? "success" : "error"} 
                              size="small"
                            />
                          } 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <WarningIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">Risk Information</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Risk Score" 
                          secondary={
                            <Box display="flex" alignItems="center">
                              <Box
                                sx={{
                                  width: '70%',
                                  bgcolor: 'grey.300',
                                  mr: 1,
                                  borderRadius: 5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${(customerDetails.risk_score || 0) * 100}%`,
                                    height: 10,
                                    bgcolor: 
                                      (customerDetails.risk_score || 0) > 0.7 ? 'error.main' : 
                                      (customerDetails.risk_score || 0) > 0.3 ? 'warning.main' : 'success.main',
                                    borderRadius: 5,
                                  }}
                                />
                              </Box>
                              <Typography variant="body2">
                                {customerDetails.risk_score ? 
                                  (customerDetails.risk_score * 100).toFixed(1) + '%' : 'N/A'}
                              </Typography>
                            </Box>
                          } 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Risk Level" 
                          secondary={getRiskChip(customerDetails.risk_score)} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Last Activity" 
                          secondary={customerDetails.last_activity ? 
                            new Date(customerDetails.last_activity).toLocaleString() : 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Total Transactions" 
                          secondary={customerDetails.transaction_count || 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Total Spend" 
                          secondary={customerDetails.total_spend ? 
                            `$${customerDetails.total_spend.toFixed(2)}` : 'N/A'} 
                          primaryTypographyProps={{ variant: 'subtitle2' }}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={() => {
                      handleViewBehavior(customerDetails.id);
                      handleCloseDetails();
                    }}
                    startIcon={<ShowChartIcon />}
                  >
                    View Behavior
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Behavior Modal */}
      <Dialog
        open={showBehavior}
        onClose={handleCloseBehavior}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Customer Behavior Analysis
              {behaviorData && behaviorData.customer_id && 
                ` - ${behaviorData.customer_id}`}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseBehavior} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {behaviorData ? (
            <Box>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab label="Behavior Summary" icon={<TimelineIcon />} iconPosition="start" />
                <Tab label="Recent Transactions" icon={<AssignmentIcon />} iconPosition="start" />
                <Tab label="Risk Indicators" icon={<WarningIcon />} iconPosition="start" />
              </Tabs>
              
              {tabValue === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Transaction Patterns
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <ShowChartIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Average Transaction Amount" 
                              secondary={behaviorData.avg_transaction_amount ? 
                                `$${behaviorData.avg_transaction_amount.toFixed(2)}` : 'N/A'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <ShowChartIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Maximum Transaction" 
                              secondary={behaviorData.max_transaction_amount ? 
                                `$${behaviorData.max_transaction_amount.toFixed(2)}` : 'N/A'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <TimelineIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Transaction Frequency" 
                              secondary={`${behaviorData.transaction_frequency || 'Unknown'} per month`} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <TimelineIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Days Since Last Transaction" 
                              secondary={behaviorData.days_since_last_transaction || 'N/A'} 
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Location & Merchant Behavior
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <PersonIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Common Locations" 
                              secondary={behaviorData.common_locations ? 
                                behaviorData.common_locations.join(', ') : 'N/A'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <PersonIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Preferred Merchants" 
                              secondary={behaviorData.preferred_merchants ? 
                                behaviorData.preferred_merchants.join(', ') : 'N/A'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <TimelineIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="New Merchants Past 30 Days" 
                              secondary={behaviorData.new_merchants_past_month || '0'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <TimelineIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Typical Transaction Time" 
                              secondary={behaviorData.typical_transaction_time || 'Varies'} 
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {tabValue === 1 && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Transaction ID</TableCell>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Merchant</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Risk</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customerTransactions.length > 0 ? (
                        customerTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.id}</TableCell>
                            <TableCell>
                              {transaction.timestamp ? 
                                new Date(transaction.timestamp).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                            <TableCell>{transaction.merchant_id || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={transaction.status || 'Completed'} 
                                color={
                                  transaction.status === 'failed' ? 'error' : 
                                  transaction.status === 'pending' ? 'warning' : 'success'
                                } 
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {transaction.is_anomaly ? (
                                <Chip icon={<WarningIcon />} label="Anomaly" color="error" size="small" />
                              ) : (
                                <Chip icon={<CheckCircleIcon />} label="Normal" color="success" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="textSecondary">
                              No transactions found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tabValue === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="error">
                          Risk Indicators
                        </Typography>
                        <List>
                          {behaviorData.risk_indicators && behaviorData.risk_indicators.length > 0 ? (
                            behaviorData.risk_indicators.map((indicator, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  {indicator.severity === 'high' ? (
                                    <ErrorIcon color="error" />
                                  ) : indicator.severity === 'medium' ? (
                                    <WarningIcon color="warning" />
                                  ) : (
                                    <CheckCircleIcon color="success" />
                                  )}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={indicator.description}
                                  secondary={indicator.details}
                                  primaryTypographyProps={{ 
                                    color: indicator.severity === 'high' ? 'error' : 
                                      indicator.severity === 'medium' ? 'warning.main' : 'textPrimary'
                                  }}
                                />
                              </ListItem>
                            ))
                          ) : (
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="success" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="No significant risk indicators detected" 
                                secondary="Customer behavior appears normal"
                              />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Behavior Anomalies
                        </Typography>
                        <List>
                          {behaviorData.behavior_anomalies && behaviorData.behavior_anomalies.length > 0 ? (
                            behaviorData.behavior_anomalies.map((anomaly, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <WarningIcon color="warning" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={anomaly.description}
                                  secondary={`Detected on: ${new Date(anomaly.timestamp).toLocaleDateString()}`}
                                />
                              </ListItem>
                            ))
                          ) : (
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="success" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="No behavior anomalies detected" 
                                secondary="Transaction pattern is consistent with historical data"
                              />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBehavior} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default Customers; 