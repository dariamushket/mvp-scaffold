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

// Lead type for admin management
// TODO: Create leads table in Supabase
export interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  score: number | null;
  business_type: string | null;
  bottleneck: string | null;
  tags: string[];
  notes: string | null;
  consent_marketing: boolean;
  created_at: string;
  updated_at: string;
}

// Assessment types
// TODO: Create assessments table in Supabase
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

// Form validation schemas will be added here with Zod
// Example structure for future implementation:
// export const loginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(8),
// });
