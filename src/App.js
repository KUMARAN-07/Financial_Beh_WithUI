import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Anomalies from './pages/Anomalies';
import Customers from './pages/Customers';
import Merchants from './pages/Merchants';
import RiskAnalysis from './pages/RiskAnalysis';
import RiskChatbot from './components/RiskChatbot';

// These pages would be implemented in a full application
const PlaceholderPage = ({ title }) => (
  <div style={{ padding: 20 }}>
    <h2>{title}</h2>
    <p>This page is not implemented yet.</p>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <DataProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/anomalies" element={<Anomalies />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/merchants" element={<Merchants />} />
              <Route path="/risk-analysis" element={<RiskAnalysis />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
              <Route path="/security" element={<PlaceholderPage title="Security" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {/* Chatbot is available on all pages */}
            <RiskChatbot />
          </MainLayout>
        </DataProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App; 