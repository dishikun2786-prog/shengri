import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, Typography, TextField, Button,
  Alert, CircularProgress, Snackbar, Switch, FormControlLabel, Divider, Chip,
} from '@mui/material';
import { Title, useLogout } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';

const API_BASE = '/api/v1/admin/pairing';

const PAIRING_TYPE_META: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'primary' }> = {
  personality: { label: '性格匹配', color: 'success' },
  career: { label: '事业合作', color: 'info' },
  wealth: { label: '财运互补', color: 'warning' },
  hehun: { label: '合婚分析', color: 'error' },
  comprehensive: { label: '综合配对', color: 'primary' },
};

interface PairingTypeConfig {
  price: number;
  freeCount: number;
  enabled: boolean;
}

interface PairingPricingConfig {
  personality: PairingTypeConfig;
  career: PairingTypeConfig;
  wealth: PairingTypeConfig;
  hehun: PairingTypeConfig;
  comprehensive: PairingTypeConfig;
}

const DEFAULTS: PairingPricingConfig = {
  personality: { price: 29.9, freeCount: 3, enabled: true },
  career: { price: 39.9, freeCount: 2, enabled: true },
  wealth: { price: 39.9, freeCount: 2, enabled: true },
  hehun: { price: 49.9, freeCount: 1, enabled: true },
  comprehensive: { price: 99.9, freeCount: 1, enabled: true },
};

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

const PairingConfigPage = () => {
  const logout = useLogout();

  const [config, setConfig] = useState<PairingPricingConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/config`);
      const merged = { ...DEFAULTS };
      for (const key of Object.keys(merged) as (keyof PairingPricingConfig)[]) {
        if (data[key]) {
          merged[key] = { ...merged[key], ...data[key] };
        }
      }
      setConfig(merged);
      setError(null);
    } catch (err: any) {
      if (err?.message === 'unauthorized') { logout(); return; }
      setError('配对配置加载失败');
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
      showSnack('配对定价配置已保存');
    } catch (err: any) {
      showSnack(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateType = (type: string, field: keyof PairingTypeConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
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
      <Title title="朋友圈配对设置" />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Alert severity="info" sx={{ flex: 1, minWidth: 200 }}>
          配置每种配对类型的价格、免费体验次数和启用状态。修改后即时生效，新用户注册时将自动获得对应免费次数。
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
        {(Object.keys(PAIRING_TYPE_META) as string[]).map((type) => {
          const meta = PAIRING_TYPE_META[type];
          const cfg = config[type];
          return (
            <Grid item xs={12} sm={6} lg={4} key={type}>
              <Card sx={{ opacity: cfg.enabled ? 1 : 0.6 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={meta.label} color={meta.color} size="small" />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={cfg.enabled}
                            onChange={(e) => updateType(type, 'enabled', e.target.checked)}
                            size="small"
                          />
                        }
                        label=""
                        sx={{ ml: 'auto', mr: 0 }}
                      />
                    </Box>
                  }
                  titleTypographyProps={{ variant: 'subtitle1' }}
                  sx={{ pb: 0 }}
                />
                <Divider />
                <CardContent>
                  <TextField
                    fullWidth size="small" sx={{ mb: 2 }} type="number"
                    label="价格 (元)"
                    value={cfg.price}
                    onChange={(e) => updateType(type, 'price', parseFloat(e.target.value) || 0)}
                    helperText="用户使用免费次数后需支付的价格"
                    inputProps={{ min: 0, max: 9999, step: 0.01 }}
                    disabled={!cfg.enabled}
                  />
                  <TextField
                    fullWidth size="small" type="number"
                    label="免费体验次数"
                    value={cfg.freeCount}
                    onChange={(e) => updateType(type, 'freeCount', parseInt(e.target.value) || 0)}
                    helperText="每个用户可免费体验该配对类型的次数"
                    inputProps={{ min: 0, max: 999 }}
                    disabled={!cfg.enabled}
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
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

export default PairingConfigPage;
