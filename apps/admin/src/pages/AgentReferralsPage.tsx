import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Pagination,
} from '@mui/material';
import { Title } from 'react-admin';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const API_BASE = '/api/v1/admin/actions/agent';

function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }).then((r) => {
    if (!r.ok) return r.json().then((d: any) => { throw new Error(d.message || `HTTP ${r.status}`); });
    return r.json();
  });
}

interface ReferralUser {
  id: number;
  nickname: string;
  phone: string;
  role: string;
  balance: number;
  cardKeyCount: number;
  createdAt: string;
}

export default function AgentReferralsPage() {
  const [users, setUsers] = useState<ReferralUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoting, setPromoting] = useState<number | null>(null);
  const [confirmUser, setConfirmUser] = useState<ReferralUser | null>(null);
  const [snackbar, setSnackbar] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pageSize = 20;

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithAuth(`${API_BASE}/referrals?page=${page}&size=${pageSize}`);
      setUsers(data.data);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const handlePromote = async (userId: number) => {
    setPromoting(userId);
    try {
      const result = await fetchWithAuth(`${API_BASE}/promote/${userId}`, { method: 'POST' });
      setSnackbar({ type: 'success', text: `已将「${result.nickname}」升级为代理` });
      setConfirmUser(null);
      loadReferrals();
    } catch (err: any) {
      setSnackbar({ type: 'error', text: err.message || '升级失败' });
    } finally {
      setPromoting(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Title title="我的推广" />

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                我的推广用户
              </Typography>
              <Typography variant="body2" color="text.secondary">
                通过你的推广链接注册的用户，可升级为代理
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              共 {total} 人
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : error ? (
            <Alert severity="error" action={<Button size="small" onClick={loadReferrals}>重试</Button>}>
              {error}
            </Alert>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                还没有推广用户
              </Typography>
              <Typography variant="body2" color="text.secondary">
                快去分享你的推广链接，邀请用户注册吧！
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#faf5f0' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>昵称</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>手机号</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>角色</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>余额</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>制卡数</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>注册时间</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{u.id}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{u.nickname || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{u.phone || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={u.role === 'agent' ? '代理' : u.role === 'admin' ? '管理员' : '用户'}
                            size="small"
                            color={u.role === 'agent' ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          ¥{u.balance.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{u.cardKeyCount}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {new Date(u.createdAt).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {u.role !== 'agent' && u.role !== 'admin' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PersonAddIcon />}
                              disabled={promoting === u.id}
                              onClick={() => setConfirmUser(u)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              {promoting === u.id ? '升级中...' : '升级为代理'}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              {u.role === 'agent' ? '已是代理' : '-'}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    size="small"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={!!confirmUser} onClose={() => setConfirmUser(null)}>
        <DialogTitle>确认升级</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确认将用户「{confirmUser?.nickname || confirmUser?.phone || `ID:${confirmUser?.id}`}」
            升级为代理角色吗？升级后该用户可登录管理后台进行代理操作。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUser(null)}>取消</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => confirmUser && handlePromote(confirmUser.id)}
            disabled={promoting === confirmUser?.id}
          >
            {promoting === confirmUser?.id ? '升级中...' : '确认升级'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.type} onClose={() => setSnackbar(null)} variant="filled">
            {snackbar.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
