import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical';
  label?: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const colors = useMemo(() => {
    switch (status) {
      case 'normal':
        return { bg: '#16241A', text: '#3FA65B' };
      case 'warning':
        return { bg: '#2A2009', text: '#E0A32E' };
      case 'critical':
        return { bg: '#2C1214', text: '#E5484D' };
      default:
        return { bg: '#262220', text: '#A39C94' };
    }
  }, [status]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'normal':
        return label || 'Норма';
      case 'warning':
        return label || 'Внимание';
      case 'critical':
        return label || 'Авария';
      default:
        return 'Неизвестно';
    }
  }, [status, label]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '6px 12px',
        borderRadius: '6px',
        minWidth: '70px',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Archivo", sans-serif',
          fontWeight: 600,
          fontSize: '11px',
          color: colors.text,
        }}
      >
        {statusLabel}
      </Typography>
    </Box>
  );
};
