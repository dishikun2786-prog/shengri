import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  SearchInput,
  SelectInput,
  FilterButton,
  TopToolbar,
  ExportButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import StatusField from '../../components/StatusField';
import MoneyField from '../../components/MoneyField';
import { ORDER_STATUS } from '../../constants';

const ORDER_STATUS_LABELS: Record<number, string> = {
  0: '待付款', 1: '已付款', 2: '已完成', 3: '退款中', 4: '已退款', 5: '已取消',
};

const orderFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索订单号" />,
  <SelectInput source="status" label="状态" choices={ORDER_STATUS} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const OrderList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={orderFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => r.orderNo || '-'}
          secondaryText={(r) => `${r.product?.name || '-'} · ¥${Number(r.paidAmount || 0).toFixed(2)}`}
          tertiaryText={(r) => ORDER_STATUS_LABELS[r.status] || '未知'}
          linkType="show"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="show" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="orderNo" label="订单号" />
          <ReferenceField source="userId" reference="users" label="用户" link="edit">
            <TextField source="nickname" />
          </ReferenceField>
          <ReferenceField source="productId" reference="products" label="产品" link={false}>
            <TextField source="name" />
          </ReferenceField>
          <MoneyField source="originalAmount" label="原价" />
          <MoneyField source="paidAmount" label="实付" />
          <TextField source="paymentMethod" label="支付方式" />
          <StatusField source="status" type="order" label="状态" />
          <DateField source="createdAt" label="创建时间" showTime />
          <DateField source="paidAt" label="支付时间" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default OrderList;
