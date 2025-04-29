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
  Tooltip
} from '@mui/material';
import {
  Info as InfoIcon,
  Flag as FlagIcon
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

const TransactionsTable = ({ transactions }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryColorMap, setCategoryColorMap] = useState({...predefinedColors});

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
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate risk score color
  const getRiskScoreColor = (score) => {
    if (score >= 80) return '#E53935'; // High risk - red
    if (score >= 50) return '#FFB300'; // Medium risk - amber
    return '#43A047'; // Low risk - green
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Risk Score</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((transaction) => {
                const category = transaction.category || 'RETAIL';
                const categoryStyle = categoryColorMap[category] || categoryColorMap['RETAIL'];
                const riskScore = transaction.risk_score || Math.floor(Math.random() * 100);
                
                return (
                  <TableRow hover key={transaction.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {transaction.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(transaction.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {transaction.description || 'Unknown Transaction'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.merchant_id || transaction.location || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.category || 'RETAIL'}
                        size="small"
                        sx={{
                          color: categoryStyle.color,
                          bgcolor: categoryStyle.bgColor,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        color={parseFloat(transaction.amount) < 0 ? 'error.main' : 'success.main'}
                      >
                        {formatAmount(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box 
                          width={48} 
                          height={6} 
                          bgcolor={getRiskScoreColor(riskScore)}
                          borderRadius={3}
                          mr={1}
                        />
                        <Typography variant="body2">
                          {riskScore}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Flag Transaction">
                        <IconButton size="small" color="error">
                          <FlagIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
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
      />
    </Paper>
  );
};

export default TransactionsTable;

 