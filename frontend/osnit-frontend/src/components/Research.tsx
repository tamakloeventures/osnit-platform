import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const Research: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setResults([
      {
        id: 1,
        source: 'News Article',
        title: `Results for: ${searchQuery}`,
        date: new Date().toISOString(),
        relevance: 85,
        verified: true,
      },
      {
        id: 2,
        source: 'Social Media',
        title: `Public mentions of ${searchQuery}`,
        date: new Date().toISOString(),
        relevance: 72,
        verified: false,
      },
    ]);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Research & Intelligence
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            label="Search public records, media, social media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Button 
            variant="contained" 
            onClick={handleSearch} 
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="📰 News Sources" color="primary" variant="outlined" />
          <Chip label="📱 Social Media" variant="outlined" />
          <Chip label="📄 Public Records" variant="outlined" />
        </Box>
      </Paper>

      {results.length > 0 && (
        <Grid container spacing={2}>
          {results.map((result) => (
            <Grid key={result.id} size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{result.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.source}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(result.date).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={`${result.relevance}% relevant`} 
                      color={result.relevance > 80 ? 'success' : 'warning'}
                      size="small"
                    />
                    {result.verified && (
                      <Chip label="✅ Verified" color="success" size="small" sx={{ ml: 1 }} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Research;
