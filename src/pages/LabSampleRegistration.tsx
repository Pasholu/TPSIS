import {
  Alert,
  Box,
  Container,
  Grid,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Pagination,
  useMediaQuery,
  useTheme,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { StatusBadge } from '@/components';
import {
  fetchLabSamples,
  createLabSample,
  deleteLabSample,
  fetchFurnaces,
  fetchCementGrades,
  fetchLabLimits,
  errorMessage,
  type Furnace,
  type CementGrade,
  type LabSampleRow,
  type LabLimits,
} from '@/services/api';

const EMPTY_FORM = { sampleId: '', furnace: '', cementType: '', cao: '', mgo: '', notes: '' };

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const parseValue = (raw: string) => (raw.trim() === '' ? NaN : Number(raw.replace(',', '.')));

const outOfRange = (value: number, range?: { min: number; max: number }) =>
  range !== undefined && Number.isFinite(value) && (value < range.min || value > range.max);

const sampleStatus = (passed: boolean | null) =>
  passed === false ? { status: 'critical' as const, label: 'Брак' } : { status: 'normal' as const, label: 'Одобрено' };

export const LabSampleRegistration = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [attempted, setAttempted] = useState(false);
  const [samples, setSamples] = useState<LabSampleRow[]>([]);
  const [furnaces, setFurnaces] = useState<Furnace[]>([]);
  const [grades, setGrades] = useState<CementGrade[]>([]);
  const [limits, setLimits] = useState<LabLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LabSampleRow | null>(null);
  const [page, setPage] = useState(1);

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(samples.length / itemsPerPage));
  const displayedSamples = samples.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const reloadSamples = useCallback(async () => {
    setSamples(await fetchLabSamples());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [furnaceData, gradeData, limitData] = await Promise.all([
          fetchFurnaces(),
          fetchCementGrades(),
          fetchLabLimits(),
        ]);
        setFurnaces(furnaceData);
        setGrades(gradeData);
        setLimits(limitData);
        setFormData((prev) => ({
          ...prev,
          furnace: prev.furnace || String(furnaceData[0]?.furnace_id ?? ''),
          cementType: prev.cementType || String(gradeData[0]?.grade_id ?? ''),
        }));
        await reloadSamples();
        setLoadError(null);
      } catch (err) {
        setLoadError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reloadSamples]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const cao = parseValue(formData.cao);
  const mgo = parseValue(formData.mgo);
  const fieldError = (value: number, raw: string, force = false) => {
    if (!attempted && !force && raw === '') return null;
    if (raw.trim() === '') return 'Обязательное поле';
    if (!Number.isFinite(value)) return 'Введите число';
    if (value < 0 || value > 100) return 'Значение от 0 до 100';
    return null;
  };
  const caoError = fieldError(cao, formData.cao);
  const mgoError = fieldError(mgo, formData.mgo);

  const helper = (error: string | null, value: number, range?: { min: number; max: number }) => {
    if (error) return error;
    if (!range) return undefined;
    if (outOfRange(value, range)) return `Вне допуска ${range.min}–${range.max}% — проба будет отмечена как брак`;
    return `Допуск ${range.min}–${range.max}%`;
  };

  const handleSubmit = async () => {
    setAttempted(true);
    setNotice(null);
    setSubmitError(null);
    const invalid =
      fieldError(cao, formData.cao, true) !== null ||
      fieldError(mgo, formData.mgo, true) !== null ||
      !formData.furnace ||
      !formData.cementType;
    if (invalid) return;

    setSubmitting(true);
    try {
      const result = await createLabSample({
        sample_code: formData.sampleId,
        furnace_id: Number(formData.furnace),
        grade_id: Number(formData.cementType),
        cao,
        mgo,
        notes: formData.notes,
      });
      await reloadSamples();
      setPage(1);
      setFormData((prev) => ({ ...EMPTY_FORM, furnace: prev.furnace, cementType: prev.cementType }));
      setAttempted(false);
      setNotice(result.passed ? 'Проба сохранена: соответствует допускам.' : 'Проба сохранена: не соответствует допускам (брак).');
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData((prev) => ({ ...EMPTY_FORM, furnace: prev.furnace, cementType: prev.cementType }));
    setAttempted(false);
    setSubmitError(null);
    setNotice(null);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLabSample(toDelete.sample_id);
      setToDelete(null);
      await reloadSamples();
    } catch (err) {
      setToDelete(null);
      setLoadError(errorMessage(err));
    }
  };

  const numberCell = {
    color: '#F2EFEA',
    fontSize: '12px',
    py: 1,
    fontFamily: '"JetBrains Mono", monospace',
    letterSpacing: '0.02em',
  };
  const headCell = { color: '#A39C94', fontWeight: 600, fontSize: '12px' };

  return (
    <Box sx={{ backgroundColor: '#12100E', minHeight: '100vh', pb: 4 }}>
      <Paper elevation={0} sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C', p: 3, mb: 3 }}>
        <Container maxWidth={false}>
          <Typography variant="h5" sx={{ color: '#F2EFEA', fontWeight: 600 }}>
            Регистрация лабораторной пробы
          </Typography>
          <Typography variant="body2" sx={{ color: '#A39C94', mt: 1 }}>
            Лаборант ОТК - Регистрация результатов анализа цемента
          </Typography>
        </Container>
      </Paper>

      <Container maxWidth={false}>
        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError(null)}>
            {loadError}
          </Alert>
        )}
        <Grid container spacing={isMd ? 3 : 2}>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent sx={{ p: isMd ? 3 : 2 }}>
                <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                  Форма регистрации
                </Typography>

                <Stack spacing={2}>
                  {submitError && <Alert severity="error">{submitError}</Alert>}
                  {notice && (
                    <Alert severity="success" onClose={() => setNotice(null)}>
                      {notice}
                    </Alert>
                  )}

                  <TextField
                    label="ID пробы"
                    name="sampleId"
                    value={formData.sampleId}
                    onChange={handleInputChange}
                    placeholder="Оставьте пустым — присвоится автоматически"
                    fullWidth
                    size="small"
                    variant="outlined"
                    inputProps={{ maxLength: 50 }}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Печь</InputLabel>
                    <Select
                      name="furnace"
                      value={formData.furnace}
                      onChange={handleInputChange}
                      label="Печь"
                      variant="outlined"
                      endAdornment={null}
                      disabled={furnaces.length === 0}
                    >
                      {furnaces.map((f) => (
                        <MenuItem key={f.furnace_id} value={String(f.furnace_id)}>
                          {f.furnace_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Марка цемента</InputLabel>
                    <Select
                      name="cementType"
                      value={formData.cementType}
                      onChange={handleInputChange}
                      label="Марка цемента"
                      variant="outlined"
                      endAdornment={null}
                      disabled={grades.length === 0}
                    >
                      {grades.map((g) => (
                        <MenuItem key={g.grade_id} value={String(g.grade_id)}>
                          {g.grade_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Содержание CaO (%)"
                    name="cao"
                    type="number"
                    value={formData.cao}
                    onChange={handleInputChange}
                    inputProps={{ step: '0.1', min: '0', max: '100' }}
                    error={caoError !== null}
                    helperText={helper(caoError, cao, limits?.cao)}
                    FormHelperTextProps={{ sx: { color: caoError ? undefined : outOfRange(cao, limits?.cao) ? '#E0A32E' : '#7C746C' } }}
                    fullWidth
                    size="small"
                    variant="outlined"
                  />

                  <TextField
                    label="Содержание MgO (%)"
                    name="mgo"
                    type="number"
                    value={formData.mgo}
                    onChange={handleInputChange}
                    inputProps={{ step: '0.1', min: '0', max: '100' }}
                    error={mgoError !== null}
                    helperText={helper(mgoError, mgo, limits?.mgo)}
                    FormHelperTextProps={{ sx: { color: mgoError ? undefined : outOfRange(mgo, limits?.mgo) ? '#E0A32E' : '#7C746C' } }}
                    fullWidth
                    size="small"
                    variant="outlined"
                  />

                  <TextField
                    label="Примечание"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    variant="outlined"
                    inputProps={{ maxLength: 1000 }}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="medium"
                      startIcon={<SendIcon />}
                      onClick={handleSubmit}
                      disabled={submitting || loading}
                      fullWidth
                    >
                      {submitting ? 'Отправка...' : 'Отправить результат'}
                    </Button>
                    <Button variant="outlined" size="medium" onClick={handleClear} disabled={submitting} fullWidth>
                      Очистить
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent sx={{ p: isMd ? 3 : 2, pb: 2 }}>
                <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                  История проб
                </Typography>

                {loading ? (
                  <Typography sx={{ color: '#A39C94', py: 3, textAlign: 'center' }}>Загрузка...</Typography>
                ) : samples.length === 0 ? (
                  <Typography sx={{ color: '#A39C94', py: 3, textAlign: 'center' }}>
                    Проб пока нет. Зарегистрируйте первую пробу в форме слева.
                  </Typography>
                ) : isMd ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#262220' }}>
                          <TableCell sx={headCell}>Время</TableCell>
                          <TableCell sx={headCell}>ID пробы</TableCell>
                          <TableCell sx={headCell}>Печь / марка</TableCell>
                          <TableCell align="right" sx={headCell}>CaO (%)</TableCell>
                          <TableCell align="right" sx={headCell}>MgO (%)</TableCell>
                          <TableCell align="center" sx={headCell}>Статус</TableCell>
                          <TableCell align="center" sx={headCell}>Действие</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedSamples.map((sample) => {
                          const s = sampleStatus(sample.passed);
                          return (
                            <TableRow key={sample.sample_id} sx={{ borderBottom: '1px solid #34302C' }}>
                              <TableCell sx={{ color: '#F2EFEA', fontSize: '12px', py: 1 }}>{formatTime(sample.sample_time)}</TableCell>
                              <TableCell sx={{ color: '#F2EFEA', fontSize: '12px', py: 1 }}>
                                {sample.sample_code}
                                {sample.notes && (
                                  <Typography variant="caption" sx={{ color: '#7C746C', display: 'block', maxWidth: 220 }} noWrap title={sample.notes}>
                                    {sample.notes}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ color: '#A39C94', fontSize: '12px', py: 1 }}>
                                {sample.furnace_name} · {sample.grade_name}
                              </TableCell>
                              <TableCell align="right" sx={numberCell}>{Number(sample.cao_pct).toFixed(2)}</TableCell>
                              <TableCell align="right" sx={numberCell}>{Number(sample.mgo_pct).toFixed(2)}</TableCell>
                              <TableCell align="center" sx={{ py: 1 }}>
                                <StatusBadge status={s.status} label={s.label} />
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1 }}>
                                <Button size="small" variant="contained" color="error" onClick={() => setToDelete(sample)}>
                                  Удалить
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Stack spacing={1.5}>
                    {displayedSamples.map((sample) => {
                      const s = sampleStatus(sample.passed);
                      return (
                        <Paper
                          key={sample.sample_id}
                          sx={{ p: 1.5, backgroundColor: '#262220', border: '1px solid #34302C', borderRadius: '8px' }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: '#A39C94', fontSize: '11px' }}>
                                {formatTime(sample.sample_time)} - {sample.sample_code}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#A39C94', fontSize: '11px' }}>
                                {sample.furnace_name} · {sample.grade_name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#F2EFEA', fontSize: '12px', mt: 0.5 }}>
                                CaO: <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{Number(sample.cao_pct).toFixed(2)}%</span>
                                {' | '}
                                MgO: <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{Number(sample.mgo_pct).toFixed(2)}%</span>
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                              <StatusBadge status={s.status} label={s.label} />
                              <Button size="small" variant="contained" color="error" onClick={() => setToDelete(sample)} sx={{ fontSize: '10px' }}>
                                Удалить
                              </Button>
                            </Box>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}

                {samples.length > itemsPerPage && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle sx={{ color: '#F2EFEA' }}>Удалить пробу?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Проба {toDelete?.sample_code} будет удалена без возможности восстановления.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setToDelete(null)}>
            Отменить
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
