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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api } from '../services/api';

interface SearchResult {
  id: string;
  source: string;
  title: string;
  content: string;
  date: string;
  relevance: number;
  verified: boolean;
  url: string | null;
  author: string | null;
  type: 'alert' | 'collected' | 'historical';
}

const Research: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      // Fetch real data from your backend
      const [alertsRes, collectedRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/collected'),
      ]);

      const allResults: SearchResult[] = [];

      // Process alerts
      alertsRes.data.forEach((alert: any) => {
        if (
          alert.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.protectee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          allResults.push({
            id: alert.id,
            source: alert.source || 'Unknown',
            title: `Alert from ${alert.source || 'Unknown'}`,
            content: alert.content || '',
            date: alert.createdAt || new Date().toISOString(),
            relevance: alert.riskScore || 50,
            verified: alert.status === 'CONFIRMED',
            url: alert.url || null,
            author: alert.source || null,
            type: 'alert',
          });
        }
      });

      // Process collected data
      collectedRes.data.forEach((item: any) => {
        if (
          item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.protectee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          allResults.push({
            id: item.id,
            source: item.source || 'Unknown',
            title: `Collected from ${item.source || 'Unknown'}`,
            content: item.content || '',
            date: item.postedDate || item.collectedAt || new Date().toISOString(),
            relevance: item.aiAnalysis?.threatScore || 50,
            verified: false,
            url: item.url || null,
            author: item.author || null,
            type: 'collected',
          });
        }
      });

      // Sort by relevance (highest first)
      allResults.sort((a, b) => b.relevance - a.relevance);

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedResult(null);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    return 'default';
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('twitter')) return '🐦';
    if (s.includes('facebook')) return '📘';
    if (s.includes('news')) return '📰';
    if (s.includes('forum')) return '💬';
    return '📌';
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
            label="Search for protectee name, keywords, or threats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, minWidth: 200 }}
            placeholder="e.g. John Mahama, threat, violence, protest"
          />
          <Button 
            variant="contained" 
            onClick={handleSearch} 
            startIcon={<SearchIcon />}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="📰 Real News Sources" color="primary" variant="outlined" />
          <Chip label="🐦 Social Media Mentions" variant="outlined" />
          <Chip label="📄 Public Records" variant="outlined" />
          <Chip label="📊 AI Analyzed" variant="outlined" />
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {results.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Found {results.length} real result{results.length > 1 ? 's' : ''}
          </Typography>
          <Grid container spacing={2}>
            {results.map((result) => (
              <Grid key={result.id} size={{ xs: 12 }}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                    borderLeft: result.relevance >= 70 ? '4px solid #dc004e' : 
                               result.relevance >= 40 ? '4px solid #ff9800' : 
                               '4px solid #4caf50',
                  }}
                  onClick={() => handleResultClick(result)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6">{result.title}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {getSourceIcon(result.source)} {result.source}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {new Date(result.date).toLocaleDateString()} • {new Date(result.date).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={`${result.relevance}% risk`}
                          color={getRelevanceColor(result.relevance)}
                          size="small"
                        />
                        {result.verified && (
                          <Chip label="✅ Verified" color="success" size="small" />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      {result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Click to view full details →
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {results.length === 0 && searchQuery && !loading && (
        <Alert severity="info">
          No results found for "{searchQuery}". Try different keywords or check if there are any alerts or collected data.
        </Alert>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedResult?.title}</Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedResult && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Chip label={`Source: ${selectedResult.source}`} variant="outlined" />
                <Chip 
                  label={`Risk Score: ${selectedResult.relevance}%`}
                  color={getRelevanceColor(selectedResult.relevance)}
                />
                {selectedResult.verified && (
                  <Chip label="✅ Verified" color="success" />
                )}
                <Chip 
                  label={new Date(selectedResult.date).toLocaleDateString()} 
                  variant="outlined" 
                />
                <Chip 
                  label={selectedResult.type} 
                  variant="outlined" 
                  color="primary"
                />
              </Box>

              {selectedResult.author && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Author/Source:</strong> {selectedResult.author}
                </Typography>
              )}

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Full Content:
              </Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResult.content || 'Full content not available.'}
                </Typography>
              </Paper>

              {selectedResult.url && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    component="a" 
                    href={selectedResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    variant="outlined"
                    endIcon={<OpenInNewIcon />}
                  >
                    View Original Source
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedResult?.url && (
            <Button 
              component="a" 
              href={selectedResult.url} 
              target="_blank" 
              rel="noopener noreferrer"
              variant="contained"
              color="primary"
            >
              Open Source
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Research;
