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
} from 'recharts';
import { getStats, getAlerts } from '../services/api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        getStats(),
        getAlerts(),
      ]);
      setStats(statsRes.data);

      const alerts = alertsRes.data || [];
      setRecentAlerts(alerts.slice(0, 5));

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
      link: '/alerts'
    },
    { 
      title: 'Pending Review', 
      value: stats?.pendingAlerts || 0, 
      color: '#ff9800',
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800' }} />,
      bgColor: 'rgba(255, 152, 0, 0.1)',
      link: '/alerts'
    },
    { 
      title: 'Confirmed Threats', 
      value: stats?.confirmedAlerts || 0, 
      color: '#dc004e',
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#dc004e' }} />,
      bgColor: 'rgba(220, 0, 78, 0.1)',
      link: '/alerts'
    },
    { 
      title: 'Active Protectees', 
      value: stats?.totalProtectees || 0, 
      color: '#4caf50',
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#4caf50' }} />,
      bgColor: 'rgba(76, 175, 80, 0.1)',
      link: '/protectees'
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Real-time threat intelligence and monitoring summary
      </Typography>

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <a href={stat.link} style={{ textDecoration: 'none' }}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8,
                  },
                }}
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
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 2 }}>
                    Click to view →
                  </Typography>
                </CardContent>
              </Card>
            </a>
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Alerts
              </Typography>
              <a href="/alerts" style={{ textDecoration: 'none' }}>
                <Button size="small" color="primary">
                  View All
                </Button>
              </a>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {recentAlerts.length > 0 ? (
              <Box>
                {recentAlerts.map((alert, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        label={alert.source || 'Unknown'} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={alert.status || 'PENDING'} 
                        size="small" 
                        color={getStatusColor(alert.status)}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}>
                      {alert.content?.substring(0, 60)}
                      {alert.content?.length > 60 && '...'}
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
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
