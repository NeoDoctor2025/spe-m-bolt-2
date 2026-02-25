import { Check } from 'lucide-react';
import { EVALUATION_STEPS } from '../../data/evaluationCriteria';

interface EvalStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  answeredSteps: Set<number>;
}

export function EvalStepper({ currentStep, onStepClick, answeredSteps }: EvalStepperProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {EVALUATION_STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = answeredSteps.has(index) && index !== currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 focus-ring ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/30'
                  : isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span className="hidden md:inline whitespace-nowrap">{step.title}</span>
            </button>
            {index < EVALUATION_STEPS.length - 1 && (
              <div
                className={`w-4 lg:w-8 h-px mx-0.5 shrink-0 ${
                  isCompleted ? 'bg-emerald-500/40' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
