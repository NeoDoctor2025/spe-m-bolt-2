import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '---';
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getScoreColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'text-slate-400';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'bg-slate-700';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'bg-emerald-500/20';
  if (pct >= 50) return 'bg-amber-500/20';
  return 'bg-red-500/20';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Concluído':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Em Andamento':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Pendente':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'Ativo':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Inativo':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

export function getClassificationColor(cls: string): string {
  switch (cls) {
    case 'I':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'II':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'III':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'IV':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
