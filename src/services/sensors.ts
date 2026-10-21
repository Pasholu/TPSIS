export type Status = 'normal' | 'warning' | 'critical';

export interface RawReading {
  reading_time: string;
  temperature: number;
  pressure: number;
  fuel_consumption: number;
  o2_percent: number;
  cao_pct: number;
  sio2_pct: number;
  al2o3_pct: number;
}

type Field = 'temperature' | 'fuel_consumption' | 'o2_percent' | 'cao_pct' | 'sio2_pct' | 'al2o3_pct';

interface ParamSpec {
  field: Field;
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  setpoint: number;
}

export const PARAMS: ParamSpec[] = [
  { field: 'temperature', id: 'temp-zone', name: 'Температура зоны спекания', unit: '°C', min: 1400, max: 1500, setpoint: 1450 },
  { field: 'fuel_consumption', id: 'fuel-consumption', name: 'Расход топлива', unit: 'кг/т', min: 170, max: 200, setpoint: 190 },
  { field: 'o2_percent', id: 'o2-exhaust', name: 'Содержание O₂ в отходящих газах', unit: '%', min: 2.5, max: 4, setpoint: 3 },
  { field: 'cao_pct', id: 'cao', name: 'Содержание CaO', unit: '%', min: 62, max: 66, setpoint: 64 },
  { field: 'sio2_pct', id: 'sio2', name: 'Содержание SiO2', unit: '%', min: 19.5, max: 21, setpoint: 20 },
  { field: 'al2o3_pct', id: 'al2o3', name: 'Содержание Al2O3', unit: '%', min: 5, max: 6.5, setpoint: 5.8 },
];

export const getStatus = (value: number, min: number, max: number): Status => {
  if (value < min || value > max) return 'critical';
  const margin = (max - min) * 0.1;
  if (value < min + margin || value > max - margin) return 'warning';
  return 'normal';
};

const fmtTime = (iso: string, withSeconds = false) =>
  new Date(iso).toLocaleTimeString('ru-RU', withSeconds ? undefined : { hour: '2-digit', minute: '2-digit' });

export const buildDashboard = (readings: RawReading[]) => {
  if (readings.length === 0) return null;
  const last = readings[readings.length - 1];

  const params = PARAMS.map((p) => {
    const current = Number(last[p.field]);
    return {
      ...p,
      current,
      status: getStatus(current, p.min, p.max),
      trend: readings.slice(-12).map((r) => Number(r[p.field])),
    };
  });

  const trendData = readings.map((r) => ({
    time: fmtTime(r.reading_time),
    temperature: Number(r.temperature),
    pressure: Number(r.pressure),
    oxygen: Number(r.o2_percent),
  }));

  const time = fmtTime(last.reading_time, true);
  const problems = params.filter((p) => p.status !== 'normal');
  const alerts =
    problems.length === 0
      ? [{ id: 'ok', time, message: 'Норма - все параметры в норме', severity: 'success' as const }]
      : problems.map((p) => ({
          id: p.id,
          time,
          message:
            p.status === 'critical'
              ? `Авария - ${p.name} вне допуска (${p.current.toFixed(1)} ${p.unit})`
              : `Внимание - ${p.name} у границы допуска (${p.current.toFixed(1)} ${p.unit})`,
          severity: (p.status === 'critical' ? 'error' : 'warning') as 'error' | 'warning',
        }));

  return { params, trendData, alerts };
};
