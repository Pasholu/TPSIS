import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#12100E',
      paper: '#1C1917',
    },
    primary: {
      main: '#2FBFA8',
      light: '#4DCCB8',
      dark: '#1FA897',
    },
    success: {
      main: '#3FA65B',
      dark: '#16241A',
    },
    warning: {
      main: '#E0A32E',
      dark: '#2A2009',
    },
    error: {
      main: '#E5484D',
      dark: '#2C1214',
    },
    text: {
      primary: '#F2EFEA',
      secondary: '#A39C94',
      disabled: '#4A443F',
    },
    divider: '#34302C',
  },
  typography: {
    fontFamily: '"Archivo", sans-serif',
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2,
      fontFamily: '"Archivo", sans-serif',
    },
    h2: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.3,
      fontFamily: '"Archivo", sans-serif',
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
      fontFamily: '"Archivo", sans-serif',
    },
    h4: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4,
      fontFamily: '"Archivo", sans-serif',
    },
    h5: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.5,
      fontFamily: '"Archivo", sans-serif',
    },
    body1: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: '"Archivo", sans-serif',
    },
    body2: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: '"Archivo", sans-serif',
    },
    caption: {
      fontSize: '11px',
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#7C746C',
      fontFamily: '"Archivo", sans-serif',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '14px',
          textTransform: 'none',
          fontFamily: '"Archivo", sans-serif',
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#2FBFA8',
            color: '#12100E',
            '&:hover': {
              backgroundColor: '#4DCCB8',
            },
            '&:active': {
              backgroundColor: '#1FA897',
            },
            '&:disabled': {
              backgroundColor: '#4A443F',
              color: '#262220',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: '#34302C',
            color: '#F2EFEA',
            fontFamily: '"Archivo", sans-serif',
            '&:hover': {
              borderColor: '#2FBFA8',
              backgroundColor: 'rgba(47, 191, 168, 0.1)',
            },
            '&:active': {
              borderColor: '#1FA897',
              backgroundColor: 'rgba(47, 191, 168, 0.2)',
            },
          },
          '&.MuiButton-containedError': {
            backgroundColor: '#E5484D',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#f55a61',
            },
          },
        },
        sizeMedium: {
          height: '48px',
          padding: '12px 24px',
        },
        sizeSmall: {
          height: '38px',
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1C1917',
          borderColor: '#34302C',
          borderWidth: '1px',
          borderStyle: 'solid',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#262220',
            '& fieldset': {
              borderColor: '#34302C',
            },
            '&:hover fieldset': {
              borderColor: '#2FBFA8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2FBFA8',
              borderWidth: '2px',
            },
          },
          '& .MuiOutlinedInput-input': {
            fontFamily: '"Archivo", sans-serif',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: '"Archivo", sans-serif',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          borderBottom: 'none',
        },
        indicator: {
          display: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#A39C94',
          textTransform: 'none',
          fontSize: '14px',
          fontWeight: 500,
          minHeight: '48px',
          padding: '8px 16px',
          marginRight: '8px',
          borderRadius: '8px',
          border: '1px solid #34302C',
          backgroundColor: 'transparent',
          fontFamily: '"Archivo", sans-serif',
          '&.Mui-selected': {
            color: '#F2EFEA',
            backgroundColor: '#262220',
            borderColor: '#2FBFA8',
          },
          '&:hover': {
            borderColor: '#2FBFA8',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: '"Archivo", sans-serif',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 375,
      md: 768,
      lg: 1440,
      xl: 1920,
    },
  },
});

export default darkTheme;
