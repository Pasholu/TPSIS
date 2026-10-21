import {
  Alert,
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SensorCard, StatusBadge, AlertList } from '@/components';
import {
  fetchFurnaces,
  fetchFurnaceCurrent,
  fetchSensorReadings,
  errorMessage,
  type Furnace,
  type FurnaceCurrent,
} from '@/services/api';
import { buildDashboard } from '@/services/sensors';

type Dashboard = NonNullable<ReturnType<typeof buildDashboard>>;

const mono = { fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.02em' };
const headCell = { color: '#A39C94', fontWeight: 600 };

const numberCell = (value: number) => (
  <TableCell align="right" sx={{ color: '#F2EFEA', fontSize: '12px', py: 1, ...mono }}>
    {value.toFixed(1)}
  </TableCell>
);

export const OperatorDashboard = () => {
  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const [currentFurnace, setCurrentFurnace] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ru-RU'));
  const [furnaces, setFurnaces] = useState<Furnace[]>([]);
  const [current, setCurrent] = useState<FurnaceCurrent | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('ru-RU')), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchFurnaces()
      .then((data) => {
        setFurnaces(data);
        setCurrentFurnace((prev) => prev || String(data[0]?.furnace_id ?? ''));
        if (data.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(errorMessage(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!currentFurnace) return;
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const [readings, info] = await Promise.all([fetchSensorReadings(currentFurnace), fetchFurnaceCurrent(currentFurnace)]);
        if (cancelled) return;
        setDashboard(buildDashboard(readings));
        setCurrent(info);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setDashboard(null);
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentFurnace]);

  const contentGap = isLg ? 3 : 2;
  const furnaceActive = current?.furnace_status === 'Активна';

  return (
    <Box sx={{ backgroundColor: '#12100E', minHeight: '100vh', pb: 4 }}>
      <Paper elevation={0} sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C', p: isMd ? 3 : 2, mb: 2 }}>
        <Container maxWidth={false} sx={{ px: isMd ? 4 : 2 }}>
          <Grid container spacing={isMd ? 3 : 2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="h5" sx={{ color: '#F2EFEA', fontWeight: 600 }}>
                {current?.furnace_name ?? 'Дашборд оператора'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#A39C94', mt: 0.5 }}>
                Марка цемента: {current?.grade_name ?? '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: isMd ? 'center' : 'left' }}>
              <Typography variant="body1" sx={{ color: '#F2EFEA' }}>
                Оператор: {current ? current.operator_name ?? 'не назначен' : '—'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#A39C94', mt: 0.5 }}>
                Смена: {current?.operator_shift ?? '—'} | {currentTime}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: isMd ? 'right' : 'left' }}>
              <Typography variant="caption" sx={{ color: '#7C746C', mr: 1 }}>
                Статус печи
              </Typography>
              {current ? (
                <StatusBadge status={furnaceActive ? 'normal' : 'warning'} label={furnaceActive ? 'Работает' : current.furnace_status} />
              ) : (
                <Typography component="span" sx={{ color: '#7C746C' }}>
                  —
                </Typography>
              )}
            </Grid>
          </Grid>
        </Container>
      </Paper>

      <Paper elevation={0} sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C', mb: 2 }}>
        <Container maxWidth={false} sx={{ px: isMd ? 4 : 2, py: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {furnaces.map((furnace) => {
              const num = String(furnace.furnace_id);
              const selected = currentFurnace === num;
              return (
                <Button
                  key={num}
                  onClick={() => setCurrentFurnace(num)}
                  variant={selected ? 'contained' : 'outlined'}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    border: selected ? '2px solid #2FBFA8' : '1px solid #34302C',
                    backgroundColor: selected ? '#262220' : 'transparent',
                    color: selected ? '#F2EFEA' : '#A39C94',
                    '&:hover': {
                      borderColor: '#2FBFA8',
                      backgroundColor: selected ? '#262220' : 'rgba(47, 191, 168, 0.05)',
                    },
                  }}
                >
                  {furnace.furnace_name}
                </Button>
              );
            })}
          </Box>
        </Container>
      </Paper>

      <Container maxWidth={false} sx={{ px: isMd ? 4 : 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!dashboard && !error && (
          <Typography sx={{ color: '#A39C94', py: 4, textAlign: 'center' }}>
            {loading ? 'Загрузка...' : 'По этой печи нет показаний датчиков.'}
          </Typography>
        )}

        {dashboard && (
          <>
            <Grid container spacing={contentGap} sx={{ mb: 3 }}>
              <Grid
                item
                xs={12}
                md={6}
                lg={3}
                sx={{ display: 'grid', gridTemplateColumns: isMd ? '1fr 1fr' : '1fr', gap: 2, gridColumn: { lg: '1' } }}
              >
                {dashboard.params.slice(0, 3).map((p) => (
                  <SensorCard
                    key={p.id}
                    name={p.name}
                    value={p.current}
                    unit={p.unit}
                    status={p.status}
                    min={p.min}
                    max={p.max}
                    trend={p.trend}
                  />
                ))}
              </Grid>

              <Grid item xs={12} md={12} lg={4}>
                <Card sx={{ height: '100%', minHeight: isMd ? '400px' : '300px' }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
                    <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                      Тренд параметров обжига
                    </Typography>
                    <ResponsiveContainer width="100%" height={isMd ? 300 : 200}>
                      <LineChart data={dashboard.trendData} margin={{ top: 5, right: 0, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#34302C" />
                        <XAxis dataKey="time" stroke="#A39C94" tick={{ fontSize: 10 }} minTickGap={24} />
                        <YAxis yAxisId="temp" stroke="#2FBFA8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(v) => Math.round(v).toString()} />
                        <YAxis yAxisId="aux" orientation="right" stroke="#E0A32E" tick={{ fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#262220', border: '1px solid #34302C', borderRadius: '8px' }}
                          labelStyle={{ color: '#F2EFEA' }}
                          cursor={false}
                          formatter={(value: number, name: string) => [typeof value === 'number' ? value.toFixed(1) : value, name]}
                        />
                        <Legend />
                        <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Температура (°C)" stroke="#2FBFA8" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line yAxisId="aux" type="monotone" dataKey="pressure" name="Давление (кПа)" stroke="#E0A32E" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line yAxisId="aux" type="monotone" dataKey="oxygen" name="O2 (%)" stroke="#E5484D" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {isLg && (
                <Grid item xs={12} lg={5}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                        Алерты и уведомления
                      </Typography>
                      <Box sx={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <AlertList alerts={dashboard.alerts} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {!isLg && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                    Алерты и уведомления
                  </Typography>
                  <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <AlertList alerts={dashboard.alerts} />
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, p: 2 }}>
                  Таблица параметров
                </Typography>
                {isMd ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#262220' }}>
                          <TableCell sx={headCell}>Параметр</TableCell>
                          <TableCell align="right" sx={headCell}>Текущее</TableCell>
                          <TableCell align="right" sx={headCell}>Уставка</TableCell>
                          <TableCell align="right" sx={headCell}>Мин</TableCell>
                          <TableCell align="right" sx={headCell}>Макс</TableCell>
                          <TableCell align="center" sx={headCell}>Статус</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dashboard.params.map((row) => (
                          <TableRow key={row.id} sx={{ borderBottom: '1px solid #34302C' }}>
                            <TableCell sx={{ color: '#F2EFEA', fontSize: '12px', py: 1 }}>{row.name}</TableCell>
                            {numberCell(row.current)}
                            {numberCell(row.setpoint)}
                            {numberCell(row.min)}
                            {numberCell(row.max)}
                            <TableCell align="center" sx={{ py: 1 }}>
                              <StatusBadge status={row.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2 }}>
                    {dashboard.params.map((row) => (
                      <Box key={row.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #34302C', '&:last-child': { borderBottom: 'none' } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#A39C94', fontSize: '11px' }}>
                            {row.name}
                          </Typography>
                          <StatusBadge status={row.status} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '12px' }}>
                          <Typography sx={{ color: '#F2EFEA', ...mono }}>Текущее: {row.current.toFixed(1)}</Typography>
                          <Typography sx={{ color: '#F2EFEA', ...mono }}>Уставка: {row.setpoint.toFixed(1)}</Typography>
                          <Typography sx={{ color: '#F2EFEA', ...mono }}>Мин: {row.min.toFixed(1)}</Typography>
                          <Typography sx={{ color: '#F2EFEA', ...mono }}>Макс: {row.max.toFixed(1)}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Container>
    </Box>
  );
};
