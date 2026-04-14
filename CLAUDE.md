# SPE-M - Surgical Planning & Evaluation - Medical

## Build & Dev Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking (tsconfig.app.json)

## Latest Build Status

✅ **Build Success** - All TypeScript errors resolved
- Fixed Modal component to support `onClose` and `footer` props
- Cleaned up unused imports across components
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

## Conventions

- No comments in code unless explicitly requested
- Use lucide-react for all icons
- Use stock photos from Pexels when images are needed
- Never use purple/indigo/violet hues unless requested
- Files should follow single responsibility, stay under ~200-300 lines
- All new tables must have RLS enabled with restrictive policies
- Use `maybeSingle()` instead of `single()` for Supabase queries
- Language: Portuguese (Brazilian) for UI labels
