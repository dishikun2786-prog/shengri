import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, Typography, TextField, Button,
  Alert, CircularProgress, Snackbar, Switch, FormControlLabel, Divider,
} from '@mui/material';
import { Title, useLogout } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';

const API_BASE = '/api/v1/admin/token';

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

interface TokenConfig {
  registrationGift: number;
  dailyFree: number;
  chargeEnabled: boolean;
  estimationSafetyFactor: number;
}

const DEFAULTS: TokenConfig = {
  registrationGift: 5,
  dailyFree: 3,
  chargeEnabled: true,
  estimationSafetyFactor: 1.5,
};

const TokenConfigPage = () => {
  const logout = useLogout();

  const [config, setConfig] = useState<TokenConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/config`);
      setConfig({ ...DEFAULTS, ...data });
      setError(null);
    } catch (err: any) {
      if (err?.message === 'unauthorized') { logout(); return; }
      setError('Token 配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchWithAuth(`${API_BASE}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      showSnack('Token 配置已保存');
    } catch (err: any) {
      showSnack(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Title title="Token 消耗配置" />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Alert severity="info" sx={{ flex: 1, minWidth: 200 }}>
          配置新用户注册赠送免费次数、每日免费额度、付费开关及预估安全系数。
        </Alert>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          size="small"
        >
          保存配置
        </Button>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* 免费配额 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="免费配额" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <Divider />
            <CardContent>
              <TextField
                fullWidth size="small" sx={{ mb: 2 }} type="number"
                label="注册赠送永久免费次数"
                value={config.registrationGift}
                onChange={(e) => setConfig({ ...config, registrationGift: parseInt(e.target.value) || 0 })}
                helperText="新用户注册时赠送的永久免费使用次数"
                inputProps={{ min: 0, max: 999 }}
              />
              <TextField
                fullWidth size="small" type="number"
                label="每日免费次数"
                value={config.dailyFree}
                onChange={(e) => setConfig({ ...config, dailyFree: parseInt(e.target.value) || 0 })}
                helperText="每个用户每天可免费使用的次数"
                inputProps={{ min: 0, max: 999 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 付费与安全设置 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="付费与安全设置" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <Divider />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.chargeEnabled}
                    onChange={(e) => setConfig({ ...config, chargeEnabled: e.target.checked })}
                  />
                }
                label="启用付费功能"
                sx={{ mb: 2, display: 'block' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                关闭后，免费次数用完的用户将无法继续使用 AI 功能。
              </Typography>

              <TextField
                fullWidth size="small" type="number"
                label="预估安全系数"
                value={config.estimationSafetyFactor}
                onChange={(e) => setConfig({ ...config, estimationSafetyFactor: parseFloat(e.target.value) || 1.5 })}
                helperText="冻结余额 = 预估费用 × 安全系数，防止实际消耗超出预估。建议 1.2-2.0"
                inputProps={{ min: 1, max: 5, step: 0.1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default TokenConfigPage;
