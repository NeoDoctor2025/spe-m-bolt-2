# Spec — Upgrade SPE-M com assets do MFI SaaS
> Metodologia: SDD — Intenção → Spec → Review → Design → Implementação
> Stack base: `spe-m-bolt-2` (React 18 + Vite + Zustand + Supabase SPA)

---

## Intenção

Adicionar ao SPE-M as capacidades que foram construídas e validadas no MFI SaaS:
multi-tenancy, pipeline de status do paciente, keyword check clínico, e onboarding
de organização — sem tocar no design, UI ou lógica clínica existente.

---

## O que o MFI SaaS criou que pode ser portado

### Código pronto para portar (lógica pura — sem deps de Next.js)

| Arquivo MFI | O que faz | Porta como |
|---|---|---|
| `lib/harness/keyword-check.ts` | Detecta 25+ keywords críticas em mensagens de pacientes | `src/lib/keywordCheck.ts` (cópia direta, zero adaptação) |
| `lib/patient-pipeline.ts` | Máquina de estados pura: transições válidas, bloqueios clínicos, SC-04 | `src/lib/patientPipeline.ts` (cópia direta, zero adaptação) |
| `lib/spe-m.ts` | 5 critérios SPE-M, calculateScore(), interpretScore() | Já existe no SPE-M com 22 critérios — **não portar, manter o do SPE-M** |

### Padrões para reimplementar (têm deps de Next.js — adaptar para Vite/Edge Functions)

| Arquivo MFI | O que faz | Adaptar como |
|---|---|---|
| `lib/supabase/admin.ts` | Cliente Supabase com service role key | `supabase/functions/` (Edge Function — chave nunca no client) |
| `app/actions/onboarding.ts` | Cria org + vincula user + atualiza JWT | `supabase/functions/complete-onboarding/index.ts` |

### Patterns e decisões arquiteturais (aplicar como conhecimento)

- RLS helpers `public.current_org_id()` e `public.current_app_role()`
- JWT custom claims via `auth.custom_access_token_hook`
- Idempotência no onboarding (2 camadas: JWT check + banco check)
- `workflow_status` em patients como campo de banco, não estado local
- `user_id` mantido, `org_id` adicionado (não renomear)

---

## O que o SPE-M já tem (não reescrever)

```
src/components/ui/           src/data/evaluationCriteria.ts
src/data/procedures.ts       src/stores/themeStore.ts
src/index.css                tailwind.config.js
src/components/evaluation/   (wizard SPE-M completo)
src/pages/Photos.tsx         src/pages/Analytics.tsx
```

### Stores existentes (todos precisam de org_id nos INSERTs)
```
authStore      patientStore    evaluationStore
checklistStore documentStore   surgicalStore
appointmentStore preopExamStore surveyStore
```

---

## Escopo deste upgrade

### O que entra neste upgrade
1. Multi-tenancy: `organizations` + `org_id` em todas as tabelas
2. JWT custom claims: `org_id` + `role` via `app_metadata`
3. Onboarding de organização (Edge Function)
4. `authStore`: adicionar `orgId` e `role`
5. Todos os stores: `org_id` nos INSERTs
6. `patientPipeline.ts`: portado do MFI (lógica pura)
7. `keywordCheck.ts`: portado do MFI (lógica pura)
8. `workflow_status` em patients
9. UI mínima: StatusActions no PatientDetail + cartão de referência

### O que fica para depois (fora do escopo)
- Alertas WhatsApp / Inngest (requer layer server-side dedicado)
- Settings de organização (gerenciar membros, invites)
- Billing / Stripe
- SPE-M com 22 critérios integrado ao pipeline (o SPE-M atual já funciona independente)

---

## Decomposição em Issues

---

### Issue 1 — Schema: organizations + org_id + JWT hook

**O que faz:** cria toda a infraestrutura de banco para multi-tenancy.

**Arquivos:**
```
supabase/migrations/YYYYMMDD_add_organizations_and_org_id.sql
supabase/functions/complete-onboarding/index.ts   (Edge Function)
```

**SQL — executar na ordem:**

```sql
-- 0. Funções utilitárias (idempotentes)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role'
$$;

-- 1. Tabela organizations
CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  cnpj       text,
  phone      text,
  timezone   text NOT NULL DEFAULT 'America/Sao_Paulo',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_select ON organizations
  FOR SELECT USING (id = public.current_org_id());

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (id = public.current_org_id()
    AND public.current_app_role() = 'admin')
  WITH CHECK (id = public.current_org_id());

-- 2. profiles: adicionar org_id e role
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS role text
    CHECK (role IN ('admin', 'doctor', 'reception'));
-- SEM DEFAULT — null até onboarding. Onboarding define 'admin'.

-- 3. Adicionar org_id e workflow_status nas tabelas de dados
-- (estratégia segura: nullable primeiro, NOT NULL depois do backfill)

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'lead'
    CHECK (workflow_status IN (
      'lead','consulta_agendada','consulta_realizada',
      'decidiu_operar','pre_operatorio','cirurgia_agendada',
      'cirurgia_realizada','pos_op_ativo','longo_prazo',
      'encerrado','nao_convertido','cancelado'
    ));

-- Repetir para: leads, evaluations, patient_photos,
-- patient_documents, checklists, checklist_items,
-- patient_appointments, preop_exams, surgical_records,
-- implant_records, satisfaction_surveys
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_photos ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_appointments ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE preop_exams ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE surgical_records ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE implant_records ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- Após backfill (se banco tem dados): ALTER TABLE x ALTER COLUMN org_id SET NOT NULL;

-- 4. Migrar RLS policies de user_id → org_id
-- Padrão: dropar antigas, criar novas com helpers
-- (executar para cada tabela listada acima)
-- Exemplo para patients:
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;

CREATE POLICY patients_select ON patients
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY patients_insert ON patients
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY patients_update ON patients
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
-- SEM DELETE policy (dados clínicos — soft delete via workflow_status)

-- 5. Storage: atualizar policies do bucket patient-photos
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;

CREATE POLICY photos_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text);

CREATE POLICY photos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text);

-- 6. JWT custom claims hook
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec record;
BEGIN
  SELECT org_id, role INTO rec
  FROM public.profiles WHERE id = (event->>'user_id')::uuid;
  IF FOUND AND rec.org_id IS NOT NULL THEN
    event := jsonb_set(event,
      '{claims,app_metadata,org_id}', to_jsonb(rec.org_id::text));
    event := jsonb_set(event,
      '{claims,app_metadata,role}', to_jsonb(rec.role));
  END IF;
  RETURN event;
END;
$$;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;

-- ⚠️ MANUAL: Supabase Dashboard → Auth → Hooks → registrar custom_access_token_hook
```

**Edge Function `complete-onboarding`:**
```typescript
// supabase/functions/complete-onboarding/index.ts
// Lógica (portar do MFI app/actions/onboarding.ts, adaptar para Edge Function):
// 1. Validar JWT do Authorization header
// 2. Checar se profiles.org_id já existe (idempotência)
//    → se sim: só atualiza app_metadata + retorna
// 3. INSERT em organizations (name, timezone='America/Sao_Paulo')
// 4. UPDATE em profiles (org_id, role='admin')
// 5. supabase.auth.admin.updateUserById(userId, { app_metadata: { org_id, role: 'admin' }})
// 6. Retornar { success: true, orgId }
// Service role key via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
```

**Critério de done:**
- [ ] `npx supabase gen types typescript --linked > src/lib/database.types.ts` — `organizations` aparece
- [ ] Login → `user.app_metadata` contém `org_id` e `role` após onboarding
- [ ] Login sem org → `app_metadata` vazio/sem org_id
- [ ] Edge Function deployada: `npx supabase functions deploy complete-onboarding`

---

### Issue 2 — authStore: adicionar orgId e role

**O que faz:** expõe `orgId` e `role` do JWT para todos os stores e componentes.

**Arquivo:** `src/stores/authStore.ts` — alteração mínima, não reescrever.

**O que adicionar ao estado existente:**
```typescript
// Adicionar à interface AuthState:
orgId: string | null
role: 'admin' | 'doctor' | 'reception' | null

// Adicionar à função initialize() após session verificada:
const orgId = session.user.app_metadata?.org_id ?? null
const role  = session.user.app_metadata?.role ?? null
set({ orgId, role })

// Adicionar ao onAuthStateChange handler:
const orgId = session?.user.app_metadata?.org_id ?? null
const role  = session?.user.app_metadata?.role  ?? null
set({ orgId, role })

// Seletores de conveniência (fora do create):
export const useOrgId = () => useAuthStore(s => s.orgId)
export const useRole  = () => useAuthStore(s => s.role)
```

**Guard em `src/App.tsx`:**
```typescript
// Dentro do ProtectedRoute:
const { session, orgId, initialized } = useAuthStore()
if (!session) return <Navigate to="/login" />
if (session && !orgId) return <Navigate to="/onboarding" />
return <>{children}</>
```

**Atualizar `src/lib/types.ts`:**
```typescript
export type Role = 'admin' | 'doctor' | 'reception'
export interface OrgContext { orgId: string; role: Role }
```

**Critério de done:**
- [ ] `useOrgId()` retorna string após login com org
- [ ] `useOrgId()` retorna null para user novo
- [ ] App.tsx redireciona para `/onboarding` se session existe mas orgId é null

---

### Issue 3 — Onboarding de organização

**O que faz:** página que cria a organização e vincula o primeiro usuário como admin.

**Arquivo:** `src/pages/Onboarding.tsx` (novo) + rota em `App.tsx`.

**Design:** seguir padrão de `src/pages/Login.tsx` — AuthLayout, editorial navy/gold.

**Comportamento:**
```typescript
// Form: nome da clínica (obrigatório, min 2 chars)
// Submit:
const { data, error } = await supabase.functions.invoke('complete-onboarding', {
  body: { orgName: clinicName }
})
if (data?.success) {
  await supabase.auth.refreshSession() // novo JWT com claims
  navigate('/dashboard')
}
```

**Estados de UI:**
- Default: campo + botão ativo
- Loading: botão com spinner, campo disabled
- Error: mensagem abaixo do form

**Rota em `App.tsx`:**
```typescript
<Route path="/onboarding" element={
  <ProtectedRoute requireOrg={false}>  {/* session sim, org não obrigatória */}
    <Onboarding />
  </ProtectedRoute>
} />
```

**Critério de done:**
- [ ] Novo usuário registrado → login → redireciona para `/onboarding`
- [ ] Após submit: `organizations` tem o novo registro
- [ ] `profiles` tem `org_id` e `role = 'admin'`
- [ ] `user.app_metadata.org_id` preenchido após `refreshSession()`
- [ ] Usuário vai para `/dashboard` automaticamente

---

### Issue 4 — Stores: org_id nos INSERTs

**O que faz:** garante que todos os dados novos são criados com `org_id` correto.

**Arquivos:** 9 stores — alteração mecânica e repetitiva.

**Padrão para cada store:**
```typescript
// Antes (single-tenant):
.insert({ ...data, user_id: user.id })

// Depois (multi-tenant):
import { useAuthStore } from './authStore'
const orgId = useAuthStore.getState().orgId
if (!orgId) return { error: 'Organização não encontrada' }
.insert({ ...data, user_id: user.id, org_id: orgId })
```

**Remover** qualquer `.eq('user_id', user.id)` em queries de **listagem** (SELECTs).
O RLS via `public.current_org_id()` já filtra automaticamente.

**Manter** `.eq('user_id', user.id)` onde é verificação de propriedade (ex: só o criador pode editar).

**Stores a atualizar:**
`patientStore`, `evaluationStore`, `checklistStore`, `documentStore`,
`surgicalStore`, `appointmentStore`, `preopExamStore`, `surveyStore`

**Critério de done:**
- [ ] Criar paciente em org A → não aparece no login de org B
- [ ] Todos os stores passam em `npm run typecheck`

---

### Issue 5 — patientPipeline.ts (porta do MFI)

**O que faz:** adiciona máquina de estados pura para `workflow_status` do paciente.

**Arquivo:** `src/lib/patientPipeline.ts`

**Como portar:**
```bash
# Copiar diretamente do MFI SaaS:
# lib/patient-pipeline.ts → src/lib/patientPipeline.ts
# Única adaptação: nenhuma — é lógica pura sem deps
```

**O código MFI já tem:**
- `PIPELINE_ORDER`, `TERMINAL_STATUSES`
- `getNextStatuses(current)` — próximos válidos
- `canTransition(from, to)` — valida direção (SC-04)
- `checkClinicalBlocks(context, from, to)` — bloqueios clínicos
- `ClinicalContext` type — extensível
- Testes em `lib/__tests__/patient-pipeline.test.ts`

**Adicionar testes com Vitest:**
```bash
# Copiar também:
# lib/__tests__/patient-pipeline.test.ts → src/lib/__tests__/patientPipeline.test.ts
```

**Componente UI:** `src/components/patient/StatusActions.tsx`
```typescript
// Botão "Avançar para [próximo status]"
// Botão "Cancelar paciente" com dialog de confirmação
// Cores seguindo design editorial:
//   lead → editorial-muted | cirurgia → editorial-gold
//   pos_op → editorial-sage | cancelado → editorial-rose
// Integrar em PatientDetail.tsx — nova seção após header
```

**patientStore.advanceStatus:**
```typescript
advanceStatus: async (id, toStatus) => {
  const { data: { user } } = await supabase.auth.getUser()
  // 1. Buscar status atual do paciente
  // 2. canTransition(current, toStatus) — se não permitido, retornar erro
  // 3. Buscar ClinicalContext (score SPE-M mais recente, etc.)
  // 4. checkClinicalBlocks(context, current, toStatus) — se bloqueado, retornar motivo
  // 5. UPDATE com WHERE workflow_status = current (race condition protection)
  // 6. Verificar affected rows — se 0, outro usuário mudou antes
}
```

**Critério de done:**
- [ ] `canTransition('lead', 'pre_operatorio')` → false
- [ ] `canTransition('lead', 'consulta_agendada')` → true
- [ ] Testes do pipeline passando (Vitest)
- [ ] StatusActions aparece no PatientDetail

---

### Issue 6 — keywordCheck.ts (porta do MFI)

**O que faz:** detecta sinais de alerta clínico em texto livre de mensagens de pacientes.

**Arquivo:** `src/lib/keywordCheck.ts`

**Como portar:**
```bash
# Copiar diretamente do MFI SaaS:
# lib/harness/keyword-check.ts → src/lib/keywordCheck.ts
# Única adaptação: nenhuma — é lógica pura sem deps
```

**O código MFI já tem (verificado no repo):**
- `checkCriticalKeywords(text)` → `{ critical, keyword, normalised }`
- `getCriticalKeywords()` → array de keywords para observabilidade
- 25+ keywords: sangramento, hematoma, febre, secreção, pus, paralisia, etc.
- Normalização de acentos e case

**Testes:**
```bash
# Copiar:
# lib/harness/__tests__/keyword-check.test.ts → src/lib/__tests__/keywordCheck.test.ts
# Adaptar imports (path muda)
# Cobertura 100% obrigatória — segurança clínica
```

**Integração imediata:** pode ser usado em qualquer campo de texto livre onde pacientes respondem. Por ora expor como utilitário disponível.

**Critério de done:**
- [ ] `checkCriticalKeywords('estou com sangramento')` → `{ critical: true, keyword: 'sangramento' }`
- [ ] `checkCriticalKeywords('estou bem')` → `{ critical: false, keyword: null }`
- [ ] 100% de cobertura nos testes

---

### Issue 7 — Cartão de referência rápida

**O que faz:** página `/reference` com protocolo clínico completo para uso no tablet durante procedimentos.

**Arquivo:** `src/pages/Reference.tsx` + rota em `App.tsx` + item em `Navbar.tsx`.

**Conteúdo:**
- 10 fases do protocolo (Captação → Fechamento 12m)
- Decisões Sim/Não por fase com ações
- Filtro por perfil: Recepção / Médico / Ambos
- Seção de keywords críticas WhatsApp (usar `getCriticalKeywords()`)
- Botão de impressão (`window.print()` + CSS `@media print`)

**Design:** 100% editorial navy/gold — mesmo padrão de `src/pages/Help.tsx` (FAQ em accordion).

**Critério de done:**
- [ ] Rota `/reference` acessível no Navbar
- [ ] Filtro por perfil funciona
- [ ] Keywords críticas listadas
- [ ] Imprime corretamente em `@media print`

---

## Sequência de implementação

```
Issue 1 → Schema + Edge Function     (bloqueante — executar primeiro)
Issue 2 → authStore                  (bloqueante — precisa da Issue 1)
Issue 3 → Onboarding UI              (bloqueante para uso real)
Issue 4 → Stores com org_id          (pode começar após Issue 2)
Issue 5 → patientPipeline.ts         (pode começar após Issue 4)
Issue 6 → keywordCheck.ts            (independente — pode ser paralelo)
Issue 7 → Cartão de referência       (independente — pode ser paralelo)
```

---

## Critério de done do upgrade completo

- [ ] Nova clínica: registro → onboarding → dashboard com org isolada
- [ ] Dados de org A não aparecem para org B (testar com 2 usuários)
- [ ] `workflow_status` em patients percorre lead → encerrado
- [ ] Keyword check: `checkCriticalKeywords('sangramento')` → critical: true
- [ ] Testes do pipeline e keyword check passando (Vitest)
- [ ] `npm run build` sem erros
- [ ] `npm run typecheck` sem erros
- [ ] Cartão de referência acessível e imprimível

---

## O que NÃO entra neste upgrade

| Item | Motivo |
|---|---|
| Alertas WhatsApp | Requer Inngest/Edge Function dedicada — sprint separado |
| Settings de org (gerenciar membros) | Pós-MVP |
| SPE-M completo integrado ao pipeline | SPE-M atual funciona independente — integrar depois |
| Billing / Stripe | Fase 6 |
| Design system | Intocado — risco zero |

---

## Prompt para o Claude Code

```
Leia este arquivo completamente.

Projeto: upgrade do SPE-M com assets do MFI SaaS
Stack: React 18 + Vite + Zustand + Supabase SPA

CONTEXTO DOS ARQUIVOS DISPONÍVEIS:
- MFI lib/harness/keyword-check.ts → portar direto para src/lib/keywordCheck.ts
- MFI lib/patient-pipeline.ts → portar direto para src/lib/patientPipeline.ts
- MFI app/actions/onboarding.ts → adaptar para Edge Function Supabase
- MFI lib/supabase/admin.ts → padrão para Edge Function (não copiar — sem Next.js)

REGRAS:
1. SPA Vite — sem server actions, sem Next.js. Operações com service role → Edge Function
2. Não tocar em: design system, wizard SPE-M, canvas fotos, analytics, themeStore
3. Alterações nos stores existentes: mínimas, só o necessário para org_id
4. user_id: manter, não renomear
5. Migrations: nullable primeiro, NOT NULL depois do backfill

Iniciar pela Issue 1.
Mostrar SQL completo e código da Edge Function para aprovação antes de executar.
```