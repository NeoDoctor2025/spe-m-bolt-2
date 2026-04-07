import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Syringe } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import type { BioestimuladorData } from '../../lib/validation';

const BIOESTIMULADOR_TYPES = [
  'Sculptra (PLLA)',
  'Radiesse (CaHA)',
  'Ellanse',
  'Volux',
  'Profhilo',
  'Outro',
];

const BIOESTIMULADOR_REGIONS = [
  'Face completa',
  'Terco superior',
  'Terco medio',
  'Terco inferior',
  'Malar',
  'Mandibula',
  'Pescoco',
  'Maos',
  'Gluteos',
  'Outro',
];

interface BioestimuladorsSectionProps {
  value: BioestimuladorData[];
  onChange: (value: BioestimuladorData[]) => void;
}

export function BioestimuladoresSection({ value = [], onChange }: BioestimuladorsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BioestimuladorData>>({});

  const handleAdd = () => {
    if (newItem.type && newItem.region) {
      onChange([...value, newItem as BioestimuladorData]);
      setNewItem({});
      setIsAdding(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-editorial-gold" />
          <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
            Bioestimuladores
          </span>
        </div>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {value.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Paciente possui bioestimuladores. Medico deve avaliar impacto no plano cirurgico (Criterio 3 SPE-M).
          </p>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-editorial-cream/30 dark:bg-editorial-navy-light/10 rounded-lg border border-editorial-cream dark:border-editorial-navy-light/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                    {item.type}
                  </span>
                  <span className="text-xs text-editorial-muted">|</span>
                  <span className="text-sm text-editorial-muted">{item.region}</span>
                </div>
                {item.application_date && (
                  <p className="text-xs text-editorial-muted mt-0.5">
                    Aplicacao: {new Date(item.application_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-editorial-muted mt-0.5 truncate">{item.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 text-editorial-muted hover:text-editorial-rose transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-editorial-cream/20 dark:bg-editorial-navy-light/10 rounded-lg border border-editorial-cream dark:border-editorial-navy-light/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={BIOESTIMULADOR_TYPES.map((t) => ({ label: t, value: t }))}
              value={newItem.type || ''}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
            />
            <Select
              label="Regiao"
              options={BIOESTIMULADOR_REGIONS.map((r) => ({ label: r, value: r }))}
              value={newItem.region || ''}
              onChange={(e) => setNewItem({ ...newItem, region: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data da Aplicacao"
              type="date"
              value={newItem.application_date || ''}
              onChange={(e) => setNewItem({ ...newItem, application_date: e.target.value })}
            />
            <Input
              label="Observacoes"
              value={newItem.notes || ''}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              placeholder="Ex: 2 sessoes"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewItem({});
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleAdd}
              disabled={!newItem.type || !newItem.region}
            >
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {value.length === 0 && !isAdding && (
        <p className="text-xs text-editorial-muted">
          Nenhum bioestimulador registrado. Clique em "Adicionar" se o paciente possui Sculptra, Radiesse ou similar.
        </p>
      )}
    </div>
  );
}
