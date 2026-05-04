import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  FunctionField,
  TextInput,
  SelectInput,
  FilterButton,
  TopToolbar,
  ExportButton,
  SearchInput,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import StatusField from '../../components/StatusField';
import MoneyField from '../../components/MoneyField';
import { VIP_LEVELS, IDENTITY_TYPES, USER_STATUS } from '../../constants';

const userFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索手机号/昵称" />,
  <SelectInput source="vipLevel" label="VIP等级" choices={VIP_LEVELS} />,
  <SelectInput source="identityType" label="身份类型" choices={IDENTITY_TYPES} />,
  <SelectInput source="status" label="状态" choices={USER_STATUS} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const VIP_MAP: Record<number, string> = { 0: '免费', 1: '基础VIP', 2: '高级VIP', 3: '企业VIP' };
const IDENTITY_MAP: Record<number, string> = { 0: '普通', 1: '企业老板', 2: '投资人', 3: '高净值' };

const UserList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={userFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.nickname || r.phone || '-'}`}
          secondaryText={(r) => {
            const vip = VIP_MAP[r.vipLevel] || '';
            const identity = IDENTITY_MAP[r.identityType] || '';
            return [vip, identity].filter(Boolean).join(' · ');
          }}
          tertiaryText={(r) => `¥${Number(r.totalSpent || 0).toFixed(2)}`}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="username" label="用户名" />
          <TextField source="phone" label="手机号" />
          <TextField source="nickname" label="昵称" />
          <TextField source="role" label="角色" />
          <StatusField source="vipLevel" type="vip" label="VIP等级" />
          <TextField source="identityType" label="身份" />
          <MoneyField source="balance" label="余额" />
          <MoneyField source="totalSpent" label="累计消费" />
          <FunctionField
            source="sourceChannel"
            label="渠道/推荐人"
            render={(r: any) => {
              const channel = r.sourceChannel || '—';
              if (r.referrerId) {
                return `${channel} (ID:${r.referrerId})`;
              }
              return channel;
            }}
          />
          <StatusField source="status" type="user" label="状态" />
          <DateField source="createdAt" label="注册时间" showTime />
          <DateField source="lastLoginAt" label="最后登录" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default UserList;
