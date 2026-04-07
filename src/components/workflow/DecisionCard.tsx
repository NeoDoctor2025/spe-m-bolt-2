import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { WorkflowDecision } from '../../data/workflowPhases';
import { cn } from '../../lib/utils';

interface DecisionCardProps {
  decision: WorkflowDecision;
  compact?: boolean;
}

const severityConfig = {
  success: {
    bg: 'bg-editorial-sage/10',
    border: 'border-editorial-sage/30',
    text: 'text-editorial-sage',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-editorial-rose/10',
    border: 'border-editorial-rose/30',
    text: 'text-editorial-rose',
    icon: XCircle,
  },
};

export function DecisionCard({ decision, compact = false }: DecisionCardProps) {
  if (compact) {
    return (
      <div className="bg-white dark:bg-editorial-navy/40 border border-editorial-cream dark:border-editorial-navy-light/20 rounded-lg p-3">
        <div className="text-[10px] font-medium text-editorial-muted uppercase tracking-wider mb-1">
          {decision.phase}
        </div>
        <div className="text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-2">
          {decision.question}
        </div>
        <div className="space-y-1">
          {decision.options.map((option, idx) => {
            const config = severityConfig[option.severity];
            return (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded font-medium whitespace-nowrap',
                    config.bg,
                    config.text
                  )}
                >
                  {option.condition}
                </span>
                <span className="text-editorial-muted">{option.action}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-editorial-navy/40 border border-editorial-cream dark:border-editorial-navy-light/20 rounded-xl p-4 hover:border-editorial-warm dark:hover:border-editorial-navy-light/40 transition-colors">
      <div className="text-[10px] font-semibold text-editorial-muted uppercase tracking-wider mb-2">
        {decision.phase}
      </div>
      <h3 className="text-sm font-semibold text-editorial-navy dark:text-editorial-cream mb-4 leading-snug">
        {decision.question}
      </h3>
      <div className="space-y-2">
        {decision.options.map((option, idx) => {
          const config = severityConfig[option.severity];
          const Icon = config.icon;
          return (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg border',
                config.bg,
                config.border
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
                  config.text,
                  'bg-white/50 dark:bg-black/10'
                )}
              >
                <Icon className="h-3 w-3" />
                {option.condition}
              </div>
              <span className={cn('text-xs flex-1', config.text)}>{option.action}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AlertStripProps {
  title: string;
  items: string[];
  variant: 'danger' | 'warning' | 'success';
}

export function AlertStrip({ title, items, variant }: AlertStripProps) {
  const variants = {
    danger: {
      bg: 'bg-editorial-rose/10',
      border: 'border-editorial-rose/30',
      titleColor: 'text-editorial-rose',
      textColor: 'text-editorial-navy dark:text-editorial-cream',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/30',
      titleColor: 'text-amber-700 dark:text-amber-400',
      textColor: 'text-editorial-navy dark:text-editorial-cream',
    },
    success: {
      bg: 'bg-editorial-sage/10',
      border: 'border-editorial-sage/30',
      titleColor: 'text-editorial-sage',
      textColor: 'text-editorial-navy dark:text-editorial-cream',
    },
  };

  const config = variants[variant];

  return (
    <div className={cn('rounded-xl p-4 border', config.bg, config.border)}>
      <h4 className={cn('text-sm font-semibold mb-3', config.titleColor)}>{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className={cn('text-sm leading-relaxed', config.textColor)}>
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EmergencyContactsCardProps {
  contacts?: {
    doctor?: string;
    surgicalCenter?: string;
    anesthesiologist?: string;
    clinicWhatsApp?: string;
  };
}

export function EmergencyContactsCard({ contacts }: EmergencyContactsCardProps) {
  return (
    <div className="bg-editorial-sage/10 border border-editorial-sage/30 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-editorial-sage mb-3">Contatos de Emergencia</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between border-b border-editorial-sage/20 pb-1">
          <span className="text-editorial-muted">Medico responsavel:</span>
          <span className="text-editorial-navy dark:text-editorial-cream font-medium">
            {contacts?.doctor || '________________________'}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-editorial-sage/20 pb-1">
          <span className="text-editorial-muted">Centro cirurgico:</span>
          <span className="text-editorial-navy dark:text-editorial-cream font-medium">
            {contacts?.surgicalCenter || '________________________'}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-editorial-sage/20 pb-1">
          <span className="text-editorial-muted">Anestesiologista:</span>
          <span className="text-editorial-navy dark:text-editorial-cream font-medium">
            {contacts?.anesthesiologist || '________________________'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-editorial-muted">WhatsApp 24h clinica:</span>
          <span className="text-editorial-navy dark:text-editorial-cream font-medium">
            {contacts?.clinicWhatsApp || '________________________'}
          </span>
        </div>
      </div>
      {!contacts && (
        <p className="text-xs text-editorial-sage/70 mt-3">Preencher antes de colocar em uso</p>
      )}
    </div>
  );
}
