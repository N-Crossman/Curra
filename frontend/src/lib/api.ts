const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Enums 

export type UserRole = "patient" | "doctor" | "pharmacist" | "admin";

export type CareTeamStatus = "pending" | "active" | "inactive";

export type MedicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "three_times_daily"
  | "four_times_daily"
  | "every_other_day"
  | "weekly"
  | "as_needed";

export type MedicationLogStatus = "taken" | "missed" | "skipped";

export type AppointmentType =
  | "routine"
  | "urgent"
  | "labs"
  | "imaging"
  | "telehealth"
  | "other";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type MoodLevel = "great" | "good" | "neutral" | "low" | "very_low";

export type EnergyLevel = "high" | "medium" | "low";

// Core Types

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  user_id: string;
  date_of_birth?: string;
  condition?: string;
  diagnosis_date?: string;
  blood_type?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
}

export interface DoctorProfile {
  user_id: string;
  specialty?: string;
  hospital?: string;
  phone?: string;
  bio?: string;
}

export interface UserWithProfile {
  user: User;
  profile: PatientProfile | DoctorProfile | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

// Medication Types

export interface Medication {
  id: string;
  patient_id: string;
  prescribed_by?: string;
  name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  times_of_day?: string[];
  category?: string;
  instructions?: string;
  refill_date?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationCreate {
  patient_id: string;
  prescribed_by?: string;
  name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  times_of_day?: string[];
  category?: string;
  instructions?: string;
  refill_date?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface MedicationUpdate {
  prescribed_by?: string;
  name?: string;
  generic_name?: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  times_of_day?: string[];
  category?: string;
  instructions?: string;
  refill_date?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_time?: string;
  taken_at?: string;
  status: MedicationLogStatus;
  notes?: string;
}

export interface MedicationLogCreate {
  medication_id: string;
  patient_id: string;
  scheduled_time?: string;
  taken_at?: string;
  status: MedicationLogStatus;
  notes?: string;
}

export interface MedicationLogUpdate {
  taken_at?: string;
  status?: MedicationLogStatus;
  notes?: string;
}

export interface AdherenceStats {
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  adherence_rate: number;
}

// Appointment Types

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  duration_mins?: number;
  location?: string;
  notes?: string;
  prep_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  patient_id: string;
  doctor_id?: string;
  title: string;
  type: AppointmentType;
  status?: AppointmentStatus;
  scheduled_at: string;
  duration_mins?: number;
  location?: string;
  notes?: string;
  prep_notes?: string;
}

export interface AppointmentUpdate {
  doctor_id?: string;
  title?: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
  scheduled_at?: string;
  duration_mins?: number;
  location?: string;
  notes?: string;
  prep_notes?: string;
}

// Lab Types

export interface LabPanel {
  id: string;
  patient_id: string;
  ordered_by?: string;
  panel_name: string;
  drawn_at?: string;
  lab_name?: string;
  notes?: string;
  created_at: string;
}

export interface LabPanelCreate {
  patient_id: string;
  ordered_by?: string;
  panel_name: string;
  drawn_at?: string;
  lab_name?: string;
  notes?: string;
}

export interface LabPanelUpdate {
  ordered_by?: string;
  panel_name?: string;
  drawn_at?: string;
  lab_name?: string;
  notes?: string;
}

export interface LabValue {
  id: string;
  panel_id: string;
  test_name: string;
  value?: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
}

export interface LabValueCreate {
  panel_id: string;
  test_name: string;
  value?: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
}

export interface LabValueUpdate {
  test_name?: string;
  value?: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
}

export interface LabPanelWithValues {
  panel: LabPanel;
  values: LabValue[];
}

// Vital Types

export interface Vital {
  id: string;
  patient_id: string;
  recorded_at: string;
  weight_lbs?: number;
  temp_f?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  oxygen_sat?: number;
  notes?: string;
  created_at: string;
}

export interface VitalCreate {
  patient_id: string;
  recorded_at: string;
  weight_lbs?: number;
  temp_f?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  oxygen_sat?: number;
  notes?: string;
}

export interface VitalUpdate {
  recorded_at?: string;
  weight_lbs?: number;
  temp_f?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  oxygen_sat?: number;
  notes?: string;
}

// Journal Types

export interface JournalEntry {
  id: string;
  patient_id: string;
  entry_text: string;
  mood?: MoodLevel;
  energy?: EnergyLevel;
  symptoms?: string[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryCreate {
  patient_id: string;
  entry_text: string;
  mood?: MoodLevel;
  energy?: EnergyLevel;
  symptoms?: string[];
  is_private?: boolean;
}

export interface JournalEntryUpdate {
  entry_text?: string;
  mood?: MoodLevel;
  energy?: EnergyLevel;
  symptoms?: string[];
  is_private?: boolean;
}

// Care Team Types

export interface CareTeamMember {
  id: string;
  patient_id: string;
  doctor_id: string;
  role_label?: string;
  status: CareTeamStatus;
}

export interface CareTeamMemberCreate {
  patient_id: string;
  doctor_id: string;
  role_label?: string;
  status?: CareTeamStatus;
}

export interface CareTeamMemberUpdate {
  role_label?: string;
  status?: CareTeamStatus;
}

// Message Types

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  subject?: string;
  body: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface MessageCreate {
  sender_id: string;
  receiver_id: string;
  subject?: string;
  body: string;
}

// Auth Inputs 

export interface RegisterInput {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  username: string; // OAuth2PasswordRequestForm uses "username" for email
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  is_active?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Token helpers

const TOKEN_KEY = "curra_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("curra_refresh_token");
}

export function setTokens(tokens: TokenResponse): void {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem("curra_refresh_token", tokens.refresh_token);
}

// Core request function

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | boolean | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}/api${path}`;

  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value));
    }
    const str = qs.toString();
    if (str) url += `?${str}`;
  }

  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 204) return undefined as T;

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in (data as object)
        ? (data as { detail: unknown }).detail
        : data;
    const message =
      typeof detail === "string"
        ? detail
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, detail);
  }

  return data as T;
}

function json<T>(path: string, method: string, body?: unknown, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// API groups 

const auth = {
  register: (data: RegisterInput) =>
    json<User>("/auth/register", "POST", data),

  /** Login uses OAuth2 form encoding, not JSON */
  login: (data: LoginInput) => {
    const form = new URLSearchParams();
    form.set("username", data.username);
    form.set("password", data.password);
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: form.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  me: () => request<User>("/auth/me"),
};

const users = {
  me: () => request<UserWithProfile>("/users/me"),

  updateMe: (data: UserUpdate) =>
    json<UserWithProfile>("/users/me", "PATCH", data),

  updateProfile: (data: Partial<PatientProfile> | Partial<DoctorProfile>) =>
    json<PatientProfile | DoctorProfile>("/users/me/profile", "PATCH", data),

  doctors: () => request<User[]>("/users/doctors"),
};

const medications = {
  list: (activeOnly?: boolean) =>
    request<Medication[]>("/medications", {
      params: { active_only: activeOnly },
    }),

  create: (data: MedicationCreate) =>
    json<Medication>("/medications", "POST", data),

  get: (id: string) => request<Medication>(`/medications/${id}`),

  update: (id: string, data: MedicationUpdate) =>
    json<Medication>(`/medications/${id}`, "PATCH", data),

  delete: (id: string) => request<void>(`/medications/${id}`, { method: "DELETE" }),

  logsToday: () => request<MedicationLog[]>("/medications/logs/today"),

  adherenceStats: () => request<AdherenceStats>("/medications/adherence/stats"),

  createLog: (data: MedicationLogCreate) =>
    json<MedicationLog>("/medications/logs", "POST", data),

  getLogs: (medicationId: string) =>
    request<MedicationLog[]>(`/medications/logs/${medicationId}`),

  updateLog: (logId: string, data: MedicationLogUpdate) =>
    json<MedicationLog>(`/medications/logs/${logId}`, "PATCH", data),
};

const appointments = {
  list: () => request<Appointment[]>("/appointments"),

  create: (data: AppointmentCreate) =>
    json<Appointment>("/appointments", "POST", data),

  get: (id: string) => request<Appointment>(`/appointments/${id}`),

  update: (id: string, data: AppointmentUpdate) =>
    json<Appointment>(`/appointments/${id}`, "PATCH", data),

  delete: (id: string) =>
    request<void>(`/appointments/${id}`, { method: "DELETE" }),
};

const labs = {
  list: () => request<LabPanel[]>("/labs"),

  create: (data: LabPanelCreate) =>
    json<LabPanel>("/labs", "POST", data),

  get: (panelId: string) => request<LabPanelWithValues>(`/labs/${panelId}`),

  update: (panelId: string, data: LabPanelUpdate) =>
    json<LabPanel>(`/labs/${panelId}`, "PATCH", data),

  delete: (panelId: string) =>
    request<void>(`/labs/${panelId}`, { method: "DELETE" }),

  addValue: (panelId: string, data: LabValueCreate) =>
    json<LabValue>(`/labs/${panelId}/values`, "POST", data),

  updateValue: (panelId: string, valueId: string, data: LabValueUpdate) =>
    json<LabValue>(`/labs/${panelId}/values/${valueId}`, "PATCH", data),

  deleteValue: (panelId: string, valueId: string) =>
    request<void>(`/labs/${panelId}/values/${valueId}`, { method: "DELETE" }),
};

const vitals = {
  list: () => request<Vital[]>("/vitals"),

  create: (data: VitalCreate) =>
    json<Vital>("/vitals", "POST", data),

  get: (id: string) => request<Vital>(`/vitals/${id}`),

  update: (id: string, data: VitalUpdate) =>
    json<Vital>(`/vitals/${id}`, "PATCH", data),

  delete: (id: string) =>
    request<void>(`/vitals/${id}`, { method: "DELETE" }),
};

const journal = {
  list: () => request<JournalEntry[]>("/journal"),

  create: (data: JournalEntryCreate) =>
    json<JournalEntry>("/journal", "POST", data),

  get: (id: string) => request<JournalEntry>(`/journal/${id}`),

  update: (id: string, data: JournalEntryUpdate) =>
    json<JournalEntry>(`/journal/${id}`, "PATCH", data),

  delete: (id: string) =>
    request<void>(`/journal/${id}`, { method: "DELETE" }),
};

const careTeam = {
  list: () => request<CareTeamMember[]>("/care-team"),

  add: (data: CareTeamMemberCreate) =>
    json<CareTeamMember>("/care-team", "POST", data),

  update: (memberId: string, data: CareTeamMemberUpdate) =>
    json<CareTeamMember>(`/care-team/${memberId}`, "PATCH", data),

  remove: (memberId: string) =>
    request<void>(`/care-team/${memberId}`, { method: "DELETE" }),
};

const messages = {
  list: () => request<Message[]>("/messages"),

  send: (data: MessageCreate) =>
    json<Message>("/messages", "POST", data),

  get: (id: string) => request<Message>(`/messages/${id}`),

  markRead: (id: string) =>
    request<Message>(`/messages/${id}/read`, { method: "PATCH" }),

  delete: (id: string) =>
    request<void>(`/messages/${id}`, { method: "DELETE" }),
};

export const api = {
  auth,
  users,
  medications,
  appointments,
  labs,
  vitals,
  journal,
  careTeam,
  messages,
};
