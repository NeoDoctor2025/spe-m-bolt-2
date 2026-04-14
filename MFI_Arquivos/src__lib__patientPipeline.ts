/**
 * Maquina de estados do paciente — logica pura.
 * Sem dependencias de Supabase, Next.js ou React.
 * Reusavel por Server Actions e Inngest functions.
 *
 * SC-04: status so avanca (exceto cancelado).
 * SC-10/SC-12/SC-13: bloqueios clinicos verificados via ClinicalContext.
 */

/** Ordem linear do pipeline principal */
export const PIPELINE_ORDER = [
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
] as const

/** Status que saem do pipeline principal */
export const TERMINAL_STATUSES = new Set(['cancelado', 'encerrado', 'nao_convertido'])

/** Transicoes validas: from → [to1, to2, ...] */
const VALID_TRANSITIONS = new Map<string, readonly string[]>([
  ['lead', ['consulta_agendada']],
  ['consulta_agendada', ['consulta_realizada']],
  ['consulta_realizada', ['decidiu_operar', 'nao_convertido']],
  ['decidiu_operar', ['pre_operatorio']],
  ['pre_operatorio', ['cirurgia_agendada']],
  ['cirurgia_agendada', ['cirurgia_realizada']],
  ['cirurgia_realizada', ['pos_op_ativo']],
  ['pos_op_ativo', ['longo_prazo']],
  ['longo_prazo', ['encerrado']],
])

export type TransitionResult = {
  allowed: boolean
  reason?: string
}

/**
 * Contexto clinico montado pela Server Action.
 * Passado para funcoes puras do pipeline.
 * Extensivel: F10 adiciona cioSignedOut, F11 adiciona tci/contrato.
 */
export type ClinicalContext = {
  spemScore: number | null // F09: score da avaliacao mais recente (null = sem avaliacao)
  cioSignedOut: boolean    // F10: CIO Sign Out assinado
  // F11: tciSigned?: boolean
  // F11: contratoSigned?: boolean
  // F11: pagamentoConfirmado?: boolean
}

/**
 * Retorna os proximos status validos a partir do status atual.
 * Inclui 'cancelado' se nao for terminal.
 */
export function getNextStatuses(current: string | null): string[] {
  const normalized = current ?? 'lead'

  if (normalized === 'cancelado') return []

  const next = VALID_TRANSITIONS.get(normalized) ?? []
  const result = [...next]

  if (!TERMINAL_STATUSES.has(normalized)) {
    result.push('cancelado')
  }

  return result
}

/**
 * Verifica se a transicao e permitida pela maquina de estados.
 * Nao verifica bloqueios clinicos — usar checkClinicalBlocks() para isso.
 *
 * SC-04: status so avanca para frente (exceto cancelado).
 */
export function canTransition(from: string | null, to: string): TransitionResult {
  const normalized = from ?? 'lead'

  // Cancelar de cancelado → no-op success
  if (to === 'cancelado' && normalized === 'cancelado') {
    return { allowed: true }
  }

  // Cancelar de qualquer status → sempre permitido
  if (to === 'cancelado') {
    return { allowed: true }
  }

  // Status terminal nao avanca
  if (TERMINAL_STATUSES.has(normalized)) {
    return { allowed: false, reason: `Status "${normalized}" é terminal. Não é possível avançar.` }
  }

  // Verificar se a transicao esta na tabela
  const validNexts = VALID_TRANSITIONS.get(normalized)
  if (!validNexts || !validNexts.includes(to)) {
    return { allowed: false, reason: `Transição de "${normalized}" para "${to}" não é permitida.` }
  }

  // Verificar direcao (SC-04): to deve estar a frente de from no pipeline
  const fromIdx = PIPELINE_ORDER.indexOf(normalized as typeof PIPELINE_ORDER[number])
  const toIdx = PIPELINE_ORDER.indexOf(to as typeof PIPELINE_ORDER[number])

  if (fromIdx !== -1 && toIdx !== -1 && toIdx <= fromIdx) {
    return { allowed: false, reason: 'Status só pode avançar, não retroceder (SC-04).' }
  }

  return { allowed: true }
}

/**
 * Verifica bloqueio SC-12: score SPE-M.
 * Funcao pura — sem deps de banco.
 */
export function checkSPEMBlock(spemScore: number | null): TransitionResult {
  if (spemScore === null) {
    return {
      allowed: false,
      reason: 'Avaliação SPE-M necessária antes de agendar cirurgia.',
    }
  }

  if (spemScore < 6) {
    return {
      allowed: false,
      reason: `Score SPE-M ${spemScore}/10 (contraindicado). Agendamento cirúrgico bloqueado (SC-12).`,
    }
  }

  return { allowed: true }
}

/**
 * Verifica bloqueio SC-13: CIO Sign Out.
 * Funcao pura — sem deps de banco.
 */
export function checkCIOBlock(cioSignedOut: boolean): TransitionResult {
  if (!cioSignedOut) {
    return {
      allowed: false,
      reason: 'Transição para cirurgia realizada requer Sign Out do CIO assinado pelo médico (SC-13).',
    }
  }

  return { allowed: true }
}

/**
 * Verifica bloqueios clinicos para uma transicao.
 * Funcao pura — recebe ClinicalContext montado pela Server Action.
 *
 * SC-10: pre_operatorio → cirurgia_agendada (TCI + contrato + pagamento) — stub ate F11
 * SC-12: pre_operatorio → cirurgia_agendada (SPE-M >= 6) — implementado F09
 * SC-13: cirurgia_agendada → cirurgia_realizada (CIO Sign Out) — implementado F10
 */
export function checkClinicalBlocks(
  context: ClinicalContext,
  from: string | null,
  to: string,
): TransitionResult {
  const normalized = from ?? 'lead'

  // pre_operatorio → cirurgia_agendada: SC-12 + SC-10
  if (normalized === 'pre_operatorio' && to === 'cirurgia_agendada') {
    // SC-12: verificar SPE-M (real — F09)
    const spemResult = checkSPEMBlock(context.spemScore)
    if (!spemResult.allowed) {
      return spemResult
    }

    // SC-10: TCI + contrato + pagamento (stub ate F11)
    return {
      allowed: false,
      reason: 'Agendar cirurgia requer TCI assinado, contrato assinado e pagamento confirmado. (Disponível na Fase 2.)',
    }
  }

  // cirurgia_agendada → cirurgia_realizada: SC-13 (real — F10)
  if (normalized === 'cirurgia_agendada' && to === 'cirurgia_realizada') {
    return checkCIOBlock(context.cioSignedOut)
  }

  return { allowed: true }
}
