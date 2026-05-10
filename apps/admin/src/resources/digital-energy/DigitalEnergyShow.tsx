import { Show, SimpleShowLayout, TextField, DateField, FunctionField } from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';

export default function DigitalEnergyShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="phone" label="手机号" />
        <TextField source="userId" label="用户ID" />
        <DateField source="createdAt" label="创建时间" showTime />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>八星分析</Typography>
        <FunctionField label="数字对" render={(r: any) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(r.stars || []).map((g: any, i: number) => (
              <Chip key={i} label={`${g.pair} → ${g.star}`} variant="outlined"
                color={g.luck?.includes('吉') ? 'success' : 'error'} size="small" />
            ))}
          </Box>
        )} />
        <FunctionField label="主导星" render={(r: any) => r.stats?.dominantStar || '-'} />
        <FunctionField label="吉星占比" render={(r: any) => `${r.stats?.luckyPercent || 0}%`} />
        <TextField source="question" label="所问事项" emptyText="-" />
      </SimpleShowLayout>
    </Show>
  );
}
