# SPE-M -- Sistema de Pre-avaliacao Cirurgica

Plataforma para avaliacao pre-operatoria de pacientes cirurgicos. Permite a profissionais de saude conduzir avaliacoes estruturadas em etapas, gerenciar prontuarios, registrar fotos clinicas e acompanhar estatisticas.

## Funcionalidades

- **Gestao de Pacientes** -- Cadastro completo com dados pessoais, classificacao de risco (I a IV), historico medico, alergias e medicamentos
- **Avaliacao em 5 Etapas** -- Wizard guiado com pontuacao automatica cobrindo anamnese, exame fisico, classificacao de risco, planejamento cirurgico e revisao final
- **Fotos Clinicas** -- Upload de fotos por angulo anatomico (frontal, lateral, obliqua) com ferramenta de anotacao em canvas
- **Dashboard** -- Resumo de metricas, avaliacoes recentes e distribuicao por classificacao
- **Relatorios** -- Graficos interativos com filtro por periodo: avaliacoes ao longo do tempo, distribuicao por classe e scores por criterio
- **Configuracoes** -- Perfil do profissional e dados da clinica

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Estilo | Tailwind CSS |
| Componentes | Radix UI, Lucide React |
| Estado | Zustand |
| Formularios | React Hook Form + Zod |
| Graficos | Recharts |
| Backend | Supabase (PostgreSQL, Auth, Storage) |

## Estrutura do Projeto

```
src/
  pages/           Paginas da aplicacao (Dashboard, Patients, Evaluations, etc.)
  components/
    layout/        Layouts e navegacao
    evaluation/    Componentes do wizard de avaliacao
    ui/            Componentes reutilizaveis (Button, Card, Input, Modal, etc.)
  stores/          Estado global (auth, patient, evaluation, ui)
  lib/             Cliente Supabase, tipos, utilitarios e validacao
  data/            Criterios de avaliacao e dados auxiliares
supabase/
  migrations/      Migracoes SQL do banco de dados
```

## Banco de Dados

| Tabela | Descricao |
|---|---|
| `profiles` | Perfil do profissional (nome, CRM, especialidade, clinica) |
| `patients` | Prontuarios de pacientes |
| `evaluations` | Avaliacoes com status, pontuacao e etapa atual |
| `evaluation_criteria` | Respostas individuais por criterio de avaliacao |
| `patient_photos` | Fotos clinicas com anotacoes em JSON |

Todas as tabelas utilizam Row Level Security para isolamento de dados por usuario.

## Desenvolvimento

```bash
npm install
npm run dev
```

As variaveis de conexao com o Supabase devem estar configuradas no arquivo `.env`.
