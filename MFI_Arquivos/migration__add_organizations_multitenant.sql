-- ============================================================
-- SPE-M SaaS — Migration: Multi-tenancy
-- Arquivo: supabase/migrations/YYYYMMDD_add_organizations_multitenant.sql
-- Executar no Supabase Dashboard → SQL Editor
-- ============================================================

-- 0. Funções utilitárias (idempotentes — seguro rodar mais de uma vez)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role'
$$;

-- ============================================================
-- 1. Tabela organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  cnpj       text,
  phone      text,
  timezone   text NOT NULL DEFAULT 'America/Sao_Paulo',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations
  FOR SELECT USING (id = public.current_org_id());

DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  )
  WITH CHECK (id = public.current_org_id());

-- ============================================================
-- 2. profiles: adicionar org_id e role
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS role text
    CHECK (role IN ('admin', 'doctor', 'reception'));
-- SEM DEFAULT — null até onboarding. Onboarding define 'admin'. Invites definem os outros.

-- ============================================================
-- 3. Adicionar org_id nas tabelas de dados
-- Estratégia segura: nullable primeiro (para não quebrar se banco tem dados)
-- Após backfill de dados existentes: ALTER TABLE x ALTER COLUMN org_id SET NOT NULL;
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'lead'
    CHECK (workflow_status IN (
      'lead','consulta_agendada','consulta_realizada',
      'decidiu_operar','pre_operatorio','cirurgia_agendada',
      'cirurgia_realizada','pos_op_ativo','longo_prazo',
      'encerrado','nao_convertido','cancelado'
    ));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE patient_photos
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE patient_documents
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE checklists
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE patient_appointments
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE preop_exams
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE surgical_records
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE implant_records
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- ============================================================
-- 4. Migrar RLS policies: user_id → org_id
-- Dropar antigas, criar novas com helpers
-- ============================================================

-- patients
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

CREATE POLICY patients_select ON patients
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY patients_insert ON patients
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY patients_update ON patients
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
-- SEM DELETE — soft delete via workflow_status = 'cancelado'

-- leads
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

CREATE POLICY leads_select ON leads
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY leads_insert ON leads
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY leads_update ON leads
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY leads_delete ON leads
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  );

-- evaluations
DROP POLICY IF EXISTS "Users can view own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can insert own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update own evaluations" ON evaluations;

CREATE POLICY evaluations_select ON evaluations
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY evaluations_insert ON evaluations
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY evaluations_update ON evaluations
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- patient_photos
DROP POLICY IF EXISTS "Users can view own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON patient_photos;

CREATE POLICY photos_select ON patient_photos
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY photos_insert ON patient_photos
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY photos_update ON patient_photos
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY photos_delete ON patient_photos
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  );

-- patient_documents, checklists, checklist_items, patient_appointments,
-- preop_exams, surgical_records, implant_records, satisfaction_surveys
-- Repetir o padrão SELECT/INSERT/UPDATE acima para cada tabela
-- (sem DELETE policy exceto onde indicado)

-- ============================================================
-- 5. Storage: atualizar policies do bucket patient-photos
-- Novo path: {org_id}/{patient_id}/{viewport}_{timestamp}.ext
-- ============================================================
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

CREATE POLICY photos_storage_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

CREATE POLICY photos_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

-- ⚠️ NOTA: fotos existentes com path {user_id}/... não serão acessíveis
-- pelas novas policies. Se houver dados existentes, migrar o path ou
-- manter policy dupla durante transição.

-- ============================================================
-- 6. JWT custom claims hook
-- ============================================================
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec record;
BEGIN
  SELECT org_id, role INTO rec
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::uuid;

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
REVOKE EXECUTE ON FUNCTION auth.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================================
-- ⚠️ PASSO MANUAL OBRIGATÓRIO após executar este SQL:
-- Supabase Dashboard → Authentication → Hooks
-- → Add hook → Custom Access Token
-- → Schema: auth → Function: custom_access_token_hook
-- → Save
-- ============================================================

-- ============================================================
-- 7. Verificação final
-- ============================================================
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations','patients','leads','evaluations')
ORDER BY tablename, policyname;
