import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getProtectees, createProtectee } from '../services/api';

interface Protectee {
  id: string;
  name: string;
  title: string;
  status: string;
  keywords: string[];
  locations: string[];
  createdAt: string;
}

const Protectees: React.FC = () => {
  const [protectees, setProtectees] = useState<Protectee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    keywords: '',
    locations: '',
  });

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

  const handleSubmit = async () => {
    if (!formData.name) return;

    try {
      const keywords = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const locations = formData.locations.split(',').map(l => l.trim()).filter(Boolean);

      await createProtectee({
        name: formData.name,
        title: formData.title,
        keywords,
        locations,
      });

      setDialogOpen(false);
      setFormData({ name: '', title: '', keywords: '', locations: '' });
      fetchProtectees();
    } catch (error) {
      console.error('Error creating protectee:', error);
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Protectees
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Protectee
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Keywords</TableCell>
              <TableCell>Locations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {protectees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No protectees found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              protectees.map((protectee) => (
                <TableRow key={protectee.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {protectee.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{protectee.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={protectee.status} 
                      color={protectee.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {protectee.keywords?.map((kw) => (
                        <Chip key={kw} label={kw} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {protectee.locations?.map((loc) => (
                        <Chip key={loc} label={loc} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Protectee</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Keywords (comma separated)"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            margin="normal"
            helperText="e.g. JohnDoe, campaign2026"
          />
          <TextField
            fullWidth
            label="Locations (comma separated)"
            value={formData.locations}
            onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
            margin="normal"
            helperText="e.g. City Hall, State Capitol"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Protectees;
