import React from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Divider, 
  useTheme,
  Box
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Sync as TransactionsIcon,
  WarningAmber as AnomaliesIcon,
  People as CustomersIcon,
  Store as MerchantsIcon,
  Assessment as RiskAnalysisIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/' 
  },
  { 
    text: 'Transactions', 
    icon: <TransactionsIcon />, 
    path: '/transactions' 
  },
  { 
    text: 'Anomalies', 
    icon: <AnomaliesIcon />, 
    path: '/anomalies' 
  },
  { 
    text: 'Customers', 
    icon: <CustomersIcon />, 
    path: '/customers' 
  },
  { 
    text: 'Merchants', 
    icon: <MerchantsIcon />, 
    path: '/merchants' 
  },
  { 
    text: 'Risk Analysis', 
    icon: <RiskAnalysisIcon />, 
    path: '/risk-analysis' 
  },
];

const bottomMenuItems = [
  { 
    text: 'Settings', 
    icon: <SettingsIcon />, 
    path: '/settings' 
  },
  { 
    text: 'Security', 
    icon: <SecurityIcon />, 
    path: '/security' 
  }
];

const Sidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigate = (path) => {
    navigate(path);
  };
  
  // Check if the current route matches the menu item
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: '10px',
                m: 1,
                backgroundColor: isActive(item.path) ? `${theme.palette.primary.main}15` : 'transparent',
                color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? `${theme.palette.primary.main}25` 
                    : `${theme.palette.action.hover}`
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.primary
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Divider />
        <List>
          {bottomMenuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: '10px',
                m: 1,
                backgroundColor: isActive(item.path) ? `${theme.palette.primary.main}15` : 'transparent',
                color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? `${theme.palette.primary.main}25` 
                    : `${theme.palette.action.hover}`
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.primary 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 