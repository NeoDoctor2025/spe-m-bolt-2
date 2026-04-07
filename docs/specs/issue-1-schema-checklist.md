---

# Checklist de Aprovação — Issue 1

> Revisar cada item antes de executar qualquer SQL ou deploy de Edge Function.
> ✅ = pronto para executar | ⚠️ = verificar antes | ❌ = bloqueia execução

---

## Bloco A — Funções utilitárias (executar primeiro)

- `public.update_updated_at()` criada (ou confirmada que já existe no banco)
- `public.current_org_id()` criada
- `public.current_app_role()` criada
- Funções testadas: `SELECT public.current_org_id()` retorna null sem JWT, uuid com JWT válido

---

## Bloco B — Tabela `organizations`

- `organizations` criada com todos os campos: id, name, cnpj, phone, timezone, active, created_at, **updated_at**
- Trigger `trg_organizations_updated_at` criado
- RLS habilitado
- Policy `org_select`: membros veem apenas sua org via `public.current_org_id()`
- Policy `org_update`: admin pode editar sua org (verificar: `public.current_app_role() = 'admin'`)
- Sem DELETE policy em organizations

---

## Bloco C — Migração de `profiles`

- `org_id uuid REFERENCES organizations(id)` adicionado (nullable)
- `role text CHECK (role IN ('admin', 'doctor', 'reception'))` adicionado (**sem DEFAULT**)
- RLS de profiles revisada: manter policy de auto-leitura (`auth.uid() = id`) + adicionar policy de leitura por org para admin

---

## Bloco D — Migração das tabelas de dados

Para cada tabela: `patients`, `leads`, `evaluations`, `patient_photos`, `patient_documents`, `checklists`, `checklist_items`, `patient_appointments`, `preop_exams`, `surgical_records`, `implant_records`, `satisfaction_surveys`

- `org_id uuid` adicionado (nullable se dados existem, NOT NULL se banco vazio)
- Se dados existem: backfill executado antes de `SET NOT NULL`
- `workflow_status` adicionado em `patients` com CHECK constraint
- Policies antigas (por `user_id`) dropadas
- Policies novas (por `public.current_org_id()`) criadas para SELECT, INSERT, UPDATE
- DELETE policies: apenas `leads` e `patient_photos` com admin-only; demais sem DELETE

---

## Bloco E — JWT Custom Claims Hook

- Função `auth.custom_access_token_hook` criada no schema `auth`
- `GRANT EXECUTE` concedido para `supabase_auth_admin`
- **Manual:** hook registrado no Supabase Dashboard → Auth → Hooks
- Teste: fazer login, verificar `user.app_metadata.org_id` e `user.app_metadata.role` no JWT
- Teste sem org: JWT não contém org_id (usuário novo sem onboarding)

---

## Bloco F — Storage

- Path migration documentado: `{user_id}/...` → `{org_id}/{patient_id}/...`
- Estratégia para fotos existentes definida: manter legado ou migrar?
- Policy de upload criada: (storage.foldername(name))[1] = public.current_org_id()::text
- Policy de download criada: idem
- Bucket `documents` criado como privado (se ainda não existe)
- Policy de upload e download para `documents` bucket criada

---

## Bloco G — Edge Function `complete-onboarding`

- Código escrito em `supabase/functions/complete-onboarding/index.ts`
- Valida JWT do request (não aceita chamada sem auth)
- Idempotente: se `profiles.org_id` já existe, não cria nova organization; apenas garante `app_metadata` consistente e retorna sucesso.
- INSERT em `organizations` com name e timezone
- UPDATE em `profiles`: org_id + role = 'admin'
- `supabase.auth.admin.updateUserById()` com app_metadata: `{ org_id, role: 'admin' }`
- Retorna `{ success: true, orgId }`
- Deploy: `npx supabase functions deploy complete-onboarding`
- Teste manual: chamar via curl ou Supabase Studio → verificar organizations + profiles

---

## Bloco H — Types TypeScript

- `npx supabase gen types typescript --linked > src/lib/database.types.ts`
- Verificar: `organizations`, `patients` com `org_id` e `workflow_status`, todos os campos novos
- `src/lib/types.ts` atualizado com `Role`, `Organization`

---

## Verificação final da Issue 1

- Todos os blocos A-H concluídos
- `npm run typecheck` sem erros
- Login → `user.app_metadata` contém `org_id` e `role` (após onboarding)
- Login → `user.app_metadata` vazio (usuário novo sem org)
- Commit com mensagem: `feat: Issue 1 — schema multi-tenant + edge function complete-onboarding`
- **Spec review:** código bate com a spec?
- **Code quality review:** implementação está limpa?

---

## Riscos conhecidos da Issue 1


| Risco                          | Mitigação                                                        |
| ------------------------------ | ---------------------------------------------------------------- |
| Banco com dados legados        | Adicionar org_id como nullable, fazer backfill antes de NOT NULL |
| Fotos com path antigo          | Manter policy dupla ou migrar manualmente                        |
| Hook não disparar              | Verificar GRANT EXECUTE + registro manual no Dashboard           |
| app_metadata não atualizar     | Confirmar `refreshSession()` após Edge Function                  |
| Edge Function sem autenticação | Validar JWT no início da função, retornar 401 se inválido        |

---

## Validação pós-reset — SQL rápido (Blocos A–D)

Rodar no SQL Editor local (ou `psql`) após `supabase db reset` / migrations aplicadas. Ajuste nomes de colunas se o schema base de `patients` tiver outros `NOT NULL` obrigatórios.

### 1 — Helpers `public`

```sql
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('update_updated_at', 'current_org_id', 'current_app_role');
```

Esperado: **3 linhas**.

### 2 — `current_*` sem JWT de app

```sql
SELECT public.current_org_id() AS org_id, public.current_app_role() AS role;
```

No editor SQL costuma ser **NULL/NULL** (ok). Claims reais validar após Bloco E ou via cliente.

### 3 — `organizations` com RLS ativo

```sql
SELECT relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'organizations';
```

Esperado: **`t`**.

### 4 — Policies em `organizations`

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organizations'
ORDER BY policyname;
```

Esperado: **`org_select` (SELECT)**, **`org_update` (UPDATE)**; sem **DELETE**.

### 5 — Colunas `profiles.org_id` e `profiles.role`

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('org_id', 'role');
```

### 6 — Trigger `trg_profiles_protect_tenant_columns`

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

### 7 — Policies em `profiles`

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
```

Esperado: **`profiles_select_own`**, **`profiles_select_same_org_admin`**, **`profiles_insert_own`**, **`profiles_update_own`**.

### 8 — Definição do CHECK `patients_workflow_status_check`

```sql
SELECT pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE n.nspname = 'public'
  AND r.relname = 'patients'
  AND c.conname = 'patients_workflow_status_check';
```

### 9 — `workflow_status` inválido falha

Ajuste `org_id` para um UUID existente em `organizations` (ou use o script **BEGIN … ROLLBACK** abaixo).

```sql
INSERT INTO public.patients (id, org_id, workflow_status)
VALUES (gen_random_uuid(), '<uuid-org>', 'status_invalido');
```

Esperado: **erro de CHECK**.

### 10 — `workflow_status` válido passa

```sql
INSERT INTO public.patients (id, org_id, workflow_status)
VALUES (gen_random_uuid(), '<uuid-org>', 'lead');
```

Esperado: **sucesso** (ou use o script com **ROLLBACK** para não persistir).

### 11 — Sem policy **DELETE** em tabelas clínicas (addendum MVP)

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'patients', 'evaluations', 'checklists', 'checklist_items',
    'patient_documents', 'preop_exams', 'surgical_records',
    'implant_records', 'satisfaction_surveys', 'patient_appointments'
  )
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
```

Esperado: **0 linhas**.

### 12 — **DELETE** só em `leads` e `patient_photos`

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'patient_photos')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
```

Esperado: apenas **`leads_delete`** e **`photos_delete`** (nomes do addendum v3.1).

> **Nota:** os testes 11–12 só se aplicam **depois** de criar as policies de DELETE do Bloco D nos buckets certos. Se ainda não existirem, 12 pode retornar 0 linhas até a migration de policies ser aplicada.

---

### Script único `BEGIN … ROLLBACK` — GREENFIELD

Pré-requisito: variante **GREENFIELD** descomentada e aplicada; `patients` com `org_id NOT NULL` e `workflow_status NOT NULL` + CHECK dos 12 estados. Ajuste o `INSERT` em `patients` se houver outras colunas obrigatórias.

```sql
BEGIN;

INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'Org validação pós-reset');

INSERT INTO public.patients (id, org_id, workflow_status)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'lead'
);

DO $t$
BEGIN
  INSERT INTO public.patients (id, org_id, workflow_status)
  VALUES (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'status_invalido'
  );
  RAISE EXCEPTION 'FALHA: CHECK deveria ter bloqueado workflow_status inválido';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: CHECK bloqueou workflow_status inválido';
END;
$t$;

ROLLBACK;
```

### Script único `BEGIN … ROLLBACK` — LEGADO

Pré-requisito: variante **LEGADO** com `workflow_status` **nullable** e CHECK `(workflow_status IS NULL OR workflow_status IN (...12...))`. Mesmo aviso sobre colunas obrigatórias em `patients`.

```sql
BEGIN;

INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-4000-8000-000000000002', 'Org validação legado');

INSERT INTO public.patients (id, org_id, workflow_status)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000002',
  NULL
);

DO $t$
BEGIN
  INSERT INTO public.patients (id, org_id, workflow_status)
  VALUES (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000002',
    'status_invalido'
  );
  RAISE EXCEPTION 'FALHA: CHECK deveria ter bloqueado workflow_status inválido';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: CHECK bloqueou workflow_status inválido';
END;
$t$;

ROLLBACK;
```

### `patient-pipeline.ts`

Não copiar para o repo até existir app TypeScript; manter os **12 valores** alinhados entre esta migration e a futura `src/lib/patient-pipeline.ts`.


