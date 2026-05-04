import { useState, type ReactNode } from 'react';
import { useRefresh, useLogout, useGetIdentity } from 'react-admin';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/PowerSettingsNew';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CustomMenu from './CustomMenu';

const DRAWER_WIDTH = 240;
const APPBAR_HEIGHT = 56;
const APPBAR_HEIGHT_DESKTOP = 64;

const CustomLayout = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const refresh = useRefresh();
  const logout = useLogout();
  const { identity } = useGetIdentity();

  const handleDrawerToggle = () => {
    if (isSmall) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleMobileClose = () => setMobileOpen(false);

  const appBarHeight = isSmall ? APPBAR_HEIGHT : APPBAR_HEIGHT_DESKTOP;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #c44520 0%, #8a3016 100%)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: APPBAR_HEIGHT, md: APPBAR_HEIGHT_DESKTOP } }}>
          <IconButton color="inherit" edge="start" sx={{ mr: 1 }} onClick={handleDrawerToggle}>
            {!isSmall && desktopOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            sx={{ flex: 1, fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            ShengRi 管理后台
          </Typography>
          {!isSmall && identity?.fullName && (
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
              {identity.fullName}
            </Typography>
          )}
          <Tooltip title="刷新">
            <IconButton color="inherit" onClick={() => refresh()} size={isSmall ? 'small' : 'medium'}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="退出登录">
            <IconButton color="inherit" onClick={() => logout()} size={isSmall ? 'small' : 'medium'}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Mobile: temporary overlay drawer */}
      {isSmall && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMobileClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#fff',
              borderRight: '1px solid rgba(0,0,0,0.08)',
            },
          }}
        >
          <Toolbar sx={{ minHeight: APPBAR_HEIGHT }} />
          <CustomMenu onItemClick={handleMobileClose} />
        </Drawer>
      )}

      {/* Desktop: persistent collapsible drawer */}
      {!isSmall && (
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            width: desktopOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 225ms cubic-bezier(0,0,0.2,1)',
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: APPBAR_HEIGHT_DESKTOP,
              borderRight: '1px solid rgba(0,0,0,0.08)',
              bgcolor: '#fff',
            },
          }}
        >
          <CustomMenu />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: `${appBarHeight}px`,
          ml: !isSmall && desktopOpen ? 0 : !isSmall ? `-${DRAWER_WIDTH}px` : 0,
          transition: 'margin 225ms cubic-bezier(0,0,0.2,1)',
          minWidth: 0,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default CustomLayout;
