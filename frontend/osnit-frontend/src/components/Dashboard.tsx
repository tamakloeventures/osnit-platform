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
  Avatar,
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
import { getStats, getAlerts, getProtectees } from '../services/api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SecurityIcon from '@mui/icons-material/Security';
import EventNoteIcon from '@mui/icons-material/EventNote';

interface Stats {
  totalAlerts: number;
  pendingAlerts: number;
  confirmedAlerts: number;
  falsePositives: number;
  totalProtectees: number;
}

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
    try {
      const [statsRes, alertsRes, protecteesRes] = await Promise.all([
        getStats(),
        getAlerts(),
        getProtectees(),
      ]);
      setStats(statsRes.data);

      const alerts = alertsRes.data || [];
      setRecentAlerts(alerts.slice(0, 5));

      // Pie chart data for alert status
      const statusCounts = {
        PENDING: 0,
        CONFIRMED: 0,
        FALSE_POSITIVE: 0,
        INVESTIGATING: 0,
      };
      alerts.forEach((alert: any) => {
        if (statusCounts.hasOwnProperty(alert.status)) {
          statusCounts[alert.status]++;
        }
      });
      setPieData([
        { name: 'Pending', value: statusCounts.PENDING, color: '#ff9800' },
        { name: 'Confirmed', value: statusCounts.CONFIRMED, color: '#dc004e' },
        { name: 'False Positive', value: statusCounts.FALSE_POSITIVE, color: '#4caf50' },
        { name: 'Investigating', value: statusCounts.INVESTIGATING, color: '#1976d2' },
      ].filter(item => item.value > 0));

      setProtectees(protecteesRes.data || []);

      // Chart data for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
      }
      const chartData = last7Days.map((date) => {
        const count = alerts.filter((alert: any) =>
          alert.createdAt?.startsWith(date)
        ).length;
        return { date, alerts: count };
      });
      setChartData(chartData);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      change: '+12%',
      trend: 'up'
    },
    { 
      title: 'Pending Review', 
      value: stats?.pendingAlerts || 0, 
      color: '#ff9800',
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800' }} />,
      bgColor: 'rgba(255, 152, 0, 0.1)',
      path: '/alerts',
      description: 'Requires your attention',
      change: '+5%',
      trend: 'up'
    },
    { 
      title: 'Confirmed Threats', 
      value: stats?.confirmedAlerts || 0, 
      color: '#dc004e',
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#dc004e' }} />,
      bgColor: 'rgba(220, 0, 78, 0.1)',
      path: '/alerts',
      description: 'Verified threats',
      change: '0%',
      trend: 'neutral'
    },
    { 
      title: 'Active Protectees', 
      value: stats?.totalProtectees || 0, 
      color: '#4caf50',
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#4caf50' }} />,
      bgColor: 'rgba(76, 175, 80, 0.1)',
      path: '/protectees',
      description: 'People protected',
      change: '+2',
      trend: 'up'
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          onClick={() => window.location.reload()}
        >
          Refresh Data
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Stat Cards */}
        {statCards.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 8,
                },
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
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      bgcolor: stat.bgColor,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                    Click to view →
                  </Typography>
                  {stat.change && (
                    <Chip 
                      label={stat.change} 
                      size="small" 
                      color={stat.trend === 'up' ? 'success' : stat.trend === 'down' ? 'error' : 'default'}
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Chart - Takes up 8 columns on large screens */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Alert Trend
              </Typography>
              <Chip label="Last 7 Days" size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ fill: '#1976d2', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pie Chart - Takes up 4 columns on large screens (FILLS THE BLANK SPACE!) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Alert Status Distribution
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {pieData.map((item) => (
                    <Chip 
                      key={item.name}
                      label={`${item.name}: ${item.value}`}
                      size="small"
                      sx={{ bgcolor: item.color, color: '#fff' }}
                    />
                  ))}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No alerts yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Data will appear here when alerts are created
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Alerts - 8 columns */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Alerts
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/alerts')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {recentAlerts.length > 0 ? (
              <Box>
                {recentAlerts.map((alert, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FiberManualRecordIcon 
                          sx={{ 
                            fontSize: 12, 
                            color: alert.status === 'PENDING' ? '#ff9800' : 
                                   alert.status === 'CONFIRMED' ? '#dc004e' : 
                                   alert.status === 'FALSE_POSITIVE' ? '#4caf50' : '#1976d2'
                          }} 
                        />
                        <Chip 
                          label={alert.source || 'Unknown'} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      <Chip 
                        label={alert.status || 'PENDING'} 
                        size="small" 
                        color={getStatusColor(alert.status)}
                      />
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ mt: 1, mb: 0.5, cursor: 'pointer' }}
                      onClick={() => navigate('/alerts')}
                    >
                      {alert.content?.substring(0, 80)}
                      {alert.content?.length > 80 && '...'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Just now'}
                    </Typography>
                    {index < recentAlerts.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No alerts yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alerts will appear here when threats are detected
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Protectees Quick View - FILLS THE BLANK SPACE */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Active Protectees
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/protectees')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {protectees.length > 0 ? (
              <List dense>
                {protectees.map((protectee) => (
                  <ListItem 
                    key={protectee.id}
                    button
                    onClick={() => navigate('/protectees')}
                    sx={{ 
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={protectee.name}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {protectee.keywords?.slice(0, 3).map((kw: string) => (
                            <Chip key={kw} label={kw} size="small" variant="outlined" />
                          ))}
                          {protectee.keywords?.length > 3 && (
                            <Chip label={`+${protectee.keywords.length - 3}`} size="small" />
                          )}
                        </Box>
                      }
                    />
                    <Chip 
                      label={protectee.status || 'ACTIVE'} 
                      size="small" 
                      color="success"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No protectees yet
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => navigate('/protectees')}
                  sx={{ mt: 1 }}
                >
                  Add Your First Protectee
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
