import { List, Datagrid, TextField, DateField, FunctionField, SearchInput } from 'react-admin';

const RESULT_LABELS: Record<number, string> = {
  1: '大安', 2: '留连', 3: '速喜', 4: '赤口', 5: '小吉', 6: '空亡',
};

const RESULT_COLORS: Record<number, string> = {
  1: '#16a34a', 2: '#ea580c', 3: '#16a34a', 4: '#dc2626', 5: '#0d9488', 6: '#6b7280',
};

const filters = [<SearchInput source="q" alwaysOn key="q" placeholder="搜索掌诀名/用户ID..." />];

export default function XiaoliurenList() {
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="id" label="ID" />
        <FunctionField
          label="掌诀结果"
          render={(r: any) => (
            <span style={{
              color: 'white', backgroundColor: RESULT_COLORS[r.resultPosition] || '#6b7280',
              padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            }}>
              {r.resultName || RESULT_LABELS[r.resultPosition] || '-'}
            </span>
          )}
        />
        <FunctionField label="推算方式" render={(r: any) => r.inputType === 'time' ? '时间推算' : '随机数推算'} />
        <TextField source="userId" label="用户ID" />
        <TextField source="question" label="所问事项" emptyText="-" />
        <DateField source="createdAt" label="创建时间" showTime />
      </Datagrid>
    </List>
  );
}
