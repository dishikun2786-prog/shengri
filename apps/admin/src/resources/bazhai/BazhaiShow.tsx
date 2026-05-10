import { Show, SimpleShowLayout, TextField, NumberField, DateField, FunctionField } from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';
export default function BazhaiShow() {
  return (<Show><SimpleShowLayout>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <Box><Typography variant="subtitle2">基本信息</Typography><TextField source="id" /><TextField source="uuid" /><TextField source="userId" /></Box>
      <Box><Typography variant="subtitle2">命卦</Typography><FunctionField label="命卦" render={(r:any) => <Chip label={`${r.kuaNumber}${r.trigram}`} sx={{fontSize:20,fontWeight:700,px:2,py:3}} />} /><TextField source="group" /><NumberField source="birthYear" /><FunctionField label="性别" render={(r:any) => r.gender === 1 ? '♂男' : '♀女'} /></Box>
    </Box>
    <Divider sx={{my:2}} />
    <Typography variant="subtitle2" gutterBottom>八方位吉凶</Typography>
    <FunctionField label="方位" render={(r:any) => (<Box sx={{display:'flex',flexWrap:'wrap',gap:1}}>{(r.directions||[]).map((d:any,i:number) => (<Chip key={i} label={`${d.direction}→${d.star}(${d.luck})`} variant="outlined" color={d.luck.includes('吉')?'success':'error'} size="small" />))}</Box>)} />
    <DateField source="createdAt" showTime />
  </SimpleShowLayout></Show>);
}
