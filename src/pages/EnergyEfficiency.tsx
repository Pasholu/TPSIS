import {
  Alert,
  Box,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { fetchEnergy, errorMessage, type EnergyData } from '@/services/api';

type MetricType = 'fuel' | 'electricity' | 'production';

const NEUTRAL_THRESHOLD = 0.5;
const mono = { fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.02em' };
const tooltipStyle = { backgroundColor: '#262220', border: '1px solid #34302C', borderRadius: '8px' };

const getMetricStatus = (type: MetricType, change: number | null) => {
  if (change === null || Math.abs(change) < NEUTRAL_THRESHOLD) {
    return { color: '#A39C94', Icon: TrendingFlatIcon, label: 'без изменений' };
  }
  const increased = change > 0;
  // Для топлива и электричества рост — плохо, для выпуска продукции — хорошо.
  const good = type === 'production' ? increased : !increased;
  return {
    color: good ? '#3FA65B' : '#E5484D',
    Icon: increased ? TrendingUpIcon : TrendingDownIcon,
    label: `${increased ? 'рост' : 'снижение'} ${Math.abs(change).toFixed(1)}%`,
  };
};

const MetricCard = ({
  label,
  value,
  unit,
  change,
  type,
  padded,
}: {
  label: string;
  value: number | null;
  unit: string;
  change: number | null;
  type: MetricType;
  padded: boolean;
}) => {
  const status = getMetricStatus(type, change);
  const Icon = status.Icon;
  return (
    <Card>
      <CardContent sx={{ p: padded ? 3 : 2 }}>
        <Typography variant="body2" sx={{ color: '#A39C94', mb: 1.5 }}>
          {label}
        </Typography>
        <Typography sx={{ ...mono, fontSize: padded ? '32px' : '24px', fontWeight: 700, color: '#F2EFEA', mb: 1.5 }}>
          {value === null ? '—' : value.toFixed(1)}
          <Typography component="span" sx={{ fontSize: padded ? '16px' : '14px', ml: 1, fontFamily: '"Archivo", sans-serif' }}>
            {unit}
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 18, color: status.color }} />
          <Typography variant="caption" sx={{ color: status.color, fontWeight: 600 }}>
            {status.label} к предыдущей смене
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" sx={{ color: '#A39C94', display: 'block', fontSize: '10px' }}>
      {label}
    </Typography>
    <Typography sx={{ color: '#F2EFEA', fontSize: '12px', ...mono }}>{value}</Typography>
  </Box>
);

const fmt = (v: number | null, digits = 1) => (v === null ? '—' : v.toFixed(digits));

export const EnergyEfficiency = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const [data, setData] = useState<EnergyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetchEnergy();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hourly = (data?.hourly ?? [])
    .filter((h) => h.fuel !== null)
    .map((h) => ({
      time: new Date(h.hour).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      consumption: Number(h.fuel),
    }));
  const fuelValues = hourly.map((h) => h.consumption);
  const fuelDomain: [number, number] | undefined = fuelValues.length
    ? [Math.floor(Math.min(...fuelValues) - 2), Math.ceil(Math.max(...fuelValues) + 2)]
    : undefined;

  return (
    <Box sx={{ backgroundColor: '#12100E', minHeight: '100vh', pb: 4 }}>
      <Paper elevation={0} sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C', p: 3, mb: 3 }}>
        <Container maxWidth={false}>
          <Typography variant="h5" sx={{ color: '#F2EFEA', fontWeight: 600 }}>
            Панель энергоэффективности
          </Typography>
          <Typography variant="body2" sx={{ color: '#A39C94', mt: 1 }}>
            Технолог - Мониторинг удельного расхода топлива и электроэнергии
          </Typography>
        </Container>
      </Paper>

      <Container maxWidth={false}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!data && !error && (
          <Typography sx={{ color: '#A39C94', py: 4, textAlign: 'center' }}>{loading ? 'Загрузка...' : 'Нет данных.'}</Typography>
        )}

        {data && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: isMd ? 3 : 2 }}>
                <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                  Удельный расход топлива за 24 часа (среднее по печам)
                </Typography>
                <ResponsiveContainer width="100%" height={isMd ? 350 : 250}>
                  <LineChart data={hourly} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#34302C" />
                    <XAxis dataKey="time" stroke="#A39C94" tick={{ fontSize: 12 }} minTickGap={20} />
                    <YAxis stroke="#A39C94" tick={{ fontSize: 12 }} domain={fuelDomain} label={{ value: 'кг/т', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#F2EFEA' }}
                      cursor={false}
                      formatter={(value: number) => [`${value.toFixed(1)} кг/т`, 'Расход топлива']}
                    />
                    <Line type="monotone" dataKey="consumption" stroke="#2FBFA8" strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Grid container spacing={isMd ? 3 : 2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard label="Удельный расход топлива" value={data.totals.fuel} unit="кг/т" change={data.changes.fuel} type="fuel" padded={isMd} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard label="Расход электроэнергии" value={data.totals.electricity} unit="кВт·ч/т" change={data.changes.electricity} type="electricity" padded={isMd} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard label="Выпуск продукции (8 ч)" value={data.totals.production} unit="т/смену" change={data.changes.production} type="production" padded={isMd} />
              </Grid>
            </Grid>

            <Card>
              <CardContent sx={{ p: isMd ? 3 : 2 }}>
                <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                  Сравнение печей по удельному расходу топлива
                </Typography>
                <ResponsiveContainer width="100%" height={isMd ? 300 : 250}>
                  <BarChart data={data.furnaces} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#34302C" />
                    <XAxis type="number" stroke="#A39C94" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <YAxis type="category" dataKey="furnace_name" stroke="#A39C94" tick={{ fontSize: 12 }} width={140} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#F2EFEA' }}
                      cursor={false}
                      formatter={(value: number) => `${value.toFixed(1)} кг/т`}
                    />
                    <Legend />
                    <Bar dataKey="fuel" fill="#2FBFA8" name="Расход топлива (кг/т)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #34302C' }}>
                  <Typography variant="body2" sx={{ color: '#A39C94', mb: 1.5, fontWeight: 600 }}>
                    Детальные показатели по печам (последние 8 часов)
                  </Typography>
                  <Stack spacing={1}>
                    {data.furnaces.map((f) => (
                      <Paper
                        key={f.furnace_id}
                        sx={{
                          p: 1.5,
                          backgroundColor: '#262220',
                          border: '1px solid #34302C',
                          borderRadius: '6px',
                          display: 'grid',
                          gridTemplateColumns: isMd ? '2fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                          gap: isMd ? 2 : 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#F2EFEA', fontWeight: 600, gridColumn: isMd ? 'auto' : '1 / -1' }}>
                          {f.furnace_name}
                        </Typography>
                        <Metric label="Топливо" value={`${fmt(f.fuel)} кг/т`} />
                        <Metric label="Электричество" value={`${fmt(f.electricity)} кВт·ч/т`} />
                        <Metric label="Производство" value={`${fmt(f.production, 0)} т/см`} />
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </Container>
    </Box>
  );
};
