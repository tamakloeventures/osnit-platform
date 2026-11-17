import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Dialog, DialogTitle, DialogContent, TextField, CircularProgress, Divider, List, ListItem, ListItemText,
  MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { getAlerts, submitAssessment, createAlert, getProtectees } from '../services/api';

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
  scoreBreakdown?: any;
}

interface Protectee {
  id: string;
  name: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [protectees, setProtectees] = useState<Protectee[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [analystNote, setAnalystNote] = useState('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('Manual Entry');
  const [newAuthor, setNewAuthor] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newProtecteeId, setNewProtecteeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchProtectees();
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

  const fetchProtectees = async () => {
    try {
      const response = await getProtectees();
      setProtectees(response.data);
      if (response.data.length > 0) setNewProtecteeId(response.data[0].id);
    } catch (error) {
      console.error('Error fetching protectees:', error);
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

  const handleAddAlert = async () => {
    if (!newContent || !newProtecteeId) return;
    setIsSubmitting(true);
    try {
      await createAlert({
        source: newSource,
        content: newContent,
        author: newAuthor,
        location: newLocation,
        protecteeId: newProtecteeId,
        riskScore: 0, 
      });
      setAddDialogOpen(false);
      setNewContent('');
      fetchAlerts();
    } catch (error) {
      console.error('Error adding alert:', error);
    } finally {
      setIsSubmitting(false);
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
      CONFIRMED: 'error', PENDING: 'warning', FALSE_POSITIVE: 'success', INVESTIGATING: 'info',
    };
    return colors[status] || 'default';
  };

  const renderBreakdown = (breakdown: any) => {
    if (!breakdown) return null;
    let items = breakdown;
    if (typeof breakdown === 'string') {
      try { items = JSON.parse(breakdown); } catch(e) { return null; }
    }
    if (!Array.isArray(items)) return null;

    return (
      <List dense>
        {items.map((item: any, idx: number) => (
          <ListItem key={idx}>
            <ListItemText primary={`${item.factor}: ${item.value}`} secondary={item.reason} />
          </ListItem>
        ))}
      </List>
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Alert Management</Typography>
        <Button variant="contained" color="primary" onClick={() => setAddDialogOpen(true)}>
          Add Alert
        </Button>
      </Box>

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
              <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No alerts found.</Typography></TableCell></TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell><Chip label={alert.source} size="small" variant="outlined" /></TableCell>
                  <TableCell>{alert.content?.substring(0, 60)}{alert.content?.length > 60 && '...'}</TableCell>
                  <TableCell>{alert.protectee?.name || 'Unknown'}</TableCell>
                  <TableCell><Chip label={alert.severity || 'UNKNOWN'} color={getSeverityColor(alert.severity)} size="small" /></TableCell>
                  <TableCell><Chip label={`${alert.riskScore || 0}/100`} size="small" /></TableCell>
                  <TableCell><Chip label={alert.status} color={getStatusColor(alert.status)} size="small" /></TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => { setSelectedAlert(alert); setAnalystNote(''); setDialogOpen(true); }}>Review</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- REVIEW DIALOG --- */}
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
              <Typography variant="subtitle2" color="text.secondary">Source: {selectedAlert.source} | Author: {selectedAlert.author || 'Unknown'}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Protectee: {selectedAlert.protectee?.name || 'Unknown'}</Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}><Typography>{selectedAlert.content}</Typography></Paper>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>AI Explainability</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Context: {selectedAlert.context || 'unresolved'}</Typography>
              {renderBreakdown(selectedAlert.scoreBreakdown)}

              <Divider sx={{ my: 2 }} />
              <TextField fullWidth multiline rows={3} label="Analyst Notes" value={analystNote} onChange={(e) => setAnalystNote(e.target.value)} sx={{ mt: 2 }} />
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" color="error" onClick={() => handleDecision('CONFIRMED')}>Confirm Threat</Button>
                <Button variant="contained" color="warning" onClick={() => handleDecision('DOWNGRADED')}>Downgrade</Button>
                <Button variant="contained" color="success" onClick={() => handleDecision('DISMISSED')}>Dismiss (False Positive)</Button>
                <Button variant="outlined" onClick={() => setDialogOpen(false)}>Close</Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* --- ADD ALERT DIALOG --- */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Alert</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Protectee</InputLabel>
            <Select value={newProtecteeId} label="Protectee" onChange={(e) => setNewProtecteeId(e.target.value)}>
              {protectees.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth label="Source (e.g. Facebook, News)" value={newSource} onChange={(e) => setNewSource(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth multiline rows={4} label="Threat Content / Text" value={newContent} onChange={(e) => setNewContent(e.target.value)} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddAlert} disabled={isSubmitting || !newContent}>
              {isSubmitting ? 'Analyzing...' : 'Analyze & Save'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Alerts;
