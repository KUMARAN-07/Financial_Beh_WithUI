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
  Alert
} from '@mui/material';
import { 
  Sync as SyncIcon,
  FileUpload as FileUploadIcon,
  FilterList as FilterIcon
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
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="medium">
          Transactions
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<FileUploadIcon />}
            sx={{ mr: 2 }}
          >
            Import
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SyncIcon />}
            onClick={handleProcessTransactions}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Process New'}
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div" fontWeight="medium">
                  Filter Transactions
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      label="Category"
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
                  />
                </Grid>
              </Grid>
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button 
                  variant="outlined" 
                  sx={{ mr: 2 }}
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
                <Button 
                  variant="contained"
                  color="primary"
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Divider sx={{ mb: 3 }} />
      
      <Typography variant="h5" component="h2" fontWeight="medium" mb={2}>
        {isFiltered ? `Filtered Transactions (${filteredTransactions.length})` : `All Transactions (${transactions.length})`}
      </Typography>
      
      {loading || isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <TransactionsTable 
          transactions={isFiltered ? filteredTransactions : transactions}
        />
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Transactions; 