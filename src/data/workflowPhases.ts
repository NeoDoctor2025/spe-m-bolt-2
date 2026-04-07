export interface WorkflowPhase {
  id: string;
  number: string;
  title: string;
  timing: string;
  actor: 'rec' | 'med' | 'both';
  documents: WorkflowDocument[];
  archiveNote: string;
  warningNote?: string;
  successNote?: string;
}

export interface WorkflowDocument {
  code: string;
  name: string;
  responsible: string;
  isMandatory?: boolean;
  isUpdated?: boolean;
}

export interface WorkflowDecision {
  phase: string;
  question: string;
  options: {
    condition: string;
    action: string;
    severity: 'success' | 'warning' | 'danger';
  }[];
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 'captacao',
    number: '01',
    title: 'Captacao',
    timing: 'Antes de agendar a consulta',
    actor: 'rec',
    documents: [
      {
        code: 'FPC-MFI-01',
        name: 'Ficha de Pre-Cadastro',
        responsible: 'Recepcao',
      },
    ],
    archiveNote: 'CRM ou planilha de leads — registrar origem (UTM/canal) obrigatoriamente',
    warningNote: 'So agendar consulta apos qualificacao minima: procedimento, historico cirurgico e prazo.',
  },
  {
    id: 'consulta',
    number: '02',
    title: 'Consulta Medica',
    timing: 'Durante a consulta',
    actor: 'med',
    documents: [
      {
        code: 'FSPE-EM-01',
        name: 'Ficha SPE-M de Avaliacao Pre-op',
        responsible: 'Medico',
        isUpdated: true,
      },
      {
        code: 'TCI-XX-01',
        name: 'Termo de Consentimento Informado',
        responsible: 'Medico',
        isMandatory: true,
        isUpdated: true,
      },
      {
        code: 'AUI-MFI-01',
        name: 'Autorizacao de Uso de Imagem',
        responsible: 'Recepcao',
      },
    ],
    archiveNote: 'Prontuario eletronico — TCI e AUI digitalizados e anexados no mesmo dia',
    warningNote: 'TCI deve ser especifico por procedimento. O scoring SPE-M deve ser preenchido antes de definir o plano cirurgico.',
  },
  {
    id: 'agendamento',
    number: '03',
    title: 'Agendamento Cirurgico',
    timing: 'Quando o paciente confirma a data',
    actor: 'rec',
    documents: [
      {
        code: 'CPS-MFI-01',
        name: 'Contrato de Prestacao de Servicos',
        responsible: 'Recepcao',
        isMandatory: true,
      },
      {
        code: 'PPO-XX-01',
        name: 'Guia de Preparo Pre-Operatorio',
        responsible: 'Recepcao',
      },
    ],
    archiveNote: 'Contrato: 2 vias — prontuario + paciente. PPO: via unica para o paciente.',
    warningNote: 'Data cirurgica bloqueada somente apos confirmacao de pagamento ou financiamento aprovado.',
  },
  {
    id: 'confirmacao_48h',
    number: '04',
    title: '48h Antes',
    timing: '2 dias antes da cirurgia',
    actor: 'rec',
    documents: [
      {
        code: '—',
        name: 'Ligacao de Confirmacao',
        responsible: 'Recepcao — verificar jejum, exames, saude, acompanhante, pagamento',
      },
    ],
    archiveNote: 'Registro da ligacao no prontuario com data, hora e pendencias identificadas',
    successNote: 'Exame pendente ou resultado alterado: acionar o medico imediatamente para decisao de adiar ou prosseguir.',
  },
  {
    id: 'checkin',
    number: '05',
    title: 'Check-in',
    timing: 'Na chegada do paciente',
    actor: 'both',
    documents: [
      {
        code: 'CPO-XX-01',
        name: 'Checklist Pre-Operatorio',
        responsible: 'Recepcao + Medico',
        isMandatory: true,
      },
      {
        code: 'TCI-XX-01',
        name: 'TCI — confirmar no prontuario',
        responsible: 'Medico',
        isMandatory: true,
      },
    ],
    archiveNote: 'Checklist assinado + copia dos exames do dia arquivados no prontuario',
    warningNote: 'Qualquer item critico pendente = cirurgia adiada. Sem excecoes.',
  },
  {
    id: 'cirurgia',
    number: '06',
    title: 'Cirurgia',
    timing: 'Em sala cirurgica',
    actor: 'med',
    documents: [
      {
        code: 'CIO-XX-01',
        name: 'Checklist Intraoperatorio',
        responsible: 'Medico + Equipe — Sign In / Time Out / Sign Out',
        isMandatory: true,
        isUpdated: true,
      },
    ],
    archiveNote: 'Checklist + relatorio cirurgico completo no prontuario no mesmo dia',
    warningNote: 'Sign In, Time Out e Sign Out sao os 3 estagios obrigatorios OMS. Nenhum pode ser pulado.',
  },
  {
    id: 'alta',
    number: '07',
    title: 'Alta Hospitalar',
    timing: 'Antes do paciente sair',
    actor: 'both',
    documents: [
      {
        code: 'PPO-XX-01',
        name: 'Guia de Preparo (orientacoes de alta)',
        responsible: 'Medico — revisar sinais de alerta com paciente E acompanhante',
      },
      {
        code: 'CPP-XX-01',
        name: 'Checklist Pos-op',
        responsible: 'Recepcao — agendar retorno de 24-48h antes da saida',
        isMandatory: true,
      },
    ],
    archiveNote: 'Registro de alta no prontuario: hora, condicao clinica, medicacao, data do proximo retorno',
    warningNote: 'Paciente nao sai sem acompanhante adulto. Retorno de 24-48h agendado antes de sair.',
  },
  {
    id: 'pos_op_retornos',
    number: '08',
    title: 'Pos-op Retornos',
    timing: '24-48h / 7 dias / 30 dias',
    actor: 'med',
    documents: [
      {
        code: 'CPP-XX-01',
        name: 'Checklist Pos-Operatorio',
        responsible: 'Medico — preencher em cada consulta de retorno (fases I, II, III)',
      },
    ],
    archiveNote: 'Uma linha de evolucao por retorno: data, achados, conduta e proximo retorno',
    successNote: 'Contato ativo nos dias 2, 7 e 30 via WhatsApp — registrar resposta no prontuario.',
  },
  {
    id: 'retorno_3_6_meses',
    number: '09',
    title: '3-6 Meses',
    timing: 'Entre 3 e 6 meses pos-op',
    actor: 'both',
    documents: [
      {
        code: 'NPS-MFI-01',
        name: 'Pesquisa de Satisfacao NPS',
        responsible: 'Recepcao — entregar na chegada ao retorno',
      },
      {
        code: 'AUI-MFI-01',
        name: 'Autorizacao de Uso de Imagem (resultado)',
        responsible: 'Medico — solicitar autorizacao especifica para fotos de resultado',
      },
    ],
    archiveNote: 'NPS: banco de dados com data e procedimento. Fotos: pasta do paciente com data',
    successNote: 'Momento ideal para protocolo de indicacao ativa — paciente no pico de satisfacao.',
  },
  {
    id: 'fechamento_12m',
    number: '10',
    title: 'Fechamento 12m',
    timing: 'Retorno de 12 meses',
    actor: 'med',
    documents: [
      {
        code: 'CPP-XX-01',
        name: 'Checklist Pos-op — retorno final',
        responsible: 'Medico — resultado definitivo, fotos finais, fechamento formal',
      },
    ],
    archiveNote: 'Prontuario: evolucao final marcada como "Caso encerrado — XX/XX/XXXX"',
    successNote: 'Ativar CRM de retencao: aniversario do paciente, aniversario da cirurgia (12 meses).',
  },
];

export const WORKFLOW_DECISIONS: WorkflowDecision[] = [
  {
    phase: 'Fase 01 — Captacao',
    question: 'Lead mencionou cirurgia previa?',
    options: [
      { condition: 'Nao', action: 'Fluxo padrao → agendar consulta', severity: 'success' },
      { condition: 'Sim', action: 'Registrar na FPC-MFI-01 — medico deve saber antes da consulta', severity: 'warning' },
    ],
  },
  {
    phase: 'Fase 01 — Captacao',
    question: 'Lead mencionou bioestimulador (Sculptra, Radiesse)?',
    options: [
      { condition: 'Nao', action: 'Fluxo padrao', severity: 'success' },
      { condition: 'Sim', action: 'Registrar tipo, regiao e data — medico avalia impacto no plano (Criterio 3 SPE-M)', severity: 'warning' },
    ],
  },
  {
    phase: 'Fase 02 — Consulta',
    question: 'Score SPE-M final?',
    options: [
      { condition: '8-10', action: 'Candidato ideal → prosseguir com agendamento', severity: 'success' },
      { condition: '6-7', action: 'Com ressalvas → documentar riscos adicionais', severity: 'warning' },
      { condition: '< 6', action: 'NAO agendar sem nova avaliacao medica', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 03 — Agendamento',
    question: 'Pagamento / financiamento confirmado?',
    options: [
      { condition: 'Sim', action: 'Bloquear data no centro cirurgico e confirmar anestesiologista', severity: 'success' },
      { condition: 'Nao', action: 'NAO bloquear data. Aguardar confirmacao antes de qualquer reserva', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 04 — 48h Antes',
    question: 'Algum exame com resultado alterado?',
    options: [
      { condition: 'Nao', action: 'Confirmar cirurgia → registrar ligacao no prontuario', severity: 'success' },
      { condition: 'Sim', action: 'ACIONAR MEDICO IMEDIATAMENTE. Nao decidir sozinha.', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 05 — Check-in',
    question: 'Item critico (vermelho) pendente no CPO?',
    options: [
      { condition: 'Nenhum', action: 'Liberar para anestesia e preparo da sala', severity: 'success' },
      { condition: 'Qualquer um', action: 'CIRURGIA ADIADA. Acionar medico. Sem excecao.', severity: 'danger' },
      { condition: 'Sem acompanhante', action: 'Cirurgia nao acontece. Alta exige adulto responsavel.', severity: 'warning' },
    ],
  },
  {
    phase: 'Fase 06 — Cirurgia',
    question: 'Protocolo OMS executado?',
    options: [
      { condition: 'Sign In', action: 'Antes da anestesia — identidade, TCI, alergias, antibiotico', severity: 'danger' },
      { condition: 'Time Out', action: 'Antes da incisao — equipe confirma paciente e procedimento', severity: 'danger' },
      { condition: 'Sign Out', action: 'Antes de fechar — contagem de compressas e instrumentais', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 07 — Alta',
    question: 'Retorno de 24-48h esta agendado?',
    options: [
      { condition: 'Sim', action: 'Liberar alta — entregar orientacoes escritas e contato de emergencia', severity: 'success' },
      { condition: 'Nao', action: 'Agendar ANTES de liberar. Alta nao acontece sem retorno confirmado.', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 08 — Pos-op',
    question: 'Paciente relata inchaco subito ou dor intensa?',
    options: [
      { condition: 'Nao', action: 'Evolucao esperada → orientar conforme cronograma', severity: 'success' },
      { condition: 'Sim', action: 'ACIONAR MEDICO IMEDIATAMENTE — suspeita de hematoma expansivo', severity: 'danger' },
    ],
  },
  {
    phase: 'Fase 09 — 3-6 meses',
    question: 'Score NPS do paciente?',
    options: [
      { condition: '9-10', action: 'Ativar protocolo de indicacao ativa', severity: 'success' },
      { condition: '7-8', action: 'Neutro → reforcar vinculo, agendar retorno', severity: 'warning' },
      { condition: '0-6', action: 'ACIONAR MEDICO → entender insatisfacao antes de qualquer marketing', severity: 'danger' },
    ],
  },
  {
    phase: 'Suspensao de Medicamentos',
    question: 'Prazos minimos obrigatorios',
    options: [
      { condition: 'AAS', action: '14 dias antes', severity: 'warning' },
      { condition: 'Anti-inflam.', action: '7 dias antes', severity: 'warning' },
      { condition: 'Fitoterapia', action: '14 dias antes', severity: 'warning' },
      { condition: 'Tabagismo', action: '30 dias antes e 30 dias apos', severity: 'danger' },
      { condition: 'Anticoag.', action: 'Conforme medico — nao suspender sem orientacao', severity: 'danger' },
    ],
  },
];

export const CRITICAL_ALERTS = {
  danger: [
    'Exame alterado na confirmacao de 48h',
    'Item critico pendente no check-in',
    'Paciente sem acompanhante no dia',
    'Inchaco subito ou dor intensa no pos-op',
    'NPS 0-6 — insatisfacao com resultado',
  ],
  warning: [
    'Ligacao de confirmacao (data + hora + resultado)',
    'Bioestimuladores relatados na captacao',
    'Contato ativo pos-op: dias 2, 7 e 30',
    'Alta: hora + condicao + data do retorno',
    'Qualquer desvio do fluxo padrao',
  ],
};

export const PHASE_ORDER = [
  'captacao',
  'consulta',
  'agendamento',
  'confirmacao_48h',
  'checkin',
  'cirurgia',
  'alta',
  'pos_op_retornos',
  'retorno_3_6_meses',
  'fechamento_12m',
] as const;

export type WorkflowPhaseId = (typeof PHASE_ORDER)[number];

export function getPhaseIndex(phaseId: string): number {
  return PHASE_ORDER.indexOf(phaseId as WorkflowPhaseId);
}

export function getNextPhase(currentPhaseId: string): string | null {
  const currentIndex = getPhaseIndex(currentPhaseId);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[currentIndex + 1];
}

export function getPreviousPhase(currentPhaseId: string): string | null {
  const currentIndex = getPhaseIndex(currentPhaseId);
  if (currentIndex <= 0) return null;
  return PHASE_ORDER[currentIndex - 1];
}
