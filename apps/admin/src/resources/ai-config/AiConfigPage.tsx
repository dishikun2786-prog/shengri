import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, Typography, TextField, Button,
  Chip, Alert, CircularProgress, Divider, Paper, Skeleton, Dialog,
  DialogTitle, DialogContent, DialogActions, useMediaQuery, IconButton,
  Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl,
  Tooltip, Snackbar, Stack, InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Title, useLogout } from 'react-admin';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PsychologyIcon from '@mui/icons-material/Psychology';
import UploadIcon from '@mui/icons-material/Upload';

const API_BASE = '/api/v1/admin/ai';

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
    if (r.status === 401 || r.status === 403) throw new Error('unauthorized');
    if (!r.ok) return r.json().then((d: any) => { throw new Error(d.message || `HTTP ${r.status}`); });
    return r.json();
  });
}

interface ProviderInfo {
  id?: number;
  provider: string;
  name: string;
  baseURL: string;
  defaultModel: string;
  availableModels?: string[];
  config?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  hasKey: boolean;
  keyPreview: string;
}

interface TestResult {
  success: boolean;
  response?: string;
  tokenUsed?: number;
  model: string;
  latencyMs: number;
  error?: string;
  reasoningContent?: string;
}

const PROVIDER_PRESETS: Record<string, { name: string; baseURL: string; defaultModel: string; config?: any }> = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    config: { thinking: { enabled: true, reasoningEffort: 'high' } },
  },
  openai: { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  minimax: { name: 'MiniMax', baseURL: 'https://api.minimaxi.com/v1/text/chatcompletion_v2', defaultModel: 'MiniMax-M2.5' },
  custom: { name: '', baseURL: '', defaultModel: '' },
};

const PROVIDER_COLORS: Record<string, string> = {
  minimax: '#c44520',
  openai: '#10a37f',
  deepseek: '#0066ff',
};

const getProviderColor = (provider: string) => PROVIDER_COLORS[provider] || '#6366f1';

const LoadingSkeleton = () => (
  <Box sx={{ p: { xs: 1, sm: 2 } }}>
    <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {[0, 1, 2].map((i) => (
        <Grid item xs={12} md={4} key={i}>
          <Skeleton variant="rounded" height={320} />
        </Grid>
      ))}
    </Grid>
  </Box>
);

const AiConfigPage = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const logout = useLogout();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [testPrompt, setTestPrompt] = useState('请用一句话介绍八字命理。');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [resultDialog, setResultDialog] = useState<string | null>(null);

  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Partial<ProviderInfo> & { apiKey?: string } | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<ProviderInfo | null>(null);
  const [fetchingModels, setFetchingModels] = useState<Record<number, boolean>>({});
  const [migrating, setMigrating] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/config`);
      setProviders(data.providers);
      setDefaultProvider(data.defaultProvider);
      setError(null);
    } catch (err: any) {
      if (err?.message === 'unauthorized') { logout(); return; }
      setError('AI 配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ─── Test ───
  const handleTest = async (p: ProviderInfo) => {
    const key = p.provider;
    setTesting((prev) => ({ ...prev, [key]: true }));
    try {
      const url = p.id ? `${API_BASE}/providers/${p.id}/test` : `${API_BASE}/test`;
      const body = p.id ? { prompt: testPrompt } : { provider: p.provider, prompt: testPrompt };
      const result = await fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) });
      setTestResults((prev) => ({ ...prev, [key]: result }));
      if (isSmall) setResultDialog(key);
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [key]: { success: false, model: '', latencyMs: 0, error: err.message } }));
      if (isSmall) setResultDialog(key);
    } finally {
      setTesting((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ─── Set default ───
  const handleSetDefault = async (p: ProviderInfo) => {
    if (!p.id) return;
    try {
      await fetchWithAuth(`${API_BASE}/providers/${p.id}/set-default`, { method: 'POST' });
      showSnack(`已将 ${p.name} 设为默认提供商`);
      await loadConfig();
    } catch (err: any) {
      showSnack(err.message, 'error');
    }
  };

  // ─── Create/Edit ───
  const openCreateDialog = () => {
    setEditTarget({ provider: 'deepseek', ...PROVIDER_PRESETS.deepseek, apiKey: '', isActive: true, priority: 0 });
    setEditIsNew(true);
    setShowApiKey(false);
    setEditDialog(true);
  };

  const openEditDialog = (p: ProviderInfo) => {
    setEditTarget({ ...p, apiKey: '' });
    setEditIsNew(false);
    setShowApiKey(false);
    setEditDialog(true);
  };

  const handlePresetChange = (preset: string) => {
    if (!editTarget) return;
    const presetData = PROVIDER_PRESETS[preset] || PROVIDER_PRESETS.custom;
    setEditTarget({
      ...editTarget,
      provider: preset === 'custom' ? editTarget.provider || '' : preset,
      name: presetData.name || editTarget.name || '',
      baseURL: presetData.baseURL || editTarget.baseURL || '',
      defaultModel: presetData.defaultModel || editTarget.defaultModel || '',
      config: presetData.config || editTarget.config || {},
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      if (editIsNew) {
        await fetchWithAuth(`${API_BASE}/providers`, {
          method: 'POST',
          body: JSON.stringify({
            provider: editTarget.provider,
            name: editTarget.name,
            apiKey: editTarget.apiKey || '',
            baseURL: editTarget.baseURL,
            defaultModel: editTarget.defaultModel,
            config: editTarget.config || {},
            priority: editTarget.priority || 0,
          }),
        });
        showSnack(`成功添加 ${editTarget.name}`);
      } else {
        const body: any = {
          name: editTarget.name,
          baseURL: editTarget.baseURL,
          defaultModel: editTarget.defaultModel,
          config: editTarget.config || {},
          isActive: editTarget.isActive,
          priority: editTarget.priority,
        };
        if (editTarget.apiKey) body.apiKey = editTarget.apiKey;
        await fetchWithAuth(`${API_BASE}/providers/${editTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        showSnack(`成功更新 ${editTarget.name}`);
      }
      setEditDialog(false);
      await loadConfig();
    } catch (err: any) {
      showSnack(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteDialog?.id) return;
    try {
      await fetchWithAuth(`${API_BASE}/providers/${deleteDialog.id}`, { method: 'DELETE' });
      showSnack(`已删除 ${deleteDialog.name}`);
      setDeleteDialog(null);
      await loadConfig();
    } catch (err: any) {
      showSnack(err.message, 'error');
    }
  };

  // ─── Fetch models ───
  const handleFetchModels = async (p: ProviderInfo) => {
    if (!p.id) return;
    setFetchingModels((prev) => ({ ...prev, [p.id!]: true }));
    try {
      const data = await fetchWithAuth(`${API_BASE}/providers/${p.id}/models`);
      showSnack(`已获取 ${data.models.length} 个可用模型`);
      await loadConfig();
    } catch (err: any) {
      showSnack(`获取模型失败: ${err.message}`, 'error');
    } finally {
      setFetchingModels((prev) => ({ ...prev, [p.id!]: false }));
    }
  };

  // ─── Migrate env ───
  const handleMigrateEnv = async () => {
    setMigrating(true);
    try {
      const data = await fetchWithAuth(`${API_BASE}/providers/migrate-env`, { method: 'POST' });
      showSnack(data.message);
      await loadConfig();
    } catch (err: any) {
      showSnack(err.message, 'error');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;

  const renderTestResult = (provider: string) => {
    const result = testResults[provider];
    if (!result) return null;
    return (
      <Paper sx={{ p: 1.5, bgcolor: result.success ? '#f0fdf4' : '#fef2f2' }} elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          {result.success ? <CheckCircleIcon color="success" fontSize="small" /> : <ErrorIcon color="error" fontSize="small" />}
          <Typography variant="caption" fontWeight={600}>{result.success ? '连接成功' : '连接失败'}</Typography>
        </Box>
        {result.success && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>模型: {result.model}</Typography>
            {result.reasoningContent && (
              <Paper sx={{ p: 1, mb: 0.5, bgcolor: 'rgba(0,102,255,0.05)', border: '1px solid rgba(0,102,255,0.15)' }} elevation={0}>
                <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <PsychologyIcon sx={{ fontSize: 14 }} /> 思考过程
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {result.reasoningContent.slice(0, 300)}{result.reasoningContent.length > 300 ? '...' : ''}
                </Typography>
              </Paper>
            )}
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>{result.response}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip icon={<SpeedIcon />} label={`${result.latencyMs}ms`} size="small" variant="outlined" />
              <Chip label={`${result.tokenUsed} tokens`} size="small" variant="outlined" />
            </Box>
          </>
        )}
        {result.error && <Typography variant="caption" color="error">{result.error}</Typography>}
      </Paper>
    );
  };

  const isDeepseekProvider = (p: ProviderInfo | Partial<ProviderInfo> | null) =>
    p?.provider === 'deepseek' || p?.baseURL?.includes('deepseek.com');

  const renderDeepseekConfig = () => {
    if (!editTarget || !isDeepseekProvider(editTarget)) return null;
    const cfg = editTarget.config || {};
    const thinking = cfg.thinking || { enabled: true, reasoningEffort: 'high' };

    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'rgba(0,102,255,0.03)', border: '1px solid rgba(0,102,255,0.12)' }} elevation={0}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: '#0066ff' }}>
          <PsychologyIcon fontSize="small" /> DeepSeek 专属配置
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={thinking.enabled}
              onChange={(e) => setEditTarget({
                ...editTarget,
                config: { ...cfg, thinking: { ...thinking, enabled: e.target.checked } },
              })}
              color="primary"
            />
          }
          label="思考模式 (Thinking Mode)"
        />
        {thinking.enabled && (
          <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
            <InputLabel>推理强度</InputLabel>
            <Select
              value={thinking.reasoningEffort || 'high'}
              label="推理强度"
              onChange={(e) => setEditTarget({
                ...editTarget,
                config: { ...cfg, thinking: { ...thinking, reasoningEffort: e.target.value } },
              })}
            >
              <MenuItem value="high">High (默认，适合大多数场景)</MenuItem>
              <MenuItem value="max">Max (最强推理，适合复杂 Agent 类场景)</MenuItem>
            </Select>
          </FormControl>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          启用思考模式后，模型会先输出思维链再给出最终答案。注意：思考模式下 temperature/top_p 参数不生效。
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Title title="AI 模型配置" />

      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 }}>
        <Alert severity="info" sx={{ flex: 1, minWidth: 200, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          当前默认提供商：
          <Chip
            label={providers.find((p) => p.provider === defaultProvider)?.name || defaultProvider}
            sx={{ ml: 1, bgcolor: getProviderColor(defaultProvider), color: '#fff', fontWeight: 700 }}
            size="small"
          />
        </Alert>
        <Stack direction="row" spacing={1}>
          {providers.length === 0 && (
            <Button variant="outlined" startIcon={migrating ? <CircularProgress size={16} /> : <UploadIcon />} onClick={handleMigrateEnv} disabled={migrating} size="small">
              从环境变量导入
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} size="small">
            添加提供商
          </Button>
        </Stack>
      </Box>

      {/* Provider cards */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {providers.map((p) => (
          <Grid item xs={12} md={4} key={p.provider}>
            <Card sx={{
              border: p.isDefault ? `2px solid ${getProviderColor(p.provider)}` : '1px solid',
              borderColor: p.isDefault ? getProviderColor(p.provider) : 'divider',
              position: 'relative', height: '100%',
              opacity: p.isActive ? 1 : 0.6,
            }}>
              {p.isDefault && (
                <Chip label="默认" size="small" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: getProviderColor(p.provider), color: '#fff' }} />
              )}
              <CardHeader
                avatar={<SmartToyIcon sx={{ color: getProviderColor(p.provider), fontSize: isSmall ? 24 : 32 }} />}
                title={p.name}
                subheader={p.defaultModel}
                titleTypographyProps={{ fontWeight: 700, fontSize: isSmall ? '1rem' : '1.1rem' }}
                action={
                  <Box>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => openEditDialog(p)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={p.isDefault ? '当前默认' : '设为默认'}>
                      <IconButton size="small" onClick={() => handleSetDefault(p)} disabled={p.isDefault}>
                        {p.isDefault ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => setDeleteDialog(p)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                }
              />
              <CardContent>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Base URL</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>{p.baseURL}</Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">API Key</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={p.hasKey ? '已配置' : '未配置'}
                      color={p.hasKey ? 'success' : 'error'}
                      size="small"
                      icon={p.hasKey ? <CheckCircleIcon /> : <ErrorIcon />}
                    />
                    {p.keyPreview && <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.keyPreview}</Typography>}
                  </Box>
                </Box>

                {/* DeepSeek thinking indicator */}
                {isDeepseekProvider(p) && p.config?.thinking?.enabled && (
                  <Chip
                    icon={<PsychologyIcon />}
                    label={`思考模式: ${p.config.thinking.reasoningEffort || 'high'}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 1.5 }}
                  />
                )}

                {/* Available models */}
                {p.availableModels && p.availableModels.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">可用模型 ({p.availableModels.length})</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {p.availableModels.slice(0, 5).map((m: string) => (
                        <Chip key={m} label={m} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ))}
                      {p.availableModels.length > 5 && (
                        <Chip label={`+${p.availableModels.length - 5}`} size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained" fullWidth
                    onClick={() => handleTest(p)}
                    disabled={!p.hasKey || testing[p.provider]}
                    sx={{ bgcolor: getProviderColor(p.provider), '&:hover': { bgcolor: getProviderColor(p.provider), opacity: 0.9 } }}
                  >
                    {testing[p.provider] ? <CircularProgress size={20} color="inherit" /> : '测试连接'}
                  </Button>
                  {p.id && (
                    <Tooltip title="拉取模型列表">
                      <Button
                        variant="outlined" sx={{ minWidth: 40 }}
                        onClick={() => handleFetchModels(p)}
                        disabled={!p.hasKey || fetchingModels[p.id]}
                      >
                        {fetchingModels[p.id!] ? <CircularProgress size={18} /> : <CloudDownloadIcon />}
                      </Button>
                    </Tooltip>
                  )}
                </Stack>

                {!isSmall && testResults[p.provider] && (
                  <Box sx={{ mt: 2 }}>{renderTestResult(p.provider)}</Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Test prompt card */}
      <Card sx={{ mt: { xs: 2, sm: 3 } }}>
        <CardHeader title="测试提示词" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent>
          <TextField
            fullWidth multiline rows={isSmall ? 2 : 3}
            value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)}
            label="测试 Prompt"
            helperText="修改后点击上方「测试连接」按钮重新测试"
            size="small"
          />
        </CardContent>
      </Card>

      {/* ─── Edit/Create Dialog ─── */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editIsNew ? '添加 AI 提供商' : `编辑 ${editTarget?.name}`}</DialogTitle>
        <DialogContent>
          {editIsNew && (
            <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
              <InputLabel>选择预设</InputLabel>
              <Select
                value={Object.keys(PROVIDER_PRESETS).includes(editTarget?.provider || '') ? editTarget?.provider : 'custom'}
                label="选择预设"
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <MenuItem value="deepseek">DeepSeek (推荐)</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="minimax">MiniMax</MenuItem>
                <MenuItem value="custom">自定义 (OpenAI 兼容)</MenuItem>
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth size="small" sx={{ mb: 2 }}
            label="提供商标识" value={editTarget?.provider || ''}
            onChange={(e) => setEditTarget({ ...editTarget, provider: e.target.value })}
            disabled={!editIsNew}
            helperText="唯一标识，如 deepseek / openai / minimax"
          />
          <TextField
            fullWidth size="small" sx={{ mb: 2 }}
            label="显示名称" value={editTarget?.name || ''}
            onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
          />
          <TextField
            fullWidth size="small" sx={{ mb: 2 }}
            label="API Key"
            type={showApiKey ? 'text' : 'password'}
            value={editTarget?.apiKey || ''}
            onChange={(e) => setEditTarget({ ...editTarget, apiKey: e.target.value })}
            placeholder={editIsNew ? '输入 API Key' : '留空则不修改'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth size="small" sx={{ mb: 2 }}
            label="Base URL" value={editTarget?.baseURL || ''}
            onChange={(e) => setEditTarget({ ...editTarget, baseURL: e.target.value })}
            helperText="API 服务地址"
          />

          {/* Model selection */}
          {editTarget?.availableModels && editTarget.availableModels.length > 0 ? (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>默认模型</InputLabel>
              <Select
                value={editTarget?.defaultModel || ''}
                label="默认模型"
                onChange={(e) => setEditTarget({ ...editTarget, defaultModel: e.target.value })}
              >
                {editTarget.availableModels.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth size="small" sx={{ mb: 2 }}
              label="默认模型" value={editTarget?.defaultModel || ''}
              onChange={(e) => setEditTarget({ ...editTarget, defaultModel: e.target.value })}
              helperText="如 deepseek-v4-flash, deepseek-v4-pro, gpt-4o"
            />
          )}

          <TextField
            fullWidth size="small" sx={{ mb: 2 }} type="number"
            label="优先级" value={editTarget?.priority || 0}
            onChange={(e) => setEditTarget({ ...editTarget, priority: parseInt(e.target.value) || 0 })}
            helperText="用于回退排序，数值越大优先级越高"
          />

          {!editIsNew && (
            <FormControlLabel
              control={
                <Switch
                  checked={editTarget?.isActive !== false}
                  onChange={(e) => setEditTarget({ ...editTarget, isActive: e.target.checked })}
                />
              }
              label="启用"
            />
          )}

          {renderDeepseekConfig()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs">
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除提供商 <strong>{deleteDialog?.name}</strong> 吗？此操作不可恢复。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>删除</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Mobile test result dialog ─── */}
      <Dialog open={!!resultDialog} onClose={() => setResultDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>测试结果 — {resultDialog && providers.find((p) => p.provider === resultDialog)?.name}</DialogTitle>
        <DialogContent>{resultDialog && renderTestResult(resultDialog)}</DialogContent>
        <DialogActions><Button onClick={() => setResultDialog(null)}>关闭</Button></DialogActions>
      </Dialog>

      {/* ─── Snackbar ─── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AiConfigPage;
