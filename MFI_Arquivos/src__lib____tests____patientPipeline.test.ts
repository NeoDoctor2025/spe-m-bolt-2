import { describe, it, expect } from 'vitest'
import {
  canTransition,
  checkCIOBlock,
  checkClinicalBlocks,
  checkSPEMBlock,
  getNextStatuses,
  PIPELINE_ORDER,
  TERMINAL_STATUSES,
  type ClinicalContext,
} from '../patientPipeline'

// Contexto clinico default para testes que nao testam bloqueios clinicos
const DEFAULT_CONTEXT: ClinicalContext = { spemScore: null, cioSignedOut: false }
const SPEM_OK: ClinicalContext = { spemScore: 8, cioSignedOut: false }
const ALL_OK: ClinicalContext = { spemScore: 8, cioSignedOut: true }

describe('getNextStatuses', () => {
  it('retorna consulta_agendada + cancelado para lead', () => {
    const next = getNextStatuses('lead')
    expect(next).toContain('consulta_agendada')
    expect(next).toContain('cancelado')
    expect(next).toHaveLength(2)
  })

  it('retorna decidiu_operar + nao_convertido + cancelado para consulta_realizada', () => {
    const next = getNextStatuses('consulta_realizada')
    expect(next).toContain('decidiu_operar')
    expect(next).toContain('nao_convertido')
    expect(next).toContain('cancelado')
    expect(next).toHaveLength(3)
  })

  it('retorna array vazio para cancelado (terminal)', () => {
    expect(getNextStatuses('cancelado')).toEqual([])
  })

  it('retorna array vazio para encerrado (terminal)', () => {
    expect(getNextStatuses('encerrado')).toEqual([])
  })

  it('retorna array vazio para nao_convertido (terminal)', () => {
    expect(getNextStatuses('nao_convertido')).toEqual([])
  })

  it('trata null como lead', () => {
    expect(getNextStatuses(null)).toEqual(getNextStatuses('lead'))
  })
})

describe('canTransition', () => {
  it('permite avancar lead → consulta_agendada', () => {
    const result = canTransition('lead', 'consulta_agendada')
    expect(result.allowed).toBe(true)
  })

  it('permite avancar passo a passo ate pre_operatorio', () => {
    const steps: [string, string][] = [
      ['lead', 'consulta_agendada'],
      ['consulta_agendada', 'consulta_realizada'],
      ['consulta_realizada', 'decidiu_operar'],
      ['decidiu_operar', 'pre_operatorio'],
    ]
    for (const [from, to] of steps) {
      expect(canTransition(from, to).allowed).toBe(true)
    }
  })

  it('bloqueia retrocesso consulta_realizada → lead', () => {
    const result = canTransition('consulta_realizada', 'lead')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('bloqueia pular etapas lead → pre_operatorio', () => {
    const result = canTransition('lead', 'pre_operatorio')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('não é permitida')
  })

  it('permite cancelar de qualquer status', () => {
    for (const status of PIPELINE_ORDER) {
      expect(canTransition(status, 'cancelado').allowed).toBe(true)
    }
  })

  it('permite cancelar de cancelado (no-op)', () => {
    const result = canTransition('cancelado', 'cancelado')
    expect(result.allowed).toBe(true)
  })

  it('bloqueia avancar de status terminal encerrado', () => {
    const result = canTransition('encerrado', 'lead')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('terminal')
  })

  it('bloqueia avancar de nao_convertido', () => {
    const result = canTransition('nao_convertido', 'decidiu_operar')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('terminal')
  })

  it('permite consulta_realizada → nao_convertido', () => {
    expect(canTransition('consulta_realizada', 'nao_convertido').allowed).toBe(true)
  })

  it('permite consulta_realizada → decidiu_operar', () => {
    expect(canTransition('consulta_realizada', 'decidiu_operar').allowed).toBe(true)
  })

  it('trata null como lead', () => {
    expect(canTransition(null, 'consulta_agendada').allowed).toBe(true)
  })
})

describe('checkSPEMBlock', () => {
  it('bloqueia quando score e null (sem avaliacao)', () => {
    const result = checkSPEMBlock(null)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('necessária')
  })

  it('bloqueia score 0 (contraindicado)', () => {
    const result = checkSPEMBlock(0)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('SC-12')
  })

  it('bloqueia score 5 (contraindicado)', () => {
    const result = checkSPEMBlock(5)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('5/10')
  })

  it('permite score 6 (com ressalvas)', () => {
    expect(checkSPEMBlock(6).allowed).toBe(true)
  })

  it('permite score 7 (com ressalvas)', () => {
    expect(checkSPEMBlock(7).allowed).toBe(true)
  })

  it('permite score 10 (ideal)', () => {
    expect(checkSPEMBlock(10).allowed).toBe(true)
  })
})

describe('checkCIOBlock', () => {
  it('bloqueia quando CIO Sign Out nao assinado', () => {
    const result = checkCIOBlock(false)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('SC-13')
  })

  it('permite quando CIO Sign Out assinado', () => {
    expect(checkCIOBlock(true).allowed).toBe(true)
  })
})

describe('checkClinicalBlocks', () => {
  it('bloqueia pre_operatorio → cirurgia_agendada sem SPE-M', () => {
    const result = checkClinicalBlocks(DEFAULT_CONTEXT, 'pre_operatorio', 'cirurgia_agendada')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('SPE-M')
  })

  it('bloqueia pre_operatorio → cirurgia_agendada com SPE-M < 6', () => {
    const result = checkClinicalBlocks({ spemScore: 4, cioSignedOut: false }, 'pre_operatorio', 'cirurgia_agendada')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('SC-12')
  })

  it('bloqueia pre_operatorio → cirurgia_agendada com SPE-M ok mas SC-10 stub', () => {
    const result = checkClinicalBlocks(SPEM_OK, 'pre_operatorio', 'cirurgia_agendada')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('TCI')
  })

  it('bloqueia cirurgia_agendada → cirurgia_realizada sem CIO Sign Out (SC-13)', () => {
    const result = checkClinicalBlocks(DEFAULT_CONTEXT, 'cirurgia_agendada', 'cirurgia_realizada')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('SC-13')
  })

  it('permite cirurgia_agendada → cirurgia_realizada com CIO Sign Out assinado', () => {
    const result = checkClinicalBlocks(ALL_OK, 'cirurgia_agendada', 'cirurgia_realizada')
    expect(result.allowed).toBe(true)
  })

  it('permite transicoes sem bloqueio clinico', () => {
    const result = checkClinicalBlocks(DEFAULT_CONTEXT, 'lead', 'consulta_agendada')
    expect(result.allowed).toBe(true)
  })

  it('permite cancelamento sem bloqueio', () => {
    const result = checkClinicalBlocks(DEFAULT_CONTEXT, 'pre_operatorio', 'cancelado')
    expect(result.allowed).toBe(true)
  })
})

describe('PIPELINE_ORDER e TERMINAL_STATUSES', () => {
  it('pipeline tem 10 status na ordem correta', () => {
    expect(PIPELINE_ORDER).toHaveLength(10)
    expect(PIPELINE_ORDER[0]).toBe('lead')
    expect(PIPELINE_ORDER[PIPELINE_ORDER.length - 1]).toBe('encerrado')
  })

  it('terminal statuses contem cancelado, encerrado, nao_convertido', () => {
    expect(TERMINAL_STATUSES.has('cancelado')).toBe(true)
    expect(TERMINAL_STATUSES.has('encerrado')).toBe(true)
    expect(TERMINAL_STATUSES.has('nao_convertido')).toBe(true)
    expect(TERMINAL_STATUSES.size).toBe(3)
  })
})
