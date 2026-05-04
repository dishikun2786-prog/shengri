import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, CircularProgress,
} from '@mui/material';
import { Title } from 'react-admin';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

const BG_IMAGE_PATH = '/images/promotion-poster-bg.jpg';
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 1013;
const QR_SIZE = 130;
const QR_X = 315;
const QR_Y = 858;
const QR_COLOR = '#6d2a1c';
const API_BASE = '/api/v1/admin/actions/agent';

function fetchWithAuth(url: string) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) return r.json().then((d: any) => { throw new Error(d.message || `HTTP ${r.status}`); });
    return r.json();
  });
}

type Status = 'loading' | 'ready' | 'error';

export default function AgentPosterPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generatePoster = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMsg('');

      const { referralLink } = await fetchWithAuth(`${API_BASE}/referral-link`);

      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load background
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('背景图加载失败'));
        img.src = BG_IMAGE_PATH;
      });
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Generate QR code
      const QRCode = (await import('qrcode')).default || (await import('qrcode'));
      const qrDataUrl = await QRCode.toDataURL(referralLink, {
        width: QR_SIZE,
        margin: 1,
        color: { dark: QR_COLOR, light: '#ffffff' },
      });

      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('二维码生成失败'));
        img.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
      setStatus('ready');
    } catch (err: any) {
      setErrorMsg(err?.message || '海报生成失败');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    generatePoster();
  }, [generatePoster]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '推广海报.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 520, mx: 'auto' }}>
      <Title title="推广海报" />

      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 0.5 }}>
            我的推广海报
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            保存海报分享给微信好友，扫码即可注册
          </Typography>

          {status === 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">正在生成海报...</Typography>
            </Box>
          )}

          {status === 'error' && (
            <Box sx={{ py: 4 }}>
              <Alert
                severity="error"
                action={
                  <Button size="small" onClick={generatePoster} startIcon={<RefreshIcon />}>
                    重试
                  </Button>
                }
                sx={{ mb: 2 }}
              >
                {errorMsg}
              </Alert>
            </Box>
          )}

          {status === 'ready' && posterUrl && (
            <>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#f5f5f5',
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <img
                  src={posterUrl}
                  alt="推广海报"
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                长按图片保存到相册，分享给微信好友扫码注册
              </Typography>

              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{
                  bgcolor: '#c44520',
                  '&:hover': { bgcolor: '#a0371a' },
                  px: 4,
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                保存海报
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
