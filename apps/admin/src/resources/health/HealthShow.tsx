import { Show, SimpleShowLayout, TextField, DateField, FunctionField, ArrayField } from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';
export default function HealthShow() {
  return (<Show><SimpleShowLayout>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <Box><Typography variant="subtitle2">基本信息</Typography><TextField source="id" /><TextField source="uuid" /><TextField source="userId" /><TextField source="targetDate" label="日期" /></Box>
      <Box><Typography variant="subtitle2">五运六气</Typography><FunctionField label="干支" render={(r:any) => `${r.yearGan}${r.yearZhi}`} /><TextField source="yearYun" label="岁运" /><TextField source="sitian" label="司天" /><TextField source="zaiquan" label="在泉" /><TextField source="mainYun" label="主运" /><TextField source="keQi" label="客气" /></Box>
    </Box>
    <Divider sx={{my:2}} />
    <Typography variant="subtitle2" gutterBottom>体质分析</Typography>
    <FunctionField label="体质" render={(r:any) => (<Box sx={{display:'flex',flexWrap:'wrap',gap:1}}>{r.constitution ? Object.entries(r.constitution.scores||{}).sort((a:any,b:any)=>b[1]-a[1]).slice(0,3).map(([k,v]:any)=>(<Chip key={k} label={`${k}: ${v}分`} variant="outlined" size="small" color={k===r.constitution.primary?'primary':'default'} />)) : '-'}</Box>)} />
    <Divider sx={{my:2}} />
    <Typography variant="subtitle2" gutterBottom>关联报告</Typography>
    <ArrayField source="reports"><FunctionField render={(r:any) => (<Chip label={`${r.record?.reportType||'-'} · ${r.record?.uuid?.slice(0,8)||'-'}`} size="small" />)} /></ArrayField>
    <DateField source="createdAt" showTime />
  </SimpleShowLayout></Show>);
}
