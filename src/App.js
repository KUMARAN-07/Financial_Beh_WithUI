import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Anomalies from './pages/Anomalies';

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
              <Route path="/customers" element={<PlaceholderPage title="Customers" />} />
              <Route path="/merchants" element={<PlaceholderPage title="Merchants" />} />
              <Route path="/risk-analysis" element={<PlaceholderPage title="Risk Analysis" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
              <Route path="/security" element={<PlaceholderPage title="Security" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </DataProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App; 