import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardHeader, Typography,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableContainer, Chip, CircularProgress, List as MuiList,
  ListItem, ListItemText, Skeleton, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRedirect, useLogout, Title } from 'react-admin';
import Alert from '@mui/material/Alert';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StatCard from '../components/StatCard';

const API_BASE = '/api/v1/admin/dashboard';

function fetchJson(url: string) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (r.status === 401 || r.status === 403) throw new Error('unauthorized');
    return r.json();
  });
}

const ORDER_STATUS_COLORS: Record<number, any> = {
  0: 'default', 1: 'primary', 2: 'success', 3: 'warning', 4: 'error', 5: 'default',
};
const ORDER_STATUS_LABELS: Record<number, string> = {
  0: '待付款', 1: '已付款', 2: '已完成', 3: '退款中', 4: '已退款', 5: '已取消',
};

const DashboardSkeleton = () => (
  <Box sx={{ p: { xs: 1, sm: 2 } }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <Grid item xs={6} md={3} key={i}>
          <Skeleton variant="rounded" height={110} />
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={8}><Skeleton variant="rounded" height={280} /></Grid>
      <Grid item xs={12} md={4}><Skeleton variant="rounded" height={280} /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={7}><Skeleton variant="rounded" height={250} /></Grid>
      <Grid item xs={12} md={5}><Skeleton variant="rounded" height={250} /></Grid>
    </Grid>
  </Box>
);

const RevenueChart = ({ data }: { data: any[] }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const chartHeight = isSmall ? 140 : 200;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', height: chartHeight, gap: 0.5, px: 1 }}>
      {data.map((day) => {
        const height = Math.max((day.revenue / maxRev) * (chartHeight - 40), 4);
        return (
          <Box
            key={day.date}
            sx={{
              flex: 1,
              textAlign: 'center',
              '&:hover .bar': { opacity: 0.85 },
              '&:hover .label': { opacity: 1 },
            }}
          >
            <Typography
              className="label"
              variant="caption"
              sx={{ fontWeight: 600, fontSize: '0.65rem', opacity: isSmall ? 1 : 0.7, transition: 'opacity 0.2s' }}
            >
              ¥{day.revenue >= 1000 ? `${(day.revenue / 1000).toFixed(1)}k` : day.revenue.toFixed(0)}
            </Typography>
            <Box
              className="bar"
              sx={{
                height,
                background: 'linear-gradient(180deg, #c44520 0%, #d86a4a 100%)',
                borderRadius: '4px 4px 0 0',
                mx: 'auto',
                width: isSmall ? '70%' : '60%',
                mt: 0.5,
                transition: 'opacity 0.2s',
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              {day.date.slice(5)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const OrderStatusBars = ({ data }: { data: any[] }) => {
  const total = Math.max(data.reduce((s, d) => s + d.count, 0), 1);
  return (
    <Box>
      {data.map((s) => {
        const pct = ((s.count / total) * 100).toFixed(1);
        return (
          <Box key={s.status} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Chip label={s.label} color={ORDER_STATUS_COLORS[s.status]} size="small" />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {s.count} ({pct}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)' }}>
              <Box
                sx={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: s.status === 2 ? 'success.main' : s.status === 1 ? 'primary.main' : 'grey.400',
                  transition: 'width 0.6s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [stats, setStats] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const redirect = useRedirect();
  const logout = useLogout();

  useEffect(() => {
    Promise.all([
      fetchJson(`${API_BASE}/stats`),
      fetchJson(`${API_BASE}/revenue-chart`),
      fetchJson(`${API_BASE}/order-status`),
      fetchJson(`${API_BASE}/recent-orders`),
      fetchJson(`${API_BASE}/recent-users`),
    ]).then(([s, rc, os, ro, ru]) => {
      setStats(s);
      setRevenueChart(Array.isArray(rc) ? rc : []);
      setOrderStatus(Array.isArray(os) ? os : []);
      setRecentOrders(Array.isArray(ro) ? ro : []);
      setRecentUsers(Array.isArray(ru) ? ru : []);
      setLoading(false);
    }).catch((err) => {
      if (err?.message === 'unauthorized') { logout(); return; }
      setError('数据加载失败，请稍后刷新重试');
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 } }}>
      <Title title="数据大屏" />

      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} md={3}>
          <StatCard
            title="今日收入"
            value={`¥${(stats?.todayRevenue || 0).toFixed(2)}`}
            icon={<AttachMoneyIcon />}
            color="#c44520"
            subtitle={`本月: ¥${(stats?.monthRevenue || 0).toFixed(2)}`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="今日新用户"
            value={stats?.todayNewUsers || 0}
            icon={<PeopleIcon />}
            color="#2e7d32"
            subtitle={`总用户: ${stats?.totalUsers || 0}`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="今日订单"
            value={stats?.todayOrders || 0}
            icon={<ShoppingCartIcon />}
            color="#0288d1"
            subtitle={`总订单: ${stats?.totalOrders || 0}`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="当月转化率"
            value={`${stats?.conversionRate || 0}%`}
            icon={<TrendingUpIcon />}
            color="#dca310"
            subtitle={`总报告: ${stats?.totalReports || 0}`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="近7天收入趋势"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <RevenueChart data={revenueChart} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="订单状态分布"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <OrderStatusBars data={orderStatus} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 1, sm: 2 }}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader
              title="最新订单"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {isSmall ? (
                <MuiList dense disablePadding>
                  {recentOrders.map((o: any) => (
                    <ListItem
                      key={o.id}
                      divider
                      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                      onClick={() => redirect('show', 'orders', o.id)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: '50%' }}>
                              {o.orderNo}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#c44520' }}>
                              ¥{Number(o.paidAmount || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {o.product?.name || '-'}
                            </Typography>
                            <Chip
                              label={ORDER_STATUS_LABELS[o.status] || '未知'}
                              color={ORDER_STATUS_COLORS[o.status]}
                              size="small"
                              sx={{ height: 20 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {recentOrders.length === 0 && (
                    <ListItem><ListItemText secondary="暂无订单数据" sx={{ textAlign: 'center' }} /></ListItem>
                  )}
                </MuiList>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>订单号</TableCell>
                        <TableCell>用户</TableCell>
                        <TableCell>产品</TableCell>
                        <TableCell align="right">金额</TableCell>
                        <TableCell>状态</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((o: any) => (
                        <TableRow
                          key={o.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => redirect('show', 'orders', o.id)}
                        >
                          <TableCell sx={{ fontSize: '0.8rem' }}>{o.orderNo}</TableCell>
                          <TableCell>{o.user?.nickname || o.user?.phone || '-'}</TableCell>
                          <TableCell>{o.product?.name || '-'}</TableCell>
                          <TableCell align="right" sx={{ color: '#c44520', fontWeight: 600 }}>
                            ¥{Number(o.paidAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ORDER_STATUS_LABELS[o.status] || '未知'}
                              color={ORDER_STATUS_COLORS[o.status]}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">暂无订单数据</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader
              title="最新注册用户"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {isSmall ? (
                <MuiList dense disablePadding>
                  {recentUsers.map((u: any) => (
                    <ListItem
                      key={u.id}
                      divider
                      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                      onClick={() => redirect('edit', 'users', u.id)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{u.nickname || u.phone || '-'}</Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: Number(u.totalSpent) > 0 ? '#c44520' : 'inherit' }}
                            >
                              ¥{Number(u.totalSpent || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        }
                        secondary={new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      />
                    </ListItem>
                  ))}
                  {recentUsers.length === 0 && (
                    <ListItem><ListItemText secondary="暂无用户数据" sx={{ textAlign: 'center' }} /></ListItem>
                  )}
                </MuiList>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>昵称</TableCell>
                        <TableCell>手机号</TableCell>
                        <TableCell align="right">累计消费</TableCell>
                        <TableCell>注册时间</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentUsers.map((u: any) => (
                        <TableRow
                          key={u.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => redirect('edit', 'users', u.id)}
                        >
                          <TableCell>{u.nickname || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{u.phone || '-'}</TableCell>
                          <TableCell align="right" sx={{ color: Number(u.totalSpent) > 0 ? '#c44520' : 'inherit' }}>
                            ¥{Number(u.totalSpent || 0).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">暂无用户数据</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
