import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from '@/components/Login';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import AdminPanel from '@/components/AdminPanel';
import VesselManagement from '@/components/VesselManagement';
import CrewManagement from '@/components/CrewManagement';
import PassengerManagement from '@/components/PassengerManagement';
import DocumentManagement from '@/components/DocumentManagement';
import TripManagement from '@/components/TripManagement';
import TripShiftsPage from '@/components/TripShiftsPage';
import RiskAssessment from '@/components/RiskAssessment';
import Maintenance from '@/components/Maintenance';
import Incidents from '@/components/Incidents';
import Emergency from '@/components/Emergency';
import Compliance from '@/components/Compliance';
import AIAssistant from '@/components/AIAssistant';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Placeholder components for Phase 2+
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="text-gray-500">This feature will be available in Phase 2</p>
      <p className="text-sm text-gray-400">Currently under development</p>
    </div>
  </div>
);

// Phase 2+ modules now active!

// Protected Route wrapper
const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        // Verify token is still valid
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }

    // Auto-login DISABLED - User requested manual login functionality
    // Note: Auto-login was causing race condition with manual login attempts
    // To re-enable: uncomment the block below
    /*
    try {
      console.log('🔐 Auto-login: Attempting automatic authentication...');
      const response = await axios.post(`${API}/auth/login`, {
        email: 'admin@test.com',
        password: 'Admin123!'
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        console.log('✅ Auto-login successful!');
      }
    } catch (error) {
      console.error('❌ Auto-login failed:', error);
    }
    */
    
    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute user={user}>
                <Layout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/vessels" element={<VesselManagement />} />
                    <Route path="/crew" element={<CrewManagement />} />
                    <Route path="/passengers" element={<PassengerManagement />} />
                    <Route path="/documents" element={<DocumentManagement />} />
                    <Route path="/trips" element={<TripManagement />} />
                    <Route path="/risk-assessment" element={<RiskAssessment />} />
                    <Route path="/maintenance" element={<Maintenance />} />
                    <Route path="/incidents" element={<Incidents />} />
                    <Route path="/emergency" element={<Emergency />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
