import { List, Datagrid, TextField, NumberField, DateField, FunctionField, SearchInput } from 'react-admin';
const filters = [<SearchInput source="q" alwaysOn key="q" />];
export default function BazhaiList() {
  return (<List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}><Datagrid rowClick="show" bulkActionButtons={false}>
    <TextField source="id" label="ID" />
    <FunctionField label="命卦" render={(r:any) => `${r.kuaNumber}${r.trigram}`} />
    <TextField source="group" label="所属" />
    <NumberField source="birthYear" label="出生年" />
    <FunctionField label="性别" render={(r:any) => r.gender === 1 ? '♂男' : '♀女'} />
    <TextField source="userId" label="用户ID" />
    <DateField source="createdAt" label="创建时间" showTime />
  </Datagrid></List>);
}
