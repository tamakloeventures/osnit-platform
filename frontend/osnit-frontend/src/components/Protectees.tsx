import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, TextField, CircularProgress, Chip, IconButton
} from '@mui/material';
import { Edit as EditIcon, Search as SearchIcon } from '@mui/icons-material';
import { getProtectees, createProtectee, updateProtectee, triggerManualScan } from '../services/api';

interface Protectee {
  id: string;
  name: string;
  title: string;
  status: string;
  keywords: string[];
  locations: string[];
}

const Protectees: React.FC = () => {
  const [protectees, setProtectees] = useState<Protectee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [locations, setLocations] = useState('');
  const [scanningId, setScanningId] = useState<string | null>(null);

  useEffect(() => {
    fetchProtectees();
  }, []);

  const fetchProtectees = async () => {
    try {
      const response = await getProtectees();
      setProtectees(response.data);
    } catch (error) {
      console.error('Error fetching protectees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (protectee?: Protectee) => {
    if (protectee) {
      setEditingId(protectee.id);
      setName(protectee.name);
      setTitle(protectee.title || '');
      setKeywords(protectee.keywords?.join(', ') || '');
      setLocations(protectee.locations?.join(', ') || '');
    } else {
      setEditingId(null);
      setName('');
      setTitle('');
      setKeywords('');
      setLocations('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name,
      title,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      locations: locations.split(',').map(l => l.trim()).filter(Boolean),
    };

    try {
      if (editingId) {
        await updateProtectee(editingId, payload);
      } else {
        await createProtectee(payload);
      }
      setDialogOpen(false);
      fetchProtectees();
    } catch (error) {
      console.error('Error saving protectee:', error);
    }
  };

  const handleScan = async (id: string) => {
    try {
      setScanningId(id);
      await triggerManualScan(id);
      alert('Scan started in the background. It may take a moment to find new alerts.');
    } catch (error) {
      console.error('Error starting scan:', error);
      alert('Failed to start scan.');
    } finally {
      setScanningId(null);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Protectees</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
          Add Protectee
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Keywords</TableCell>
              <TableCell>Locations</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {protectees.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>
                  {p.keywords?.slice(0, 3).map((kw, i) => <Chip key={i} label={kw} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                </TableCell>
                <TableCell>
                  {p.locations?.slice(0, 2).map((loc, i) => <Chip key={i} label={loc} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />)}
                </TableCell>
                <TableCell><Chip label={p.status} color={p.status === 'ACTIVE' ? 'success' : 'default'} size="small" /></TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(p)} title="Edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="secondary" 
                    onClick={() => handleScan(p.id)} 
                    disabled={scanningId === p.id}
                    title="Scan Public News now"
                  >
                    <SearchIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Protectee' : 'Add Protectee'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 2, mb: 2 }} />
          <TextField fullWidth label="Title / Role" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Keywords (comma separated)" value={keywords} onChange={(e) => setKeywords(e.target.value)} sx={{ mb: 2 }} helperText="e.g. General Secretary, NDC Chairman" />
          <TextField fullWidth label="Locations (comma separated)" value={locations} onChange={(e) => setLocations(e.target.value)} sx={{ mb: 2 }} helperText="e.g. Kumasi, Accra" />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Protectees;
