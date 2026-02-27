// User roles for RBAC
export type UserRole = "customer" | "admin";

// Profile type - represents the profiles table
// profiles.id matches auth.users.id (set via trigger)
export interface Profile {
  id: string;
  role: UserRole;
  company_id: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

// Session type from Supabase Auth
export interface AuthSession {
  user: {
    id: string;
    email?: string;
    created_at: string;
  };
  access_token: string;
  refresh_token: string;
}

// Dimension score object within leads.dimension_scores JSONB array
export interface DimensionScore {
  id?: string;
  name: string;
  score: number;
  maxScore?: number;
  percentage?: number;
}

// Lead type — Lovable-compatible schema (superset of Lovable's leads table)
export interface Lead {
  id: string;
  // Contact
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string;
  position: string | null;
  employee_count: string | null;
  annual_revenue: string | null;
  // Assessment results
  total_score: number | null;
  max_score: number | null;
  typology_id: string | null;
  typology_name: string | null;
  bottleneck_dimension: string | null;
  bottleneck_score: number | null;
  dimension_scores: DimensionScore[] | null;
  // Diagnostic tracking
  diagnostic_status: string | null;
  diagnostic_started_at: string | null;
  diagnostic_completed_at: string | null;
  last_dimension_index: number | null;
  // Portal extensions
  company_id: string;
  notes: string | null;
  created_at: string;
}

// Assessment types
export interface Assessment {
  id: string;
  lead_id: string;
  answers: Record<string, string | number>;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

// Task types
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
  is_archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  tag_id: string | null;
  deadline: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // optional joined relations
  tag?: TaskTag | null;
  subtasks?: Subtask[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
}

export interface SubtaskAttachment {
  id: string;
  subtask_id: string;
  label: string;
  url: string;
  type: 'link' | 'material';
  material_id: string | null;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  deadline: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // optional joined relations
  attachments?: SubtaskAttachment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  label: string;
  url: string;
  type: 'link' | 'material';
  material_id: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface TaskTemplateTaskDef {
  title: string;
  description?: string;
  status?: TaskStatus;
  tag_id?: string;
  deadline_offset_days?: number;
  subtasks?: Array<{
    title: string;
    deadline_offset_days?: number;
    attachments?: Array<{ label: string; url: string; type?: 'link' | 'material' }>;
  }>;
  attachments?: Array<{ label: string; url: string; type?: 'link' | 'material' }>;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  tag_id: string | null;
  created_by: string | null;
  last_used_at: string | null;
  payload: TaskTemplateTaskDef[];
  created_at: string;
  updated_at: string;
  tag?: TaskTag | null;
}

// Session type for coaching sessions (sessions table)
export interface Session {
  id: string;
  lead_id: string;
  created_by_admin_id: string | null;
  title: string;
  description: string | null;
  calendly_url: string;
  status: 'booking_open' | 'booked' | 'completed' | 'canceled';
  booked_start_at: string | null;
  booked_end_at: string | null;
  location: string | null;
  meeting_url: string | null;
  recording_url: string | null;
  calendly_event_uri: string | null;
  calendly_invitee_uri: string | null;
  show_on_dashboard: boolean;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  company_id: string;
  uploaded_by: string;
  is_published: boolean;
  type: string;
  tag_id: string | null;
  tag?: TaskTag | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
