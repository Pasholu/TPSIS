import { Box, Card, CardContent, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { StatusBadge } from './StatusBadge';

interface SensorCardProps {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  min: number;
  max: number;
  trend: number[];
}

export const SensorCard = ({
  name,
  value,
  unit,
  status,
  min,
  max,
  trend,
}: SensorCardProps) => {
  const trendData = trend.map((val, idx) => ({ idx, value: val }));

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#A39C94', fontSize: '12px' }}>
            {name}
          </Typography>
          <StatusBadge status={status} />
        </Box>

        <Box sx={{ my: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '32px',
                fontWeight: 700,
                color: '#F2EFEA',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              {value.toFixed(1)}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Archivo", sans-serif',
                fontSize: '14px',
                color: '#A39C94',
              }}
            >
              {unit}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 60, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
              <XAxis dataKey="idx" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2FBFA8"
                isAnimationActive={false}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Typography variant="caption" sx={{ color: '#7C746C', fontSize: '11px' }}>
          Диапазон: {min} - {max} {unit}
        </Typography>
      </CardContent>
    </Card>
  );
};
