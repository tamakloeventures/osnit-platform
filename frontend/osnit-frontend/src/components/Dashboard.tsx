import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getStats, getAlerts } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        getStats(),
        getAlerts()
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  // Prepare chart data
  const pieData = [
    { name: 'Pending', value: alerts.filter(a => a.status === 'PENDING').length },
    { name: 'Investigating', value: alerts.filter(a => a.status === 'INVESTIGATING').length },
    { name: 'Confirmed', value: alerts.filter(a => a.status === 'CONFIRMED').length },
    { name: 'False Positive', value: alerts.filter(a => a.status === 'FALSE_POSITIVE').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e'];

  const StatCard = ({ title, value, icon }: { title: string, value: any, icon: string }) => (
    <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white', flex: 1, minWidth: '200px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{value}</Typography>
        </Box>
        <Typography variant="h3">{icon}</Typography>
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>Dashboard Overview</Typography>
          <Typography variant="body2" color="text.secondary">Real-time threat intelligence and monitoring summary</Typography>
        </Box>
        <button onClick={fetchData} style={{ padding: '8px 16px', cursor: 'pointer', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '4px' }}>REFRESH DATA</button>
      </Box>

      {/* Stat Cards Row - Using Flexbox instead of Grid */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <StatCard title="Total Alerts" value={stats.totalAlerts || 0} icon="⚠️" />
        <StatCard title="Pending Review" value={stats.threatsToday || 0} icon="📈" />
        <StatCard title="Confirmed Threats" value={stats.criticalAlerts || 0} icon="🚫" />
        <StatCard title="Active Protectees" value={stats.activeProtectees || 0} icon="👥" />
      </Box>

      {/* Charts Row - Using Flexbox */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white', flex: 2, minWidth: '400px', height: 400 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Alert Trend</Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[{ name: 'Alerts', data: alerts.length }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              <Line type="monotone" dataKey="data" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white', flex: 1, minWidth: '300px', height: 400 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Alert Status</Typography>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary">No alerts yet</Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
