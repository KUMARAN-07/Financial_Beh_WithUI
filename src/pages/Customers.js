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
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  ShowChart as ShowChartIcon
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
      const behavior = await getCustomerBehavior(customerId);
      setCustomerDetails({
        ...behavior,
        id: customerId
      });
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
                            <IconButton size="small" color="secondary">
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
      
      {/* Customer Details Modal could be added here */}
      
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