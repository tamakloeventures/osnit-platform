import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress, Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { api } from '../services/api';

const Research: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.get(`/research?q=${encodeURIComponent(query)}`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Error during research:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MODERATE': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>Research</Typography>

      <Paper sx={{ p: 3, mb: 4, bgcolor: '#1e293b', color: 'white' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for protectee name, keywords, or threats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.05)', 
              input: { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#3b82f6' },
              }
            }}
          />
          <Button variant="contained" color="primary" onClick={handleSearch} startIcon={<SearchIcon />}>
            SEARCH
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : searched && results.length === 0 ? (
        <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white' }}>
          <Typography>No results found for "{query}".</Typography>
        </Paper>
      ) : (
        results.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Found {results.length} results for "{query}"
            </Typography>
            {results.map((result, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: '#1e293b', color: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {result.title}
                  </Typography>
                  <Chip 
                    label={result.aiAnalysis.severity} 
                    color={getSeverityColor(result.aiAnalysis.severity)} 
                    size="small" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {result.content}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {result.source} • {new Date(result.pubDate).toLocaleDateString()}
                  </Typography>
                  <Button size="small" href={result.link} target="_blank" sx={{ color: '#3b82f6' }}>
                    Read Article
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )
      )}
    </Box>
  );
};

export default Research;
