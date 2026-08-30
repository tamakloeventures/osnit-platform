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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface SearchResult {
  id: number;
  source: string;
  title: string;
  content?: string;
  date: string;
  relevance: number;
  verified: boolean;
  url?: string;
  author?: string;
}

const Research: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    // Simulate API call - in production, this would call your backend
    setTimeout(() => {
      const mockResults: SearchResult[] = [
        {
          id: 1,
          source: 'News Article',
          title: `Results for: ${searchQuery}`,
          content: `This is the full content of the news article about ${searchQuery}. It contains detailed information about the subject, including recent activities, public appearances, and any notable events. The article was published by a reputable news source and has been verified for accuracy.`,
          date: new Date().toISOString(),
          relevance: 85,
          verified: true,
          url: 'https://example.com/news/1',
          author: 'John Smith',
        },
        {
          id: 2,
          source: 'Social Media',
          title: `Public mentions of ${searchQuery}`,
          content: `This is a social media post mentioning ${searchQuery}. The user expressed concerns about recent political developments and mentioned the subject by name. The post has been analyzed for threat indicators and shows moderate relevance to the protectee.`,
          date: new Date().toISOString(),
          relevance: 72,
          verified: false,
          url: 'https://example.com/post/2',
          author: '@citizen123',
        },
        {
          id: 3,
          source: 'Public Record',
          title: `Historical data related to ${searchQuery}`,
          content: `This is a public record containing information about ${searchQuery}. It includes official documents, past statements, and historical context that may be relevant for due diligence purposes. The record has been verified as authentic.`,
          date: new Date().toISOString(),
          relevance: 68,
          verified: true,
          url: 'https://example.com/record/3',
          author: 'Government Archives',
        },
      ];
      setResults(mockResults);
      setLoading(false);
    }, 1000);
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
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'default';
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
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
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
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
                onClick={() => handleResultClick(result)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{result.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.source}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {new Date(result.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={`${result.relevance}% relevant`}
                        color={getRelevanceColor(result.relevance)}
                        size="small"
                      />
                      {result.verified && (
                        <Chip label="✅ Verified" color="success" size="small" />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Click to view details →
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {results.length === 0 && searchQuery && !loading && (
        <Alert severity="info">
          No results found for "{searchQuery}". Try different keywords.
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
                  label={`Relevance: ${selectedResult.relevance}%`}
                  color={getRelevanceColor(selectedResult.relevance)}
                />
                {selectedResult.verified && (
                  <Chip label="✅ Verified" color="success" />
                )}
                <Chip 
                  label={new Date(selectedResult.date).toLocaleDateString()} 
                  variant="outlined" 
                />
              </Box>

              {selectedResult.author && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Author:</strong> {selectedResult.author}
                </Typography>
              )}

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Content:
              </Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <Typography variant="body2">
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
