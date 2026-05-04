import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TablePagination,
} from '@mui/material';
import { Title } from 'react-admin';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

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

interface SubAgent {
  id: number;
  nickname: string;
  phone: string;
  balance: number;
  cardKeyCount: number;
  redeemedCount: number;
  totalFaceValue: number;
  createdAt: string;
}

interface BalanceTx {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  remark: string;
  createdAt: string;
}

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  agent_recharge: { label: '充值', color: '#22c55e' },
  agent_card_cost: { label: '制卡扣款', color: '#ef4444' },
  agent_card_void: { label: '制卡退款', color: '#f59e0b' },
};

export default function AgentSubAgentsPage() {
  const [agents, setAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Transaction detail dialog
  const [selectedAgent, setSelectedAgent] = useState<SubAgent | null>(null);
  const [transactions, setTransactions] = useState<BalanceTx[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const txPageSize = 15;

  const loadSubAgents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithAuth(`${API_BASE}/sub-agents`);
      setAgents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubAgents(); }, [loadSubAgents]);

  const openTransactions = useCallback(async (agent: SubAgent) => {
    setSelectedAgent(agent);
    setTxPage(0);
    setTxLoading(true);
    setTxError('');
    try {
      const data = await fetchWithAuth(
        `${API_BASE}/sub-agent/${agent.id}/transactions?page=1&size=${txPageSize}`,
      );
      setTransactions(data.data);
      setTxTotal(data.total);
    } catch (err: any) {
      setTxError(err.message || '加载失败');
    } finally {
      setTxLoading(false);
    }
  }, []);

  const handleTxPageChange = useCallback(async (newPage: number) => {
    if (!selectedAgent) return;
    setTxPage(newPage);
    setTxLoading(true);
    try {
      const data = await fetchWithAuth(
        `${API_BASE}/sub-agent/${selectedAgent.id}/transactions?page=${newPage + 1}&size=${txPageSize}`,
      );
      setTransactions(data.data);
      setTxTotal(data.total);
    } catch (err: any) {
      setTxError(err.message || '加载失败');
    } finally {
      setTxLoading(false);
    }
  }, [selectedAgent]);

  const closeTransactions = () => {
    setSelectedAgent(null);
    setTransactions([]);
    setTxTotal(0);
    setTxPage(0);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Title title="我的代理" />

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                我的代理
              </Typography>
              <Typography variant="body2" color="text.secondary">
                查看你发展的代理余额和制卡数据，点击行查看余额流水
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              共 {agents.length} 人
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : error ? (
            <Alert severity="error" action={<Button size="small" onClick={loadSubAgents}>重试</Button>}>
              {error}
            </Alert>
          ) : agents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                还没有发展代理
              </Typography>
              <Typography variant="body2" color="text.secondary">
                在「我的推广」中将用户升级为代理后，即可在此查看
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#faf5f0' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>昵称</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>手机号</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>余额</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>制卡数</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>已兑换</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>总面值</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>注册时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((a) => (
                    <TableRow
                      key={a.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openTransactions(a)}
                    >
                      <TableCell sx={{ fontSize: '0.85rem' }}>{a.id}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{a.nickname || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{a.phone || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        ¥{a.balance.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{a.cardKeyCount}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{a.redeemedCount}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        ¥{a.totalFaceValue.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {new Date(a.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {agents.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mt: 2 }}>
          {[
            { label: '代理总数', value: `${agents.length} 人` },
            { label: '总余额', value: `¥${agents.reduce((s, a) => s + a.balance, 0).toFixed(2)}` },
            { label: '总制卡数', value: `${agents.reduce((s, a) => s + a.cardKeyCount, 0)}` },
            { label: '总兑换', value: `${agents.reduce((s, a) => s + a.redeemedCount, 0)}` },
          ].map((card) => (
            <Card key={card.label} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {card.label}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Transaction dialog */}
      <Dialog
        open={!!selectedAgent}
        onClose={closeTransactions}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWalletIcon fontSize="small" />
          {selectedAgent?.nickname || selectedAgent?.phone || '-'} 的余额流水
          <Chip
            label={`余额：¥${(selectedAgent?.balance ?? 0).toFixed(2)}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </DialogTitle>
        <DialogContent>
          {txLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : txError ? (
            <Alert severity="error">{txError}</Alert>
          ) : transactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              暂无交易记录
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#faf5f0' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>类型</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>金额</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>余额</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>备注</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>时间</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => {
                      const typeInfo = TX_TYPE_LABELS[tx.type] || { label: tx.type, color: '#666' };
                      return (
                        <TableRow key={tx.id} hover>
                          <TableCell>
                            <Chip
                              label={typeInfo.label}
                              size="small"
                              sx={{ fontSize: '0.7rem', bgcolor: typeInfo.color, color: '#fff' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            {tx.type === 'agent_card_cost' ? '-' : '+'}¥{Math.abs(Number(tx.amount)).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            ¥{Number(tx.balanceAfter).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tx.remark || '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {new Date(tx.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={txTotal}
                page={txPage}
                onPageChange={(_, p) => handleTxPageChange(p)}
                rowsPerPage={txPageSize}
                rowsPerPageOptions={[txPageSize]}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTransactions}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
