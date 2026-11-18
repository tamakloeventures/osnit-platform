import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getStats, getAlerts, getProtectees } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [protectees, setProtectees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, protecteesRes] = await Promise.all([
        getStats(),
        getAlerts(),
        getProtectees()
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setProtectees(protecteesRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  // Chart data
  const pieData = [
    { name: 'Pending', value: alerts.filter(a => a.status === 'PENDING').length },
    { name: 'Investigating', value: alerts.filter(a => a.status === 'INVESTIGATING').length },
    { name: 'Confirmed', value: alerts.filter(a => a.status === 'CONFIRMED').length },
    { name: 'False Positive', value: alerts.filter(a => a.status === 'FALSE_POSITIVE').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e'];
  const recentAlerts = alerts.slice(0, 3);

  const StatCard = ({ title, value, icon, sub, onClick }: any) => (
    <Paper sx={{ p: 2, flex: 1, minWidth: '200px', bgcolor: '#1e293b', color: 'white' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mt: 1, mb: 1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        </Box>
        <Typography variant="h3" sx={{ fontSize: '2rem' }}>{icon}</Typography>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button size="small" sx={{ color: '#3b82f6', textTransform: 'none' }} onClick={onClick}>Click to view</Button>
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
        <Button variant="outlined" onClick={fetchData} sx={{ color: '#3b82f6', borderColor: '#3b82f6' }}>REFRESH DATA</Button>
      </Box>

      {/* Stats Row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard title="Total Alerts" value={stats.totalAlerts || 0} icon="⚠️" sub="View all alerts" onClick={() => navigate('/alerts')} />
        <StatCard title="Pending Review" value={stats.threatsToday || 0} icon="📈" sub="Requires your attention" onClick={() => navigate('/alerts')} />
        <StatCard title="Confirmed Threats" value={stats.criticalAlerts || 0} icon="🚫" sub="Verified threats" onClick={() => navigate('/alerts')} />
        <StatCard title="Active Protectees" value={stats.activeProtectees || 0} icon="👥" sub="People protected" onClick={() => navigate('/protectees')} />
      </Box>

      {/* Charts Row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 2, minWidth: '400px', bgcolor: '#1e293b', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Alert Trend</Typography>
            <Chip label="Last 7 Days" size="small" sx={{ bgcolor: '#334155', color: 'white' }} />
          </Box>
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: 'Day 1', alerts: 0 }, { name: 'Day 2', alerts: 0 }, { name: 'Day 3', alerts: 0 }, { name: 'Day 4', alerts: 0 }, { name: 'Day 5', alerts: 0 }, { name: 'Day 6', alerts: 0 }, { name: 'Today', alerts: alerts.length }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="body2" color="#3b82f6" align="center" sx={{ mt: 1 }}>↔ alerts</Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: '300px', bgcolor: '#1e293b', color: 'white' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Alert Status</Typography>
          <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#8884d8" paddingAngle={5}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">No alerts yet</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Chip label={`Pending: ${alerts.filter(a => a.status === 'PENDING').length}`} size="small" sx={{ bgcolor: '#f59e0b', color: 'white' }} />
          </Box>
        </Paper>
      </Box>

      {/* Bottom Row: Recent Alerts & Active Protectees */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 2, minWidth: '400px', bgcolor: '#1e293b', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Recent Alerts</Typography>
            <Button size="small" sx={{ color: '#3b82f6' }} onClick={() => navigate('/alerts')}>VIEW ALL</Button>
          </Box>
          {recentAlerts.length === 0 ? (
            <Typography color="text.secondary">No alerts yet</Typography>
          ) : (
            recentAlerts.map(alert => (
              <Box key={alert.id} sx={{ p: 1, mb: 1, cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Chip label={alert.source} size="small" sx={{ bgcolor: '#334155', color: 'white', height: 20 }} />
                  </Box>
                  <Chip label={alert.status} size="small" sx={{ bgcolor: '#f59e0b', color: 'white', height: 20 }} />
                </Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>{alert.content.substring(0, 100)}...</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(alert.createdAt).toLocaleString()}</Typography>
              </Box>
            ))
          )}
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: '300px', bgcolor: '#1e293b', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Active Protectees</Typography>
            <Button size="small" sx={{ color: '#3b82f6' }} onClick={() => navigate('/protectees')}>VIEW ALL</Button>
          </Box>
          {protectees.length === 0 ? (
             <Typography color="text.secondary">No protectees yet</Typography>
          ) : (
            protectees.slice(0, 3).map(p => (
              <Box key={p.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => navigate('/protectees')}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{p.name}</Typography>
                  </Box>
                  <Chip label={p.status} size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {p.keywords?.slice(0, 2).map((kw: string, i: number) => (
                    <Chip key={i} label={kw} size="small" sx={{ bgcolor: '#334155', color: '#cbd5e1', height: 20, fontSize: '0.7rem' }} />
                  ))}
                  {p.keywords?.length > 2 && <Chip label={`+${p.keywords.length - 2}`} size="small" sx={{ bgcolor: '#334155', color: '#cbd5e1', height: 20, fontSize: '0.7rem' }} />}
                </Box>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
