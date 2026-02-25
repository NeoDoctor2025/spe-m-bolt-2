import type { CriterionDefinition } from '../../lib/types';

interface CriterionQuestionProps {
  criterion: CriterionDefinition;
  selectedOption: string;
  onSelect: (option: string, score: number) => void;
}

export function CriterionQuestion({ criterion, selectedOption, onSelect }: CriterionQuestionProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h4 className="text-sm font-semibold text-slate-200 mb-3">{criterion.label}</h4>
      <div className="space-y-2">
        {criterion.options.map((option) => {
          const isSelected = selectedOption === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value, option.score)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all focus-ring ${
                isSelected
                  ? 'bg-blue-600/10 border-blue-600/30 text-blue-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{option.label}</span>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {option.score}/{criterion.maxScore}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
