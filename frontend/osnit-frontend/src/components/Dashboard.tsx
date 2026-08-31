import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getDashboardData } from '../services/api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SecurityIcon from '@mui/icons-material/Security';

interface Stats {
  totalAlerts: number;
  pendingAlerts: number;
  confirmedAlerts: number;
  falsePositives: number;
  totalProtectees: number;
}

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 30000;

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [protectees, setProtectees] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_DURATION) {
      const data = cachedData;
      setStats(data.stats);
      setRecentAlerts(data.recentAlerts);
      setChartData(data.chartData);
      setPieData(data.pieData);
      setProtectees(data.protectees);
      setLoading(false);
      return;
    }

    try {
      const response = await getDashboardData();
      const data = response.data;
      cachedData = data;
      cacheTime = Date.now();
      setStats(data.stats);
      setRecentAlerts(data.recentAlerts);
      setChartData(data.chartData);
      setPieData(data.pieData);
      setProtectees(data.protectees);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'error';
      case 'PENDING': return 'warning';
      case 'FALSE_POSITIVE': return 'success';
      case 'INVESTIGATING': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    { 
      title: 'Total Alerts', 
      value: stats?.totalAlerts || 0, 
      color: '#1976d2',
      icon: <WarningIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      bgColor: 'rgba(25, 118, 210, 0.1)',
      path: '/alerts',
      description: 'View all alerts',
    },
    { 
      title: 'Pending Review', 
      value: stats?.pendingAlerts || 0, 
      color: '#ff9800',
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800' }} />,
      bgColor: 'rgba(255, 152, 0, 0.1)',
      path: '/alerts',
      description: 'Requires your attention',
    },
    { 
      title: 'Confirmed Threats', 
      value: stats?.confirmedAlerts || 0, 
      color: '#dc004e',
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#dc004e' }} />,
      bgColor: 'rgba(220, 0, 78, 0.1)',
      path: '/alerts',
      description: 'Verified threats',
    },
    { 
      title: 'Active Protectees', 
      value: stats?.totalProtectees || 0, 
      color: '#4caf50',
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#4caf50' }} />,
      bgColor: 'rgba(76, 175, 80, 0.1)',
      path: '/protectees',
      description: 'People protected',
    },
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time threat intelligence and monitoring summary
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => {
            cachedData = null;
            window.location.reload();
          }}
        >
          Refresh Data
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 200px)', minHeight: 600 }}>
        {statCards.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
              onClick={() => handleCardClick(stat.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {stat.description}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: stat.bgColor }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                    Click to view →
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Row 2: Chart (8 cols) + Pie Chart (4 cols) - BOTH EXPAND TO FULL HEIGHT */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ height: '45%' }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Alert Trend</Typography>
              <Chip label="Last 7 Days" size="small" />
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alerts" stroke="#1976d2" strokeWidth={3} dot={{ fill: '#1976d2', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart - FILLS THE ENTIRE HEIGHT (NO BLANK SPACE BELOW) */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ height: '45%' }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Alert Status</Typography>
            <Divider sx={{ mb: 1 }} />
            {pieData.length > 0 ? (
              <>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          const pct = percent || 0;
                          return `${name} ${(pct * 100).toFixed(0)}%`;
                        }}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mt: 0.5 }}>
                  {pieData.map((item) => (
                    <Chip key={item.name} label={`${item.name}: ${item.value}`} size="small" sx={{ bgcolor: item.color, color: '#fff' }} />
                  ))}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">No alerts yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Row 3: Recent Alerts (8 cols) + Protectees (4 cols) - BOTH EXPAND TO FULL HEIGHT */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ height: '40%' }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Alerts</Typography>
              <Button size="small" color="primary" onClick={() => navigate('/alerts')}>View All</Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert, index) => (
                  <Box key={index} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 12, color: alert.status === 'PENDING' ? '#ff9800' : alert.status === 'CONFIRMED' ? '#dc004e' : alert.status === 'FALSE_POSITIVE' ? '#4caf50' : '#1976d2' }} />
                        <Chip label={alert.source || 'Unknown'} size="small" variant="outlined" />
                      </Box>
                      <Chip label={alert.status || 'PENDING'} size="small" color={getStatusColor(alert.status)} />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.5, mb: 0.5, cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
                      {alert.content?.substring(0, 80)}{alert.content?.length > 80 && '...'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Just now'}
                    </Typography>
                    {index < recentAlerts.length - 1 && <Divider sx={{ mt: 1 }} />}
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No alerts yet</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Protectees - FILLS THE ENTIRE HEIGHT (NO BLANK SPACE BELOW) */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ height: '40%' }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Active Protectees</Typography>
              <Button size="small" color="primary" onClick={() => navigate('/protectees')}>View All</Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {protectees.length > 0 ? (
                <List dense sx={{ p: 0 }}>
                  {protectees.map((protectee) => (
                    <ListItem key={protectee.id} onClick={() => navigate('/protectees')} sx={{ borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, px: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <SecurityIcon color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={protectee.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            {protectee.keywords?.slice(0, 2).map((kw: string) => (
                              <Chip key={kw} label={kw} size="small" variant="outlined" />
                            ))}
                            {protectee.keywords?.length > 2 && (
                              <Chip label={`+${protectee.keywords.length - 2}`} size="small" />
                            )}
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <Chip label={protectee.status || 'ACTIVE'} size="small" color="success" />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No protectees yet</Typography>
                  <Button variant="outlined" size="small" onClick={() => navigate('/protectees')} sx={{ mt: 1 }}>Add Your First</Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
