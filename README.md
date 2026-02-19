# MVP Scaffold

A Next.js 14 application scaffold with Supabase authentication, RBAC, and a clean architecture ready for incremental feature development.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom shadcn/ui-style components
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Forms**: React Hook Form + Zod (installed, not wired)
- **Linting**: ESLint + Prettier

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (api)/             # API routes
│   ├── admin/             # Admin-only routes
│   │   └── leads/         # Lead management
│   ├── app/               # Customer portal routes
│   │   ├── tasks/
│   │   ├── sessions/
│   │   └── materials/
│   ├── assessment/        # Public assessment flow
│   ├── lead-gate/         # Lead capture form
│   ├── login/             # Authentication
│   └── results/           # Assessment results
├── components/
│   ├── layouts/           # Layout components (Header)
│   ├── shared/            # Shared components (PageHeader, NotAuthorized)
│   └── ui/                # Base UI components (Button, Card, etc.)
├── lib/
│   ├── auth/              # Auth helpers (getSession, getProfile, requireRole)
│   ├── supabase/          # Supabase client configuration
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase project

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project details:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

Create the required tables in your Supabase project. Run these SQL commands in the Supabase SQL editor:

```sql
-- Profiles table for RBAC
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.1 Materials storage + RLS setup

Run `supabase/migrations/20260219120000_materials_storage_and_rls.sql` in the Supabase SQL editor (or via Supabase CLI migrations). This migration does the following:

- Creates private Storage bucket `materials`.
- Enforces deterministic object keys shaped like `company/{company_id}/{material_id}/{filename}`.
- Adds Storage policies so:
  - admins can create/update/delete (and read) `materials` objects,
  - customers can read only objects under `company/{their_company_id}/...`.
- Creates `materials` and optional `material_assignments` tables with RLS enabled.
- Adds table RLS policies so:
  - admins can manage all rows,
  - customers can only `SELECT` published company-bound records.

Policy assumptions used by the migration:

- `profiles.id = auth.uid()` (if your project uses `profiles.user_id`, adapt the policy joins accordingly).
- `profiles.role` contains `admin` and `customer` values.
- `profiles.company_id` is populated for customer users.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## Routes Overview

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/assessment` | Multi-step assessment wizard |
| `/lead-gate` | Lead capture form |
| `/results` | Assessment results display |
| `/login` | Authentication page |

### Customer Portal (Protected)
Requires authentication with role: `customer` or `admin`

| Route | Description |
|-------|-------------|
| `/app` | Dashboard |
| `/app/tasks` | Task management |
| `/app/sessions` | Coaching sessions |
| `/app/materials` | Learning materials |

### Admin Panel (Protected)
Requires authentication with role: `admin`

| Route | Description |
|-------|-------------|
| `/admin/leads` | Lead list with search |
| `/admin/leads/[id]` | Lead detail page |

## Authentication & RBAC

### Auth Flow
1. User attempts to access protected route
2. Middleware checks for valid session
3. If no session, redirect to `/login`
4. After login, redirect back to intended destination

**Supabase auth flow type**: This project expects **PKCE** (code exchange) with redirects landing on
`/auth/callback` (e.g., `http://localhost:3000/auth/callback`). If you add magic-link login, use
`supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback` } })`
and ensure Supabase Auth settings have “Email link flow” set to **PKCE** so links include `?code=...`.

### Role-Based Access
- **customer**: Access to `/app/*` routes
- **admin**: Access to `/app/*` and `/admin/*` routes

### Auth Helpers
```typescript
import { getSession, getUser, getProfile, requireAuth, requireAdmin } from '@/lib/auth';

// In Server Components
const session = await getSession();
const user = await getUser();
const profile = await getProfile();

// For route protection
const auth = await requireAuth(); // Any authenticated user
const adminAuth = await requireAdmin(); // Admin only
```

## TODO: Database Tables

The following tables need to be created for full functionality:

- [ ] `leads` - Store assessment leads
- [ ] `assessments` - Store assessment answers
- [ ] `tasks` - Customer tasks
- [ ] `sessions` - Coaching sessions
- [ ] `materials` - Learning resources
- [ ] `companies` - Company/organization data

See `src/types/index.ts` for table schema definitions.

## Customization

### Adding New UI Components
Components follow shadcn/ui patterns. Add new components to `src/components/ui/`.

### Adding New Routes
1. Create a new folder in `src/app/`
2. Add a `page.tsx` file
3. For protected routes, use the appropriate layout or add auth checks

### Styling
- Uses Tailwind CSS with CSS variables for theming
- Color scheme defined in `src/app/globals.css`
- Component variants use `class-variance-authority`

## License

MIT
