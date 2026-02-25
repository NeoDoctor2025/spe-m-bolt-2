import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Concluído':
    case 'Ativo':
      return 'success';
    case 'Em Andamento':
      return 'warning';
    case 'Pendente':
      return 'error';
    case 'Inativo':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function getClassificationBadgeVariant(cls: string): BadgeVariant {
  switch (cls) {
    case 'I': return 'success';
    case 'II': return 'info';
    case 'III': return 'warning';
    case 'IV': return 'error';
    default: return 'neutral';
  }
}
