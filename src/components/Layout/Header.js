import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  useTheme, 
  Avatar,
  InputBase,
  alpha
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  Search, 
  Notifications, 
  HelpOutline 
} from '@mui/icons-material';
import { useColorMode } from '../../context/ThemeContext';

const Header = () => {
  const theme = useTheme();
  const colorMode = useColorMode();
  
  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={1}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: theme.palette.primary.main,
            fontWeight: 'bold'
          }}
        >
          <Box 
            component="img" 
            sx={{ height: 40, width: 40, mr: 1 }}
            alt="Logo"
            src="/logo.png"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="%232196f3" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;
            }}
          />
          FinRisk
        </Typography>
        
        <Box sx={{ 
          position: 'relative',
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.common.black, 0.05),
          '&:hover': {
            backgroundColor: alpha(theme.palette.common.black, 0.1),
          },
          ml: 4,
          width: 'auto',
        }}>
          <Box sx={{ 
            padding: theme.spacing(0, 2),
            height: '100%',
            position: 'absolute',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Search />
          </Box>
          <InputBase
            placeholder="Search…"
            sx={{
              padding: theme.spacing(1, 1, 1, 0),
              paddingLeft: `calc(1em + ${theme.spacing(4)})`,
              transition: theme.transitions.create('width'),
              width: '20ch',
              '&:focus': {
                width: '30ch',
              },
            }}
          />
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="large" color="inherit">
            <HelpOutline />
          </IconButton>
          
          <IconButton size="large" color="inherit">
            <Notifications />
          </IconButton>
          
          <IconButton onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>A</Avatar>
            <Typography sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
              Admin User
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 