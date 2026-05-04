import {
  Show,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  useRecordContext,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SectionCard from '../../components/SectionCard';
import StatusField from '../../components/StatusField';
import InfoIcon from '@mui/icons-material/Info';
import PaymentIcon from '@mui/icons-material/Payment';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ScheduleIcon from '@mui/icons-material/Schedule';

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Box>{children}</Box>
  </Box>
);

const ConsultationShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard title="基本信息" icon={<InfoIcon fontSize="small" />}>
            <FieldRow label="咨询单号"><TextField source="consultationNo" /></FieldRow>
            <FieldRow label="状态"><StatusField source="status" type="consultation" /></FieldRow>
            <FieldRow label="类型"><TextField source="consultationType" /></FieldRow>
            <FieldRow label="用户ID"><TextField source="userId" /></FieldRow>
            <FieldRow label="命理师">
              <ReferenceField source="masterId" reference="masters" link="edit">
                <TextField source="displayName" />
              </ReferenceField>
            </FieldRow>
          </SectionCard>

          <SectionCard title="咨询内容" icon={<QuestionAnswerIcon fontSize="small" />}>
            <FieldRow label="主题"><TextField source="topic" /></FieldRow>
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>问题</Typography>
              <TextField source="question" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }} />
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="金额明细" icon={<PaymentIcon fontSize="small" />}>
            <FieldRow label="支付金额"><NumberField source="paidAmount" options={{ style: 'currency', currency: 'CNY' }} /></FieldRow>
            <FieldRow label="命理师收入"><NumberField source="masterEarning" options={{ style: 'currency', currency: 'CNY' }} /></FieldRow>
            <FieldRow label="平台分成"><NumberField source="platformFee" options={{ style: 'currency', currency: 'CNY' }} /></FieldRow>
          </SectionCard>

          <SectionCard title="时间线" icon={<ScheduleIcon fontSize="small" />}>
            <FieldRow label="创建时间"><DateField source="createdAt" showTime /></FieldRow>
            <FieldRow label="接单时间"><DateField source="acceptedAt" showTime /></FieldRow>
            <FieldRow label="完成时间"><DateField source="completedAt" showTime /></FieldRow>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const ConsultationShow = () => (
  <Show title="咨询详情">
    <ConsultationShowContent />
  </Show>
);

export default ConsultationShow;
