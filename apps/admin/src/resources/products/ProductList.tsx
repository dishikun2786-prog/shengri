import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  SearchInput,
  SelectInput,
  EditButton,
  CreateButton,
  FilterButton,
  TopToolbar,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MoneyField from '../../components/MoneyField';
import { PRODUCT_CATEGORIES } from '../../constants';

const productFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索产品名/编码" />,
  <SelectInput source="category" label="分类" choices={PRODUCT_CATEGORIES} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const CATEGORY_MAP: Record<string, string> = {
  free: '免费', lead: '引流', standard: '标准', premium: '高端', enterprise: '企业', vip: 'VIP',
};

const ProductList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={productFilters} actions={<ListActions />} sort={{ field: 'sortOrder', order: 'ASC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => r.name || '-'}
          secondaryText={(r) => `${CATEGORY_MAP[r.category] || r.category} · ¥${Number(r.currentPrice || 0).toFixed(2)}`}
          tertiaryText={(r) => r.isActive ? '启用' : '停用'}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="productCode" label="产品编码" />
          <TextField source="name" label="名称" />
          <TextField source="category" label="分类" />
          <TextField source="reportType" label="报告类型" />
          <MoneyField source="originalPrice" label="原价" />
          <MoneyField source="currentPrice" label="现价" />
          <TextField source="commissionRateL1" label="一级佣金率" />
          <TextField source="commissionRateL2" label="二级佣金率" />
          <BooleanField source="isActive" label="启用" />
          <TextField source="sortOrder" label="排序" />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default ProductList;
