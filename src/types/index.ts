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

// Task type for customer portal
// TODO: Create tasks table in Supabase
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Session type for coaching sessions
// TODO: Create sessions table in Supabase
export interface CoachingSession {
  id: string;
  user_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  recording_url: string | null;
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
