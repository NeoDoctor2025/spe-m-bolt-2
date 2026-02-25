import type { CriterionDefinition } from '../../lib/types';

interface CriterionQuestionProps {
  criterion: CriterionDefinition;
  selectedOption: string;
  onSelect: (option: string, score: number) => void;
}

export function CriterionQuestion({ criterion, selectedOption, onSelect }: CriterionQuestionProps) {
  return (
    <div className="bg-editorial-light border border-editorial-cream rounded-lg p-5">
      <h4 className="text-sm font-semibold text-editorial-navy mb-3">{criterion.label}</h4>
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
                  ? 'bg-editorial-gold/10 border-editorial-gold/30 text-editorial-gold-dark'
                  : 'bg-editorial-cream/50 border-editorial-warm/50 text-editorial-muted hover:bg-editorial-cream hover:border-editorial-warm hover:text-editorial-navy-light'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-editorial-gold bg-editorial-gold' : 'border-editorial-warm'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{option.label}</span>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-editorial-gold/20 text-editorial-gold'
                      : 'bg-editorial-cream/50 text-editorial-muted'
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
