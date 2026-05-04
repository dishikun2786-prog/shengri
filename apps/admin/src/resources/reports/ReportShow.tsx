import { useState } from 'react';
import {
  Show,
  TextField,
  DateField,
  NumberField,
  BooleanField,
  ReferenceField,
  useRecordContext,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SectionCard from '../../components/SectionCard';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArticleIcon from '@mui/icons-material/Article';

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Box>{children}</Box>
  </Box>
);

const AIContentSection = () => {
  const record = useRecordContext();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(!isSmall);

  if (!record) return null;
  const content = record.aiContent || '';
  const isLong = content.length > 500;
  const displayContent = !expanded && isLong ? content.slice(0, 500) + '...' : content;

  return (
    <SectionCard title="报告内容" icon={<ArticleIcon fontSize="small" />}>
      <Box
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.9,
          fontSize: '0.9rem',
          p: { xs: 1.5, sm: 2 },
          bgcolor: '#fdf8f4',
          borderRadius: 2,
          border: '1px solid rgba(196,69,32,0.1)',
          maxHeight: expanded ? 'none' : 300,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {displayContent}
      </Box>
      {isLong && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ mt: 1, textTransform: 'none' }}
        >
          {expanded ? '收起' : '展开全部'}
        </Button>
      )}
    </SectionCard>
  );
};

const ReportShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard title="基础信息" icon={<InfoIcon fontSize="small" />}>
            <FieldRow label="ID"><TextField source="id" /></FieldRow>
            <FieldRow label="UUID"><TextField source="uuid" /></FieldRow>
            <FieldRow label="报告类型"><TextField source="reportType" /></FieldRow>
            <FieldRow label="付费"><BooleanField source="isPaid" /></FieldRow>
            <FieldRow label="用户">
              <ReferenceField source="userId" reference="users" link="edit">
                <TextField source="nickname" />
              </ReferenceField>
            </FieldRow>
            <FieldRow label="创建时间"><DateField source="createdAt" showTime /></FieldRow>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="AI 参数" icon={<InfoIcon fontSize="small" />}>
            <FieldRow label="AI 提供商"><TextField source="aiProvider" /></FieldRow>
            <FieldRow label="模型"><TextField source="aiModel" /></FieldRow>
            <FieldRow label="Prompt 版本"><TextField source="promptVersion" /></FieldRow>
            <FieldRow label="Token 用量"><NumberField source="aiTokenUsed" /></FieldRow>
          </SectionCard>

          <SectionCard title="统计数据" icon={<BarChartIcon fontSize="small" />}>
            <FieldRow label="浏览次数"><NumberField source="viewCount" /></FieldRow>
            <FieldRow label="分享次数"><NumberField source="shareCount" /></FieldRow>
            <FieldRow label="用户评分"><NumberField source="userRating" /></FieldRow>
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <AIContentSection />
        </Grid>
      </Grid>
    </Box>
  );
};

const ReportShow = () => (
  <Show title="报告详情">
    <ReportShowContent />
  </Show>
);

export default ReportShow;
