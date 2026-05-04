import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import theme from './theme';
import Dashboard from './dashboard/Dashboard';
import AgentDashboard from './dashboard/AgentDashboard';
import CustomLayout from './layout/CustomLayout';
import CustomLoginPage from './layout/CustomLoginPage';

import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import RuleIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShareIcon from '@mui/icons-material/Share';
import ContactsIcon from '@mui/icons-material/Contacts';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ReceiptIcon from '@mui/icons-material/Receipt';

import UserList from './resources/users/UserList';
import UserEdit from './resources/users/UserEdit';
import UserCreate from './resources/users/UserCreate';
import OrderList from './resources/orders/OrderList';
import OrderShow from './resources/orders/OrderShow';
import ProductList from './resources/products/ProductList';
import { ProductEdit, ProductCreate } from './resources/products/ProductEdit';
import RuleList from './resources/rules/RuleList';
import { RuleEdit, RuleCreate } from './resources/rules/RuleEdit';
import PromptList from './resources/prompts/PromptList';
import { PromptEdit, PromptCreate } from './resources/prompts/PromptEdit';
import ReportList from './resources/reports/ReportList';
import ReportShow from './resources/reports/ReportShow';
import ChartList from './resources/charts/ChartList';
import ChartShow from './resources/charts/ChartShow';
import ConsultationList from './resources/consultations/ConsultationList';
import ConsultationShow from './resources/consultations/ConsultationShow';
import DistributorList from './resources/distributors/DistributorList';
import DistributorEdit from './resources/distributors/DistributorEdit';
import DistributorCreate from './resources/distributors/DistributorCreate';
import CommissionList from './resources/commissions/CommissionList';
import CustomerList from './resources/crm/CustomerList';
import { CustomerEdit, CustomerCreate } from './resources/crm/CustomerEdit';
import MasterList from './resources/masters/MasterList';
import MasterEdit from './resources/masters/MasterEdit';
import AiConfigPage from './resources/ai-config/AiConfigPage';
import SiteConfigPage from './resources/site-config/SiteConfigPage';
import PaymentConfigPage from './resources/payment-config/PaymentConfigPage';
import PromotionConfigPage from './resources/promotion-config/PromotionConfigPage';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ChatSessionList from './resources/chat-sessions/ChatSessionList';
import ChatSessionShow from './resources/chat-sessions/ChatSessionShow';
import CardKeyList from './resources/card-keys/CardKeyList';
import CardKeyShow from './resources/card-keys/CardKeyShow';
import BalanceTransactionList from './resources/balance-transactions/BalanceTransactionList';
import TokenPricingList from './resources/token-pricing/TokenPricingList';
import { TokenPricingEdit, TokenPricingCreate } from './resources/token-pricing/TokenPricingEdit';
import TokenUsageList from './resources/token-usage/TokenUsageList';
import TokenConfigPage from './pages/TokenConfigPage';
import AgentReferralsPage from './pages/AgentReferralsPage';
import AgentSubAgentsPage from './pages/AgentSubAgentsPage';
import AgentPosterPage from './pages/AgentPosterPage';
import PairingConfigPage from './pages/PairingConfigPage';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import TuneIcon from '@mui/icons-material/Tune';

const getRole = (): string => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'viewer';
    return JSON.parse(userStr).role || 'viewer';
  } catch { return 'viewer'; }
};

const DashboardSwitcher = () => {
  if (getRole() === 'agent') return <AgentDashboard />;
  return <Dashboard />;
};

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    theme={theme}
    dashboard={DashboardSwitcher}
    layout={CustomLayout}
    loginPage={CustomLoginPage}
    title="ShengRi 管理后台"
  >
    <Resource
      name="users"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
      icon={PeopleIcon}
      options={{ label: '用户管理' }}
    />
    <Resource
      name="orders"
      list={OrderList}
      show={OrderShow}
      icon={ShoppingCartIcon}
      options={{ label: '订单管理' }}
    />
    <Resource
      name="products"
      list={ProductList}
      edit={ProductEdit}
      create={ProductCreate}
      icon={InventoryIcon}
      options={{ label: '产品管理' }}
    />
    <Resource
      name="rules"
      list={RuleList}
      edit={RuleEdit}
      create={RuleCreate}
      icon={RuleIcon}
      options={{ label: '规则引擎' }}
    />
    <Resource
      name="prompts"
      list={PromptList}
      edit={PromptEdit}
      create={PromptCreate}
      icon={ChatIcon}
      options={{ label: 'Prompt管理' }}
    />
    <Resource
      name="reports"
      list={ReportList}
      show={ReportShow}
      icon={AssessmentIcon}
      options={{ label: '报告管理' }}
    />
    <Resource
      name="charts"
      list={ChartList}
      show={ChartShow}
      icon={AutoGraphIcon}
      options={{ label: '命盘管理' }}
    />
    <Resource
      name="consultations"
      list={ConsultationList}
      show={ConsultationShow}
      icon={ForumIcon}
      options={{ label: '咨询管理' }}
    />
    <Resource
      name="chat_sessions"
      list={ChatSessionList}
      show={ChatSessionShow}
      icon={ChatBubbleOutlineIcon}
      options={{ label: '对话管理' }}
    />
    <Resource name="chat_messages" />
    <Resource
      name="card_keys"
      list={CardKeyList}
      show={CardKeyShow}
      icon={VpnKeyIcon}
      options={{ label: '卡密管理' }}
    />
    <Resource
      name="balance_transactions"
      list={BalanceTransactionList}
      icon={AccountBalanceWalletIcon}
      options={{ label: '余额流水' }}
    />
    <Resource
      name="distributors"
      list={DistributorList}
      edit={DistributorEdit}
      create={DistributorCreate}
      icon={ShareIcon}
      options={{ label: '分销管理' }}
    />
    <Resource
      name="commission_records"
      list={CommissionList}
      icon={ReceiptIcon}
      options={{ label: '佣金记录' }}
    />
    <Resource
      name="crm_customers"
      list={CustomerList}
      edit={CustomerEdit}
      create={CustomerCreate}
      icon={ContactsIcon}
      options={{ label: 'CRM客户' }}
    />
    <Resource
      name="masters"
      list={MasterList}
      edit={MasterEdit}
      icon={PersonIcon}
      options={{ label: '命理师' }}
    />
    <Resource
      name="token_pricings"
      list={TokenPricingList}
      edit={TokenPricingEdit}
      create={TokenPricingCreate}
      icon={MonetizationOnIcon}
      options={{ label: 'Token定价' }}
    />
    <Resource
      name="token_usages"
      list={TokenUsageList}
      icon={DataUsageIcon}
      options={{ label: 'Token消耗' }}
    />
    <CustomRoutes>
      <Route path="/ai-config" element={<AiConfigPage />} />
      <Route path="/site-config" element={<SiteConfigPage />} />
      <Route path="/payment-config" element={<PaymentConfigPage />} />
      <Route path="/promotion-config" element={<PromotionConfigPage />} />
      <Route path="/token-config" element={<TokenConfigPage />} />
      <Route path="/agent-referrals" element={<AgentReferralsPage />} />
      <Route path="/agent-sub-agents" element={<AgentSubAgentsPage />} />
      <Route path="/agent-poster" element={<AgentPosterPage />} />
      <Route path="/pairing-config" element={<PairingConfigPage />} />
    </CustomRoutes>
  </Admin>
);

export default App;
