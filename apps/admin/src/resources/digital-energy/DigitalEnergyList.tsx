import { List, Datagrid, TextField, DateField, FunctionField, SearchInput } from 'react-admin';

const filters = [<SearchInput source="q" alwaysOn key="q" placeholder="搜索手机号..." />];

export default function DigitalEnergyList() {
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="id" label="ID" />
        <TextField source="phone" label="手机号" />
        <FunctionField label="主导星" render={(r: any) => r.stats?.dominantStar || '-'} />
        <FunctionField label="吉星占比" render={(r: any) => r.stats?.luckyPercent != null ? `${r.stats.luckyPercent}%` : '-'} />
        <TextField source="userId" label="用户ID" />
        <DateField source="createdAt" label="创建时间" showTime />
      </Datagrid>
    </List>
  );
}
