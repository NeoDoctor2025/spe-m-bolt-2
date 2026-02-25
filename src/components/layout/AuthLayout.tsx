import type { ReactNode } from 'react';
import { Activity } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[60%] relative bg-slate-950 items-center justify-center overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-slate-400" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-blue-600/5" />

        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-blue-600/3 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 mb-8">
            <Activity className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-slate-50 mb-4 tracking-tight">
            SPE-M
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Surgical Planning & Evaluation - Medical
          </p>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            Plataforma de avaliacao medica para planejamento cirurgico com scoring em tempo real e visualizacao anatomica.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '2.4k+', label: 'Avaliacoes' },
              { value: '99.8%', label: 'Uptime' },
              { value: '350+', label: 'Cirurgioes' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-950 lg:bg-slate-900/50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-xl font-bold text-slate-50">SPE-M</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
