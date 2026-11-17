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
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { getAlerts, submitAssessment } from '../services/api';

interface Alert {
  id: string;
  source: string;
  content: string;
  url: string;
  riskScore: number;
  status: string;
  analystNote: string;
  protectee: { name: string; };
  createdAt: string;
  author?: string;
  location?: string;
  severity?: string;
  category?: string;
  context?: string;
  reviewPriority?: string;
  scoreBreakdown?: any[];
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

  const handleDecision = async (decision: string) => {
    if (!selectedAlert) return;
    try {
      await submitAssessment(selectedAlert.id, {
        decision,
        reason: analystNote,
        newSeverity: decision === 'DOWNGRADED' ? 'LOW' : undefined
      });
      setDialogOpen(false);
      fetchAlerts();
    } catch (error) {
      console.error('Error submitting assessment:', error);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MODERATE': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
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
              <TableCell>Severity</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>Status</TableCell>
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
                      label={alert.severity || 'UNKNOWN'}
                      color={getSeverityColor(alert.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={`${alert.riskScore || 0}/100`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.status}
                      color={getStatusColor(alert.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setAnalystNote('');
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
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip label={`Severity: ${selectedAlert.severity || 'UNKNOWN'}`} color={getSeverityColor(selectedAlert.severity)} />
                <Chip label={`Category: ${selectedAlert.category || 'none'}`} variant="outlined" />
                <Chip label={`Priority: ${selectedAlert.reviewPriority || 'STANDARD'}`} />
              </Box>

              <Typography variant="subtitle2" color="text.secondary">
                Source: {selectedAlert.source} | Author: {selectedAlert.author || 'Unknown'}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Protectee: {selectedAlert.protectee?.name || 'Unknown'}
              </Typography>
              
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography>{selectedAlert.content}</Typography>
              </Paper>

              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>AI Explainability</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Context: {selectedAlert.context || 'unresolved'}
              </Typography>
              
              {selectedAlert.scoreBreakdown && selectedAlert.scoreBreakdown.length > 0 && (
                <List dense>
                  {selectedAlert.scoreBreakdown.map((item, idx) => (
                    <ListItem key={idx}>
                      <ListItemText 
                        primary={`${item.factor}: ${item.value}`} 
                        secondary={item.reason} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 2 }} />

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
                  onClick={() => handleDecision('CONFIRMED')}
                >
                  Confirm Threat
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => handleDecision('DOWNGRADED')}
                >
                  Downgrade
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleDecision('DISMISSED')}
                >
                  Dismiss (False Positive)
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
