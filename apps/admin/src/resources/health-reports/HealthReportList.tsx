import { List, Datagrid, TextField, NumberField, DateField, BooleanField, ReferenceField, FunctionField, SearchInput, FilterButton, TopToolbar, ExportButton } from 'react-admin';
import { Chip } from '@mui/material';
const filters = [<SearchInput source="q" alwaysOn placeholder="搜索UUID" />];
const ListActions = () => (<TopToolbar><FilterButton /><ExportButton /></TopToolbar>);
export default function HealthReportList() {
  return (<List resource="reports" filters={filters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }} filterDefaultValues={{ reportType: 'health' }}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="id" label="ID" />
      <TextField source="uuid" label="UUID" />
      <ReferenceField source="userId" reference="users" label="用户" link="edit"><TextField source="nickname" /></ReferenceField>
      <FunctionField label="类型" render={() => (<Chip size="small" label="健康分析" sx={{fontWeight:600,fontSize:12,bgcolor:'#d1fae5',color:'#065f46',border:'1px solid',borderColor:'#6ee7b7'}} />)} />
      <TextField source="aiProvider" label="AI提供商" />
      <NumberField source="aiTokenUsed" label="Token" />
      <NumberField source="viewCount" label="浏览" />
      <BooleanField source="isPaid" label="付费" />
      <DateField source="createdAt" label="创建时间" showTime />
    </Datagrid>
  </List>);
}
