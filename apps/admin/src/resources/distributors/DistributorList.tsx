import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  SearchInput,
  SelectInput,
  EditButton,
  CreateButton,
  TopToolbar,
  FilterButton,
  ExportButton,
  SimpleList,
  FunctionField,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import MoneyField from '../../components/MoneyField';
import StatusField from '../../components/StatusField';
import { DISTRIBUTOR_LEVELS, DISTRIBUTOR_STATUS } from '../../constants';

const DIST_STATUS_LABELS: Record<number, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  0: { label: '待审核', color: 'warning' },
  1: { label: '正常', color: 'success' },
  2: { label: '冻结', color: 'error' },
};
const LEVEL_LABELS: Record<number, string> = { 1: '普通', 2: '金牌', 3: '钻石' };

const distributorFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索分销商" />,
  <SelectInput source="level" label="等级" choices={DISTRIBUTOR_LEVELS} />,
  <SelectInput source="status" label="状态" choices={DISTRIBUTOR_STATUS} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const DistributorList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={distributorFilters} actions={<ListActions />} sort={{ field: 'totalEarnings', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => {
            const uid = r.userId ? `用户 #${r.userId}` : '未知用户';
            const lv = LEVEL_LABELS[r.level] || `Lv${r.level}`;
            return `${uid} · ${lv}`;
          }}
          secondaryText={(r) => {
            const st = DIST_STATUS_LABELS[r.status] || DIST_STATUS_LABELS[1];
            return `收益 ¥${Number(r.totalEarnings || 0).toFixed(2)} · 待结算 ¥${Number(r.pendingAmount || 0).toFixed(2)} · ${st.label}`;
          }}
          tertiaryText={(r) => {
            const d = r.approvedAt ? `审核于 ${new Date(r.approvedAt).toLocaleDateString('zh-CN')}` : '';
            return d || '';
          }}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="userId" label="用户ID" />
          <FunctionField
            source="level"
            label="等级"
            render={(r: { level?: number }) => {
              const lv = LEVEL_LABELS[r.level || 1];
              return <Chip label={lv} size="small" color={r.level === 3 ? 'info' : r.level === 2 ? 'warning' : 'default'} variant="outlined" />;
            }}
          />
          <MoneyField source="totalEarnings" label="总收益" />
          <MoneyField source="withdrawnAmount" label="已提现" />
          <MoneyField source="pendingAmount" label="待结算" />
          <NumberField source="totalOrders" label="总订单" />
          <NumberField source="totalTeamSize" label="团队人数" />
          <StatusField source="status" type="distributor" label="状态" />
          <DateField source="approvedAt" label="审核时间" showTime />
          <DateField source="createdAt" label="创建时间" showTime />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default DistributorList;
