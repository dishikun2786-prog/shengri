import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  SearchInput,
  NumberInput,
  TopToolbar,
  FilterButton,
  ShowButton,
} from 'react-admin';

const filters = [
  <SearchInput source="q" alwaysOn placeholder="搜索 UUID / 标题" />,
  <NumberInput source="userId" label="用户 ID" />,
  <NumberInput source="reportId" label="报告 ID" />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
  </TopToolbar>
);

const ChatSessionList = () => (
  <List actions={<ListActions />} filters={filters} sort={{ field: 'lastMessageAt', order: 'DESC' }}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="id" />
      <TextField source="uuid" label="会话 UUID" />
      <ReferenceField source="userId" reference="users" link="show" label="用户">
        <TextField source="nickname" />
      </ReferenceField>
      <ReferenceField source="reportId" reference="reports" link="show" label="报告">
        <TextField source="uuid" />
      </ReferenceField>
      <TextField source="title" label="标题" empty="—" />
      <NumberField source="messageCount" label="消息数" />
      <DateField source="lastMessageAt" label="最后消息" showTime />
      <NumberField source="status" label="状态" />
      <DateField source="createdAt" label="创建时间" showTime />
      <ShowButton />
    </Datagrid>
  </List>
);

export default ChatSessionList;
