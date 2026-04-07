# SPE-M SaaS — Addendum v3 → v3.1
> 4 ajustes finais antes de executar a Issue 1
> Não reescreve a v3 — apenas corrige os pontos identificados

---

## Correção 1 — `role` nullable sem default

**Problema na v3:** texto dizia "nullable até onboarding" mas SQL tinha `DEFAULT 'doctor'`. Inconsistente.

**SQL correto:**
```sql
ALTER TABLE profiles
  ADD COLUMN org_id uuid REFERENCES organizations(id),
  ADD COLUMN role text CHECK (role IN ('admin', 'doctor', 'reception'));
-- Sem DEFAULT. role = NULL até onboarding concluído.
-- Onboarding define 'admin'. Invite define 'doctor' ou 'reception'.
```

**Guard no authStore:** se `session && orgId && !role` → tratar como estado inválido → redirecionar para `/onboarding` (provavelmente onboarding incompleto).

---

## Correção 2 — `update_updated_at()` precisa existir

**Problema:** trigger em `organizations` usa a função mas a spec não garantia sua existência.

**Adicionar no início da Issue 1, antes de criar organizations:**
```sql
-- Criar se não existir (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Esta função pode ser reutilizada por qualquer tabela que precise de `updated_at` automático.

---

## Correção 3 — DELETE policies: decisão fechada para MVP

**Problema:** v3 deixou em aberto ("manter por user_id onde faz sentido").

**Decisão MVP — regra única:**

> **Tabelas clínicas não têm DELETE no MVP. Soft delete via status.**

```sql
-- NÃO criar DELETE policy para:
-- patients, evaluations, checklists, checklist_items,
-- patient_documents, preop_exams, surgical_records,
-- implant_records, satisfaction_surveys, patient_appointments

-- Exceções com DELETE permitido (dados não-clínicos):
-- leads: admin pode deletar lead não convertido
-- patient_photos: admin pode deletar foto

-- DELETE policy para leads (admin apenas):
CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );

-- DELETE policy para patient_photos (admin apenas):
CREATE POLICY "photos_delete" ON patient_photos
  FOR DELETE USING (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );
```

**Motivo:** dados clínicos têm obrigação de retenção (Res. CFM 1638/2002). Soft delete via `workflow_status = 'cancelado'` ou `status = 'arquivado'` é o caminho correto.

---

## Correção 4 — Edge Function `manage-members`: validação de admin obrigatória

**Problema:** v3 não especificou como a Edge Function valida que o chamador é admin da org.

**Regras explícitas para `manage-members`:**
```typescript
// supabase/functions/manage-members/index.ts

// 1. Extrair JWT do header Authorization
// 2. Verificar que app_metadata.role === 'admin'
// 3. Verificar que app_metadata.org_id existe
// 4. Todas as operações só afetam membros com o mesmo org_id do chamador
// 5. Ninguém pode promover alguém para org diferente da sua

// Ações permitidas:
// - invite: criar convite para email + role predefinida
// - changeRole: mudar role de membro existente da mesma org
// - removeMember: remover membro da org (não deleta o usuário Supabase)

// Validação de entrada mínima:
// - invite: { action: 'invite', email, role }
//   - role deve ser 'doctor' ou 'reception' (admin não pode ser convidado — só onboarding)
// - changeRole: { action: 'changeRole', memberId, newRole }
//   - newRole: 'doctor' | 'reception' (admin não pode ser atribuído via invite)
// - removeMember: { action: 'removeMember', memberId }
//   - não pode remover a si mesmo
//   - não pode remover o último admin da org
```

---

## Observação extra: `checklist_items` e `org_id`

**Dúvida do copilot:** `checklist_items` precisa de `org_id` ou deriva via join?

**Decisão:** adicionar `org_id` diretamente em `checklist_items`.

**Motivo:** RLS em tabelas filhas via join é possível mas complexo de implementar e debugar. Para MVP, `org_id` direto é mais simples, mais explícito e mais performático nas policies. A redundância é aceitável.

---

## Sequência de execução corrigida (Issue 4 antes de 6 e 7)

```
Issue 1  → Schema + Edge Functions            (bloqueante)
Issue 2  → authStore                          (bloqueante)
Issue 3  → Onboarding                         (bloqueante para uso real)
Issue 4  → Stores (11 stores — mais arriscada) ← executar antes de 6 e 7
Issue 5  → Pipeline de status
Issue 6  → Keyword check                      (paralelo ao 5)
Issue 7  → Cartão de referência               (paralelo ao 5)
Issue 8  → Settings de org
Issue 9  → Planejar alertas (pós-MVP)
```