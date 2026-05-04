import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Alert, Switch,
  Snackbar, Typography, Stack, Chip, Skeleton, Tabs, Tab,
  IconButton, InputAdornment,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { Title } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import QrCodeIcon from '@mui/icons-material/QrCode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SectionCard from '../../components/SectionCard';
import { fetchWithAuth } from '../../lib/fetchWithAuth';

const API_BASE = '/api/v1/admin/config';

interface PaymentMethodConfig {
  enabled: boolean;
  label: string;
  sortOrder: number;
}

interface PaymentConfig {
  wechat: PaymentMethodConfig;
  alipay: PaymentMethodConfig;
  balance: PaymentMethodConfig;
  card_key: PaymentMethodConfig;
}

type PaymentKey = keyof PaymentConfig;

interface WechatPayCredentials {
  appId: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
  notifyUrl: string;
  apiV3Key: string;
}

interface AlipayCredentials {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  notifyUrl: string;
  returnUrl: string;
  signType: string;
}

interface CredentialsConfig {
  wechat: WechatPayCredentials;
  alipay: AlipayCredentials;
}

const PAYMENT_META: Record<PaymentKey, { icon: React.ReactNode; color: string; hint?: string }> = {
  wechat: { icon: <QrCodeIcon />, color: '#07c160', hint: '需在渠道配置中完成微信商户号接入' },
  alipay: { icon: <PaymentIcon />, color: '#1677ff', hint: '需在渠道配置中完成支付宝应用接入' },
  balance: { icon: <AccountBalanceWalletIcon />, color: 'primary' },
  card_key: { icon: <VpnKeyIcon />, color: 'secondary' },
};

const getResolvedColor = (color: string): string => {
  if (color === 'primary') return '#c44520';
  if (color === 'secondary') return '#dca310';
  return color;
};

// ─── Tab 1: 支付方式开关管理 ──────────────────────────────────────────

const MethodsTab = () => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await fetchWithAuth(`${API_BASE}/payment`));
    } catch (err: any) {
      if (err.message !== 'unauthorized') setSnackbar({ open: true, message: '加载失败', severity: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      setConfig(await fetchWithAuth(`${API_BASE}/payment`, { method: 'PUT', body: JSON.stringify(config) }));
      setSnackbar({ open: true, message: '支付配置已保存', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally { setSaving(false); }
  };

  const update = (key: PaymentKey, field: keyof PaymentMethodConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: { ...config[key], [field]: value } });
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 800 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={88} sx={{ mb: 2, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (!config) return null;

  const methods = (Object.keys(PAYMENT_META) as PaymentKey[]).sort(
    (a, b) => (config[a]?.sortOrder ?? 99) - (config[b]?.sortOrder ?? 99),
  );

  return (
    <>
      <Stack spacing={2}>
        {methods.map((key) => {
          const method = config[key];
          const meta = PAYMENT_META[key];
          const resolved = getResolvedColor(meta.color);
          return (
            <Card key={key} sx={{ position: 'relative', overflow: 'hidden', opacity: method.enabled ? 1 : 0.7, transition: 'all 0.2s' }}>
              {method.enabled && <Box sx={{ height: 3, bgcolor: resolved }} />}
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: method.enabled ? `${resolved}15` : 'grey.100', color: method.enabled ? resolved : 'grey.500' }}>
                    {meta.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{method.label}</Typography>
                      <Chip label={method.enabled ? '已启用' : '已禁用'} size="small" color={method.enabled ? 'success' : 'default'} variant={method.enabled ? 'filled' : 'outlined'} />
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField size="small" label="显示名称" value={method.label} onChange={(e) => update(key, 'label', e.target.value)} sx={{ width: 200 }} />
                      <TextField size="small" label="排序" type="number" value={method.sortOrder} onChange={(e) => update(key, 'sortOrder', parseInt(e.target.value) || 0)} sx={{ width: 100 }} />
                    </Stack>
                    {meta.hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{meta.hint}</Typography>}
                  </Box>
                  <Switch checked={method.enabled} onChange={(e) => update(key, 'enabled', e.target.checked)} />
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} size="large">
          保存配置
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

// ─── Tab 2: 渠道密钥配置 ──────────────────────────────────────────────

const PasswordField = ({ label, value, onChange, multiline, helperText }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; helperText?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <TextField
      fullWidth size="small" label={label} value={value}
      onChange={(e) => onChange(e.target.value)}
      type={show || multiline ? 'text' : 'password'}
      multiline={multiline} rows={multiline ? 3 : undefined}
      helperText={helperText}
      InputProps={{
        endAdornment: !multiline ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow(!show)}>
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
};

const CredentialsTab = () => {
  const [creds, setCreds] = useState<CredentialsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const loadCreds = useCallback(async () => {
    try {
      setCreds(await fetchWithAuth(`${API_BASE}/payment-credentials`));
    } catch (err: any) {
      if (err.message !== 'unauthorized') setSnackbar({ open: true, message: '加载失败', severity: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCreds(); }, [loadCreds]);

  const handleSave = async () => {
    if (!creds) return;
    setSaving(true);
    try {
      await fetchWithAuth(`${API_BASE}/payment-credentials`, { method: 'PUT', body: JSON.stringify(creds) });
      setSnackbar({ open: true, message: '渠道配置已保存', severity: 'success' });
      loadCreds();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleTest = async (channel: string) => {
    setTesting(channel);
    try {
      const res = await fetchWithAuth(`${API_BASE}/payment-test/${channel}`, { method: 'POST' });
      setSnackbar({ open: true, message: res.message, severity: res.success ? 'success' : 'error' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally { setTesting(null); }
  };

  const updateWechat = (field: keyof WechatPayCredentials, value: string) => {
    if (!creds) return;
    setCreds({ ...creds, wechat: { ...creds.wechat, [field]: value } });
  };

  const updateAlipay = (field: keyof AlipayCredentials, value: string) => {
    if (!creds) return;
    setCreds({ ...creds, alipay: { ...creds.alipay, [field]: value } });
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 800 }}>
        {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={200} sx={{ mb: 2, borderRadius: 2 }} />)}
      </Box>
    );
  }

  if (!creds) return null;

  return (
    <>
      <Alert severity="warning" sx={{ mb: 2 }}>
        支付密钥为敏感信息，保存后以加密方式存储。展示时仅显示前 8 位字符。
      </Alert>

      <SectionCard
        title="微信支付 V3"
        icon={<QrCodeIcon />}
        action={
          <Button
            size="small" variant="outlined"
            startIcon={testing === 'wechat' ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            onClick={() => handleTest('wechat')}
            disabled={testing !== null}
          >
            测试连通
          </Button>
        }
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth size="small" label="AppID" value={creds.wechat.appId} onChange={(e) => updateWechat('appId', e.target.value)} />
            <TextField fullWidth size="small" label="商户号 MchID" value={creds.wechat.mchId} onChange={(e) => updateWechat('mchId', e.target.value)} />
          </Stack>
          <TextField fullWidth size="small" label="商户证书序列号" value={creds.wechat.serialNo} onChange={(e) => updateWechat('serialNo', e.target.value)} helperText="在微信支付商户平台 → API安全 中查看" />
          <PasswordField label="APIv3 密钥" value={creds.wechat.apiV3Key} onChange={(v) => updateWechat('apiV3Key', v)} helperText="32 字符，用于回调数据解密" />
          <PasswordField label="商户私钥" value={creds.wechat.privateKey} onChange={(v) => updateWechat('privateKey', v)} multiline helperText="PEM 格式的 apiclient_key.pem 内容" />
          <TextField fullWidth size="small" label="回调通知 URL" value={creds.wechat.notifyUrl} onChange={(e) => updateWechat('notifyUrl', e.target.value)} helperText="如 https://yourdomain.com/api/v1/payment/wechat/notify" />
        </Stack>
      </SectionCard>

      <SectionCard
        title="支付宝"
        icon={<PaymentIcon />}
        action={
          <Button
            size="small" variant="outlined"
            startIcon={testing === 'alipay' ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            onClick={() => handleTest('alipay')}
            disabled={testing !== null}
          >
            测试连通
          </Button>
        }
      >
        <Stack spacing={2}>
          <TextField fullWidth size="small" label="AppID" value={creds.alipay.appId} onChange={(e) => updateAlipay('appId', e.target.value)} helperText="支付宝开放平台创建的应用 AppID" />
          <PasswordField label="应用私钥" value={creds.alipay.privateKey} onChange={(v) => updateAlipay('privateKey', v)} multiline helperText="RSA2 应用私钥（非证书模式）" />
          <TextField fullWidth size="small" label="支付宝公钥" value={creds.alipay.alipayPublicKey} onChange={(e) => updateAlipay('alipayPublicKey', e.target.value)} multiline rows={3} helperText="在支付宝开放平台应用详情中获取" />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth size="small" label="异步通知 URL" value={creds.alipay.notifyUrl} onChange={(e) => updateAlipay('notifyUrl', e.target.value)} helperText="如 https://yourdomain.com/api/v1/payment/alipay/notify" />
            <TextField fullWidth size="small" label="同步跳转 URL" value={creds.alipay.returnUrl} onChange={(e) => updateAlipay('returnUrl', e.target.value)} helperText="支付完成后跳转的前端页面" />
          </Stack>
        </Stack>
      </SectionCard>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} size="large">
          保存渠道配置
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────

const PaymentConfigPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 800 }}>
      <Title title="支付管理" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="支付方式" />
        <Tab label="渠道配置" />
      </Tabs>

      {tab === 0 && <MethodsTab />}
      {tab === 1 && <CredentialsTab />}
    </Box>
  );
};

export default PaymentConfigPage;
