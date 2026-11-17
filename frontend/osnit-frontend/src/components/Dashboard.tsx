import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { getStats, getAlerts } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({ totalAlerts: 0, activeProtectees: 0, criticalAlerts: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        getStats(),
        getAlerts()
      ]);
      
      console.log('Stats Data from API:', statsRes.data); 

      setStats({
        totalAlerts: statsRes.data?.totalAlerts || 0,
        activeProtectees: statsRes.data?.activeProtectees || 0,
        criticalAlerts: statsRes.data?.criticalAlerts || 0,
        threatsToday: statsRes.data?.threatsToday || 0
      });

      setRecentAlerts(alertsRes.data.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  const StatCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
    <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white', flex: 1, minWidth: '200px' }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h3" sx={{ fontWeight: 'bold', color: color }}>{value}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>Dashboard Overview</Typography>
          <Typography variant="body2" color="text.secondary">Real-time threat intelligence and monitoring summary</Typography>
        </Box>
        <button onClick={fetchData} style={{ padding: '8px 16px', cursor: 'pointer', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '4px' }}>Refresh Data</button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <StatCard title="Total Alerts" value={stats.totalAlerts} color="#3b82f6" />
        <StatCard title="Pending Review" value={stats.threatsToday} color="#eab308" />
        <StatCard title="Confirmed Threats" value={stats.criticalAlerts} color="#ef4444" />
        <StatCard title="Active Protectees" value={stats.activeProtectees} color="#22c55e" />
      </Box>

      <Paper sx={{ p: 3, bgcolor: '#1e293b', color: 'white' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Alerts</Typography>
        {recentAlerts.length === 0 ? (
          <Typography color="text.secondary">No alerts yet</Typography>
        ) : (
          recentAlerts.map(alert => (
            <Box key={alert.id} sx={{ p: 2, borderBottom: '1px solid #334155', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{alert.source}</Typography>
              <Typography variant="body2" color="text.secondary">{alert.content}</Typography>
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
