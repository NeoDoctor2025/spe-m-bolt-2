import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../lib/validation';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function ForgotPassword() {
  const { resetPassword, loading } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const { error } = await resetPassword(data.email);
    if (error) {
      showToast(error, 'error');
    } else {
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        {sent ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-50 mb-2">E-mail Enviado</h2>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Verifique sua caixa de entrada para redefinir sua senha. O link expira em 24 horas.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="mt-6">
                Voltar ao Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-50 mb-1">Recuperar Senha</h2>
            <p className="text-sm text-slate-400 mb-8">
              Informe seu e-mail para receber o link de recuperacao
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" loading={loading} className="w-full">
                Enviar Link de Recuperacao
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
