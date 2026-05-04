import { ReactNode } from 'react';
import { List, ListProps, Datagrid, SimpleList } from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface MobileFieldMapping {
  primary: (record: any) => string;
  secondary?: (record: any) => string;
  tertiary?: (record: any) => string;
  linkType?: 'show' | 'edit';
}

interface ResponsiveListProps extends Omit<ListProps, 'children'> {
  desktopColumns: ReactNode;
  mobileFields: MobileFieldMapping;
  children?: never;
}

const ResponsiveList = ({ desktopColumns, mobileFields, ...listProps }: ResponsiveListProps) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List
      {...listProps}
      sx={{
        '& .RaList-main': { overflow: 'hidden' },
        '& .RaList-content': { overflowX: 'auto' },
        ...listProps.sx as any,
      }}
    >
      {isSmall ? (
        <SimpleList
          primaryText={mobileFields.primary}
          secondaryText={mobileFields.secondary}
          tertiaryText={mobileFields.tertiary}
          linkType={mobileFields.linkType || 'show'}
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick={mobileFields.linkType || 'show'} bulkActionButtons={false}>
          {desktopColumns}
        </Datagrid>
      )}
    </List>
  );
};

export default ResponsiveList;
