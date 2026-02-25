import { useEffect, useState, useRef } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, CheckCircle2, Award } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { EVALUATION_STEPS } from '../data/evaluationCriteria';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.5rem',
  color: '#f1f5f9',
  fontSize: '0.875rem',
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lineData, setLineData] = useState<{ month: string; count: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [barData, setBarData] = useState<{ name: string; score: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, avgScore: 0, completedCount: 0, highest: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchAnalytics();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dateFrom, dateTo]);

  async function fetchAnalytics() {
    setLoading(true);

    let evalsQuery = supabase.from('evaluations').select('*');
    if (dateFrom) evalsQuery = evalsQuery.gte('created_at', dateFrom);
    if (dateTo) evalsQuery = evalsQuery.lte('created_at', `${dateTo}T23:59:59`);
    const { data: evalsData } = await evalsQuery;
    const evals = evalsData ?? [];

    const total = evals.length;
    const completed = evals.filter((e) => e.status === 'Concluído');
    const avgScore =
      completed.length > 0
        ? Math.round(
            completed.reduce((s, e) => s + (e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0), 0) /
              completed.length
          )
        : 0;
    const highest =
      completed.length > 0
        ? Math.round(
            Math.max(...completed.map((e) => (e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0)))
          )
        : 0;

    setStats({ total, avgScore, completedCount: completed.length, highest });

    const monthCounts: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = 0;
    }
    evals.forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthCounts) monthCounts[key]++;
    });
    setLineData(
      Object.entries(monthCounts).map(([month, count]) => ({
        month: month.split('-')[1] + '/' + month.split('-')[0].slice(2),
        count,
      }))
    );

    const hasDateFilter = dateFrom || dateTo;
    const evalIds = evals.map((e) => e.id);
    const patientIds = [...new Set(evals.map((e) => e.patient_id))];

    let patientsQuery = supabase.from('patients').select('classification');
    if (hasDateFilter && patientIds.length > 0) {
      patientsQuery = patientsQuery.in('id', patientIds);
    } else if (hasDateFilter) {
      setPieData([]);
      setBarData(EVALUATION_STEPS.map((step) => ({ name: step.title, score: 0 })));
      setLoading(false);
      return;
    }
    const { data: patientsData } = await patientsQuery;
    const classCounts: Record<string, number> = { I: 0, II: 0, III: 0, IV: 0 };
    (patientsData ?? []).forEach((p) => {
      if (p.classification in classCounts) classCounts[p.classification]++;
    });
    setPieData(
      Object.entries(classCounts)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name: `Classe ${name}`, value }))
    );

    let criteriaQuery = supabase.from('evaluation_criteria').select('criterion_group, score, max_score');
    if (hasDateFilter && evalIds.length > 0) {
      criteriaQuery = criteriaQuery.in('evaluation_id', evalIds);
    } else if (hasDateFilter) {
      setBarData(EVALUATION_STEPS.map((step) => ({ name: step.title, score: 0 })));
      setLoading(false);
      return;
    }
    const { data: criteriaData } = await criteriaQuery;
    const groupScores: Record<string, { total: number; max: number; count: number }> = {};
    (criteriaData ?? []).forEach((c) => {
      if (!groupScores[c.criterion_group]) groupScores[c.criterion_group] = { total: 0, max: 0, count: 0 };
      groupScores[c.criterion_group].total += c.score;
      groupScores[c.criterion_group].max += c.max_score;
      groupScores[c.criterion_group].count++;
    });

    const barChartData = EVALUATION_STEPS.map((step) => {
      const g = groupScores[step.title];
      return {
        name: step.title,
        score: g && g.max > 0 ? Math.round((g.total / g.max) * 100) : 0,
      };
    });
    setBarData(barChartData);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Relatorios e Estatisticas</h1>
          <p className="text-sm text-slate-400 mt-1">Analise detalhada das avaliacoes</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-slate-500 text-sm">ate</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BarChart3, label: 'Total Avaliacoes', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: TrendingUp, label: 'Score Medio', value: `${stats.avgScore}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: CheckCircle2, label: 'Concluidas', value: stats.completedCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: Award, label: 'Maior Score', value: `${stats.highest}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((card) => (
          <Card key={card.label}>
            <div className="flex items-center gap-3">
              <div className={`${card.bg} rounded-lg p-2.5`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-50">{card.value}</p>
                <p className="text-sm text-slate-400">{card.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Avaliacoes ao Longo do Tempo</CardTitle>
          <CardDescription>Quantidade de avaliacoes por mes</CardDescription>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Avaliacoes"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Distribuicao por Classificacao</CardTitle>
          <CardDescription>Pacientes por classe de risco</CardDescription>
          <div className="h-72 mt-4">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-slate-500">Sem dados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    formatter={(value) => <span className="text-sm text-slate-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Scores por Criterio</CardTitle>
          <CardDescription>Pontuacao media por etapa de avaliacao (%)</CardDescription>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" width={140} stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Score']} />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
