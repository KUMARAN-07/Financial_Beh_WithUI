import React, { useState, useEffect } from 'react';
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Collapse,
  Grid,
  Divider,
  useTheme,
  Card,
  CardContent,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Info as InfoIcon,
  Flag as FlagIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ShoppingBag as ShoppingBagIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  CreditCard as CreditCardIcon,
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Predefined colors for the most common categories
const predefinedColors = {
  EDUCATION: { color: '#1E88E5', bgColor: '#E3F2FD' },   // Blue
  HEALTHCARE: { color: '#43A047', bgColor: '#E8F5E9' },  // Green
  TRAVEL: { color: '#FFB300', bgColor: '#FFF8E1' },      // Amber
  GROCERY: { color: '#26A69A', bgColor: '#E0F2F1' },     // Teal
  RESTAURANT: { color: '#EC407A', bgColor: '#FCE4EC' },  // Pink
  RETAIL: { color: '#7B1FA2', bgColor: '#F3E5F5' },      // Purple
  ENTERTAINMENT: { color: '#F57C00', bgColor: '#FFF3E0' } // Orange
};

// Color palettes for generating new category colors
const colorPalettes = [
  { color: '#1E88E5', bgColor: '#E3F2FD' },  // Blue
  { color: '#43A047', bgColor: '#E8F5E9' },  // Green
  { color: '#FFB300', bgColor: '#FFF8E1' },  // Amber
  { color: '#26A69A', bgColor: '#E0F2F1' },  // Teal
  { color: '#EC407A', bgColor: '#FCE4EC' },  // Pink
  { color: '#7B1FA2', bgColor: '#F3E5F5' },  // Purple
  { color: '#F57C00', bgColor: '#FFF3E0' },  // Orange
  { color: '#607D8B', bgColor: '#ECEFF1' },  // Blue Grey
  { color: '#795548', bgColor: '#EFEBE9' },  // Brown
  { color: '#9C27B0', bgColor: '#F3E5F5' },  // Purple
  { color: '#3F51B5', bgColor: '#E8EAF6' },  // Indigo
  { color: '#009688', bgColor: '#E0F2F1' }   // Teal
];

const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString) => {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch (e) {
    return dateString;
  }
};

// Function to get time ago string
const getTimeAgo = (dateString) => {
  try {
    const date = new Date(dateString);
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
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  } catch (e) {
    return 'Unknown time';
  }
};

const TransactionsTable = ({ transactions }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryColorMap, setCategoryColorMap] = useState({...predefinedColors});
  const [expandedRow, setExpandedRow] = useState(null);
  const theme = useTheme();

  // Dynamically create colors for any new categories
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Extract all unique categories
      const uniqueCategories = [...new Set(transactions.map(tx => 
        tx.category ? tx.category.toUpperCase() : 'RETAIL'
      ))];

      // Create a new color map with existing predefined colors
      const newColorMap = {...predefinedColors};
      
      // Add colors for any new categories
      let colorIndex = 0;
      uniqueCategories.forEach(category => {
        if (!newColorMap[category]) {
          // Assign a color from the palette
          newColorMap[category] = colorPalettes[colorIndex % colorPalettes.length];
          colorIndex++;
        }
      });
      
      setCategoryColorMap(newColorMap);
    }
  }, [transactions]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    setExpandedRow(null); // Reset expanded row when changing pages
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setExpandedRow(null); // Reset expanded row when changing rows per page
  };

  // Handle row expansion toggle
  const toggleRowExpansion = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Calculate risk score color
  const getRiskScoreColor = (score) => {
    if (score >= 80) return '#E53935'; // High risk - red
    if (score >= 50) return '#FFB300'; // Medium risk - amber
    return '#43A047'; // Low risk - green
  };
  
  // Get risk score label
  const getRiskScoreLabel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  // Get merchant avatar by name
  const getMerchantAvatar = (merchantId, category) => {
    if (!merchantId) return <ShoppingBagIcon />;
    
    const colors = categoryColorMap[category || 'RETAIL'] || categoryColorMap['RETAIL'];
    const initial = merchantId[0]?.toUpperCase() || 'M';
    
    return (
      <Avatar
        sx={{
          bgcolor: colors.color,
          color: 'white',
          width: 38,
          height: 38,
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}
      >
        {initial}
      </Avatar>
    );
  };

  if (!transactions || transactions.length === 0) {
    return (
      <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
          <CreditCardIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No transactions found
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            There are no transactions that match your current criteria.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Paper sx={{ 
      width: '100%', 
      overflow: 'hidden', 
      borderRadius: 3,
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
    }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ 
              '& th': { 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                fontWeight: 600,
              } 
            }}>
              <TableCell sx={{ width: '30%' }}>Transaction Details</TableCell>
              <TableCell sx={{ width: '20%' }}>Time</TableCell>
              <TableCell sx={{ width: '20%' }}>Category</TableCell>
              <TableCell align="right" sx={{ width: '15%' }}>Amount</TableCell>
              <TableCell sx={{ width: '15%' }}>Risk</TableCell>
              <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((transaction) => {
                const category = transaction.category || 'RETAIL';
                const categoryStyle = categoryColorMap[category] || categoryColorMap['RETAIL'];
                const riskScore = transaction.risk_score || Math.floor(Math.random() * 100);
                const isExpanded = expandedRow === transaction.id;
                
                return (
                  <React.Fragment key={transaction.id}>
                    <TableRow 
                      hover 
                      onClick={() => toggleRowExpansion(transaction.id)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: isExpanded ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)') : 'inherit',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }
                      }}
                    >
                    <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getMerchantAvatar(transaction.merchant_id, category)}
                          <Box sx={{ ml: 1.5 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {transaction.description || 'Unknown Transaction'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {transaction.merchant_id || 'Unknown Merchant'}
                              </span>
                              {transaction.is_anomaly && (
                                <Chip 
                                  label="Flagged" 
                                  size="small" 
                                  color="error" 
                                  variant="outlined"
                                  sx={{ ml: 1, height: 18, fontSize: '0.625rem' }}
                                />
                              )}
                      </Typography>
                          </Box>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant="body2" color="text.primary" fontWeight="medium">
                        {formatDate(transaction.timestamp)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getTimeAgo(transaction.timestamp)}
                        </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                          label={category}
                        size="small"
                        sx={{
                          color: categoryStyle.color,
                          bgcolor: categoryStyle.bgColor,
                            fontWeight: 500,
                            borderRadius: '6px',
                            '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                          fontWeight="600"
                        color={parseFloat(transaction.amount) < 0 ? 'error.main' : 'success.main'}
                      >
                        {formatAmount(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                          <Tooltip title={`${riskScore} - ${getRiskScoreLabel(riskScore)} Risk`}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                sx={{
                                  width: 40,
                                  mr: 1,
                                  position: 'relative',
                                  height: 6,
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                  borderRadius: 3,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box 
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${riskScore}%`,
                                    bgcolor: getRiskScoreColor(riskScore),
                                    borderRadius: 3
                                  }}
                                />
                              </Box>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: getRiskScoreColor(riskScore),
                                  fontWeight: 'bold'
                                }}
                              >
                                {getRiskScoreLabel(riskScore)}
                        </Typography>
                            </Box>
                          </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(transaction.id);
                            }}
                            size="small"
                          >
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Details */}
                    <TableRow>
                      <TableCell 
                        style={{ paddingBottom: 0, paddingTop: 0 }} 
                        colSpan={6}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box 
                            sx={{ 
                              m: 2, 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'
                            }}
                          >
                            <Typography variant="subtitle2" gutterBottom component="div" color="primary">
                              Transaction Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Stack spacing={2}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Customer ID
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {transaction.customer_id || 'Unknown'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <CreditCardIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Account ID
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {transaction.account_id || 'Unknown'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ShoppingBagIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Merchant ID
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {transaction.merchant_id || 'Unknown'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Stack>
                              </Grid>
                              
                              <Grid item xs={12} md={6}>
                                <Stack spacing={2}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Transaction Time
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {formatDate(transaction.timestamp)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <LocationIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Location
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {transaction.location || 'Unknown Location'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
                                    <Tooltip title="View Full Details">
                                      <IconButton size="small" color="primary">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                                    <Tooltip title="Flag as Suspicious">
                        <IconButton size="small" color="error">
                          <FlagIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                                    <Tooltip title="More Actions">
                                      <IconButton size="small">
                                        <MoreVertIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Stack>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                    </TableCell>
                  </TableRow>
                  </React.Fragment>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={transactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem'
          }
        }}
      />
    </Paper>
  );
};

export default TransactionsTable;

 