import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StoresManagement from './components/StoresManagement';
import StoreEditor from './components/StoreEditor';
import BeaconsManagement from './components/BeaconsManagement';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import StoreSectors from './components/StoreSectors';
import StoreMapEditor from './components/StoreMapEditor';
import SimpleMapEditor from './components/SimpleMapEditor';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/store-sectors/:storeId" element={
              <ProtectedRoute>
                <StoreSectors />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/stores" element={
              <ProtectedRoute>
                <StoresManagement />
              </ProtectedRoute>
            } />
            <Route path="/store-editor/:storeId" element={
              <ProtectedRoute>
                <StoreEditor />
              </ProtectedRoute>
            } />
            <Route path="/beacons" element={
              <ProtectedRoute>
                <BeaconsManagement />
              </ProtectedRoute>
            } />
            <Route path="/store-map-editor/:storeId" element={
              <ProtectedRoute>
                <StoreMapEditor />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;