# SPE-M -- Sistema de Pre-avaliacao Cirurgica

Plataforma web medica para avaliacao pre-operatoria estruturada com score de precisao em tempo real. Permite a profissionais de saude conduzir avaliacoes em 5 etapas, gerenciar prontuarios, registrar fotos clinicas com anotacoes e acompanhar estatisticas clinicas.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| Estilo | Tailwind CSS · Dark theme exclusivo |
| Componentes | Radix UI (Dialog, Tabs, Accordion, Select, Tooltip, Popover, Progress, Radio Group, Dropdown Menu) |
| Icones | Lucide React |
| Estado | Zustand 5 (4 stores) |
| Formularios | React Hook Form + Zod 4 |
| Graficos | Recharts 3 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Datas | date-fns |
| Roteamento | React Router 7 |

## Inicio Rapido

```bash
npm install
npm run dev      # http://localhost:5173
```

Requer as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas no arquivo `.env`.

## Funcionalidades

### Score SPE-M -- Avaliacao em 5 Etapas

Wizard guiado com 22 criterios clinicos distribuidos em 5 etapas. Pontuacao maxima: **64 pontos**.

| Etapa | Criterios | Pts Max | Descricao |
|---|---|---|---|
| 1. Anamnese | 5 criterios | 14 | Queixa principal, historico cirurgico, comorbidades, medicamentos, alergias |
| 2. Exame Fisico | 5 criterios | 14 | Estado geral, IMC, qualidade da pele, simetria, cicatrizacao |
| 3. Classificacao de Risco | 4 criterios | 13 | ASA, Mallampati, risco tromboembolico, risco cardiaco (Goldman) |
| 4. Planejamento Cirurgico | 4 criterios | 12 | Complexidade, tempo estimado, tipo de anestesia, expectativas |
| 5. Revisao Final | 4 criterios | 11 | Exames laboratoriais, consentimento, preparo pre-op, decisao final |

**Classificacao de risco por score:**

| Score | Nivel | Cor |
|---|---|---|
| >= 80% | Risco Baixo / Apto | Verde |
| >= 60% | Risco Moderado / Avaliar | Ambar |
| >= 40% | Risco Alto / Cautela | Laranja |
| < 40% | Risco Muito Alto / Contraindicado | Vermelho |

O sidebar lateral exibe em tempo real: score total com indicador circular SVG, nivel de risco e breakdown por etapa com barras de progresso.

### Telas

| Rota | Descricao |
|---|---|
| `/login` | Autenticacao com layout split-screen (branding + stats a esquerda, formulario a direita) |
| `/register` | Cadastro com nome, email, CRM, senha com indicador de forca (4 niveis) |
| `/forgot-password` | Recuperacao de senha com confirmacao visual |
| `/dashboard` | 4 metricas (pacientes, avaliacoes, pendentes, score medio), tabela de recentes, grafico de distribuicao por classe |
| `/patients` | Lista paginada (10/pg) com busca por nome/CPF, filtro por classificacao, ordenacao |
| `/patients/new` | Cadastro com 4 secoes: dados pessoais, contato, endereco (27 estados BR), historico medico |
| `/patients/:id` | Detalhe com tabs (Visao Geral + Historico de avaliacoes), acoes rapidas |
| `/patients/:id/edit` | Edicao do prontuario existente |
| `/evaluations` | Lista centralizada de todas as avaliacoes com status e scores |
| `/evaluations/new` | Wizard 5 etapas com score em tempo real e canvas anatomico |
| `/evaluations/:id` | Retomada de avaliacao em andamento |
| `/photos` | 5 viewports de upload (Frontal, Lateral E/D, Obliqua E/D) com ferramentas de anotacao |
| `/analytics` | 4 graficos: linha (avaliacoes/mes), pizza (distribuicao por classe), barras (scores por criterio), cards de metricas |
| `/settings` | Tabs: Perfil (nome, CRM, especialidade, telefone) e Clinica (nome, endereco) |
| `/help` | FAQ em accordion pesquisavel (6 secoes) + contato de suporte |

### Fotos Clinicas com Anotacao

- 5 viewports anatomicos: Frontal, Lateral Esquerda/Direita, Obliqua Esquerda/Direita
- Upload com drag-and-drop ou clique por viewport
- Canvas HTML5 com ferramentas de desenho:
  - Caneta (4 cores) e borracha
  - 3 larguras de linha
  - Undo/Redo com historico completo
  - Limpar tudo
- Anotacoes salvas como JSON (tipo, cor, largura, pontos)
- Armazenamento: Supabase Storage (bucket `patient-photos`)

### Canvas Anatomico

Disponivel na etapa de Classificacao de Risco do wizard:
- Desenho sobre diagrama corporal (cabeca, torso, membros)
- Ferramentas: caneta, borracha, 5 cores, 3 larguras
- Undo/Redo completo
- Responsivo ao container

### Autenticacao

- Email/senha via Supabase Auth (sem magic links)
- Registro com validacao de senha forte (8+ chars, 1 maiuscula, 1 numero)
- Indicador visual de forca da senha (4 niveis)
- Recuperacao de senha por email
- Rotas protegidas com redirect automatico
- Perfil criado automaticamente via trigger no banco

### Dashboard

- 4 cards de metricas com icones e tendencias
- Tabela de avaliacoes recentes com avatar, paciente, data, status, score
- Grafico de pizza: distribuicao de pacientes por classificacao (I a IV)
- Loading skeletons durante fetch

### Relatorios (Analytics)

- 4 cards de estatisticas: total avaliacoes, score medio, concluidas, maior score
- Filtro por intervalo de datas (debounce 300ms)
- Grafico de linha: avaliacoes ao longo de 12 meses
- Grafico de pizza: distribuicao por classificacao
- Grafico de barras horizontal: scores medios por criterio
- Tema escuro customizado nos graficos

## Banco de Dados

5 tabelas com Row Level Security ativo em todas:

| Tabela | Descricao | RLS |
|---|---|---|
| `profiles` | Perfil do profissional (nome, CRM, especialidade, clinica) | Usuario le/edita apenas o proprio perfil |
| `patients` | Prontuarios com dados pessoais, endereco, historico medico | CRUD restrito ao dono |
| `evaluations` | Avaliacoes com status, score, etapa atual | CRUD restrito ao dono |
| `evaluation_criteria` | Respostas individuais por criterio (upsert via unique constraint) | Leitura/escrita vinculada ao dono da avaliacao |
| `patient_photos` | Fotos com viewport, URL e anotacoes em JSONB | CRUD restrito ao dono |

**Storage:** Bucket `patient-photos` com path `{user_id}/{patient_id}/{viewport}_{timestamp}.{ext}`

**Trigger:** `handle_new_user` cria automaticamente um registro em `profiles` ao registrar usuario, puxando `full_name` do metadata.

**Indexes:** user_id, patient_id, status, classification, created_at DESC nas tabelas relevantes.

## Estado (Zustand)

| Store | Responsabilidade |
|---|---|
| `authStore` | Sessao, perfil, login/registro/logout, reset de senha |
| `patientStore` | CRUD de pacientes, paginacao, filtros (busca, classificacao, status, ordenacao) |
| `evaluationStore` | CRUD de avaliacoes, respostas por criterio, navegacao do wizard, calculo de score |
| `uiStore` | Sidebar, toasts (auto-dismiss 4s com animacao) |

## Validacao (Zod)

| Schema | Campos |
|---|---|
| `loginSchema` | Email, senha (min 6) |
| `registerSchema` | Nome, email, CRM, senha forte, confirmacao |
| `forgotPasswordSchema` | Email |
| `patientSchema` | Nome, CPF (11-14 chars), nascimento, genero, telefone, email, endereco, classificacao, historico medico |
| `profileSchema` | Nome, CRM, especialidade (50+ opcoes), telefone, dados da clinica |

## Estrutura do Projeto

```
src/
├── components/
│   ├── evaluation/       # Wizard de avaliacao
│   │   ├── AnatomicalCanvas.tsx    # Canvas HTML5 com diagrama corporal
│   │   ├── CriterionQuestion.tsx   # Radio group por criterio
│   │   ├── EvalScoreSidebar.tsx    # Score em tempo real + breakdown
│   │   └── EvalStepper.tsx         # Indicador de etapas
│   ├── layout/           # Estrutura da aplicacao
│   │   ├── AppLayout.tsx           # Layout principal com Navbar + Outlet
│   │   ├── AuthLayout.tsx          # Layout split-screen para login/registro
│   │   └── Navbar.tsx              # Navegacao responsiva + dropdown de perfil
│   └── ui/               # Componentes reutilizaveis
│       ├── Avatar.tsx              # Imagem ou iniciais (sm/md/lg/xl)
│       ├── Badge.tsx               # 5 variantes (success/warning/error/info/neutral)
│       ├── Button.tsx              # 5 variantes + loading spinner
│       ├── Card.tsx                # Container com header/title/description
│       ├── EmptyState.tsx          # Estado vazio com icone e CTA
│       ├── Input.tsx               # Input, Textarea, Select com validacao
│       ├── Modal.tsx               # Dialog Radix com backdrop blur
│       ├── Skeleton.tsx            # Card/Table/Page skeletons com pulse
│       └── Toast.tsx               # Notificacoes com auto-dismiss
├── data/
│   ├── evaluationCriteria.ts       # 22 criterios em 5 etapas (config completa)
│   └── mockData.ts                 # Dados auxiliares
├── lib/
│   ├── supabase.ts                 # Cliente Supabase (singleton)
│   ├── types.ts                    # Interfaces TypeScript (Profile, Patient, Evaluation, etc.)
│   ├── utils.ts                    # Formatacao (data, CPF, telefone), cores por score/status
│   └── validation.ts              # Schemas Zod (login, registro, paciente, perfil)
├── pages/                          # Uma pagina por rota (13 paginas)
├── stores/                         # Zustand stores (auth, patient, evaluation, ui)
├── index.css                       # Design system (dark theme, scrollbar, focus ring)
├── main.tsx                        # Entry point
└── App.tsx                         # Rotas protegidas/publicas

supabase/
└── migrations/                     # 6 migracoes SQL
    ├── create_profiles_table.sql
    ├── create_patients_table.sql
    ├── create_evaluations_table.sql
    ├── create_patient_photos_table.sql
    ├── add_evaluation_criteria_unique_constraint.sql
    └── create_patient_photos_storage_bucket.sql
```

## Design System

| Elemento | Valor |
|---|---|
| Background | `slate-950` |
| Cards | `bg-slate-900 border-slate-800 rounded-lg` |
| Primary | Blue-600 (`#2563EB`) |
| Texto heading | `text-slate-50` |
| Texto body | `text-slate-400` |
| Success | Emerald-400/500 |
| Warning | Amber-400/500 |
| Danger | Red-400/500 |
| Font | Inter (300-800, Google Fonts) |
| Animacoes | fade-in, slide-up, slide-down (0.3s), pulse-slow (3s) |
| Idioma | pt-BR |

Dark theme exclusivo. Scrollbar customizada. Focus ring azul com offset.

## Scripts

```bash
npm run dev        # Servidor de desenvolvimento (Vite)
npm run build      # Build de producao
npm run preview    # Preview do build
npm run lint       # ESLint
npm run typecheck  # Verificacao de tipos TypeScript
```
