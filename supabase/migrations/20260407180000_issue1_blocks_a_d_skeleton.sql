-- ============================================================================
-- Issue 1 — Migration (Blocos A–D) — endurecida, ainda não executar até validar
-- Base: docs/specs/addendum-v3.1.md + docs/specs/issue-1-schema-checklist.md
--
-- Sintaxe de trigger: Supabase/Postgres atual — FOR EACH ROW EXECUTE FUNCTION …
-- (validado via Context7 /supabase/supabase — exemplos oficiais de updated_at).
--
-- workflow_status (patients) — 12 estados fechados = pipeline SPE-M + saídas do funil:
--   PIPELINE_ORDER (10): lead → consulta_agendada → consulta_realizada → decidiu_operar →
--   pre_operatorio → cirurgia_agendada → cirurgia_realizada → pos_op_ativo → longo_prazo → encerrado
--   + saídas: cancelado, nao_convertido
-- Fonte canônica da máquina de estados: replicar em src quando existir lib/patient-pipeline.ts
-- (referência legível: workspace de referência mfi-saas — NÃO commitar código lá).
--
-- Blocos E/F/G (hook JWT, storage, Edge Function) ficam fora deste arquivo ou em commits seguintes.
--
-- ANTES DE RODAR: garantir que public.profiles e tabelas do Bloco D já existem (ordem de migrations).
-- Escolher UMA variante por tabela:
--   [GREENFIELD] = sem linhas → org_id NOT NULL + workflow_status NOT NULL DEFAULT 'lead'
--   [LEGADO]     = nullable + backfill + NOT NULL em migration posterior
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bloco A — Funções utilitárias (executar primeiro)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at() IS
  'Trigger helper: mantém updated_at coerente. Reutilizável em qualquer tabela com updated_at.';

-- Lê org_id e role do JWT (app_metadata). Deve bater com o que o hook (Bloco E) gravar.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role');
$$;

COMMENT ON FUNCTION public.current_org_id() IS
  'Retorna org_id do JWT; NULL sem sessão/claim. Testar: SELECT public.current_org_id();';
COMMENT ON FUNCTION public.current_app_role() IS
  'Retorna role do JWT (admin|doctor|reception); NULL se ausente.';

-- ----------------------------------------------------------------------------
-- Bloco B — Tabela public.organizations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  phone text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policies novas (ajustar nomes se já existirem no projeto)
DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations
  FOR SELECT
  USING (id = public.current_org_id());

DROP POLICY IF EXISTS org_update ON public.organizations;
CREATE POLICY org_update ON public.organizations
  FOR UPDATE
  USING (
    id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  )
  WITH CHECK (
    id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  );

-- Sem DELETE em organizations (MVP)

-- ----------------------------------------------------------------------------
-- Bloco C — Migração de public.profiles
-- ----------------------------------------------------------------------------

-- org_id referencia organizations: Bloco B deve rodar antes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations (id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (
        role IS NULL
        OR role IN ('admin', 'doctor', 'reception')
      );
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.role IS
  'Sem DEFAULT (addendum v3.1). NULL até onboarding/invite definir valor.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Impede que sessão autenticada comum altere org_id/role; Edge Functions com service_role podem.
CREATE OR REPLACE FUNCTION public.profiles_protect_tenant_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles: org_id e role só podem ser alterados pelo backend (service_role)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_tenant_columns ON public.profiles;
CREATE TRIGGER trg_profiles_protect_tenant_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_tenant_columns();

-- Se o projeto já tinha policies em profiles, DROP explícito com nomes reais antes desta migration.

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_select_same_org_admin ON public.profiles;
CREATE POLICY profiles_select_same_org_admin ON public.profiles
  FOR SELECT
  USING (
    public.current_app_role() = 'admin'
    AND org_id IS NOT NULL
    AND org_id = public.current_org_id()
  );

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Bloco D — org_id (+ workflow_status em patients) nas tabelas de dados
-- ----------------------------------------------------------------------------

-- Lista do checklist: patients, leads, evaluations, patient_photos, patient_documents,
-- checklists, checklist_items, patient_appointments, preop_exams, surgical_records,
-- implant_records, satisfaction_surveys

-- [GREENFIELD] — descomente: org_id NOT NULL + workflow_status NOT NULL DEFAULT 'lead' + CHECK definitivo (12 estados)
/*
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id),
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'lead';

DO $wf$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_workflow_status_check') THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_workflow_status_check
      CHECK (
        workflow_status IN (
          'lead',
          'consulta_agendada',
          'consulta_realizada',
          'decidiu_operar',
          'pre_operatorio',
          'cirurgia_agendada',
          'cirurgia_realizada',
          'pos_op_ativo',
          'longo_prazo',
          'encerrado',
          'cancelado',
          'nao_convertido'
        )
      );
  END IF;
END $wf$;
*/

-- [LEGADO] — descomente: colunas nullable até backfill; CHECK permite NULL durante migração
/*
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations (id),
  ADD COLUMN IF NOT EXISTS workflow_status text;

DO $wf$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_workflow_status_check') THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_workflow_status_check
      CHECK (
        workflow_status IS NULL
        OR workflow_status IN (
          'lead',
          'consulta_agendada',
          'consulta_realizada',
          'decidiu_operar',
          'pre_operatorio',
          'cirurgia_agendada',
          'cirurgia_realizada',
          'pos_op_ativo',
          'longo_prazo',
          'encerrado',
          'cancelado',
          'nao_convertido'
        )
      );
  END IF;
END $wf$;

-- Backfill exemplo (substituir pela org “default” ou mapeamento real):
-- UPDATE public.patients SET org_id = '<uuid-org-default>' WHERE org_id IS NULL;
-- UPDATE public.patients SET workflow_status = 'lead' WHERE workflow_status IS NULL;
-- Depois, em nova migration: NOT NULL + remover IS NULL do CHECK se desejar apenas estados fechados.
*/

-- Demais tabelas: repetir padrão [GREENFIELD] ou [LEGADO] por tabela (sem workflow_status).

-- [GREENFIELD] exemplo compacto (descomente e valide nomes de tabela no seu banco)
/*
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.patient_photos
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.patient_appointments
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.preop_exams
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.surgical_records
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.implant_records
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);

ALTER TABLE public.satisfaction_surveys
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL REFERENCES public.organizations (id);
*/

-- [LEGADO] — template por tabela (copiar/descomentar conforme necessidade)
/*
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations (id);
-- UPDATE public.leads SET org_id = ... WHERE org_id IS NULL;
*/

-- ----------------------------------------------------------------------------
-- Bloco D (continuação) — RLS nas tabelas de dados
-- ----------------------------------------------------------------------------
-- Dropar policies antigas (ex.: por user_id) antes de criar as abaixo.
-- Aplicar quando as tabelas existirem e org_id estiver populado.

-- public.patients — SELECT/INSERT/UPDATE por org; sem DELETE (MVP)
/*
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS ... ON public.patients;

CREATE POLICY patients_select_org ON public.patients
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY patients_insert_org ON public.patients
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY patients_update_org ON public.patients
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
*/

-- DELETE apenas leads + patient_photos, admin-only (addendum v3.1 — nomes alinhados ao texto da spec)
/*
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_delete ON public.leads
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  );

DROP POLICY IF EXISTS photos_delete ON public.patient_photos;
CREATE POLICY photos_delete ON public.patient_photos
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  );
*/

-- ============================================================================
-- Próximos passos manuais (fora de A–D ou em arquivo separado)
-- ============================================================================
-- E — auth.custom_access_token_hook + GRANT + registro no Dashboard
-- F — Storage: paths {org_id}/{patient_id}/... + policies
-- G — Edge Function complete-onboarding
-- H — supabase gen types + ajustes TS
-- ============================================================================
