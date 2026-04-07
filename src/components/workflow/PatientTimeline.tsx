import { Check, Circle, AlertCircle, User, Stethoscope, Users } from 'lucide-react';
import { WORKFLOW_PHASES, getPhaseIndex, type WorkflowPhaseId } from '../../data/workflowPhases';
import { cn } from '../../lib/utils';

interface PatientTimelineProps {
  currentPhase: string;
  onPhaseClick?: (phaseId: string) => void;
  compact?: boolean;
}

const actorIcons = {
  rec: User,
  med: Stethoscope,
  both: Users,
};

const actorColors = {
  rec: {
    border: 'border-editorial-muted',
    bg: 'bg-editorial-muted/10',
    text: 'text-editorial-muted',
  },
  med: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  both: {
    border: 'border-indigo-500',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
};

export function PatientTimeline({ currentPhase, onPhaseClick, compact = false }: PatientTimelineProps) {
  const currentIndex = getPhaseIndex(currentPhase);

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {WORKFLOW_PHASES.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <button
              key={phase.id}
              onClick={() => onPhaseClick?.(phase.id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                isCompleted && 'bg-editorial-sage/10 text-editorial-sage',
                isCurrent && 'bg-editorial-gold/20 text-editorial-gold-dark ring-1 ring-editorial-gold',
                isPending && 'bg-editorial-cream/50 text-editorial-muted dark:bg-editorial-navy-light/20'
              )}
              title={phase.title}
            >
              <span className="font-mono">{phase.number}</span>
              {isCompleted && <Check className="h-3 w-3" />}
              {isCurrent && <Circle className="h-3 w-3 fill-current" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const isLast = index === WORKFLOW_PHASES.length - 1;
        const ActorIcon = actorIcons[phase.actor];
        const colors = actorColors[phase.actor];

        return (
          <div key={phase.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => onPhaseClick?.(phase.id)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  isCompleted && 'bg-editorial-sage text-white',
                  isCurrent && 'bg-editorial-gold text-white ring-2 ring-editorial-gold/30 ring-offset-2 ring-offset-editorial-paper dark:ring-offset-editorial-navy-dark',
                  isPending && 'bg-editorial-cream text-editorial-muted dark:bg-editorial-navy-light/30 dark:text-editorial-warm'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : phase.number}
              </button>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px] my-1',
                    isCompleted ? 'bg-editorial-sage' : 'bg-editorial-cream dark:bg-editorial-navy-light/30'
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                'flex-1 pb-4 cursor-pointer group',
                isPending && 'opacity-60'
              )}
              onClick={() => onPhaseClick?.(phase.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent
                        ? 'text-editorial-gold-dark dark:text-editorial-gold'
                        : 'text-editorial-navy dark:text-editorial-cream group-hover:text-editorial-gold-dark dark:group-hover:text-editorial-gold'
                    )}
                  >
                    {phase.title}
                  </h4>
                  <p className="text-xs text-editorial-muted mt-0.5">{phase.timing}</p>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    colors.bg,
                    colors.text
                  )}
                >
                  <ActorIcon className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {phase.actor === 'rec' ? 'Recepcao' : phase.actor === 'med' ? 'Medico' : 'Ambos'}
                  </span>
                </div>
              </div>

              {isCurrent && phase.documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {phase.documents.map((doc) => (
                    <div
                      key={doc.code}
                      className={cn(
                        'flex items-center gap-2 text-xs px-2 py-1 rounded',
                        doc.isMandatory
                          ? 'bg-editorial-rose/10 text-editorial-rose'
                          : 'bg-editorial-cream/50 text-editorial-muted dark:bg-editorial-navy-light/20'
                      )}
                    >
                      {doc.isMandatory && <AlertCircle className="h-3 w-3 flex-shrink-0" />}
                      <span className="font-mono text-[10px] opacity-70">{doc.code}</span>
                      <span className="truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {isCurrent && phase.warningNote && (
                <div className="mt-2 text-xs text-editorial-rose bg-editorial-rose/10 px-2 py-1.5 rounded">
                  {phase.warningNote}
                </div>
              )}

              {isCurrent && phase.successNote && (
                <div className="mt-2 text-xs text-editorial-sage bg-editorial-sage/10 px-2 py-1.5 rounded">
                  {phase.successNote}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PhaseStripProps {
  currentPhase: string;
  onPhaseClick?: (phaseId: string) => void;
}

export function PhaseStrip({ currentPhase, onPhaseClick }: PhaseStripProps) {
  const currentIndex = getPhaseIndex(currentPhase);

  return (
    <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const ActorIcon = actorIcons[phase.actor];

        return (
          <button
            key={phase.id}
            onClick={() => onPhaseClick?.(phase.id)}
            className={cn(
              'p-2 rounded-lg border text-left transition-all',
              'hover:border-editorial-gold/50 hover:shadow-sm',
              isCompleted && 'bg-editorial-sage/5 border-editorial-sage/30',
              isCurrent && 'bg-editorial-gold/10 border-editorial-gold ring-1 ring-editorial-gold/20',
              !isCompleted && !isCurrent && 'bg-white border-editorial-cream dark:bg-editorial-navy/40 dark:border-editorial-navy-light/20'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  'text-[10px] font-semibold',
                  isCompleted && 'text-editorial-sage',
                  isCurrent && 'text-editorial-gold-dark',
                  !isCompleted && !isCurrent && 'text-editorial-muted'
                )}
              >
                {phase.number}
              </span>
              {isCompleted && <Check className="h-3 w-3 text-editorial-sage" />}
            </div>
            <h4 className="text-xs font-medium text-editorial-navy dark:text-editorial-cream truncate">
              {phase.title}
            </h4>
            <div className="flex items-center gap-1 mt-1">
              <ActorIcon className={cn('h-3 w-3', actorColors[phase.actor].text)} />
              <span className="text-[10px] text-editorial-muted truncate">
                {phase.actor === 'rec' ? 'Rec' : phase.actor === 'med' ? 'Med' : 'Ambos'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
