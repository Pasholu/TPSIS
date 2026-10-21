import {
  Alert,
  Box,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Stack,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  fetchReferences,
  createReference,
  updateReference,
  deleteReference,
  uploadReferenceFile,
  deleteReferenceFile,
  referenceFileUrl,
  errorMessage,
  type ReferenceCategory,
  type ReferenceItem,
  type ReferencesData,
} from '@/services/api';

interface Field {
  key: 'name' | 'value' | 'description' | 'strength' | 'price' | 'url';
  label: string;
  required: boolean;
  numeric?: boolean;
  multiline?: boolean;
  hint?: string;
}

const TEXT_FIELDS: Field[] = [
  { key: 'name', label: 'Название', required: true },
  { key: 'value', label: 'Значение', required: true },
  { key: 'description', label: 'Описание', required: false, multiline: true },
];

const FIELDS: Record<ReferenceCategory, Field[]> = {
  cementTypes: [
    { key: 'name', label: 'Марка', required: true },
    { key: 'value', label: 'Стандарт', required: false },
    { key: 'strength', label: 'Прочность, МПа', required: true, numeric: true },
    { key: 'price', label: 'Цена, ₽/т', required: false, numeric: true },
  ],
  tempRegimes: TEXT_FIELDS,
  tolerances: [
    { key: 'name', label: 'Элемент', required: true },
    { key: 'value', label: 'Допуск', required: true, hint: 'Диапазон, например 62.0-66.0%. Используется для проверки лабораторных проб (CaO, MgO).' },
    { key: 'description', label: 'Описание', required: false, multiline: true },
  ],
  recipes: TEXT_FIELDS,
  standards: [
    ...TEXT_FIELDS,
    { key: 'url', label: 'Ссылка на документ', required: false, hint: 'Необязательно: адрес, начиная с http:// или https://. PDF-файл можно прикрепить при редактировании записи.' },
  ],
};

const MAX_PDF_MB = 20;

const DocumentLink = ({ item }: { item: ReferenceItem }) => {
  const href = item.hasFile ? referenceFileUrl(item.id) : item.url || null;
  if (!href) {
    return (
      <Typography variant="caption" sx={{ color: '#7C746C' }}>
        Нет документа
      </Typography>
    );
  }
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="small"
      variant="outlined"
      startIcon={<OpenInNewIcon />}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {item.hasFile ? 'Открыть PDF' : 'Открыть ссылку'}
    </Button>
  );
};

const CATEGORY_LABELS: Record<ReferenceCategory, string> = {
  cementTypes: 'Марки цемента',
  tempRegimes: 'Температурные режимы',
  tolerances: 'Допуски по элементам',
  recipes: 'Рецептуры смесей',
  standards: 'Нормативные документы',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ReferenceCategory[];

type FormValues = Record<string, string>;

const toFormValues = (fields: Field[], item?: ReferenceItem): FormValues =>
  Object.fromEntries(fields.map((f) => [f.key, item ? String(item[f.key] ?? '') : '']));

const buildPayload = (fields: Field[], values: FormValues): { payload?: Partial<ReferenceItem>; error?: string } => {
  const payload: Record<string, string | number | null> = {};
  for (const f of fields) {
    const raw = (values[f.key] ?? '').trim();
    if (raw === '') {
      if (f.required) return { error: `Заполните поле «${f.label}»` };
      payload[f.key] = f.numeric ? null : '';
      continue;
    }
    if (f.numeric) {
      const n = Number(raw.replace(',', '.'));
      if (!Number.isFinite(n)) return { error: `Поле «${f.label}» должно быть числом` };
      payload[f.key] = n;
    } else {
      payload[f.key] = raw;
    }
  }
  return { payload: payload as Partial<ReferenceItem> };
};

const FieldInputs = ({ fields, values, onChange }: { fields: Field[]; values: FormValues; onChange: (key: string, v: string) => void }) => (
  <Stack spacing={2}>
    {fields.map((f) => (
      <TextField
        key={f.key}
        label={f.label}
        value={values[f.key] ?? ''}
        onChange={(e) => onChange(f.key, e.target.value)}
        helperText={f.hint}
        required={f.required}
        multiline={f.multiline}
        rows={f.multiline ? 2 : undefined}
        fullWidth
        size="small"
      />
    ))}
  </Stack>
);

export const ReferencesAdmin = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));

  const [selectedCategory, setSelectedCategory] = useState<ReferenceCategory>('cementTypes');
  const [data, setData] = useState<ReferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<FormValues>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newValues, setNewValues] = useState<FormValues>({});
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<ReferenceItem | null>(null);

  const fields = FIELDS[selectedCategory];
  const tableFields = fields.filter((f) => f.key !== 'url');
  const isStandards = selectedCategory === 'standards';
  const currentData = data ? data[selectedCategory] : [];
  const editingItem = currentData.find((i) => i.id === editId) ?? null;

  useEffect(() => {
    fetchReferences()
      .then((d) => {
        setData(d);
        setPageError(null);
      })
      .catch((err) => setPageError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const closeEdit = () => {
    setEditId(null);
    setEditValues({});
    setEditError(null);
  };

  const handleSelectCategory = (category: ReferenceCategory) => {
    setSelectedCategory(category);
    closeEdit();
  };

  const handleSelectRow = (item: ReferenceItem) => {
    setEditId(item.id);
    setEditValues(toFormValues(fields, item));
    setEditError(null);
  };

  const replaceItems = (category: ReferenceCategory, fn: (items: ReferenceItem[]) => ReferenceItem[]) =>
    setData((prev) => (prev ? { ...prev, [category]: fn(prev[category]) } : prev));

  const handleSaveEdit = async () => {
    if (editId === null) return;
    const { payload, error } = buildPayload(fields, editValues);
    if (!payload) return setEditError(error ?? 'Проверьте поля');
    setSaving(true);
    try {
      const saved = await updateReference(selectedCategory, editId, payload);
      replaceItems(selectedCategory, (items) => items.map((i) => (i.id === saved.id ? saved : i)));
      closeEdit();
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || editId === null) return;
    if (file.size > MAX_PDF_MB * 1024 * 1024) return setEditError(`Файл больше ${MAX_PDF_MB} МБ`);
    setFileBusy(true);
    setEditError(null);
    try {
      const saved = await uploadReferenceFile(editId, file);
      replaceItems('standards', (items) => items.map((i) => (i.id === saved.id ? saved : i)));
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setFileBusy(false);
    }
  };

  const handleRemoveFile = async () => {
    if (editId === null) return;
    setFileBusy(true);
    setEditError(null);
    try {
      const saved = await deleteReferenceFile(editId);
      replaceItems('standards', (items) => items.map((i) => (i.id === saved.id ? saved : i)));
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setFileBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const item = toDelete;
    setToDelete(null);
    try {
      await deleteReference(selectedCategory, item.id);
      replaceItems(selectedCategory, (items) => items.filter((i) => i.id !== item.id));
      if (editId === item.id) closeEdit();
      setPageError(null);
    } catch (err) {
      setPageError(errorMessage(err));
    }
  };

  const openDialog = () => {
    setNewValues(toFormValues(fields));
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleAddItem = async () => {
    const { payload, error } = buildPayload(fields, newValues);
    if (!payload) return setDialogError(error ?? 'Проверьте поля');
    setSaving(true);
    try {
      const created = await createReference(selectedCategory, payload);
      replaceItems(selectedCategory, (items) => [...items, created]);
      setDialogOpen(false);
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const cellValue = (item: ReferenceItem, f: Field) => {
    const v = item[f.key];
    return v === null || v === undefined || v === '' ? '—' : String(v);
  };

  const headCell = { color: '#A39C94', fontWeight: 600, fontSize: '12px' };

  return (
    <Box sx={{ backgroundColor: '#12100E', minHeight: '100vh', pb: 4 }}>
      <Paper elevation={0} sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C', p: 3, mb: 3 }}>
        <Container maxWidth={false}>
          <Typography variant="h5" sx={{ color: '#F2EFEA', fontWeight: 600 }}>
            Справочники и ГОСТы
          </Typography>
          <Typography variant="body2" sx={{ color: '#A39C94', mt: 1 }}>
            Администратор - Управление справочниками рецептур и нормативными документами
          </Typography>
        </Container>
      </Paper>

      <Container maxWidth={false}>
        {pageError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
            {pageError}
          </Alert>
        )}
        <Grid container spacing={isMd ? 3 : 2}>
          {isMd && (
            <Grid item md={3}>
              <Card>
                <CardContent sx={{ p: 0 }}>
                  <List disablePadding>
                    {CATEGORIES.map((category, idx) => (
                      <Box key={category}>
                        <ListItemButton
                          selected={selectedCategory === category}
                          onClick={() => handleSelectCategory(category)}
                          sx={{
                            backgroundColor: selectedCategory === category ? '#262220' : 'transparent',
                            '&.Mui-selected': { backgroundColor: '#262220', borderLeft: '3px solid #2FBFA8' },
                          }}
                        >
                          <ListItemText
                            primary={CATEGORY_LABELS[category]}
                            primaryTypographyProps={{
                              sx: {
                                color: selectedCategory === category ? '#F2EFEA' : '#A39C94',
                                fontWeight: selectedCategory === category ? 600 : 400,
                              },
                            }}
                          />
                        </ListItemButton>
                        {idx < CATEGORIES.length - 1 && <Divider sx={{ borderColor: '#34302C' }} />}
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} md={9}>
            {!isMd && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1} direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {CATEGORIES.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleSelectCategory(category)}
                        sx={{ fontSize: '11px' }}
                      >
                        {CATEGORY_LABELS[category]}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: isMd ? 3 : 2, pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600 }}>
                    {CATEGORY_LABELS[selectedCategory]}
                  </Typography>
                  <Button variant="contained" color="primary" startIcon={<AddIcon />} size="small" onClick={openDialog} disabled={!data}>
                    Добавить
                  </Button>
                </Box>

                {loading ? (
                  <Typography sx={{ color: '#A39C94', py: 3, textAlign: 'center' }}>Загрузка...</Typography>
                ) : !data ? null : currentData.length === 0 ? (
                  <Typography sx={{ color: '#A39C94', py: 3, textAlign: 'center' }}>Записей пока нет.</Typography>
                ) : isMd ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#262220' }}>
                          {tableFields.map((f) => (
                            <TableCell key={f.key} sx={headCell}>
                              {f.label}
                            </TableCell>
                          ))}
                          {isStandards && <TableCell sx={headCell}>Документ</TableCell>}
                          <TableCell align="center" sx={headCell}>
                            Действие
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentData.map((row) => (
                          <TableRow
                            key={row.id}
                            sx={{
                              backgroundColor: editId === row.id ? '#262220' : 'transparent',
                              borderBottom: '1px solid #34302C',
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: '#262220' },
                            }}
                            onClick={() => handleSelectRow(row)}
                          >
                            {tableFields.map((f) => (
                              <TableCell
                                key={f.key}
                                sx={{ color: f.key === 'description' ? '#A39C94' : '#F2EFEA', fontSize: f.key === 'description' ? '11px' : '12px', py: 1 }}
                              >
                                {cellValue(row, f)}
                              </TableCell>
                            ))}
                            {isStandards && (
                              <TableCell sx={{ py: 1 }}>
                                <DocumentLink item={row} />
                              </TableCell>
                            )}
                            <TableCell align="center" sx={{ py: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setToDelete(row);
                                }}
                              >
                                Удалить
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Stack spacing={1}>
                    {currentData.map((row) => (
                      <Paper
                        key={row.id}
                        sx={{
                          p: 1.5,
                          backgroundColor: '#262220',
                          border: editId === row.id ? '2px solid #2FBFA8' : '1px solid #34302C',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSelectRow(row)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            {tableFields.map((f, i) => (
                              <Typography
                                key={f.key}
                                variant="caption"
                                sx={{ color: i === 0 ? '#F2EFEA' : '#A39C94', display: 'block', fontWeight: i === 0 ? 600 : 400, fontSize: '12px', mt: i === 0 ? 0 : 0.5 }}
                              >
                                {i === 0 ? '' : `${f.label}: `}
                                {cellValue(row, f)}
                              </Typography>
                            ))}
                            {isStandards && (
                              <Box sx={{ mt: 1 }}>
                                <DocumentLink item={row} />
                              </Box>
                            )}
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setToDelete(row);
                            }}
                            sx={{ fontSize: '10px' }}
                          >
                            Удалить
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {editingItem && (
              <Card sx={{ mt: 3, mb: 2, backgroundColor: '#1C1917', borderColor: '#2FBFA8', borderWidth: '2px', borderStyle: 'solid' }}>
                <CardContent sx={{ p: isMd ? 3 : 2 }}>
                  <Typography variant="h6" sx={{ color: '#F2EFEA', fontWeight: 600, mb: 2 }}>
                    Редактирование записи: <span style={{ color: '#2FBFA8' }}>{editingItem.name}</span>
                  </Typography>
                  <Stack spacing={2}>
                    {editError && <Alert severity="error">{editError}</Alert>}
                    <FieldInputs fields={fields} values={editValues} onChange={(k, v) => setEditValues((p) => ({ ...p, [k]: v }))} />
                    {isStandards && (
                      <Box sx={{ border: '1px dashed #34302C', borderRadius: '8px', p: 2 }}>
                        <Typography variant="body2" sx={{ color: '#A39C94', mb: 1 }}>
                          PDF-файл документа (до {MAX_PDF_MB} МБ)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {editingItem.hasFile ? (
                            <>
                              <Typography sx={{ color: '#F2EFEA', fontSize: '13px', mr: 1 }}>{editingItem.fileName}</Typography>
                              <DocumentLink item={editingItem} />
                              <Button size="small" variant="outlined" color="error" onClick={handleRemoveFile} disabled={fileBusy}>
                                Удалить файл
                              </Button>
                            </>
                          ) : (
                            <Typography sx={{ color: '#7C746C', fontSize: '13px', mr: 1 }}>Файл не прикреплён</Typography>
                          )}
                          <Button component="label" size="small" variant="contained" startIcon={<UploadFileIcon />} disabled={fileBusy}>
                            {fileBusy ? 'Загрузка...' : editingItem.hasFile ? 'Заменить PDF' : 'Загрузить PDF'}
                            <input type="file" hidden accept="application/pdf,.pdf" onChange={handleFileChosen} />
                          </Button>
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveEdit} disabled={saving} fullWidth>
                        {saving ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                      <Button variant="outlined" startIcon={<CancelIcon />} onClick={closeEdit} disabled={saving} fullWidth>
                        Отменить
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#F2EFEA' }}>Добавить новую запись</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <FieldInputs fields={fields} values={newValues} onChange={(k, v) => setNewValues((p) => ({ ...p, [k]: v }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>
            Отменить
          </Button>
          <Button onClick={handleAddItem} variant="contained" color="primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle sx={{ color: '#F2EFEA' }}>Удалить запись?</DialogTitle>
        <DialogContent>
          <DialogContentText>Запись «{toDelete?.name}» будет удалена без возможности восстановления.</DialogContentText>
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
