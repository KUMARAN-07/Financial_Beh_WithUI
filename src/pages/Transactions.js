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
  Paper,
  IconButton,
  Chip,
  Tooltip,
  useTheme,
  LinearProgress,
  InputAdornment,
  Badge
} from '@mui/material';
import { 
  Sync as SyncIcon,
  FileUpload as FileUploadIcon,
  FilterList as FilterIcon,
  ClearAll as ClearAllIcon,
  Search as SearchIcon,
  CalendarMonth as CalendarIcon,
  Category as CategoryIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import TransactionsTable from '../components/Transactions/TransactionsTable';
import { useData } from '../context/DataContext';
import apiService from '../api/apiService';

const Transactions = () => {
  const { transactions, loading, error, processNewTransactions } = useData();
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAmount, setFilterAmount] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const theme = useTheme();
  
  // Stats derived from transactions
  const stats = {
    totalAmount: transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    totalCount: transactions.length,
    flaggedCount: transactions.filter(tx => tx.is_anomaly).length
  };
  
  // Extract unique categories from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const uniqueCategories = [...new Set(transactions.map(tx => 
        tx.category ? tx.category.toUpperCase() : 'RETAIL'
      ))].sort();
      
      // If no categories found, use default categories
      if (uniqueCategories.length === 0) {
        setCategories(['EDUCATION', 'HEALTHCARE', 'TRAVEL', 'GROCERY', 'RESTAURANT', 'RETAIL', 'ENTERTAINMENT']);
      } else {
        setCategories(uniqueCategories);
      }
    } else {
      // Default categories when no transactions available
      setCategories(['EDUCATION', 'HEALTHCARE', 'TRAVEL', 'GROCERY', 'RESTAURANT', 'RETAIL', 'ENTERTAINMENT']);
    }
  }, [transactions]);
  
  // Handle apply filters
  const handleApplyFilters = () => {
    let filtered = [...transactions];
    
    if (filterCategory) {
      filtered = filtered.filter(tx => tx.category === filterCategory);
    }
    
    if (filterAmount) {
      const amount = parseFloat(filterAmount);
      filtered = filtered.filter(tx => parseFloat(tx.amount) >= amount);
    }
    
    if (filterMerchant) {
      filtered = filtered.filter(tx => tx.merchant_id && tx.merchant_id.includes(filterMerchant));
    }
    
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from).getTime();
      filtered = filtered.filter(tx => new Date(tx.timestamp).getTime() >= fromDate);
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to).getTime();
      filtered = filtered.filter(tx => new Date(tx.timestamp).getTime() <= toDate);
    }
    
    setFilteredTransactions(filtered);
    setIsFiltered(true);
    
    setSnackbar({
      open: true,
      message: `Showing ${filtered.length} filtered transactions`,
      severity: 'info'
    });
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    setFilterCategory('');
    setFilterAmount('');
    setFilterMerchant('');
    setDateRange({ from: '', to: '' });
    setIsFiltered(false);
    
    setSnackbar({
      open: true,
      message: 'Filters have been reset',
      severity: 'success'
    });
  };
  
  // Handle process transactions
  const handleProcessTransactions = async () => {
    try {
      setIsLoading(true);
      // Create a realistic transaction
      const newTransaction = {
        id: `tx-${Date.now()}`,
        customer_id: "c123456789",
        account_id: "a123456789",
        merchant_id: "m123456789",
        amount: Math.random() * 1000,
        timestamp: new Date().toISOString(),
        category: categories[Math.floor(Math.random() * categories.length)],
        description: "Test transaction",
        location: "Online"
      };
      
      const results = await processNewTransactions([newTransaction]);
      setIsLoading(false);
      
      setSnackbar({
        open: true,
        message: 'Transaction processed successfully',
        severity: 'success'
      });
    } catch (error) {
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to process transaction: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterCategory) count++;
    if (filterAmount) count++;
    if (filterMerchant) count++;
    if (dateRange.from) count++;
    if (dateRange.to) count++;
    return count;
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: '16px',
          background: `linear-gradient(90deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
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
              Transaction Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              View, filter, and process financial transactions
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Import
            </Button>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={handleProcessTransactions}
              disabled={isLoading}
              sx={{
                bgcolor: 'white',
                color: theme.palette.secondary.main,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                'Process New'
              )}
            </Button>
          </Box>
        </Box>
        
        {/* Transaction Stats */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              p: 2, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <ReceiptIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Transactions
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stats.totalCount.toLocaleString()}
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
              <MoneyIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Volume
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(stats.totalAmount)}
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
              <TrendingUpIcon sx={{ fontSize: 36, mr: 2, opacity: 0.8 }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Flagged Transactions
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stats.flaggedCount.toLocaleString()} 
                  <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                    ({stats.totalCount > 0 ? ((stats.flaggedCount / stats.totalCount) * 100).toFixed(1) : 0}%)
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Filter Section */}
      <Paper elevation={0} sx={{ 
        borderRadius: 3, 
        mb: 4, 
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <Box sx={{ 
          px: 3, 
          py: 2, 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box display="flex" alignItems="center">
            <FilterIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight="medium">
              Filter Transactions
            </Typography>
            {getActiveFiltersCount() > 0 && (
              <Badge 
                badgeContent={getActiveFiltersCount()} 
                color="primary"
                sx={{ ml: 2 }}
              >
                <Chip 
                  label="Active Filters" 
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Badge>
            )}
          </Box>
          {getActiveFiltersCount() > 0 && (
            <Tooltip title="Clear all filters">
              <IconButton onClick={handleResetFilters} size="small">
                <ClearAllIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Divider />
        
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Category"
                  startAdornment={
                    <InputAdornment position="start">
                      <CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Min Amount"
                type="number"
                variant="outlined"
                size="small"
                fullWidth
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="From Date"
                type="date"
                variant="outlined"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="To Date"
                type="date"
                variant="outlined"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          
          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button 
              variant="outlined" 
              sx={{ mr: 2 }}
              onClick={handleResetFilters}
              startIcon={<ClearAllIcon />}
            >
              Reset
            </Button>
            <Button 
              variant="contained"
              color="primary"
              onClick={handleApplyFilters}
              startIcon={<FilterIcon />}
            >
              Apply Filters
            </Button>
          </Box>
        </CardContent>
      </Paper>
      
      {/* Transactions Section */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography 
            variant="h5" 
            component="h2" 
            fontWeight="medium"
            color={isFiltered ? 'primary.main' : 'text.primary'}
          >
            {isFiltered ? (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterIcon sx={{ mr: 1, fontSize: 20 }} />
                Filtered Transactions ({filteredTransactions.length})
              </Box>
            ) : (
              `All Transactions (${transactions.length})`
            )}
          </Typography>
          
          {isFiltered && (
            <Button 
              variant="text" 
              size="small" 
              onClick={handleResetFilters}
              startIcon={<ClearAllIcon fontSize="small" />}
            >
              Clear Filters
            </Button>
          )}
        </Box>
        
        {loading || isLoading ? (
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
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary" align="center">
              Loading transactions data...
            </Typography>
            <Box sx={{ width: '50%', mt: 3 }}>
              <LinearProgress />
            </Box>
          </Paper>
        ) : error ? (
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
        ) : (
          <TransactionsTable 
            transactions={isFiltered ? filteredTransactions : transactions}
          />
        )}
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Transactions; 