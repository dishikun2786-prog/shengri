import { defaultTheme } from 'react-admin';

const theme = {
  ...defaultTheme,
  palette: {
    primary: {
      main: '#c44520',
      light: '#d86a4a',
      dark: '#8a3016',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dca310',
      light: '#e6b840',
      dark: '#9a720b',
      contrastText: '#fff',
    },
    background: {
      default: '#fdf8f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d2d2d',
      secondary: '#666666',
    },
    error: { main: '#d32f2f' },
    warning: { main: '#ed6c02' },
    info: { main: '#0288d1' },
    success: { main: '#2e7d32' },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      '"KaiTi"',
      '"STKaiti"',
      '"楷体"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    ...defaultTheme.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #c44520 0%, #8a3016 100%)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        containedPrimary: {
          background: 'linear-gradient(135deg, #c44520 0%, #d86a4a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8a3016 0%, #c44520 100%)',
          },
        },
        root: {
          textTransform: 'none' as const,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.85rem',
        },
        head: {
          fontWeight: 600,
          color: '#2d2d2d',
          backgroundColor: '#fdf8f4',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        sizeSmall: {
          fontSize: '0.75rem',
          height: 24,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
        size: 'small' as const,
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
        },
      },
    },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          '&.RaMenuItemLink-active': {
            borderLeft: '3px solid #c44520',
            backgroundColor: 'rgba(196,69,32,0.08)',
          },
        },
      },
    },
    RaDatagrid: {
      styleOverrides: {
        root: {
          '& .RaDatagrid-headerCell': {
            fontWeight: 600,
            backgroundColor: '#fdf8f4',
          },
        },
      },
    },
  },
};

export default theme;
