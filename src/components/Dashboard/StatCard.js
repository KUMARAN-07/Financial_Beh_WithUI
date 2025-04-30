import React from 'react';
import { Paper, Box, Typography, useTheme, Avatar, LinearProgress, Chip } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';

const StatCard = ({ title, value, icon, change, changeType, color, detail, progress }) => {
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
  const ChangeIcon = changeType === 'positive' ? TrendingUpIcon : TrendingDownIcon;
  
  // Format numeric values with comma separators if they're large numbers
  const formattedValue = typeof value === 'number' && value > 999 
    ? value.toLocaleString() 
    : value;
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        borderRadius: '16px', 
        overflow: 'hidden', 
        height: '100%', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" color="text.secondary" fontWeight="normal" sx={{ mb: 3 }}>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {formattedValue}
            </Typography>
            {detail && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {detail}
              </Typography>
            )}
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: `${cardColor}.light`, 
              p: 1
            }}
          >
            {React.cloneElement(icon, { color: cardColor })}
          </Avatar>
        </Box>
        
        {change && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <ChangeIcon sx={{ color: getChangeColor(), mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: getChangeColor(), fontWeight: 'medium' }}>
              {Math.abs(change)}% {changeType === 'positive' ? 'increase' : 'decrease'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              from last period
            </Typography>
          </Box>
        )}
        
        {progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {progress.label}
              </Typography>
              <Typography variant="body2" fontWeight="medium" color={progress.color || cardColor}>
                {progress.value}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={parseFloat(progress.value)} 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }} 
              color={progress.color || cardColor} 
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StatCard; 