import { useState, FormEvent } from 'react';
import { useLogin, useNotify } from 'react-admin';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

const CustomLoginPage = () => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    login({ username: account, password })
      .catch((err: any) => {
        notify(err?.message || '登录失败', { type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      px: { xs: 2, sm: 0 },
      background: 'linear-gradient(135deg, #fdf8f4 0%, #f5e6d8 100%)',
    }}>
      <Card sx={{
        width: '100%',
        maxWidth: 420,
        boxShadow: 6,
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'hidden',
      }}>
        <Box sx={{
          background: 'linear-gradient(135deg, #c44520 0%, #8a3016 100%)',
          py: { xs: 2.5, sm: 3 },
          px: { xs: 3, sm: 4 },
          textAlign: 'center',
        }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', mb: 0.5 }}>
            ☯
          </Typography>
          <Typography
            variant="h5"
            sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}
          >
            ShengRi 管理后台
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            专业级八字命理 SaaS 平台
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <form onSubmit={handleSubmit}>
            <TextField
              label="账号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              fullWidth
              margin="normal"
              autoFocus
              required
              placeholder="管理员用户名，如 admin"
            />
            <TextField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                background: 'linear-gradient(135deg, #c44520 0%, #d86a4a 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #8a3016 0%, #c44520 100%)' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomLoginPage;
