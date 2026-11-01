import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Protectees from './components/Protectees';
import Research from './components/Research';
import Login from './components/Login';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#0a1929', paper: '#132f4c' },
  },
});

function App() {
  const [user, setUser] = useState<any>(null);

  // Restore session from localStorage on first load
  useEffect(() => {
    const token = localStorage.getItem('osnit_token');
    const savedUser = localStorage.getItem('osnit_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('osnit_token');
        localStorage.removeItem('osnit_user');
      }
    }
  }, []);

  const handleLogin = (userData: any, _token: string) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('osnit_token');
    localStorage.removeItem('osnit_user');
    setUser(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {user ? (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/protectees" element={<Protectees />} />
              <Route path="/research" element={<Research />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        )}
      </Router>
    </ThemeProvider>
  );
}

export default App;
