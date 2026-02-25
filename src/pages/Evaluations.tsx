import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { useEvaluationStore } from '../stores/evaluationStore';
import { formatDate } from '../lib/utils';

export default function Evaluations() {
  const navigate = useNavigate();
  const { evaluations, loading, fetchAllEvaluations } = useEvaluationStore();

  useEffect(() => {
    fetchAllEvaluations();
  }, [fetchAllEvaluations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Avaliacoes</h1>
        <p className="text-sm text-slate-400 mt-1">Todas as avaliacoes realizadas</p>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-slate-800">
            {[...Array(6)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : evaluations.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="Nenhuma avaliacao"
            description="Inicie uma avaliacao a partir de um paciente"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Paciente
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Data
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={ev.patient?.full_name ?? 'P'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {ev.patient?.full_name ?? 'Paciente'}
                        </p>
                        <p className="text-xs text-slate-500">{ev.patient?.cpf}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-400">{formatDate(ev.created_at)}</span>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {ev.status === 'Concluído' ? (
                      <span className="text-sm font-semibold text-slate-200">
                        {ev.max_score > 0 ? Math.round((ev.total_score / ev.max_score) * 100) : 0}%
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">---</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
