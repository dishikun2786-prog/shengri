import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  ReferenceManyField,
  Datagrid,
  Pagination,
  TopToolbar,
  DeleteButton,
  FunctionField,
} from 'react-admin';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ForumIcon from '@mui/icons-material/Forum';
import SectionCard from '../../components/SectionCard';

const ChatSessionShowActions = () => (
  <TopToolbar>
    <DeleteButton mutationMode="pessimistic" />
  </TopToolbar>
);

const ChatSessionShow = () => (
  <Show actions={<ChatSessionShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="uuid" label="会话 UUID" />
      <ReferenceField source="userId" reference="users" link="show" label="用户">
        <TextField source="nickname" />
      </ReferenceField>
      <ReferenceField source="reportId" reference="reports" link="show" label="报告">
        <TextField source="uuid" />
      </ReferenceField>
      <TextField source="title" empty="—" />
      <NumberField source="messageCount" />
      <DateField source="lastMessageAt" showTime empty="—" />
      <NumberField source="status" />
      <TextField source="mem0UserId" label="Mem0 User" empty="—" />
      <TextField source="mem0AgentId" label="Mem0 Agent" empty="—" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />

      <Box sx={{ mt: 2, width: '100%' }}>
        <SectionCard title="消息时间线" icon={<ForumIcon />}>
          <ReferenceManyField
            reference="chat_messages"
            target="sessionId"
            label={false}
            perPage={25}
            sort={{ field: 'createdAt', order: 'ASC' }}
          >
            <Datagrid bulkActionButtons={false} rowClick={false}>
              <TextField source="id" />
              <TextField source="role" />
              <FunctionField
                source="content"
                label="内容预览"
                render={(record: { content?: string }) => {
                  const t = record?.content || '';
                  if (t.length <= 200) {
                    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxWidth: 480 }}>{t}</Typography>;
                  }
                  return (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxWidth: 480 }}>
                      {t.slice(0, 200)}…
                    </Typography>
                  );
                }}
              />
              <TextField source="model" empty="—" />
              <NumberField source="tokenUsed" empty="—" />
              <NumberField source="feedbackScore" empty="—" />
              <DateField source="createdAt" showTime />
            </Datagrid>
            <Pagination />
          </ReferenceManyField>
        </SectionCard>
      </Box>
    </SimpleShowLayout>
  </Show>
);

export default ChatSessionShow;
