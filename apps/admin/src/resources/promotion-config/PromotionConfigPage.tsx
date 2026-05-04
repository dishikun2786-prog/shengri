import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Alert, Snackbar, Typography, Stack,
  TextField, Switch, Skeleton, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, FormControlLabel, Paper, Pagination,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { Title } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import SectionCard from '../../components/SectionCard';
import { fetchWithAuth } from '../../lib/fetchWithAuth';
import { DISTRIBUTOR_LEVELS } from '../../constants';

const API_ACTIONS = '/api/v1/admin/actions';
const API_CONFIG = '/api/v1/admin/config';

interface CommissionRatesConfig {
  defaultL1Rate: number;
  defaultL2Rate: number;
  levelBonuses: Record<string, { l1Bonus: number; l2Bonus: number }>;
}

interface LevelConfig {
  autoUpgrade: boolean;
  levels: Record<string, { name: string; minTeamSize: number; minEarnings: number }>;
}

interface WithdrawalRecord {
  id: number;
  userId: number;
  userNickname: string;
  distributorId: number;
  distributorLevel: number;
  distributorEarnings: number;
  amount: number;
  status: number;
  reviewNotes: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}

const WITHDRAWAL_STATUS: Record<number, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  0: { label: '待审核', color: 'warning' },
  1: { label: '已通过', color: 'success' },
  2: { label: '已拒绝', color: 'error' },
};

// ─── Tab 1: Commission Rates ──────────────────────────────────────────

const CommissionRatesTab = () => {
  const [config, setConfig] = useState<CommissionRatesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const load = useCallback(async () => {
    try {
      setConfig(await fetchWithAuth(`${API_CONFIG}/promotion/commission-rates`));
    } catch (err: any) {
      if (err.message !== 'unauthorized') setSnackbar({ open: true, message: '加载失败', severity: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      setConfig(await fetchWithAuth(`${API_CONFIG}/promotion/commission-rates`, { method: 'PUT', body: JSON.stringify(config) }));
      setSnackbar({ open: true, message: '佣金配置已保存', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ maxWidth: 800 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 2, borderRadius: 2 }} />)}</Box>;
  if (!config) return null;

  const updateBonus = (level: string, field: 'l1Bonus' | 'l2Bonus', value: number) => {
    setConfig({
      ...config,
      levelBonuses: {
        ...config.levelBonuses,
        [level]: { ...config.levelBonuses[level], [field]: value },
      },
    });
  };

  return (
    <Box sx={{ maxWidth: 800 }}>
      <SectionCard title="默认佣金率" icon={<TrendingUpIcon />}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" label="一级佣金率"
              type="number" value={config.defaultL1Rate}
              onChange={(e) => setConfig({ ...config, defaultL1Rate: parseFloat(e.target.value) || 0 })}
              helperText="好友直接消费的佣金比例（例：0.15 = 15%）"
              inputProps={{ min: 0, max: 1, step: 0.01 }}
            />
            <TextField
              fullWidth size="small" label="二级佣金率"
              type="number" value={config.defaultL2Rate}
              onChange={(e) => setConfig({ ...config, defaultL2Rate: parseFloat(e.target.value) || 0 })}
              helperText="好友的下级消费的佣金比例"
              inputProps={{ min: 0, max: 1, step: 0.01 }}
            />
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="等级加成" icon={<StarIcon />} sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          每个等级的佣金率 = 默认佣金率 + 等级加成。加成在默认佣金率基础上叠加。
        </Alert>
        {(['1', '2', '3'] as const).map((level) => {
          const lv = DISTRIBUTOR_LEVELS.find((l) => l.id === parseInt(level));
          return (
            <Paper key={level} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                {lv?.name || `等级 ${level}`} 推广员
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth size="small" label="一级佣金加成"
                  type="number" value={config.levelBonuses[level]?.l1Bonus ?? 0}
                  onChange={(e) => updateBonus(level, 'l1Bonus', parseFloat(e.target.value) || 0)}
                  helperText={`最终一级佣金率: ${((config.defaultL1Rate + (config.levelBonuses[level]?.l1Bonus ?? 0)) * 100).toFixed(1)}%`}
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                />
                <TextField
                  fullWidth size="small" label="二级佣金加成"
                  type="number" value={config.levelBonuses[level]?.l2Bonus ?? 0}
                  onChange={(e) => updateBonus(level, 'l2Bonus', parseFloat(e.target.value) || 0)}
                  helperText={`最终二级佣金率: ${((config.defaultL2Rate + (config.levelBonuses[level]?.l2Bonus ?? 0)) * 100).toFixed(1)}%`}
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                />
              </Stack>
            </Paper>
          );
        })}
      </SectionCard>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} size="large">
          保存佣金配置
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Tab 2: Level Config ──────────────────────────────────────────────

const LevelConfigTab = () => {
  const [config, setConfig] = useState<LevelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const load = useCallback(async () => {
    try {
      setConfig(await fetchWithAuth(`${API_CONFIG}/promotion/level-config`));
    } catch (err: any) {
      if (err.message !== 'unauthorized') setSnackbar({ open: true, message: '加载失败', severity: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      setConfig(await fetchWithAuth(`${API_CONFIG}/promotion/level-config`, { method: 'PUT', body: JSON.stringify(config) }));
      setSnackbar({ open: true, message: '等级配置已保存', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ maxWidth: 800 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: 2 }} />)}</Box>;
  if (!config) return null;

  const updateLevel = (level: string, field: string, value: any) => {
    setConfig({
      ...config,
      levels: { ...config.levels, [level]: { ...config.levels[level], [field]: value } },
    });
  };

  return (
    <Box sx={{ maxWidth: 800 }}>
      <SectionCard title="自动升级" icon={<StarIcon />}>
        <FormControlLabel
          control={<Switch checked={config.autoUpgrade} onChange={(e) => setConfig({ ...config, autoUpgrade: e.target.checked })} />}
          label="启用后，团队规模和收益达标时自动提升推广员等级"
        />
      </SectionCard>

      <SectionCard title="等级定义" icon={<StarIcon />} sx={{ mt: 2 }}>
        {(['1', '2', '3'] as const).map((level) => {
          const lvName = DISTRIBUTOR_LEVELS.find((l) => l.id === parseInt(level))?.name || level;
          return (
            <Paper key={level} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                等级 {level} — {lvName}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth size="small" label="等级名称"
                  value={config.levels[level]?.name || ''}
                  onChange={(e) => updateLevel(level, 'name', e.target.value)}
                />
                <TextField
                  fullWidth size="small" label="最低团队人数"
                  type="number" value={config.levels[level]?.minTeamSize ?? 0}
                  onChange={(e) => updateLevel(level, 'minTeamSize', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  fullWidth size="small" label="最低累计收益 (元)"
                  type="number" value={config.levels[level]?.minEarnings ?? 0}
                  onChange={(e) => updateLevel(level, 'minEarnings', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Stack>
            </Paper>
          );
        })}
      </SectionCard>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} size="large">
          保存等级配置
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Tab 3: Withdrawal Review ─────────────────────────────────────────

const WithdrawalReviewTab = () => {
  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [approveDialog, setApproveDialog] = useState<WithdrawalRecord | null>(null);
  const [denyDialog, setDenyDialog] = useState<WithdrawalRecord | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (statusFilter !== undefined) params.set('status', String(statusFilter));
      const data = await fetchWithAuth(`${API_ACTIONS}/withdrawal-requests?${params}`);
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (err.message !== 'unauthorized') setSnackbar({ open: true, message: '加载失败', severity: 'error' });
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setActionLoading(true);
    try {
      await fetchWithAuth(`${API_ACTIONS}/withdrawal-requests/${approveDialog.id}/approve`, { method: 'POST' });
      setSnackbar({ open: true, message: `已通过 ¥${approveDialog.amount.toFixed(2)} 提现申请`, severity: 'success' });
      setApproveDialog(null);
      load();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || '操作失败', severity: 'error' });
    } finally { setActionLoading(false); }
  };

  const handleDeny = async () => {
    if (!denyDialog || !denyReason.trim()) return;
    setActionLoading(true);
    try {
      await fetchWithAuth(`${API_ACTIONS}/withdrawal-requests/${denyDialog.id}/deny`, {
        method: 'POST',
        body: JSON.stringify({ reason: denyReason }),
      });
      setSnackbar({ open: true, message: '已拒绝提现申请', severity: 'success' });
      setDenyDialog(null);
      setDenyReason('');
      load();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || '操作失败', severity: 'error' });
    } finally { setActionLoading(false); }
  };

  const statusFilterButtons = (
    <Stack direction="row" spacing={1}>
      {[{ v: undefined, l: '全部' }, { v: 0, l: '待审核' }, { v: 1, l: '已通过' }, { v: 2, l: '已拒绝' }].map((opt) => (
        <Button
          key={String(opt.v)}
          size="small"
          variant={statusFilter === opt.v ? 'contained' : 'outlined'}
          onClick={() => { setStatusFilter(opt.v); setPage(1); }}
        >
          {opt.l}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>提现申请列表</Typography>
        {statusFilterButtons}
      </Box>

      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />)}
        </Stack>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell>等级</TableCell>
                  <TableCell>提现金额</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>申请时间</TableCell>
                  <TableCell>审核备注</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      暂无提现申请
                    </TableCell>
                  </TableRow>
                )}
                {records.map((r) => {
                  const st = WITHDRAWAL_STATUS[r.status] || WITHDRAWAL_STATUS[0];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>#{r.id}</TableCell>
                      <TableCell>{r.userNickname}</TableCell>
                      <TableCell>{DISTRIBUTOR_LEVELS.find((l) => l.id === r.distributorLevel)?.name || r.distributorLevel}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>¥{r.amount.toFixed(2)}</TableCell>
                      <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                      <TableCell>{new Date(r.requestedAt).toLocaleString('zh-CN')}</TableCell>
                      <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.reviewNotes || (r.reviewedAt ? '—' : '')}
                      </TableCell>
                      <TableCell align="right">
                        {r.status === 0 && (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" variant="contained" color="success" onClick={() => setApproveDialog(r)}>通过</Button>
                            <Button size="small" variant="contained" color="error" onClick={() => { setDenyDialog(r); setDenyReason(''); }}>拒绝</Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {total > 20 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(total / 20)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveDialog} onClose={() => setApproveDialog(null)}>
        <DialogTitle>确认通过提现</DialogTitle>
        <DialogContent>
          {approveDialog && (
            <Stack spacing={1}>
              <Typography>用户: {approveDialog.userNickname}</Typography>
              <Typography>金额: ¥{approveDialog.amount.toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary">
                通过后，佣金将转入用户余额，并记录余额流水
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(null)}>取消</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={actionLoading}>
            {actionLoading ? '处理中...' : '确认通过'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deny dialog */}
      <Dialog open={!!denyDialog} onClose={() => setDenyDialog(null)}>
        <DialogTitle>拒绝提现申请</DialogTitle>
        <DialogContent>
          {denyDialog && (
            <Stack spacing={1}>
              <Typography>用户: {denyDialog.userNickname}</Typography>
              <Typography>金额: ¥{denyDialog.amount.toFixed(2)}</Typography>
              <TextField
                label="拒绝原因（必填）"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                multiline rows={2}
                fullWidth
                sx={{ mt: 1 }}
                required
                helperText="拒绝后佣金将退回待结算余额"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyDialog(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeny} disabled={actionLoading || !denyReason.trim()}>
            {actionLoading ? '处理中...' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────

const PromotionConfigPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1000 }}>
      <Title title="推广管理" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="佣金设置" />
        <Tab label="等级配置" />
        <Tab label="提现审核" />
      </Tabs>

      {tab === 0 && <CommissionRatesTab />}
      {tab === 1 && <LevelConfigTab />}
      {tab === 2 && <WithdrawalReviewTab />}
    </Box>
  );
};

export default PromotionConfigPage;
