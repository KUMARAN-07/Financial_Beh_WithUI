import React from 'react';
import { Card, Box, Typography, useTheme } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

const StatCard = ({ title, value, icon, change, changeType, color }) => {
  const theme = useTheme();
  
  // Default color if not provided
  const cardColor = color || 'primary';
  
  // Determine change color based on type (positive or negative)
  const getChangeColor = () => {
    if (changeType === 'positive') {
      return theme.palette.success.main;
    } else if (changeType === 'negative') {
      return theme.palette.error.main;
    } else {
      return theme.palette.text.secondary;
    }
  };
  
  // Determine change icon based on type
  const ChangeIcon = changeType === 'positive' ? ArrowUpward : ArrowDownward;
  
  return (
    <Card 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        height: '100%',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6,
        }
      }}
    >
      <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
        <Box 
          sx={{ 
            bgcolor: `${cardColor}.light`,
            color: `${cardColor}.main`,
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Box>
      {change && (
        <Box display="flex" alignItems="center">
          <ChangeIcon sx={{ fontSize: 16, color: getChangeColor(), mr: 0.5 }} />
          <Typography 
            variant="body2" 
            sx={{ 
              color: getChangeColor(),
              fontWeight: 'medium'
            }}
          >
            {Math.abs(change)}%
          </Typography>
        </Box>
      )}
    </Card>
  );
};

export default StatCard; 