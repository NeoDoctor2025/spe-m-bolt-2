import { useState } from 'react';
import { User, Stethoscope, Users, FileText, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DecisionCard, AlertStrip, EmergencyContactsCard } from '../components/workflow/DecisionCard';
import { PhaseStrip } from '../components/workflow/PatientTimeline';
import { WORKFLOW_PHASES, WORKFLOW_DECISIONS, CRITICAL_ALERTS } from '../data/workflowPhases';
import { cn } from '../lib/utils';

type FilterType = 'all' | 'rec' | 'med';

export default function QuickReference() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const filteredDecisions = WORKFLOW_DECISIONS.filter((decision) => {
    if (filter === 'all') return true;
    const phase = WORKFLOW_PHASES.find((p) =>
      decision.phase.toLowerCase().includes(p.title.toLowerCase())
    );
    if (!phase) return true;
    if (filter === 'rec') return phase.actor === 'rec' || phase.actor === 'both';
    if (filter === 'med') return phase.actor === 'med' || phase.actor === 'both';
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
            Cartao de Referencia Rapida
          </h1>
          <p className="text-sm text-editorial-muted mt-1">
            Fluxo operacional completo · Recepcao e equipe medica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      <div className="print:block hidden">
        <h1 className="text-lg font-bold">Modern Face Institute — Cartao de Referencia Rapida</h1>
        <p className="text-xs text-gray-600">Fluxo operacional completo · Recepcao e equipe medica</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-editorial-muted">
            <div className="w-2 h-2 rounded-full bg-editorial-muted" />
            Recepcao
          </div>
          <div className="flex items-center gap-1.5 text-xs text-editorial-muted">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Medico
          </div>
          <div className="flex items-center gap-1.5 text-xs text-editorial-muted">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            Ambos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-editorial-muted">
            <div className="w-2 h-2 rounded-full bg-editorial-rose/50 border border-editorial-rose" />
            Obrigatorio
          </div>
          <div className="flex items-center gap-1.5 text-xs text-editorial-muted">
            <div className="w-2 h-2 rounded-full bg-editorial-sage/50 border border-editorial-sage" />
            Atualizado v1.1
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === 'all'
                ? 'bg-editorial-navy text-white dark:bg-editorial-gold dark:text-editorial-navy'
                : 'bg-editorial-cream text-editorial-muted hover:bg-editorial-warm/50 dark:bg-editorial-navy-light/20 dark:hover:bg-editorial-navy-light/30'
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('rec')}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === 'rec'
                ? 'bg-editorial-navy text-white dark:bg-editorial-gold dark:text-editorial-navy'
                : 'bg-editorial-cream text-editorial-muted hover:bg-editorial-warm/50 dark:bg-editorial-navy-light/20 dark:hover:bg-editorial-navy-light/30'
            )}
          >
            <User className="h-3 w-3" />
            Recepcao
          </button>
          <button
            onClick={() => setFilter('med')}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === 'med'
                ? 'bg-editorial-navy text-white dark:bg-editorial-gold dark:text-editorial-navy'
                : 'bg-editorial-cream text-editorial-muted hover:bg-editorial-warm/50 dark:bg-editorial-navy-light/20 dark:hover:bg-editorial-navy-light/30'
            )}
          >
            <Stethoscope className="h-3 w-3" />
            Medico
          </button>
        </div>
      </div>

      <div className="card p-4 print:p-2 print:border print:border-gray-300">
        <h2 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Fases do Protocolo
        </h2>
        <PhaseStrip currentPhase={selectedPhase || 'captacao'} onPhaseClick={setSelectedPhase} />
      </div>

      <div className="print:hidden">
        <h2 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Decisoes Rapidas — variaveis que mudam o fluxo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDecisions.map((decision, idx) => (
            <DecisionCard key={idx} decision={decision} />
          ))}
        </div>
      </div>

      <div className="print:block hidden">
        <h2 className="text-xs font-semibold uppercase mb-2">Decisoes Rapidas</h2>
        <div className="grid grid-cols-3 gap-2 text-[8px]">
          {WORKFLOW_DECISIONS.slice(0, 9).map((decision, idx) => (
            <DecisionCard key={idx} decision={decision} compact />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
        <AlertStrip
          title="Nunca fazer sem acionar o medico"
          items={CRITICAL_ALERTS.danger}
          variant="danger"
        />
        <AlertStrip
          title="Registrar sempre no prontuario"
          items={CRITICAL_ALERTS.warning}
          variant="warning"
        />
        <EmergencyContactsCard />
      </div>

      {selectedPhase && (
        <PhaseDetailModal
          phaseId={selectedPhase}
          onClose={() => setSelectedPhase(null)}
        />
      )}
    </div>
  );
}

interface PhaseDetailModalProps {
  phaseId: string;
  onClose: () => void;
}

function PhaseDetailModal({ phaseId, onClose }: PhaseDetailModalProps) {
  const phase = WORKFLOW_PHASES.find((p) => p.id === phaseId);
  if (!phase) return null;

  const relatedDecisions = WORKFLOW_DECISIONS.filter((d) =>
    d.phase.toLowerCase().includes(phase.title.toLowerCase()) ||
    d.phase.toLowerCase().includes(phase.number)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-editorial-navy rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-editorial-navy border-b border-editorial-cream dark:border-editorial-navy-light/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-editorial-gold flex items-center justify-center text-white font-semibold">
                {phase.number}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-editorial-navy dark:text-editorial-cream">
                  {phase.title}
                </h2>
                <p className="text-sm text-editorial-muted">{phase.timing}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream"
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider mb-2">
              Documentos
            </h3>
            <div className="space-y-2">
              {phase.documents.map((doc) => (
                <div
                  key={doc.code}
                  className={cn(
                    'p-3 rounded-lg border',
                    doc.isMandatory
                      ? 'bg-editorial-rose/5 border-editorial-rose/30'
                      : 'bg-editorial-cream/30 border-editorial-cream dark:bg-editorial-navy-light/10 dark:border-editorial-navy-light/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-editorial-muted">{doc.code}</span>
                    {doc.isMandatory && (
                      <span className="text-[10px] font-medium text-editorial-rose bg-editorial-rose/10 px-1.5 py-0.5 rounded">
                        Obrigatorio
                      </span>
                    )}
                    {doc.isUpdated && (
                      <span className="text-[10px] font-medium text-editorial-sage bg-editorial-sage/10 px-1.5 py-0.5 rounded">
                        Atualizado
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                    {doc.name}
                  </p>
                  <p className="text-xs text-editorial-muted mt-1">{doc.responsible}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider mb-2">
              Arquivamento
            </h3>
            <p className="text-sm text-editorial-navy dark:text-editorial-cream bg-editorial-cream/30 dark:bg-editorial-navy-light/10 p-3 rounded-lg">
              {phase.archiveNote}
            </p>
          </div>

          {phase.warningNote && (
            <div className="bg-editorial-rose/10 border border-editorial-rose/30 rounded-lg p-3">
              <p className="text-sm text-editorial-rose">{phase.warningNote}</p>
            </div>
          )}

          {phase.successNote && (
            <div className="bg-editorial-sage/10 border border-editorial-sage/30 rounded-lg p-3">
              <p className="text-sm text-editorial-sage">{phase.successNote}</p>
            </div>
          )}

          {relatedDecisions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider mb-2">
                Decisoes Relacionadas
              </h3>
              <div className="space-y-3">
                {relatedDecisions.map((decision, idx) => (
                  <DecisionCard key={idx} decision={decision} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
