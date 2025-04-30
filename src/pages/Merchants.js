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
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import apiService from '../api/apiService';

const Merchants = () => {
  const { merchants, loading: globalLoading, error: globalError, getMerchantRisk } = useData();
  const [filteredMerchants, setFilteredMerchants] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [merchantDetails, setMerchantDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // Extract unique categories from merchants
    if (merchants && merchants.length > 0) {
      const uniqueCategories = [...new Set(merchants.map(m => 
        m.category ? m.category.toUpperCase() : 'RETAIL'
      ))].sort();
      
      if (uniqueCategories.length === 0) {
        setCategories(['EDUCATION', 'HEALTHCARE', 'TRAVEL', 'GROCERY', 'RESTAURANT', 'RETAIL', 'ENTERTAINMENT']);
      } else {
        setCategories(uniqueCategories);
      }
    } else {
      setCategories(['EDUCATION', 'HEALTHCARE', 'TRAVEL', 'GROCERY', 'RESTAURANT', 'RETAIL', 'ENTERTAINMENT']);
    }
  }, [merchants]);

  useEffect(() => {
    // Fetch merchants if they're not already in context
    const fetchMerchants = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getMerchants();
        setFilteredMerchants(response.merchants || []);
      } catch (error) {
        console.error('Error fetching merchants:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load merchants: ' + error.message,
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (merchants && merchants.length > 0) {
      setFilteredMerchants(merchants);
    } else {
      fetchMerchants();
    }
  }, [merchants]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (merchantId) => {
    try {
      setIsLoading(true);
      const risk = await getMerchantRisk(merchantId);
      setMerchantDetails({
        ...risk,
        id: merchantId
      });
      setShowDetails(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: `Failed to load details for merchant ${merchantId}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleApplyFilters = () => {
    let filtered = [...(merchants || [])];
    
    if (searchQuery) {
      filtered = filtered.filter(merchant => 
        merchant.id.includes(searchQuery) || 
        (merchant.name && merchant.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (riskLevel) {
      filtered = filtered.filter(merchant => {
        if (riskLevel === 'high') return merchant.risk_score > 0.7;
        if (riskLevel === 'medium') return merchant.risk_score > 0.3 && merchant.risk_score <= 0.7;
        if (riskLevel === 'low') return merchant.risk_score <= 0.3;
        return true;
      });
    }
    
    if (category) {
      filtered = filtered.filter(merchant => 
        merchant.category && merchant.category.toUpperCase() === category
      );
    }
    
    setFilteredMerchants(filtered);
    setIsFiltered(true);
    
    setSnackbar({
      open: true,
      message: `Showing ${filtered.length} filtered merchants`,
      severity: 'info'
    });
  };
  
  const handleResetFilters = () => {
    setSearchQuery('');
    setRiskLevel('');
    setCategory('');
    setIsFiltered(false);
    setFilteredMerchants(merchants || []);
    
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

  const getRiskBar = (score) => {
    if (!score && score !== 0) return <Typography variant="body2">Unknown</Typography>;
    
    const value = score * 100;
    let color = 'success';
    
    if (score > 0.7) {
      color = 'error';
    } else if (score > 0.3) {
      color = 'warning';
    }
    
    return (
      <Box display="flex" alignItems="center">
        <Box width="100%" mr={1}>
          <LinearProgress variant="determinate" value={value} color={color} />
        </Box>
        <Box minWidth={35}>
          <Typography variant="body2" color="textSecondary">{Math.round(value)}%</Typography>
        </Box>
      </Box>
    );
  };

  if (globalLoading && !isFiltered) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (globalError && !filteredMerchants.length) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading merchants: {globalError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Merchants
        </Typography>
      </Box>
      
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div" fontWeight="medium">
                  Filter Merchants
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
                    placeholder="ID or Name"
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
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
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
              Merchant List
            </Typography>
            {isLoading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
          
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Merchant ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Risk Score</TableCell>
                  <TableCell>Transaction Volume</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMerchants.length > 0 ? (
                  filteredMerchants
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell>{merchant.id}</TableCell>
                        <TableCell>{merchant.name || 'N/A'}</TableCell>
                        <TableCell>{merchant.category || 'N/A'}</TableCell>
                        <TableCell>{merchant.country || 'N/A'}</TableCell>
                        <TableCell>
                          {getRiskChip(merchant.risk_score)}
                          <Box mt={1}>
                            {getRiskBar(merchant.risk_score)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {merchant.transaction_volume ? 
                            `$${Number(merchant.transaction_volume).toLocaleString()}` : 
                            'N/A'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewDetails(merchant.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {merchant.risk_score > 0.7 && (
                            <Tooltip title="High Risk Merchant">
                              <IconButton size="small" color="error">
                                <WarningIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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
                          No merchants found
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
            count={filteredMerchants.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>
      
      {/* Merchant Details Modal could be added here */}
      
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

export default Merchants; 