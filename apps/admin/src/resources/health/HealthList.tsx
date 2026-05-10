import { List, Datagrid, TextField, DateField, FunctionField, SearchInput } from 'react-admin';
const filters = [<SearchInput source="q" alwaysOn key="q" />];
export default function HealthList() {
  return (<List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}><Datagrid rowClick="show" bulkActionButtons={false}>
    <TextField source="id" label="ID" />
    <TextField source="targetDate" label="日期" />
    <FunctionField label="干支" render={(r:any) => `${r.yearGan}${r.yearZhi}`} />
    <TextField source="yearYun" label="岁运" />
    <TextField source="sitian" label="司天" />
    <TextField source="zaiquan" label="在泉" />
    <TextField source="userId" label="用户ID" />
    <DateField source="createdAt" label="创建时间" showTime />
  </Datagrid></List>);
}
