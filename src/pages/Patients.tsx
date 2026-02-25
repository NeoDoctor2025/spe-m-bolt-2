import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge, getClassificationBadgeVariant, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { usePatientStore } from '../stores/patientStore';
import { formatCPF, formatDate } from '../lib/utils';
import { useState } from 'react';

export default function Patients() {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    filters,
    setFilters,
    fetchPatients,
    page,
    setPage,
    pageSize,
    totalCount,
  } = usePatientStore();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [openAction, setOpenAction] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) setFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Pacientes</h1>
          <p className="text-sm text-slate-400 mt-1">{totalCount} pacientes cadastrados</p>
        </div>
        <Button onClick={() => navigate('/patients/new')}>
          <Plus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou CPF..."
                icon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                options={[
                  { label: 'Classe I', value: 'I' },
                  { label: 'Classe II', value: 'II' },
                  { label: 'Classe III', value: 'III' },
                  { label: 'Classe IV', value: 'IV' },
                ]}
                placeholder="Classificacao"
                value={filters.classification}
                onChange={(e) => setFilters({ classification: e.target.value })}
                className="w-40"
              />
              <Select
                options={[
                  { label: 'Nome A-Z', value: 'name_asc' },
                  { label: 'Nome Z-A', value: 'name_desc' },
                  { label: 'Mais recentes', value: 'created_at_desc' },
                  { label: 'Mais antigos', value: 'created_at_asc' },
                ]}
                placeholder="Ordenar"
                value={filters.sortBy}
                onChange={(e) => setFilters({ sortBy: e.target.value })}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-800">
            {[...Array(6)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Nenhum paciente encontrado"
            description="Cadastre um novo paciente para comecar"
            action={
              <Button size="sm" onClick={() => navigate('/patients/new')}>
                <Plus className="h-4 w-4" />
                Novo Paciente
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Paciente
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      CPF
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Classe
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Cadastro
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={patient.full_name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-slate-200">{patient.full_name}</p>
                            <p className="text-xs text-slate-500 md:hidden">{formatCPF(patient.cpf)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-400 font-mono">{formatCPF(patient.cpf)}</span>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <Badge variant={getClassificationBadgeVariant(patient.classification)}>
                          Classe {patient.classification}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-400">{formatDate(patient.created_at)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusBadgeVariant(patient.status)}>{patient.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenAction(openAction === patient.id ? null : patient.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors focus-ring"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openAction === patient.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenAction(null);
                                }}
                              />
                              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-40 py-1 animate-fade-in">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/patients/${patient.id}`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 w-full text-left transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                  Visualizar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/patients/${patient.id}/edit`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 w-full text-left transition-colors"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/evaluations/new?patient=${patient.id}`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 w-full text-left transition-colors"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                  Nova Avaliacao
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                <p className="text-sm text-slate-500">
                  Mostrando {(page - 1) * pageSize + 1} a{' '}
                  {Math.min(page * pageSize, totalCount)} de {totalCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 3), page + 2)
                    .map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="w-8 h-8 p-0"
                      >
                        {p}
                      </Button>
                    ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
