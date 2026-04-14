// src/pages/Reference.tsx
import { useState } from 'react';
import { Printer, AlertTriangle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getCriticalKeywords } from '../lib/keywordCheck';

type ProfileFilter = 'todos' | 'recepcao' | 'medico';

interface Decision {
  question: string;
  yes: string;
  no: string;
  isAlert?: boolean;
}

interface Phase {
  number: number;
  title: string;
  profile: 'recepcao' | 'medico' | 'ambos';
  decisions: Decision[];
}

const PHASES: Phase[] = [
  {
    number: 1, title: 'Captação', profile: 'recepcao',
    decisions: [
      { question: 'Lead mencionou cirurgia prévia?', yes: 'Registrar na FPC-MFI-01 — médico deve saber antes da consulta', no: 'Fluxo padrão → agendar consulta' },
      { question: 'Lead mencionou bioestimulador (Sculptra, Radiesse)?', yes: 'Registrar tipo, região e data — médico avalia impacto no plano (Critério 3 SPE-M)', no: 'Fluxo padrão' },
    ],
  },
  {
    number: 2, title: 'Consulta Médica', profile: 'medico',
    decisions: [
      { question: 'Score SPE-M final?', yes: '', no: '',
        isAlert: false
      },
    ],
  },
  {
    number: 3, title: 'Agendamento Cirúrgico', profile: 'recepcao',
    decisions: [
      { question: 'Pagamento / financiamento confirmado?', yes: 'Bloquear data no centro cirúrgico e confirmar anestesiologista', no: 'NÃO bloquear data. Aguardar confirmação antes de qualquer reserva' },
    ],
  },
  {
    number: 4, title: '48h Antes', profile: 'recepcao',
    decisions: [
      { question: 'Algum exame com resultado alterado?', yes: 'ACIONAR MÉDICO IMEDIATAMENTE. Não decidir sozinha.', no: 'Confirmar cirurgia → registrar ligação no prontuário', isAlert: true },
    ],
  },
  {
    number: 5, title: 'Check-in', profile: 'ambos',
    decisions: [
      { question: 'Item crítico (vermelho) pendente no CPO?', yes: 'Qualquer um: CIRURGIA ADIADA. Acionar médico. Sem exceção.', no: 'Nenhum: Liberar para anestesia e preparo da sala', isAlert: true },
      { question: 'Sem acompanhante adulto responsável?', yes: 'Cirurgia não acontece. Alta exige adulto responsável.', no: 'Seguir protocolo', isAlert: true },
    ],
  },
  {
    number: 6, title: 'Cirurgia', profile: 'medico',
    decisions: [
      { question: 'Protocolo OMS executado?', yes: '', no: '',
        isAlert: false
      },
    ],
  },
  {
    number: 7, title: 'Alta Hospitalar', profile: 'ambos',
    decisions: [
      { question: 'Retorno de 24-48h está agendado?', yes: 'Liberar alta — entregar orientações escritas e contato de emergência', no: 'Agendar ANTES de liberar. Alta não acontece sem retorno confirmado.', isAlert: true },
    ],
  },
  {
    number: 8, title: 'Pós-op Retornos', profile: 'medico',
    decisions: [
      { question: 'Paciente relata inchaço súbito ou dor intensa?', yes: 'ACIONAR MÉDICO IMEDIATAMENTE — suspeita de hematoma expansivo', no: 'Evolução esperada → orientar conforme cronograma', isAlert: true },
    ],
  },
  {
    number: 9, title: '3-6 Meses', profile: 'ambos',
    decisions: [
      { question: 'Score NPS do paciente?', yes: '9-10: Solicitar depoimento e indicação', no: '<7: Registrar motivo e acompanhar ativamento' },
    ],
  },
  {
    number: 10, title: 'Fechamento 12m', profile: 'medico',
    decisions: [
      { question: 'Resultado consolidado e paciente satisfeito?', yes: 'Ativar protocolo de reativação para novo procedimento', no: 'Registrar aprendizado e arquivar prontuário' },
    ],
  },
];

const SPE_M_SCORES = [
  { range: '8-10', level: 'Ideal', color: 'text-editorial-sage', action: 'Candidato ideal → prosseguir com agendamento' },
  { range: '6-7',  level: 'Com ressalvas', color: 'text-editorial-gold-dark', action: 'Com ressalvas → documentar riscos adicionais' },
  { range: '< 6',  level: 'Contraindicado', color: 'text-editorial-rose', action: 'NÃO agendar sem nova avaliação médica' },
];

const CIO_STEPS = [
  { step: 'Sign In', timing: 'Antes da anestesia', items: 'identidade, TCI, alergias, antibiótico' },
  { step: 'Time Out', timing: 'Antes da incisão', items: 'equipe confirma paciente e procedimento' },
  { step: 'Sign Out', timing: 'Antes de sair da sala', items: 'contagem de compressas e instrumentais' },
];

export default function Reference() {
  const [filter, setFilter] = useState<ProfileFilter>('todos');
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const keywords = getCriticalKeywords();

  const filteredPhases = PHASES.filter((p) => {
    if (filter === 'todos') return true;
    if (filter === 'recepcao') return p.profile === 'recepcao' || p.profile === 'ambos';
    if (filter === 'medico')   return p.profile === 'medico'   || p.profile === 'ambos';
    return true;
  });

  const profileLabel = { recepcao: 'Rec', medico: 'Med', ambos: 'Ambos' };
  const profileColor = {
    recepcao: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    medico:   'bg-editorial-gold/10 text-editorial-gold-dark',
    ambos:    'bg-editorial-sage/10 text-editorial-sage',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-editorial-gold/10 border border-editorial-gold/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-editorial-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
              Cartão de Referência Rápida
            </h1>
            <p className="text-sm text-editorial-muted">Fluxo operacional completo · Recepção e equipe médica</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Filtro de perfil */}
      <div className="flex gap-2 mb-6 print:hidden">
        {(['todos', 'recepcao', 'medico'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === f
                ? 'bg-editorial-navy text-white border-editorial-navy dark:bg-editorial-gold dark:text-editorial-navy dark:border-editorial-gold'
                : 'bg-transparent text-editorial-muted border-editorial-cream dark:border-editorial-navy-light/20 hover:border-editorial-navy dark:hover:border-editorial-gold'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'recepcao' ? 'Recepção' : 'Médico'}
          </button>
        ))}
      </div>

      {/* SPE-M Score */}
      <div className="card p-5 mb-5">
        <h2 className="font-serif font-semibold text-editorial-navy dark:text-editorial-cream mb-3">
          Score SPE-M
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {SPE_M_SCORES.map((s) => (
            <div key={s.range} className="bg-editorial-paper dark:bg-editorial-navy/40 rounded-lg p-3 border border-editorial-cream dark:border-editorial-navy-light/20">
              <div className={`text-lg font-bold font-serif ${s.color}`}>{s.range}</div>
              <div className="text-xs font-medium text-editorial-muted mt-0.5">{s.level}</div>
              <div className="text-xs text-editorial-muted mt-2 leading-relaxed">{s.action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Protocolo OMS — CIO */}
      <div className="card p-5 mb-5">
        <h2 className="font-serif font-semibold text-editorial-navy dark:text-editorial-cream mb-3">
          Protocolo OMS — Checklist Intraoperatório
        </h2>
        <div className="space-y-2">
          {CIO_STEPS.map((s) => (
            <div key={s.step} className="flex gap-3 items-start p-3 bg-editorial-paper dark:bg-editorial-navy/40 rounded-lg border border-editorial-cream dark:border-editorial-navy-light/20">
              <span className="text-xs font-bold text-editorial-gold bg-editorial-gold/10 px-2 py-1 rounded flex-shrink-0">{s.step}</span>
              <div>
                <span className="text-xs font-medium text-editorial-navy dark:text-editorial-cream">{s.timing}</span>
                <p className="text-xs text-editorial-muted mt-0.5">{s.items}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-3 mb-8">
        <h2 className="font-serif font-semibold text-editorial-navy dark:text-editorial-cream">
          Decisões Rápidas por Fase
        </h2>
        {filteredPhases.map((phase) => {
          const expanded = expandedPhase === phase.number;
          return (
            <div key={phase.number} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedPhase(expanded ? null : phase.number)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-editorial-gold/10 border border-editorial-gold/20 flex items-center justify-center text-xs font-bold text-editorial-gold">
                    {phase.number}
                  </span>
                  <span className="font-medium text-editorial-navy dark:text-editorial-cream">{phase.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profileColor[phase.profile]}`}>
                    {profileLabel[phase.profile]}
                  </span>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-editorial-muted" /> : <ChevronDown className="h-4 w-4 text-editorial-muted" />}
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-editorial-cream dark:border-editorial-navy-light/20 pt-3">
                  {phase.decisions.map((d, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${d.isAlert ? 'border-editorial-rose/30 bg-editorial-rose/5' : 'border-editorial-cream dark:border-editorial-navy-light/20'}`}>
                      <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-2 flex items-center gap-2">
                        {d.isAlert && <AlertTriangle className="h-3.5 w-3.5 text-editorial-rose flex-shrink-0" />}
                        {d.question}
                      </p>
                      {d.yes && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-editorial-sage/10 rounded p-2">
                            <span className="font-bold text-editorial-sage">Sim: </span>
                            <span className="text-editorial-muted">{d.yes}</span>
                          </div>
                          <div className="bg-editorial-warm/20 rounded p-2">
                            <span className="font-bold text-editorial-muted">Não: </span>
                            <span className="text-editorial-muted">{d.no}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keywords críticas */}
      <div className="card p-5">
        <h2 className="font-serif font-semibold text-editorial-navy dark:text-editorial-cream mb-1 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-editorial-rose" />
          Keywords Críticas — WhatsApp
        </h2>
        <p className="text-xs text-editorial-muted mb-4">
          Se o paciente mencionar qualquer uma destas palavras em mensagem, acionar o médico imediatamente.
        </p>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span key={kw} className="px-3 py-1 rounded-full text-xs font-medium bg-editorial-rose/10 text-editorial-rose border border-editorial-rose/20">
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; color: black; }
          .card { border: 1px solid #ddd; break-inside: avoid; }
          button { display: none; }
        }
      `}</style>
    </div>
  );
}
