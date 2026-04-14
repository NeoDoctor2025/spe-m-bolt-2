// src/components/patient/StatusActions.tsx
import { useState } from 'react';
import { ChevronRight, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { usePatientStore } from '../../stores/patientStore';
import { useUIStore } from '../../stores/uiStore';
import { getNextStatuses } from '../../lib/patientPipeline';

// Labels e cores editoriais por status
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  lead:                { label: 'Lead',                color: 'bg-editorial-warm/20 text-editorial-muted border-editorial-warm/30' },
  consulta_agendada:   { label: 'Consulta Agendada',   color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300' },
  consulta_realizada:  { label: 'Consulta Realizada',  color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300' },
  decidiu_operar:      { label: 'Decidiu Operar',      color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300' },
  pre_operatorio:      { label: 'Pré-Operatório',      color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300' },
  cirurgia_agendada:   { label: 'Cirurgia Agendada',   color: 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/30' },
  cirurgia_realizada:  { label: 'Cirurgia Realizada',  color: 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/30' },
  pos_op_ativo:        { label: 'Pós-op Ativo',        color: 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/30' },
  longo_prazo:         { label: 'Longo Prazo',         color: 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/30' },
  encerrado:           { label: 'Encerrado',           color: 'bg-editorial-warm/20 text-editorial-muted border-editorial-warm/30' },
  nao_convertido:      { label: 'Não Convertido',      color: 'bg-editorial-warm/20 text-editorial-muted border-editorial-warm/30' },
  cancelado:           { label: 'Cancelado',           color: 'bg-editorial-rose/10 text-editorial-rose border-editorial-rose/30' },
};

interface StatusActionsProps {
  patientId: string;
  currentStatus: string;
}

export function StatusActions({ patientId, currentStatus }: StatusActionsProps) {
  const advanceStatus = usePatientStore((s) => s.advanceStatus);
  const showToast = useUIStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const nextStatuses = getNextStatuses(currentStatus).filter((s) => s !== 'cancelado');
  const canCancel = currentStatus !== 'cancelado' && currentStatus !== 'encerrado';
  const config = STATUS_CONFIG[currentStatus] ?? { label: currentStatus, color: '' };

  const handleAdvance = async (toStatus: string) => {
    setLoading(true);
    const { error } = await advanceStatus(patientId, toStatus);
    setLoading(false);
    if (error) {
      showToast(error, 'error');
    } else {
      const label = STATUS_CONFIG[toStatus]?.label ?? toStatus;
      showToast(`Status atualizado para ${label}`, 'success');
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    setLoading(true);
    const { error } = await advanceStatus(patientId, 'cancelado');
    setLoading(false);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Paciente cancelado', 'success');
    }
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Status atual */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-editorial-muted">Status:</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
            {config.label}
          </span>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {nextStatuses.map((toStatus) => {
            const nextConfig = STATUS_CONFIG[toStatus];
            return (
              <Button
                key={toStatus}
                size="sm"
                variant="outline"
                onClick={() => handleAdvance(toStatus)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                {nextConfig?.label ?? toStatus}
              </Button>
            );
          })}

          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="text-editorial-rose border-editorial-rose/30 hover:bg-editorial-rose/5"
              onClick={() => setConfirmCancel(true)}
              disabled={loading}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Dialog de confirmação de cancelamento */}
      {confirmCancel && (
        <Modal
          isOpen={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          title="Cancelar paciente"
        >
          <div className="space-y-4">
            <p className="text-sm text-editorial-muted">
              Tem certeza que deseja cancelar este paciente?
              Esta ação não pode ser desfeita facilmente.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Voltar
              </Button>
              <Button
                onClick={handleCancel}
                className="bg-editorial-rose hover:bg-editorial-rose/90 text-white border-0"
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
