import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function Onboarding() {
  const navigate = useNavigate();
  const initialize = useAuthStore((s) => s.initialize);
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clinicName.trim() || clinicName.trim().length < 2) {
      setError('Nome da clínica deve ter pelo menos 2 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Chamar Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('complete-onboarding', {
        body: { orgName: clinicName.trim() },
      });

      if (fnError || !data?.success) {
        setError(data?.error ?? fnError?.message ?? 'Erro ao criar organização. Tente novamente.');
        return;
      }

      // Forçar refresh do JWT para incluir os novos claims (org_id + role)
      await supabase.auth.refreshSession();

      // Reinicializar o authStore para capturar os novos claims
      await initialize();

      navigate('/dashboard');
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-editorial-gold/10 border border-editorial-gold/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-editorial-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
              Sua clínica
            </h2>
            <p className="text-sm text-editorial-muted">
              Configure sua organização para começar
            </p>
          </div>
        </div>

        <p className="text-sm text-editorial-muted mb-8 leading-relaxed">
          Você está quase pronto. Informe o nome da sua clínica para criar
          seu espaço de trabalho. Outros profissionais poderão ser convidados depois.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nome da clínica"
            type="text"
            placeholder="Ex: Instituto Médico Silva"
            icon={<Building2 className="h-4 w-4" />}
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            disabled={loading}
            autoFocus
          />

          {error && (
            <p className="text-sm text-editorial-rose dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !clinicName.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando sua clínica...
              </>
            ) : (
              'Criar clínica e continuar'
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
