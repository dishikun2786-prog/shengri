import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  ReferenceField,
  SelectInput,
  TopToolbar,
  FilterButton,
  ExportButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MoneyField from '../../components/MoneyField';

const COMMISSION_STATUS_LABELS: Record<number, string> = { 0: '待结算', 1: '已结算', 2: '已取消' };
const LEVEL_LABELS: Record<number, string> = { 1: '一级', 2: '二级' };

const commissionFilters = [
  <SelectInput
    source="commissionLevel"
    label="佣金级别"
    alwaysOn
    choices={[
      { id: 1, name: '一级' },
      { id: 2, name: '二级' },
    ]}
  />,
  <SelectInput
    source="status"
    label="状态"
    choices={[
      { id: 0, name: '待结算' },
      { id: 1, name: '已结算' },
      { id: 2, name: '已取消' },
    ]}
  />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const CommissionList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List
      resource="commission_records"
      filters={commissionFilters}
      actions={<ListActions />}
      sort={{ field: 'id', order: 'DESC' }}
    >
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `分销商 ${r.distributorId} · ${LEVEL_LABELS[r.commissionLevel] || r.commissionLevel}`}
          secondaryText={(r) => `¥${Number(r.commissionAmount || 0).toFixed(2)}`}
          tertiaryText={(r) => COMMISSION_STATUS_LABELS[r.status] || '未知'}
          linkType={false}
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <ReferenceField source="distributorId" reference="distributors" label="分销商" link="edit">
            <TextField source="id" />
          </ReferenceField>
          <TextField source="orderId" label="订单ID" />
          <TextField source="buyerId" label="买家ID" />
          <NumberField source="commissionLevel" label="级别" />
          <NumberField source="commissionRate" label="比例" options={{ style: 'percent' }} />
          <MoneyField source="commissionAmount" label="佣金" />
          <MoneyField source="orderAmount" label="订单金额" />
          <TextField source="status" label="状态" />
          <DateField source="settledAt" label="结算时间" showTime />
          <DateField source="createdAt" label="创建时间" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default CommissionList;
