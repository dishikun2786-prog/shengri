import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShareIcon from '@mui/icons-material/Share';
import ContactsIcon from '@mui/icons-material/Contacts';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import PaymentIcon from '@mui/icons-material/Payment';
import ForumIcon from '@mui/icons-material/Forum';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import TuneIcon from '@mui/icons-material/Tune';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SmsIcon from '@mui/icons-material/Sms';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

const adminMenuGroups: MenuGroup[] = [
  {
    id: 'core',
    label: '核心业务',
    items: [
      { path: '/', label: '数据大屏', icon: <DashboardIcon /> },
      { path: '/users', label: '用户管理', icon: <PeopleIcon /> },
      { path: '/orders', label: '订单管理', icon: <ShoppingCartIcon /> },
    ],
  },
  {
    id: 'content',
    label: '内容管理',
    items: [
      { path: '/products', label: '产品管理', icon: <InventoryIcon /> },
      { path: '/reports', label: '报告管理', icon: <AssessmentIcon /> },
      { path: '/charts', label: '命盘管理', icon: <AutoGraphIcon /> },
      { path: '/xiaoliuren_records', label: '小六壬占卜', icon: <SmsIcon /> },
      { path: '/digital_energy_records', label: '数字能量', icon: <DataUsageIcon /> },
      { path: '/bazhai_records', label: '八宅风水', icon: <AccountTreeIcon /> },
      { path: '/bazhai_reports', label: '八宅报告', icon: <AssessmentIcon /> },
      { path: '/health_records', label: '五运六气分析', icon: <AssessmentIcon /> },
      { path: '/health_reports', label: '健康报告', icon: <AssessmentIcon /> },
      { path: '/prompts', label: 'Prompt管理', icon: <ChatIcon /> },
      { path: '/rules', label: '规则引擎', icon: <AccountTreeIcon /> },
    ],
  },
  {
    id: 'service',
    label: '服务管理',
    items: [
      { path: '/masters', label: '命理师', icon: <PersonIcon /> },
      { path: '/consultations', label: '咨询管理', icon: <ForumIcon /> },
      { path: '/chat_sessions', label: '对话管理', icon: <ChatBubbleOutlineIcon /> },
    ],
  },
  {
    id: 'marketing',
    label: '营销分销',
    items: [
      { path: '/card_keys', label: '卡密管理', icon: <VpnKeyIcon /> },
      { path: '/promotion-config', label: '推广设置', icon: <CampaignIcon /> },
      { path: '/balance_transactions', label: '余额流水', icon: <AccountBalanceWalletIcon /> },
      { path: '/distributors', label: '分销管理', icon: <ShareIcon /> },
      { path: '/commission_records', label: '佣金记录', icon: <ReceiptIcon /> },
      { path: '/crm_customers', label: 'CRM客户', icon: <ContactsIcon /> },
    ],
  },
  {
    id: 'system',
    label: '系统设置',
    items: [
      { path: '/site-config', label: '基础信息', icon: <SettingsIcon /> },
      { path: '/payment-config', label: '支付管理', icon: <PaymentIcon /> },
      { path: '/ai-config', label: 'AI模型配置', icon: <SmartToyIcon /> },
      { path: '/token_pricings', label: 'Token定价', icon: <MonetizationOnIcon /> },
      { path: '/token_usages', label: 'Token消耗', icon: <DataUsageIcon /> },
      { path: '/token-config', label: 'Token配置', icon: <TuneIcon /> },
      { path: '/pairing-config', label: '配对设置', icon: <FavoriteIcon /> },
      { path: '/sms-config', label: '短信配置', icon: <SmsIcon /> },
    ],
  },
];

const agentMenuGroups: MenuGroup[] = [
  {
    id: 'agent',
    label: '代理中心',
    items: [
      { path: '/', label: '数据概览', icon: <DashboardIcon /> },
      { path: '/card_keys', label: '卡密管理', icon: <VpnKeyIcon /> },
      { path: '/balance_transactions', label: '余额明细', icon: <AccountBalanceWalletIcon /> },
    ],
  },
  {
    id: 'agent-dev',
    label: '发展代理',
    items: [
      { path: '/agent-referrals', label: '我的推广', icon: <GroupAddIcon /> },
      { path: '/agent-sub-agents', label: '我的代理', icon: <SupervisorAccountIcon /> },
      { path: '/agent-poster', label: '推广海报', icon: <CampaignIcon /> },
    ],
  },
];

function isSelected(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

function isGroupActive(pathname: string, group: MenuGroup): boolean {
  return group.items.some((item) => isSelected(pathname, item.path));
}

interface CustomMenuProps {
  onItemClick?: () => void;
}

const CustomMenu = ({ onItemClick }: CustomMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr).role : 'viewer';
    } catch { return 'viewer'; }
  }, []);

  const menuGroups = useMemo(() => {
    if (role === 'agent') return agentMenuGroups;
    return adminMenuGroups;
  }, [role]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const groups = role === 'agent' ? agentMenuGroups : adminMenuGroups;
    groups.forEach((g) => {
      initial[g.id] = isGroupActive(location.pathname, g);
    });
    if (!Object.values(initial).some(Boolean)) {
      initial[groups[0].id] = true;
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  return (
    <List dense component="nav" sx={{ pt: 0.5, pb: 2 }}>
      {menuGroups.map((group) => {
        const groupActive = isGroupActive(location.pathname, group);
        const groupOpen = openGroups[group.id] ?? false;

        return (
          <div key={group.id}>
            <ListSubheader
              component="div"
              onClick={() => toggleGroup(group.id)}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'transparent',
                lineHeight: '36px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: groupActive ? 'primary.main' : 'text.secondary',
                px: 2,
                mt: 0.5,
                userSelect: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {group.label}
              {groupOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListSubheader>

            <Collapse in={groupOpen} timeout="auto" unmountOnExit>
              {group.items.map((item) => {
                const selected = isSelected(location.pathname, item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    selected={selected}
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.25,
                      py: 0.75,
                      '&.Mui-selected': {
                        borderLeft: '3px solid',
                        borderLeftColor: 'primary.main',
                        bgcolor: 'rgba(196,69,32,0.08)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.85rem' }}
                    />
                  </ListItemButton>
                );
              })}
            </Collapse>
          </div>
        );
      })}
    </List>
  );
};

export default CustomMenu;
