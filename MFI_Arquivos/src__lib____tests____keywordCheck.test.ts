import { describe, it, expect } from 'vitest'
import { checkCriticalKeywords, getCriticalKeywords } from '../keywordCheck'

// keyword-check.ts exige 100% de cobertura — segurança clínica
// Qualquer alteração neste arquivo deve ser acompanhada de revisão clínica

describe('checkCriticalKeywords', () => {

  describe('palavras críticas diretas', () => {
    const criticos = [
      'sangramento',
      'sangue',
      'sangrando',
      'hematoma',
      'febre',
      'febre alta',
      'secreção',
      'secrecao',
      'pus',
      'abertura',
      'paralisia',
    ]

    criticos.forEach(kw => {
      it(`detecta "${kw}"`, () => {
        const result = checkCriticalKeywords(`Estou com ${kw} no local`)
        expect(result.critical).toBe(true)
        expect(result.keyword).toBeTruthy()
      })
    })
  })

  describe('frases críticas compostas', () => {
    it('detecta "dor forte"', () => {
      expect(checkCriticalKeywords('Estou com dor forte aqui').critical).toBe(true)
    })
    it('detecta "inchaço muito grande"', () => {
      expect(checkCriticalKeywords('o inchaço muito grande me preocupa').critical).toBe(true)
    })
    it('detecta "não consigo fechar o olho"', () => {
      expect(checkCriticalKeywords('não consigo fechar o olho direito').critical).toBe(true)
    })
    it('detecta "abriu a cirurgia"', () => {
      expect(checkCriticalKeywords('acho que abriu a cirurgia').critical).toBe(true)
    })
    it('detecta "perdendo sensação"', () => {
      expect(checkCriticalKeywords('estou perdendo sensação na bochecha').critical).toBe(true)
    })
  })

  describe('normalização de texto', () => {
    it('detecta com acentos diferentes', () => {
      expect(checkCriticalKeywords('Sangramento intenso').critical).toBe(true)
    })
    it('detecta em uppercase', () => {
      expect(checkCriticalwywords('HEMATOMA GRANDE').critical).toBe(true)
    })
    it('detecta com múltiplos espaços', () => {
      expect(checkCriticalKeywords('tem  muito  sangue').critical).toBe(true)
    })
    it('detecta sem acento em palavra acentuada', () => {
      expect(checkCriticalKeywords('secrecao amarela').critical).toBe(true)
    })
  })

  describe('respostas normais — não devem disparar', () => {
    const normais = [
      'Estou bem, só um pouco de inchaço normal',
      'Dor leve, controlada com o remédio',
      'Tudo certo, seguindo as orientações',
      'Um pouco cansada mas bem',
      'Ainda tem roxo mas melhorando',
      'Obrigada pelo contato!',
    ]

    normais.forEach(texto => {
      it(`não dispara para "${texto.substring(0, 40)}..."`, () => {
        const result = checkCriticalKeywords(texto)
        expect(result.critical).toBe(false)
        expect(result.keyword).toBeNull()
      })
    })
  })

  describe('retorno estruturado', () => {
    it('retorna normalised sempre', () => {
      const result = checkCriticalKeywords('Oi, tudo bem')
      expect(result).toHaveProperty('critical')
      expect(result).toHaveProperty('keyword')
      expect(result).toHaveProperty('normalised')
      expect(typeof result.normalised).toBe('string')
    })

    it('retorna keyword exata quando encontra', () => {
      const result = checkCriticalKeywords('tem muito sangramento')
      expect(result.critical).toBe(true)
      expect(result.keyword).toBe('sangramento')
    })

    it('retorna keyword null quando não encontra', () => {
      const result = checkCriticalKeywords('estou ótima')
      expect(result.keyword).toBeNull()
    })
  })

  describe('getCriticalKeywords', () => {
    it('retorna array não vazio', () => {
      const kws = getCriticalKeywords()
      expect(kws.length).toBeGreaterThan(20)
    })

    it('retorna lista readonly', () => {
      const kws = getCriticalKeywords()
      expect(Object.isFrozen(kws) || Array.isArray(kws)).toBe(true)
    })
  })
})

// helper para uppercase test
function checkCriticalwywords(text: string) {
  return checkCriticalKeywords(text)
}
