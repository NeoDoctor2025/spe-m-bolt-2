import { EVALUATION_STEPS, getTotalMaxScore } from '../../data/evaluationCriteria';
import { getScoreColor } from '../../lib/utils';

interface EvalScoreSidebarProps {
  getTotalScore: () => number;
  getStepScore: (stepId: number) => number;
  getStepMaxScore: (stepId: number) => number;
}

export function EvalScoreSidebar({ getTotalScore, getStepScore, getStepMaxScore }: EvalScoreSidebarProps) {
  const totalScore = getTotalScore();
  const totalMax = getTotalMaxScore();
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const getRiskLabel = (pct: number): { label: string; color: string } => {
    if (pct >= 80) return { label: 'Risco Baixo - Apto', color: 'text-emerald-400' };
    if (pct >= 60) return { label: 'Risco Moderado - Avaliar', color: 'text-amber-400' };
    if (pct >= 40) return { label: 'Risco Alto - Cautela', color: 'text-orange-400' };
    return { label: 'Risco Elevado - Contraindicado', color: 'text-red-400' };
  };

  const risk = getRiskLabel(percentage);

  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const strokeColor =
    percentage >= 80
      ? '#10b981'
      : percentage >= 60
      ? '#f59e0b'
      : percentage >= 40
      ? '#f97316'
      : '#ef4444';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 sticky top-24">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Score Total
        </h3>
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-100">{percentage}%</span>
              <span className="text-xs text-slate-500">{totalScore}/{totalMax}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <p className={`text-sm font-medium ${risk.color}`}>{risk.label}</p>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Detalhamento por Etapa
        </h4>
        {EVALUATION_STEPS.map((step) => {
          const score = getStepScore(step.id);
          const max = getStepMaxScore(step.id);
          const pct = max > 0 ? (score / max) * 100 : 0;

          return (
            <div key={step.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{step.title}</span>
                <span className={`text-xs font-medium ${getScoreColor(score, max)}`}>
                  {score}/{max}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
