import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Alert, AlertTitle,
  Snackbar, Typography, Chip, IconButton, InputAdornment, Tooltip,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { Title } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';
import SmsIcon from '@mui/icons-material/Sms';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SectionCard from '../../components/SectionCard';
import { fetchWithAuth } from '../../lib/fetchWithAuth';

const API_BASE = '/api/v1/admin/sms';

interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  endpoint: string;
}

const DEFAULTS: SmsConfig = {
  accessKeyId: '',
  accessKeySecret: '',
  signName: '生辰',
  templateCode: '',
  endpoint: 'dysmsapi.aliyuncs.com',
};

export default function SmsConfigPage() {
  const [config, setConfig] = useState<SmsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean; message: string; severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/config`);
      setConfig({ ...DEFAULTS, ...data });
      setError(null);
    } catch (err: any) {
      if (err?.message === 'unauthorized') return;
      setError('配置加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchWithAuth(`${API_BASE}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setSnackbar({ open: true, message: '短信配置已保存（即时生效）', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || '保存失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const isConfigured = config.accessKeyId && config.accessKeySecret && config.templateCode;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 720 }}>
      <Title title="短信配置" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SmsIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>短信服务配置</Typography>
        <Chip
          size="small"
          icon={isConfigured ? <CheckCircleIcon /> : undefined}
          label={isConfigured ? '已配置' : '未配置'}
          color={isConfigured ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      {/* 配置说明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>配置说明</AlertTitle>
        使用阿里云短信服务（Dysmsapi）发送验证码。请先在
        <a href="https://dysms.console.aliyun.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          阿里云短信控制台
        </a>
        中创建签名和模板，然后获取 AccessKey。
        <br />
        模板内容示例：<code>您的验证码是：$&#123;code&#125;，5分钟内有效。</code>
      </Alert>

      {/* 账户凭证 */}
      <SectionCard title="账户凭证" icon={<VpnKeyIcon />}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="AccessKey ID"
            value={config.accessKeyId}
            onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
            fullWidth
            placeholder="LTAI5tXXXXXXXXXXXXXX"
            helperText="阿里云 RAM 访问控制的 AccessKey ID"
          />
          <TextField
            label="AccessKey Secret"
            type={showSecret ? 'text' : 'password'}
            value={config.accessKeySecret}
            onChange={(e) => setConfig({ ...config, accessKeySecret: e.target.value })}
            fullWidth
            placeholder="****************************************"
            helperText="请妥善保管，保存后以密文显示"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showSecret ? '隐藏' : '显示'}>
                    <IconButton onClick={() => setShowSecret(!showSecret)} edge="end" size="small">
                      {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </SectionCard>

      {/* 短信参数 */}
      <SectionCard title="签名与模板" icon={<SmsIcon />}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="短信签名"
            value={config.signName}
            onChange={(e) => setConfig({ ...config, signName: e.target.value })}
            fullWidth
            placeholder="生辰"
            helperText="需在阿里云短信控制台审核通过"
          />
          <TextField
            label="模板CODE"
            value={config.templateCode}
            onChange={(e) => setConfig({ ...config, templateCode: e.target.value })}
            fullWidth
            placeholder="SMS_123456789"
            helperText="模板变量需包含 ${code}，内容如：您的验证码是：${code}，5分钟内有效。"
          />
        </Box>
      </SectionCard>

      {/* 高级设置 */}
      <SectionCard title="高级设置" icon={<CheckCircleIcon />}>
        <TextField
          label="API Endpoint"
          value={config.endpoint}
          onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
          fullWidth
          helperText="默认国内站：dysmsapi.aliyuncs.com，国际站：dysmsapi.ap-southeast-1.aliyuncs.com"
        />
      </SectionCard>

      {/* 保存按钮 */}
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存配置'}
        </Button>
        {isConfigured && (
          <Typography variant="body2" color="text.secondary">
            配置已就绪，修改后点击保存即时生效（无需重启服务）
          </Typography>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
