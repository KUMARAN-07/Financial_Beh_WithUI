import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Tooltip,
  Fab,
  Zoom,
  Card,
  CircularProgress,
  Divider,
  useTheme,
  Badge
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  AutoAwesome as AutoAwesomeIcon,
  AssessmentOutlined as AssessmentIcon,
  SecurityOutlined as SecurityIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material';
import apiService from '../api/apiService';

const RiskChatbot = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Welcome to FinRisk! 👋\n\nI\'m your AI assistant powered by Llama 3. Here to help with financial risk analysis and insights.\n\nTry asking me about:\n• "What\'s my overall risk score?"\n• "Explain risk factors in our system"\n• "Show recent high-risk transactions"\n• "How to reduce merchant fraud risk?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleToggleChat = () => {
    setOpen(!open);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Call the API service to get response from Llama 3 model
      const response = await apiService.getChatbotResponse(userMessage.content);
      
      // Add model response to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message || "I couldn't process that request. Please try again."
      }]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error processing your request. Please try again later."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to get icon by message content
  const getAssistantIcon = (content) => {
    if (content.toLowerCase().includes('risk') || content.toLowerCase().includes('score')) {
      return <AssessmentIcon fontSize="small" />;
    } else if (content.toLowerCase().includes('fraud') || content.toLowerCase().includes('anomaly')) {
      return <WarningIcon fontSize="small" />;
    } else if (content.toLowerCase().includes('security') || content.toLowerCase().includes('protect')) {
      return <SecurityIcon fontSize="small" />;
    }
    return <AutoAwesomeIcon fontSize="small" />;
  };

  return (
    <>
      {/* Floating button to open chat */}
      <Zoom in={!open}>
        <Box position="fixed" bottom={20} right={20} zIndex={1000}>
          <Badge color="error" variant="dot" invisible={messages.length <= 1}>
            <Tooltip title="Ask Financial Risk Assistant" placement="left">
              <Fab
                color="primary"
                aria-label="chat"
                sx={{
                  background: theme.palette.primary.main,
                  '&:hover': {
                    background: theme.palette.primary.dark,
                  },
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
                onClick={handleToggleChat}
              >
                <ChatIcon />
              </Fab>
            </Tooltip>
          </Badge>
        </Box>
      </Zoom>

      {/* Chat window */}
      <Card
        sx={{
          display: open ? 'flex' : 'none',
          flexDirection: 'column',
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: { xs: '90%', sm: 400 },
          height: 520,
          maxWidth: '95vw',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Chat header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
            color: 'white'
          }}
        >
          <Box display="flex" alignItems="center">
            <AutoAwesomeIcon sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight="500">Financial Risk Assistant</Typography>
          </Box>
          <IconButton color="inherit" onClick={handleToggleChat} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Messages area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#f8f9fa',
            backgroundImage: theme.palette.mode === 'dark' 
              ? 'linear-gradient(rgba(30, 30, 47, 0.8), rgba(30, 30, 47, 0.8)), url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h20v20H0z" fill="%23ffffff" fill-opacity="0.02"/%3E%3C/svg%3E")'
              : 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h20v20H0z" fill="%23000000" fill-opacity="0.02"/%3E%3C/svg%3E")'
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                mb: 2.5,
                maxWidth: '100%'
              }}
            >
              {message.role === 'user' ? (
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 34,
                    height: 34,
                    mr: message.role === 'user' ? 0 : 1.5,
                    ml: message.role === 'user' ? 1.5 : 0,
                    boxShadow: '0 3px 5px rgba(0,0,0,0.1)'
                  }}
                >
                  U
                </Avatar>
              ) : (
                <Avatar
                  sx={{
                    bgcolor: theme.palette.secondary.main,
                    width: 34,
                    height: 34,
                    mr: 1.5,
                    boxShadow: '0 3px 5px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {getAssistantIcon(message.content)}
                </Avatar>
              )}

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  maxWidth: '75%',
                  borderRadius: message.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  bgcolor: message.role === 'user' 
                    ? theme.palette.primary.main 
                    : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'white',
                  color: message.role === 'user' ? 'white' : theme.palette.text.primary,
                  boxShadow: message.role === 'user'
                    ? '0 3px 8px rgba(0,0,0,0.12)'
                    : '0 2px 6px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.08)',
                  position: 'relative',
                  '&::after': message.role === 'user' ? {
                    content: '""',
                    position: 'absolute',
                    right: '-5px',
                    top: 0,
                    width: 12,
                    height: 12,
                    bgcolor: theme.palette.primary.main,
                    borderRadius: '0 0 0 12px'
                  } : {
                    content: '""',
                    position: 'absolute',
                    left: '-5px',
                    top: 0,
                    width: 12,
                    height: 12,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'white',
                    borderRadius: '0 0 12px 0'
                  }
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.95rem',
                    lineHeight: 1.5
                  }}
                >
                  {message.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box
              sx={{
                display: 'flex',
                mb: 2
              }}
            >
              <Avatar
                sx={{
                  bgcolor: theme.palette.secondary.main,
                  width: 34,
                  height: 34,
                  mr: 1.5,
                  boxShadow: '0 3px 5px rgba(0,0,0,0.1)'
                }}
              >
                <AutoAwesomeIcon fontSize="small" />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '4px 16px 16px 16px',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircularProgress 
                  size={20} 
                  thickness={4} 
                  sx={{ 
                    color: theme.palette.secondary.main
                  }}
                />
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input area */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            bgcolor: theme.palette.background.paper
          }}
        >
          <TextField
            fullWidth
            placeholder="Ask about risk analysis..."
            variant="outlined"
            size="small"
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={3}
            sx={{ 
              mr: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                fontSize: '0.95rem',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                '&.Mui-focused': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
              '&.Mui-disabled': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Card>
    </>
  );
};

export default RiskChatbot; 