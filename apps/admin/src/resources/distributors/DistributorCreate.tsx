import {
  Create,
  SimpleForm,
  NumberInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  required,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import { DISTRIBUTOR_LEVELS, DISTRIBUTOR_STATUS } from '../../constants';

const F = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const DistributorCreate = () => (
  <Create title="新建分销商" redirect="list">
    <SimpleForm>
      <Grid container spacing={2}>
        <F>
          <ReferenceInput source="userId" reference="users" fullWidth>
            <AutocompleteInput
              label="选择用户"
              optionText={(r: { nickname?: string; id?: number; phone?: string }) =>
                `${r.nickname || '用户'} (#${r.id})${r.phone ? ` ${r.phone}` : ''}`
              }
              validate={required()}
              fullWidth
            />
          </ReferenceInput>
        </F>
        <F>
          <SelectInput source="level" label="等级" defaultValue={1} choices={DISTRIBUTOR_LEVELS} fullWidth />
        </F>
        <F>
          <NumberInput source="commissionRate" label="佣金比例" defaultValue={0.15} step={0.01} min={0} max={1} fullWidth
            helperText="例：0.15 = 15%"
          />
        </F>
        <F>
          <SelectInput source="status" label="状态" defaultValue={1} choices={DISTRIBUTOR_STATUS} fullWidth
            helperText="手动创建默认无需审核"
          />
        </F>
      </Grid>
    </SimpleForm>
  </Create>
);

export default DistributorCreate;
