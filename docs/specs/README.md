# Especificações (SPE-M)

Documentação de produto e critérios de aceite **deste repositório** (`spe-m-bolt-2`). Serve como referência para issues, branches e revisão de código.

## Propósito desta pasta

- Centralizar **o que está decidido** (addendum, checklists).
- Evitar decisões “só na cabeça” ou espalhadas por chats.
- Alinhar implementação com **Issue 1 (schema / Supabase)** e entregas seguintes.

## Ordem de leitura

1. `addendum-v3.1.md` — baseline do produto, alterações v3.1 e decisões que afetam dados, API e UI.
2. `issue-1-schema-checklist.md` — critérios objetivos para fechar a Issue 1.

## Repo principal vs repo de referência

| Repo | Papel |
|------|--------|
| **spe-m-bolt-2** (este) | Único local de **implementação**, migrações, Edge Functions, app React. |
| **mfi-saas** (pasta irmã no workspace) | **Consulta** — padrões, copy de arquivos ou ideias; não é fonte de verdade nem destino de deploy. |

**Regra:** código que entra em produção e histórico Git oficiais ficam **apenas** no `spe-m-bolt-2`. O que vier do `mfi-saas` deve ser **reescrito e adaptado** aqui, com commits neste repo.

## Workspace no Cursor

Na raiz do projeto existe `spe-m-unification.code-workspace`: abre este repo como pasta principal e `../mfi-saas` como referência. Caminhos relativos assumem `mfi-saas` ao lado de `spe-m-bolt-2` (ex.: `.../workspace/spe-m-bolt-2` e `.../workspace/mfi-saas`).

## Pronto para começar a Issue 1?

Usar como gate rápido antes de `git checkout -b feat/issue-1-schema`:

- [ ] `addendum-v3.1.md` lido; secção “Decisões pendentes” sem bloqueios para o schema desta issue.
- [ ] `issue-1-schema-checklist.md` reflete o que esta issue **realmente** inclui (SQL, RLS, storage, Edge Function `complete-onboarding`, etc.).
- [ ] Ambiente local Supabase alinhado (CLI / `db reset` ou fluxo que o projeto use).
- [ ] Nenhuma alteração de schema “só no remoto” sem migração versionada em `supabase/migrations/`.

Quando todos os itens estiverem OK, pode abrir a branch e implementar.
