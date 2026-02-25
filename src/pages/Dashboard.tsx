import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { startOfMonth, subMonths } from 'date-fns';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge, getStatusBadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { CardSkeleton, TableRowSkeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import type { Evaluation } from '../lib/types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TrendData {
  value: string;
  up: boolean;
  show: boolean;
}

interface DashboardMetrics {
  totalPatients: number;
  totalEvaluations: number;
  pendingCount: number;
  avgScore: number;
  trends: {
    patients: TrendData;
    evaluations: TrendData;
    pending: TrendData;
    avgScore: TrendData;
  };
}

const CHART_COLORS = ['#1A2B48', '#C5A059', '#8A8477', '#3D5A80'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentEvals, setRecentEvals] = useState<Evaluation[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function calcTrend(current: number, previous: number): TrendData {
      if (previous === 0 && current === 0) return { value: '0%', up: true, show: false };
      if (previous === 0) return { value: '+100%', up: true, show: true };
      const pct = Math.round(((current - previous) / previous) * 100);
      return { value: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0, show: true };
    }

    async function fetchData() {
      setLoading(true);

      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();

      const [
        patientsRes, evalsRes, pendingRes, scoresRes,
        patientsThisMonth, patientsLastMonth,
        evalsThisMonth, evalsLastMonth,
        pendingThisMonth, pendingLastMonth,
        scoresLastMonth,
      ] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('status', 'Pendente'),
        supabase.from('evaluations').select('total_score, max_score').eq('status', 'Concluído'),
        supabase.from('patients').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
        supabase.from('patients').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('status', 'Pendente').gte('created_at', thisMonthStart),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('status', 'Pendente').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
        supabase.from('evaluations').select('total_score, max_score').eq('status', 'Concluído').gte('completed_at', lastMonthStart).lt('completed_at', thisMonthStart),
      ]);

      const scores = scoresRes.data ?? [];
      const avgScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((sum, e) => sum + (e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0), 0) /
                scores.length
            )
          : 0;

      const scoresThisMonthData = scores.filter(() => true);
      const scoresLastMonthData = scoresLastMonth.data ?? [];
      const avgThis = scoresThisMonthData.length > 0
        ? Math.round(scoresThisMonthData.reduce((s, e) => s + (e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0), 0) / scoresThisMonthData.length)
        : 0;
      const avgLast = scoresLastMonthData.length > 0
        ? Math.round(scoresLastMonthData.reduce((s, e) => s + (e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0), 0) / scoresLastMonthData.length)
        : 0;

      setMetrics({
        totalPatients: patientsRes.count ?? 0,
        totalEvaluations: evalsRes.count ?? 0,
        pendingCount: pendingRes.count ?? 0,
        avgScore,
        trends: {
          patients: calcTrend(patientsThisMonth.count ?? 0, patientsLastMonth.count ?? 0),
          evaluations: calcTrend(evalsThisMonth.count ?? 0, evalsLastMonth.count ?? 0),
          pending: calcTrend(pendingThisMonth.count ?? 0, pendingLastMonth.count ?? 0),
          avgScore: calcTrend(avgThis, avgLast),
        },
      });

      const { data: recent } = await supabase
        .from('evaluations')
        .select('*, patient:patients(id, full_name, cpf, classification)')
        .order('created_at', { ascending: false })
        .limit(8);

      setRecentEvals((recent as Evaluation[]) ?? []);

      const { data: classData } = await supabase.from('patients').select('classification');
      if (classData) {
        const counts: Record<string, number> = { I: 0, II: 0, III: 0, IV: 0 };
        classData.forEach((p) => {
          if (p.classification in counts) counts[p.classification]++;
        });
        setChartData(
          Object.entries(counts)
            .filter(([_, v]) => v > 0)
            .map(([name, value]) => ({ name: `Classe ${name}`, value }))
        );
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Pacientes',
      value: metrics?.totalPatients ?? 0,
      icon: Users,
      trend: metrics?.trends.patients,
      color: 'text-editorial-navy',
      bg: 'bg-editorial-navy/10',
    },
    {
      label: 'Fichas',
      value: metrics?.totalEvaluations ?? 0,
      icon: ClipboardList,
      trend: metrics?.trends.evaluations,
      color: 'text-editorial-sage',
      bg: 'bg-editorial-sage-light',
    },
    {
      label: 'Pendentes',
      value: metrics?.pendingCount ?? 0,
      icon: Clock,
      trend: metrics?.trends.pending,
      color: 'text-editorial-gold',
      bg: 'bg-editorial-gold/10',
    },
    {
      label: 'Score Medio',
      value: `${metrics?.avgScore ?? 0}%`,
      icon: TrendingUp,
      trend: metrics?.trends.avgScore,
      color: 'text-editorial-sage',
      bg: 'bg-editorial-sage-light',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Dashboard</h1>
          <p className="text-sm text-editorial-muted mt-1">Visao geral das avaliacoes e pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/analytics')}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Relatorios</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/patients/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Paciente</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="group hover:border-editorial-warm transition-colors">
            <div className="flex items-start justify-between">
              <div className={`${card.bg} rounded-lg p-2.5`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              {card.trend?.show && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    card.trend.up ? 'text-editorial-sage' : 'text-editorial-rose'
                  }`}
                >
                  {card.trend.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {card.trend.value}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">{card.value}</p>
              <p className="text-sm text-editorial-muted mt-0.5">{card.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding={false} className="lg:col-span-2">
          <div className="flex items-center justify-between p-6 pb-0">
            <CardTitle>Casos Recentes</CardTitle>
            <Link
              to="/evaluations"
              className="text-sm text-editorial-gold hover:text-editorial-gold-dark transition-colors flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentEvals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 text-editorial-warm mx-auto mb-3" />
              <p className="text-sm text-editorial-muted">Nenhuma avaliacao encontrada</p>
              <Button size="sm" className="mt-4" onClick={() => navigate('/patients')}>
                Iniciar Avaliacao
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-editorial-cream dark:border-editorial-navy-light/20">
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Paciente
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Data
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvals.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-b border-editorial-cream/50 dark:border-editorial-navy-light/20 hover:bg-editorial-paper/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/evaluations/${ev.id}`)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={ev.patient?.full_name ?? 'P'} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                              {ev.patient?.full_name ?? 'Paciente'}
                            </p>
                            <p className="text-xs text-editorial-muted">{ev.patient?.cpf}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <span className="text-sm text-editorial-muted">{formatDate(ev.created_at)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {ev.status === 'Concluído' ? (
                          <span className="text-sm font-semibold text-editorial-navy dark:text-editorial-cream">
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
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Distribuicao por Classe</CardTitle>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-editorial-muted">Sem dados para exibir</p>
            </div>
          ) : (
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF9F7',
                      border: '1px solid #E8E6E1',
                      borderRadius: '0.5rem',
                      color: '#1A2B48',
                      fontSize: '0.875rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {chartData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-editorial-muted">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
