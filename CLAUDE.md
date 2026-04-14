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

## Database (Supabase)

- Tables: profiles, patients, evaluations, patient_photos
- RLS enabled on all tables
- Storage bucket: patient-photos
- Auth: email/password via Supabase Auth
- Environment variables in `.env`: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

## Multi-tenancy Architecture

### Core Tables & Columns
- `organizations`: id, name, cnpj, phone, timezone, active, created_at, updated_at
- All data tables: +org_id uuid REFERENCES organizations(id)
- `profiles`: +org_id uuid, +role text ('admin' | 'doctor' | 'reception')
- `patients`: +workflow_status text (11 states: lead → encerrado)

### RLS Strategy
- Helper functions: `public.current_org_id()`, `public.current_app_role()`
- All data policies scoped to `org_id = public.current_org_id()`
- Storage bucket policies filter by org_id in first folder level
- JWT custom hook: `auth.custom_access_token_hook` injects org_id and role

### Workflow States
Pipeline order (SC-04: forward-only):
`lead` → `consulta_agendada` → `consulta_realizada` → `decidiu_operar` → `pre_operatorio` → `cirurgia_agendada` → `cirurgia_realizada` → `pos_op_ativo` → `longo_prazo` → `encerrado`

Terminal states: `cancelado`, `encerrado`, `nao_convertido`

### Edge Functions
- `complete-onboarding`: Creates org, links user, injects JWT claims
  - Deploy: `npx supabase functions deploy complete-onboarding`
  - Manual setup: Dashboard → Auth → Hooks → Register custom_access_token_hook

### New Pages & Utils
- `src/pages/Onboarding.tsx`: Org creation form (post-signup)
- `src/pages/Reference.tsx`: Protocol reference + critical keywords
- `src/lib/patientPipeline.ts`: State machine (pure logic, no deps)
- `src/lib/keywordCheck.ts`: Clinical alert detection (25+ keywords)

## Required Setup Steps

### 1. Register JWT Custom Hook in Supabase Dashboard
This is MANDATORY for multi-tenancy to work:

1. Go to **Supabase Dashboard** → Project → **Authentication** → **Hooks**
2. Click **+ New hook**
3. Select **Custom Access Token** event
4. Function name: `auth.custom_access_token_hook`
5. Save

The hook will inject `org_id` and `role` from profiles table into JWT app_metadata.

### 2. Test Complete Flow
- Register new user → `/register`
- Login → auto redirect to `/onboarding`
- Enter clinic name → creates organization
- Dashboard redirects with org_id in JWT

### 3. Verify org_id in JWT
After login, check browser DevTools:
```javascript
// In Console:
const session = await supabase.auth.getSession();
console.log(session.data.session.user.app_metadata);
// Should show: { org_id: "...", role: "admin" }
```

## Conventions

- No comments in code unless explicitly requested
- Use lucide-react for all icons
- Use stock photos from Pexels when images are needed
- Never use purple/indigo/violet hues unless requested
- Files should follow single responsibility, stay under ~200-300 lines
- All new tables must have RLS enabled with restrictive policies
- Use `maybeSingle()` instead of `single()` for Supabase queries
- All stores check `useAuthStore.getState().orgId` before INSERT
- All data tables MUST have `org_id` column scoped to RLS
- Language: Portuguese (Brazilian) for UI labels
