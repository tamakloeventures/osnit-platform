import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  CircularProgress,
} from '@mui/material';
import { getAlerts, updateAlert } from '../services/api';

interface Alert {
  id: string;
  source: string;
  content: string;
  url: string;
  riskScore: number;
  status: string;
  analystNote: string;
  protectee: {
    name: string;
  };
  createdAt: string;
  author?: string;
  location?: string;
  platform?: string;
  createdBy?: string;
  sourceUrl?: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [analystNote, setAnalystNote] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await getAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAlert(id, { status, analystNote });
      setDialogOpen(false);
      fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
      CONFIRMED: 'error',
      PENDING: 'warning',
      FALSE_POSITIVE: 'success',
      INVESTIGATING: 'info',
    };
    return colors[status] || 'default';
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'error';
    if (score >= 60) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Alert Management
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Protectee</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No alerts found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Chip label={alert.source} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {alert.content?.substring(0, 60)}
                    {alert.content?.length > 60 && '...'}
                  </TableCell>
                  <TableCell>{alert.protectee?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${alert.riskScore || 0}%`} 
                      color={getRiskColor(alert.riskScore || 0)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.status} 
                      color={getStatusColor(alert.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setAnalystNote(alert.analystNote || '');
                        setDialogOpen(true);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Alert</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Source: {selectedAlert.source}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Author: {selectedAlert.author || 'Unknown'}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Location: {selectedAlert.location || 'Unknown'}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Protectee: {selectedAlert.protectee?.name || 'Unknown'}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Risk Score: {selectedAlert.riskScore}%
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography>{selectedAlert.content}</Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Analyst Notes"
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                sx={{ mt: 2 }}
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={() => selectedAlert && handleStatusChange(selectedAlert.id, 'CONFIRMED')}
                >
                  Confirm Threat
                </Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={() => selectedAlert && handleStatusChange(selectedAlert.id, 'FALSE_POSITIVE')}
                >
                  False Positive
                </Button>
                <Button 
                  variant="contained" 
                  color="info" 
                  onClick={() => selectedAlert && handleStatusChange(selectedAlert.id, 'INVESTIGATING')}
                >
                  Investigate
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Alerts;
