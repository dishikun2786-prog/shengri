import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Skeleton, Alert, Button,
} from '@mui/material';
import { Title } from 'react-admin';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TodayIcon from '@mui/icons-material/Today';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CampaignIcon from '@mui/icons-material/Campaign';
import StatCard from '../components/StatCard';

const API_BASE = '/api/v1/admin/actions';

interface AgentStats {
  balance: number;
  totalGenerated: number;
  totalFaceValue: number;
  redeemedCount: number;
  unusedCount: number;
  todayGenerated: number;
  subAgentCount: number;
  subAgentTotalBalance: number;
}

const AgentDashboardSkeleton = () => (
  <Box sx={{ p: { xs: 1, sm: 2 } }}>
    <Grid container spacing={2}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Grid item xs={6} sm={4} md={3} key={i}>
          <Skeleton variant="rounded" height={110} />
        </Grid>
      ))}
    </Grid>
  </Box>
);

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/agent/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) throw new Error('unauthorized');
        return r.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AgentDashboardSkeleton />;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>数据加载失败: {error}</Alert>;
  if (!stats) return null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Title title="代理中心 · 数据概览" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="当前余额"
            value={`¥${stats.balance.toFixed(2)}`}
            color="primary.main"
            icon={<AccountBalanceWalletIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="今日生成"
            value={String(stats.todayGenerated)}
            color="info.main"
            icon={<TodayIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="累计生成"
            value={String(stats.totalGenerated)}
            color="warning.main"
            icon={<VpnKeyIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="已兑换"
            value={String(stats.redeemedCount)}
            color="success.main"
            icon={<CheckCircleIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="子代理数"
            value={String(stats.subAgentCount || 0)}
            color="info.main"
            icon={<SupervisorAccountIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="子代理总余额"
            value={`¥${(stats.subAgentTotalBalance || 0).toFixed(2)}`}
            color="success.main"
            icon={<GroupAddIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                卡密总面值
              </Typography>
              <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                ¥{stats.totalFaceValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                未兑换卡密
              </Typography>
              <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                {stats.unusedCount} <Typography component="span" variant="body2" color="text.secondary">张</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                兑换率
              </Typography>
              <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                {stats.totalGenerated > 0
                  ? `${((stats.redeemedCount / stats.totalGenerated) * 100).toFixed(1)}%`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }} variant="outlined">
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              推广工具
            </Typography>
            <Typography variant="body2" color="text.secondary">
              生成专属推广海报，分享到微信获取更多推广用户
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CampaignIcon />}
            onClick={() => navigate('/agent-poster')}
            sx={{
              bgcolor: '#c44520',
              '&:hover': { bgcolor: '#a0371a' },
              textTransform: 'none',
            }}
          >
            生成推广海报
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AgentDashboard;
