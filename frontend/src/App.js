import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import VesselManagement from '@/components/VesselManagement';
import DocumentManagement from '@/components/DocumentManagement';
import RiskAssessment from '@/components/RiskAssessment';
import CrewManagement from '@/components/CrewManagement';
import MaintenanceManagement from '@/components/MaintenanceManagement';
import IncidentReporting from '@/components/IncidentReporting';
import EmergencyProcedures from '@/components/EmergencyProcedures';
import ComplianceCheck from '@/components/ComplianceCheck';
import AIAssistant from '@/components/AIAssistant';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/vessels" element={user ? <VesselManagement /> : <Navigate to="/login" />} />
            <Route path="/documents" element={user ? <DocumentManagement /> : <Navigate to="/login" />} />
            <Route path="/risk-assessment" element={user ? <RiskAssessment /> : <Navigate to="/login" />} />
            <Route path="/crew" element={user ? <CrewManagement /> : <Navigate to="/login" />} />
            <Route path="/maintenance" element={user ? <MaintenanceManagement /> : <Navigate to="/login" />} />
            <Route path="/incidents" element={user ? <IncidentReporting /> : <Navigate to="/login" />} />
            <Route path="/emergency" element={user ? <EmergencyProcedures /> : <Navigate to="/login" />} />
            <Route path="/compliance" element={user ? <ComplianceCheck /> : <Navigate to="/login" />} />
            <Route path="/ai-assistant" element={user ? <AIAssistant /> : <Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AuthContext.Provider>
  );
}

import React from 'react';
export default App;