import { Box, Paper, Typography, Stack } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

interface Alert {
  id: string;
  time: string;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
}

interface AlertListProps {
  alerts: Alert[];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'success':
      return '#3FA65B';
    case 'warning':
      return '#E0A32E';
    case 'error':
      return '#E5484D';
    case 'info':
      return '#2FBFA8';
    default:
      return '#A39C94';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'success':
      return CheckCircleIcon;
    case 'warning':
      return WarningIcon;
    case 'error':
      return ErrorIcon;
    case 'info':
      return InfoIcon;
    default:
      return InfoIcon;
  }
};

export const AlertList = ({ alerts }: AlertListProps) => {
  return (
    <Stack spacing={1}>
      {alerts.map((alert) => {
        const Icon = getSeverityIcon(alert.severity);
        const color = getSeverityColor(alert.severity);

        return (
          <Paper
            key={alert.id}
            sx={{
              p: 1.5,
              backgroundColor: '#262220',
              border: `1px solid ${color}`,
              borderRadius: '8px',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
            }}
          >
            <Icon sx={{ fontSize: 20, color, mt: 0.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#7C746C', fontSize: '10px', display: 'block' }}>
                {alert.time}
              </Typography>
              <Typography variant="body2" sx={{ color: '#F2EFEA', fontSize: '12px', mt: 0.5 }}>
                {alert.message}
              </Typography>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
};
