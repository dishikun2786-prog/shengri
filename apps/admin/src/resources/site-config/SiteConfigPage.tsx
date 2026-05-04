import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Button, Alert,
  Snackbar, Stack, Skeleton,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { Title } from 'react-admin';
import SaveIcon from '@mui/icons-material/Save';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SearchIcon from '@mui/icons-material/Search';
import PaletteIcon from '@mui/icons-material/Palette';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ArticleIcon from '@mui/icons-material/Article';
import LinkIcon from '@mui/icons-material/Link';
import SectionCard from '../../components/SectionCard';
import { fetchWithAuth } from '../../lib/fetchWithAuth';

const API_BASE = '/api/v1/admin/config';

interface SiteConfig {
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  favicon: string;
  logo: string;
  brandName: string;
  brandNameEn: string;
  footer: string;
  icp: string;
  contactEmail: string;
  contactPhone: string;
}

interface UrlConfig {
  apiUrl: string;
  webUrl: string;
  adminUrl: string;
}

const LoadingSkeleton = () => (
  <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 800 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: 2 }} />
    ))}
  </Box>
);

const SiteConfigPage = () => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [urlConfig, setUrlConfig] = useState<UrlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlLoading, setUrlLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urlSaving, setUrlSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/site`);
      setConfig(data);
      setError(null);
    } catch (err: any) {
      if (err.message === 'unauthorized') return;
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUrlConfig = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/url`);
      setUrlConfig(data);
    } catch (err: any) {
      if (err.message === 'unauthorized') return;
    } finally {
      setUrlLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadUrlConfig(); }, [loadUrlConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const data = await fetchWithAuth(`${API_BASE}/site`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setConfig(data);
      setSnackbar({ open: true, message: '站点配置已保存', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!urlConfig) return;
    setUrlSaving(true);
    try {
      const data = await fetchWithAuth(`${API_BASE}/url`, {
        method: 'PUT',
        body: JSON.stringify(urlConfig),
      });
      setUrlConfig(data);
      setSnackbar({ open: true, message: '地址配置已保存', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setUrlSaving(false);
    }
  };

  const update = (field: keyof SiteConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const updateUrl = (field: keyof UrlConfig, value: string) => {
    if (!urlConfig) return;
    setUrlConfig({ ...urlConfig, [field]: value });
  };

  if (loading || urlLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!config) return null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 800 }}>
      <Title title="基础信息配置" />

      <SectionCard title="品牌信息" icon={<StorefrontIcon />}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth size="small" label="站点标题"
            value={config.title} onChange={(e) => update('title', e.target.value)}
            helperText="显示在浏览器标签和搜索引擎中的主标题"
          />
          <TextField
            fullWidth size="small" label="副标题"
            value={config.subtitle} onChange={(e) => update('subtitle', e.target.value)}
            helperText="标题后的补充描述，如「专业八字排盘 · AI智能批命」"
          />
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth size="small" label="品牌名（中文）"
              value={config.brandName} onChange={(e) => update('brandName', e.target.value)}
            />
            <TextField
              fullWidth size="small" label="品牌名（英文）"
              value={config.brandNameEn} onChange={(e) => update('brandNameEn', e.target.value)}
            />
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="SEO 设置" icon={<SearchIcon />}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth size="small" label="页面描述" multiline rows={3}
            value={config.description} onChange={(e) => update('description', e.target.value)}
            helperText="用于搜索引擎的 meta description，建议 120 字以内"
          />
          <TextField
            fullWidth size="small" label="关键词"
            value={config.keywords} onChange={(e) => update('keywords', e.target.value)}
            helperText="多个关键词用逗号分隔"
          />
        </Stack>
      </SectionCard>

      <SectionCard title="视觉设置" icon={<PaletteIcon />}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth size="small" label="Favicon URL"
            value={config.favicon} onChange={(e) => update('favicon', e.target.value)}
            helperText="网站图标路径，如 /favicon.ico 或完整 URL"
          />
          <TextField
            fullWidth size="small" label="Logo URL"
            value={config.logo} onChange={(e) => update('logo', e.target.value)}
            helperText="网站 Logo 图片路径（可选）"
          />
        </Stack>
      </SectionCard>

      <SectionCard title="联系信息" icon={<ContactMailIcon />}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth size="small" label="ICP 备案号"
            value={config.icp} onChange={(e) => update('icp', e.target.value)}
            helperText="如「京ICP备XXXXXXXX号」，留空则不显示"
          />
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth size="small" label="联系邮箱"
              value={config.contactEmail} onChange={(e) => update('contactEmail', e.target.value)}
            />
            <TextField
              fullWidth size="small" label="联系电话"
              value={config.contactPhone} onChange={(e) => update('contactPhone', e.target.value)}
            />
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="页脚文案" icon={<ArticleIcon />}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth size="small" label="页脚文案" multiline rows={2}
            value={config.footer} onChange={(e) => update('footer', e.target.value)}
            helperText="显示在网站底部的声明文案"
          />
        </Stack>
      </SectionCard>

      {urlConfig && (
        <SectionCard title="系统地址配置" icon={<LinkIcon />}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth size="small" label="API 地址"
              value={urlConfig.apiUrl} onChange={(e) => updateUrl('apiUrl', e.target.value)}
              helperText="后端 API 服务地址，如 https://api.example.com/api/v1"
            />
            <TextField
              fullWidth size="small" label="Web 前端地址"
              value={urlConfig.webUrl} onChange={(e) => updateUrl('webUrl', e.target.value)}
              helperText="用户端网站地址，如 https://www.example.com"
            />
            <TextField
              fullWidth size="small" label="管理后台地址"
              value={urlConfig.adminUrl} onChange={(e) => updateUrl('adminUrl', e.target.value)}
              helperText="后台管理系统地址，如 https://admin.example.com"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={urlSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveUrl}
                disabled={urlSaving}
                size="small"
              >
                保存地址配置
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          size="large"
        >
          保存配置
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SiteConfigPage;
