const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export class ApiError extends Error {}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError('Нет связи с сервером. Проверьте, что бэкенд запущен.');
  }
  if (!response.ok) {
    let message = `Ошибка сервера (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // тело ответа не JSON — оставляем общее сообщение
    }
    throw new ApiError(message);
  }
  return response.json();
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Неизвестная ошибка');

export interface Furnace {
  furnace_id: number;
  furnace_name: string;
  status: string;
}

export interface CementGrade {
  grade_id: number;
  grade_name: string;
}

export interface LabSampleRow {
  sample_id: number;
  sample_code: string;
  sample_time: string;
  cao_pct: string | null;
  mgo_pct: string | null;
  notes: string | null;
  passed: boolean | null;
  furnace_id: number | null;
  furnace_name: string | null;
  grade_name: string | null;
}

export interface LabLimits {
  cao: { min: number; max: number };
  mgo: { min: number; max: number };
}

export interface NewLabSample {
  sample_code: string;
  furnace_id: number;
  grade_id: number;
  cao: number;
  mgo: number;
  notes: string;
}

export interface FurnaceCurrent {
  furnace_id: number;
  furnace_name: string;
  furnace_status: string;
  operator_name: string | null;
  operator_shift: string | null;
  grade_name: string | null;
}

export interface ReferenceItem {
  id: number;
  name: string;
  value: string;
  description?: string;
  strength?: number | null;
  price?: number | null;
  url?: string;
  hasFile?: boolean;
  fileName?: string | null;
}

export type ReferenceCategory = 'cementTypes' | 'tempRegimes' | 'tolerances' | 'recipes' | 'standards';
export type ReferencesData = Record<ReferenceCategory, ReferenceItem[]>;

export interface EnergyData {
  totals: { fuel: number | null; electricity: number | null; production: number | null };
  changes: { fuel: number | null; electricity: number | null; production: number | null };
  furnaces: Array<{
    furnace_id: number;
    furnace_name: string;
    fuel: number | null;
    electricity: number | null;
    production: number | null;
  }>;
  hourly: Array<{ hour: string; fuel: number | null }>;
}

export const fetchFurnaces = () => request<Furnace[]>('/furnaces');
export const fetchCementGrades = () => request<CementGrade[]>('/cement-grades');
export const fetchFurnaceCurrent = (id: string | number) => request<FurnaceCurrent>(`/furnaces/${id}/current`);
export const fetchSensorReadings = (furnaceId: string | number, hours = 24) =>
  request<import('./sensors').RawReading[]>(`/sensor-readings?furnace_id=${furnaceId}&hours=${hours}`);

export const fetchLabSamples = () => request<LabSampleRow[]>('/lab-samples');
export const fetchLabLimits = () => request<LabLimits>('/lab-limits');
export const createLabSample = (data: NewLabSample) =>
  request<{ sample_id: number; passed: boolean }>('/lab-samples', { method: 'POST', body: JSON.stringify(data) });
export const deleteLabSample = (id: number) => request<{ success: boolean }>(`/lab-samples/${id}`, { method: 'DELETE' });

export const fetchReferences = () => request<ReferencesData>('/references');
export const createReference = (category: ReferenceCategory, data: Partial<ReferenceItem>) =>
  request<ReferenceItem>(`/references/${category}`, { method: 'POST', body: JSON.stringify(data) });
export const updateReference = (category: ReferenceCategory, id: number, data: Partial<ReferenceItem>) =>
  request<ReferenceItem>(`/references/${category}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteReference = (category: ReferenceCategory, id: number) =>
  request<{ success: boolean }>(`/references/${category}/${id}`, { method: 'DELETE' });

export const referenceFileUrl = (id: number) => `${API_URL}/references/standards/${id}/file`;
export const uploadReferenceFile = (id: number, file: File) =>
  request<ReferenceItem>(`/references/standards/${id}/file?name=${encodeURIComponent(file.name)}`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/pdf' },
  });
export const deleteReferenceFile = (id: number) =>
  request<ReferenceItem>(`/references/standards/${id}/file`, { method: 'DELETE' });

export const fetchEnergy = () => request<EnergyData>('/energy');
