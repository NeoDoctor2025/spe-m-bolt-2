/**
 * Maquina de estados do paciente — logica pura.
 * Sem dependencias de Supabase, Next.js ou React.
 * Reusavel por Server Actions e Inngest functions.
 *
 * SC-04: status so avanca (exceto cancelado).
 * SC-10/SC-12/SC-13: bloqueios clinicos verificados via ClinicalContext.
 */

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
] as const;

export const TERMINAL_STATUSES = new Set(['cancelado', 'encerrado', 'nao_convertido']);

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
]);

export type TransitionResult = {
  allowed: boolean;
  reason?: string;
};

export type ClinicalContext = {
  spemScore: number | null;
  cioSignedOut: boolean;
};

export function getNextStatuses(current: string | null): string[] {
  const normalized = current ?? 'lead';

  if (normalized === 'cancelado') return [];

  const next = VALID_TRANSITIONS.get(normalized) ?? [];
  const result = [...next];

  if (!TERMINAL_STATUSES.has(normalized)) {
    result.push('cancelado');
  }

  return result;
}

export function canTransition(from: string | null, to: string): TransitionResult {
  const normalized = from ?? 'lead';

  if (to === 'cancelado' && normalized === 'cancelado') {
    return { allowed: true };
  }

  if (to === 'cancelado') {
    return { allowed: true };
  }

  if (TERMINAL_STATUSES.has(normalized)) {
    return { allowed: false, reason: `Status "${normalized}" é terminal. Não é possível avançar.` };
  }

  const validNexts = VALID_TRANSITIONS.get(normalized);
  if (!validNexts || !validNexts.includes(to)) {
    return { allowed: false, reason: `Transição de "${normalized}" para "${to}" não é permitida.` };
  }

  const fromIdx = PIPELINE_ORDER.indexOf(normalized as typeof PIPELINE_ORDER[number]);
  const toIdx = PIPELINE_ORDER.indexOf(to as typeof PIPELINE_ORDER[number]);

  if (fromIdx !== -1 && toIdx !== -1 && toIdx <= fromIdx) {
    return { allowed: false, reason: 'Status só pode avançar, não retroceder (SC-04).' };
  }

  return { allowed: true };
}

export function checkSPEMBlock(spemScore: number | null): TransitionResult {
  if (spemScore === null) {
    return {
      allowed: false,
      reason: 'Avaliação SPE-M necessária antes de agendar cirurgia.',
    };
  }

  if (spemScore < 6) {
    return {
      allowed: false,
      reason: `Score SPE-M ${spemScore}/10 (contraindicado). Agendamento cirúrgico bloqueado (SC-12).`,
    };
  }

  return { allowed: true };
}

export function checkCIOBlock(cioSignedOut: boolean): TransitionResult {
  if (!cioSignedOut) {
    return {
      allowed: false,
      reason: 'Transição para cirurgia realizada requer Sign Out do CIO assinado pelo médico (SC-13).',
    };
  }

  return { allowed: true };
}

export function checkClinicalBlocks(
  context: ClinicalContext,
  from: string | null,
  to: string,
): TransitionResult {
  const normalized = from ?? 'lead';

  if (normalized === 'pre_operatorio' && to === 'cirurgia_agendada') {
    const spemResult = checkSPEMBlock(context.spemScore);
    if (!spemResult.allowed) {
      return spemResult;
    }

    return {
      allowed: false,
      reason: 'Agendar cirurgia requer TCI assinado, contrato assinado e pagamento confirmado. (Disponível na Fase 2.)',
    };
  }

  if (normalized === 'cirurgia_agendada' && to === 'cirurgia_realizada') {
    return checkCIOBlock(context.cioSignedOut);
  }

  return { allowed: true };
}
