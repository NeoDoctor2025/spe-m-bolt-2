import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeft,
  Pencil,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  Pill,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, getClassificationBadgeVariant, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { PageSkeleton } from '../components/ui/Skeleton';
import { usePatientStore } from '../stores/patientStore';
import { useEvaluationStore } from '../stores/evaluationStore';
import { useUIStore } from '../stores/uiStore';
import { formatCPF, formatPhone, formatDate } from '../lib/utils';
import type { Patient, Evaluation } from '../lib/types';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchPatientById } = usePatientStore();
  const { fetchEvaluations, evaluations, startEvaluation } = useEvaluationStore();
  const showToast = useUIStore((s) => s.showToast);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        fetchPatientById(id),
        fetchEvaluations(id),
      ]).then(([p]) => {
        setPatient(p);
        setLoading(false);
      });
    }
  }, [id, fetchPatientById, fetchEvaluations]);

  const handleNewEvaluation = async () => {
    if (!id) return;
    setStarting(true);
    const { id: evalId, error } = await startEvaluation(id);
    setStarting(false);
    if (evalId) navigate(`/evaluations/${evalId}`);
    else if (error) showToast(error, 'error');
  };

  if (loading) return <PageSkeleton />;
  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-editorial-muted">Paciente nao encontrado</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/patients')}>
          Voltar
        </Button>
      </div>
    );
  }

  const patientEvals = evaluations.filter((e) => e.patient_id === id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 rounded-lg text-editorial-muted hover:text-editorial-navy hover:bg-editorial-cream/40 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={patient.full_name} size="xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-serif text-editorial-navy">{patient.full_name}</h1>
                <Badge variant={getClassificationBadgeVariant(patient.classification)}>
                  Classe {patient.classification}
                </Badge>
                <Badge variant={getStatusBadgeVariant(patient.status)}>{patient.status}</Badge>
              </div>
              <p className="text-sm text-editorial-muted mt-1 font-mono">{formatCPF(patient.cpf)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button size="sm" loading={starting} onClick={handleNewEvaluation}>
              <ClipboardList className="h-4 w-4" />
              Nova Avaliacao
            </Button>
          </div>
        </div>
      </div>

      <Tabs.Root defaultValue="overview" className="space-y-4">
        <Tabs.List className="flex gap-1 border-b border-editorial-cream pb-px">
          {[
            { value: 'overview', label: 'Visao Geral' },
            { value: 'history', label: 'Historico' },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="px-4 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy/80 focus-ring rounded-t-lg"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardTitle className="text-base font-serif">Informacoes Pessoais</CardTitle>
              <div className="mt-4 space-y-3">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={formatDate(patient.date_of_birth)} />
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Genero" value={patient.gender} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={formatPhone(patient.phone)} />
                {patient.email && <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={patient.email} />}
              </div>
            </Card>

            <Card>
              <CardTitle className="text-base font-serif">Endereco</CardTitle>
              <div className="mt-4 space-y-3">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Rua" value={patient.street || '---'} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Cidade" value={[patient.city, patient.state].filter(Boolean).join(' / ') || '---'} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="CEP" value={patient.zip_code || '---'} />
              </div>
            </Card>

            <Card className="md:col-span-2">
              <CardTitle className="text-base font-serif">Historico Medico</CardTitle>
              <div className="mt-4 space-y-4">
                <InfoBlock icon={<Stethoscope className="h-4 w-4" />} label="Historico" text={patient.medical_history || 'Nenhum historico registrado'} />
                <InfoBlock icon={<AlertTriangle className="h-4 w-4" />} label="Alergias" text={patient.allergies || 'Nenhuma alergia registrada'} />
                <InfoBlock icon={<Pill className="h-4 w-4" />} label="Medicamentos" text={patient.medications || 'Nenhum medicamento registrado'} />
              </div>
            </Card>
          </div>
        </Tabs.Content>

        <Tabs.Content value="history">
          <Card padding={false}>
            {patientEvals.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-10 w-10 text-editorial-warm mx-auto mb-3" />
                <p className="text-sm text-editorial-muted">Nenhuma avaliacao realizada</p>
                <Button size="sm" className="mt-4" loading={starting} onClick={handleNewEvaluation}>
                  Iniciar Avaliacao
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-editorial-cream">
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {patientEvals.map((ev: Evaluation) => (
                    <tr
                      key={ev.id}
                      className="border-b border-editorial-cream/50 hover:bg-editorial-cream/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/evaluations/${ev.id}`)}
                    >
                      <td className="px-6 py-3 text-sm text-editorial-navy/80">{formatDate(ev.created_at)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {ev.status === 'Concluído' ? (
                          <span className="text-sm font-semibold text-editorial-navy">
                            {ev.max_score > 0 ? Math.round((ev.total_score / ev.max_score) * 100) : 0}%
                          </span>
                        ) : (
                          <span className="text-sm text-editorial-warm">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-editorial-warm">{icon}</div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-editorial-muted">{label}</span>
        <span className="text-sm text-editorial-navy">{value}</span>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-editorial-warm">{icon}</div>
        <span className="text-sm font-medium text-editorial-muted">{label}</span>
      </div>
      <p className="text-sm text-editorial-navy/80 pl-6">{text}</p>
    </div>
  );
}
