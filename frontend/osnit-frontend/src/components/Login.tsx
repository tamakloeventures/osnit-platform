import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Login attempt:', email);
      
      if (email === 'partner@osnit.local' && password === 'SecurePass123!') {
        const userData = { 
          name: 'Partner Analyst', 
          email: 'partner@osnit.local', 
          role: 'ANALYST' 
        };
        console.log('Login success:', userData);
        onLogin(userData);
        navigate('/dashboard');
      } else if (email === 'admin@osnit.local' && password === 'admin123!') {
        const userData = { 
          name: 'Admin User', 
          email: 'admin@osnit.local', 
          role: 'ADMIN' 
        };
        console.log('Login success:', userData);
        onLogin(userData);
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            background: 'rgba(19, 47, 76, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 600 }}>
            🛡️ OSNIT
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
            Protective Intelligence Platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Demo Credentials:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              partner@osnit.local / SecurePass123!
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              admin@osnit.local / admin123!
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
