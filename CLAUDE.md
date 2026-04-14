# SPE-M - Surgical Planning & Evaluation - Medical

## Build & Dev Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking (tsconfig.app.json)

## Latest Build Status

✅ **SPE-M Upgrade Complete** - Multi-tenancy & Clinical Features
- Issue 1: Multi-tenancy schema with org_id and JWT custom claims
- Issue 2: authStore with orgId and role from JWT
- Issue 3: Onboarding page + Edge Function (complete-onboarding)
- Issue 4: All stores updated with org_id in INSERTs (9 stores)
- Issue 5: patientPipeline.ts with workflow state machine
- Issue 6: keywordCheck.ts with clinical alert detection
- Issue 7: Reference page with protocol and critical keywords
- Production build complete without errors

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3 with custom editorial design system
- **State**: Zustand stores (auth, patient, evaluation, theme, ui)
- **Routing**: React Router DOM v7
- **Forms**: React Hook Form + Zod validation
- **UI Primitives**: Radix UI (Dialog, Accordion, Tabs, Select, Radio Group, etc.)
- **Icons**: Lucide React (do not install other icon libraries)
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Client**: @supabase/supabase-js

## Project Structure

```
src/
  components/
    evaluation/    # Evaluation wizard components (canvas, questions, stepper, sidebar)
    layout/        # AppLayout, AuthLayout, Navbar
    ui/            # Reusable UI primitives (Button, Card, Input, Modal, etc.)
  data/            # Constants and evaluation criteria definitions
  lib/             # Supabase client, types, utils, validation schemas
  pages/           # Route-level page components
  stores/          # Zustand stores (authStore, patientStore, evaluationStore, themeStore, uiStore)
supabase/
  migrations/      # SQL migration files
```

## Design System

### Color Palette (editorial theme)

All colors are defined under `editorial-*` in tailwind.config.js:

- `editorial-navy` / `navy-light` / `navy-dark` - Primary dark blues
- `editorial-gold` / `gold-light` / `gold-dark` / `gold-muted` - Accent gold
- `editorial-paper` - Light background (#F2F2F0)
- `editorial-cream` - Borders/dividers (#E8E6E1)
- `editorial-warm` - Subtle text (#D4CFC5)
- `editorial-muted` - Secondary text (#8A8477)
- `editorial-light` - Card backgrounds (#FAF9F7)
- `editorial-sage` / `editorial-rose` / `editorial-slate` - Semantic colors

### Dark Mode

Dark mode uses Tailwind's `class` strategy (`darkMode: 'class'` in tailwind.config.js).

**Theme store**: `src/stores/themeStore.ts` manages theme state with Zustand, persists to localStorage (`spe-theme` key), and respects `prefers-color-scheme` on first visit.

**Flash prevention**: `index.html` contains an inline script that reads localStorage before React loads to apply the `dark` class immediately.

**Dark mode color mapping convention**:
- `bg-editorial-paper` → `dark:bg-editorial-navy-dark`
- `bg-editorial-light` → `dark:bg-editorial-navy/60`
- `bg-white` (surfaces) → `dark:bg-editorial-navy/40`
- `text-editorial-navy` → `dark:text-editorial-cream`
- `border-editorial-cream` → `dark:border-editorial-navy-light/20`
- `bg-editorial-cream` (dividers) → `dark:bg-editorial-navy-light/30`
- `hover:bg-editorial-cream/*` → `dark:hover:bg-white/5`
- `hover:text-editorial-navy` → `dark:hover:text-editorial-cream`

**Toggle**: Sun/Moon icon button in Navbar with animated rotation transition.

### Typography

- Sans: Inter (body, UI)
- Serif: Playfair Display (headings, branding)
- Max 3 font weights used

### Component Patterns

- Buttons use `tracking-editorial uppercase` for label style
- Cards use `.card` utility or `Card` component
- Glass effects via `.glass` and `.glass-editorial` utilities
- Focus states via `.focus-ring` utility class
- Modal component (`src/components/ui/Modal.tsx`) supports both `onOpenChange` (legacy) and `onClose` callbacks, plus optional `footer` prop for action buttons

## Database (Supabase) - Complete Schema

**14 Tables with RLS:**

| Table | Purpose | org_id Scoped |
|---|---|---|
| organizations | Clinics/units (name, CNPJ, timezone) | N/A (root) |
| profiles | User profiles (name, CRM, role, specialty) | Yes |
| patients | Patient records (workflow_status with 11 states) | Yes |
| evaluations | SPE-M evaluations (score, stage, status) | Yes |
| evaluation_criteria | Individual criterion responses | Yes |
| patient_photos | Photos with annotations (viewport, JSONB) | Yes |
| patient_documents | TCIs, contracts, protocols | Yes |
| checklists | Surgical release, WHO, anesthesia discharge | Yes |
| checklist_items | Individual checklist items | Yes |
| patient_appointments | Pre/post-op appointments | Yes |
| preop_exams | Pre-op exams (requested + results) | Yes |
| surgical_records | Surgery records (technique, time, complications) | Yes |
| implant_records | Surgical implants (volume, lot, side) | Yes |
| satisfaction_surveys | NPS + post-op feedback | Yes |

**Helper Functions:**
- `current_org_id()` — Extract org_id from JWT
- `current_app_role()` — Extract role (admin/doctor/reception) from JWT

**Storage Bucket:** `patient-photos` with path structure: `{org_id}/{patient_id}/{viewport}_{timestamp}.ext`

**Auth:** email/password via Supabase Auth
**Environment variables in `.env`:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

## Multi-tenancy Architecture

### Workflow States (Patient Pipeline)
Forward-only pipeline (SC-04 constraint):
```
lead → consulta_agendada → consulta_realizada → decidiu_operar
→ pre_operatorio → cirurgia_agendada → cirurgia_realizada
→ pos_op_ativo → longo_prazo → encerrado
```

Terminal states: `cancelado`, `nao_convertido`

**State Machine Rules:**
- SC-04: Forward transitions only (no backwards jumps)
- SC-12: Requires valid SPE-M score (≥40%) before advancing to `pre_operatorio`
- SC-13: CIO sign-out triggers `encerrado` state

### RLS & Security Strategy
- All data tables have `org_id` column REFERENCED to `organizations(id)`
- JWT Custom Hook (`auth.custom_access_token_hook`) injects:
  - `org_id` — User's clinic ID
  - `role` — 'admin' | 'doctor' | 'reception'
- Helper functions:
  - `current_org_id()` — Extracts org_id from JWT app_metadata
  - `current_app_role()` — Extracts role from JWT app_metadata
- ALL SELECT/INSERT/UPDATE/DELETE policies scoped to `org_id = public.current_org_id()`
- Storage bucket: Paths filtered by org_id (first folder level)

### Edge Functions
- **complete-onboarding** (`supabase/functions/complete-onboarding/index.ts`)
  - Creates organization record
  - Updates user profile with org_id + role='admin'
  - Callable from frontend after user fills onboarding form
  - No CLI deployment needed (tool-based)

### New Components & Pages
- **Pages:**
  - `src/pages/Onboarding.tsx` — Post-signup org creation form
  - `src/pages/Reference.tsx` — Protocol reference card + critical keywords
- **Utilities:**
  - `src/lib/patientPipeline.ts` — Pure state machine logic (no Supabase deps)
  - `src/lib/keywordCheck.ts` — Clinical alert detection (25+ PT keywords)

### Zustand Stores (9 Total)
| Store | Responsibilities |
|---|---|
| `authStore` | Session, orgId, role, profile, login/logout/signup |
| `patientStore` | Patient CRUD with org_id scoping, pagination, filters |
| `evaluationStore` | Evaluation CRUD, criterion responses, wizard nav, scoring |
| `checklistStore` | Checklist CRUD (surgical release, WHO, anesthesia) |
| `documentStore` | Document CRUD (TCIs, contracts, protocols) |
| `surgicalStore` | Surgery + implant record CRUD |
| `appointmentStore` | Pre/post-op appointment CRUD, routine generation |
| `preopExamStore` | Pre-op exam CRUD, templates by procedure |
| `surveyStore` | NPS + satisfaction survey CRUD |

**Convention:** All stores validate `useAuthStore.getState().orgId` before INSERT operations

## Required Setup Steps

### 1. Register JWT Custom Hook in Supabase Dashboard
**MANDATORY for multi-tenancy to work:**

1. Go to **Supabase Dashboard** → Project → **Authentication** → **Hooks**
2. Click **+ New hook** → Select **Custom Access Token**
3. Schema: `auth` | Function: `custom_access_token_hook`
4. Save

The hook will inject `org_id` and `role` from `profiles` table into JWT `app_metadata`.

### 2. Complete Onboarding Flow
1. User registers at `/register` (email, name, CRM, password)
2. Login redirects to `/onboarding` (no org_id yet in JWT)
3. Fill clinic name + submit → calls `complete-onboarding` edge function
4. Edge function:
   - Creates `organizations` record
   - Updates `profiles` with `org_id` + `role='admin'`
   - Returns success
5. Frontend calls `supabase.auth.refreshSession()` to reload JWT with org_id + role
6. Redirect to `/dashboard` (now RLS-scoped to org_id)

### 3. Verify org_id in JWT
After login, check browser DevTools:
```javascript
const session = await supabase.auth.getSession();
console.log(session.data.session.user.app_metadata);
// Should show: { org_id: "550e8400-...", role: "admin" }
```

### 4. Production Checklist
- ✅ Edge Function `complete-onboarding` deployed
- ✅ JWT hook registered in Supabase Dashboard
- ✅ All migrations applied (11 migrations total)
- ✅ RLS policies active on all 14 tables
- ✅ Production build tested (no TypeScript errors)

## Key Implementation Details

### Critical Patient Pipeline (from patientPipeline.ts)
```typescript
type WorkflowState = 'lead' | 'consulta_agendada' | 'consulta_realizada' | 'decidiu_operar'
  | 'pre_operatorio' | 'cirurgia_agendada' | 'cirurgia_realizada' | 'pos_op_ativo'
  | 'longo_prazo' | 'encerrado' | 'cancelado' | 'nao_convertido';

// SC-04: Forward-only transitions
canAdvance(from: WorkflowState, to: WorkflowState): boolean {
  // No backwards jumps, validates state order
}

// SC-12: SPE-M score validation before pre_operatorio
requiresSPEMScore(state: WorkflowState): boolean {
  return state === 'pre_operatorio'; // Must have score ≥ 40%
}

// SC-13: CIO sign-out ends patient journey
terminatePatient(state: WorkflowState): boolean {
  return state === 'encerrado' || state === 'nao_convertido';
}
```

### Critical Keyword Detection (from keywordCheck.ts)
```typescript
// 25+ Portuguese clinical keywords for post-op WhatsApp alerts
const CRITICAL_KEYWORDS = [
  'sangramento', 'sangrando', 'hematoma', 'secreção', 'paralisia',
  'sangue', 'febre', 'pus', 'abertura', 'hemorragia', 'desmaio',
  'convulsão', 'infecção', 'necrose', 'cianose', 'isquemia',
  'choque', 'taquicardia', 'falta de ar', 'taquipneia',
  'pele azulada', 'hipotensão', 'edema agudo'
];

// Phrase patterns
const CRITICAL_PHRASES = [
  'não consigo fechar o olho',
  'inchaço muito grande',
  'abriu a cirurgia',
  'perdendo sensação',
  'febre alta',
  'dor forte'
];
```

## Code Conventions

- No comments in code unless explicitly requested
- Use lucide-react for all icons
- Use stock photos from Pexels when images are needed
- Never use purple/indigo/violet hues unless requested
- Files should follow single responsibility, stay under ~200-300 lines
- All new tables must have RLS enabled with restrictive policies
- Use `maybeSingle()` instead of `single()` for Supabase queries
- **All stores check `useAuthStore.getState().orgId` before INSERT/UPDATE/DELETE**
- **All data tables MUST have `org_id` column scoped to RLS policies**
- Language: Portuguese (Brazilian) for UI labels
- Dark mode mapping: Use `dark:` Tailwind prefix consistently
- Modal component supports both `onClose` and optional `footer` prop
