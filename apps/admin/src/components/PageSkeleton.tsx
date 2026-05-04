import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';

interface PageSkeletonProps {
  type?: 'list' | 'detail' | 'form';
}

const ListSkeleton = () => (
  <Box>
    <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 0.5 }} />
    ))}
  </Box>
);

const DetailSkeleton = () => (
  <Grid container spacing={2}>
    {[...Array(6)].map((_, i) => (
      <Grid item xs={12} sm={6} key={i}>
        <Skeleton variant="text" width="40%" sx={{ mb: 0.5 }} />
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      </Grid>
    ))}
  </Grid>
);

const FormSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, i) => (
      <Box key={i} sx={{ mb: 3 }}>
        <Skeleton variant="text" width="30%" sx={{ mb: 0.5 }} />
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
    <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1, mt: 2 }} />
  </Box>
);

const PageSkeleton = ({ type = 'list' }: PageSkeletonProps) => (
  <Box sx={{ p: 2 }}>
    {type === 'list' && <ListSkeleton />}
    {type === 'detail' && <DetailSkeleton />}
    {type === 'form' && <FormSkeleton />}
  </Box>
);

export default PageSkeleton;
