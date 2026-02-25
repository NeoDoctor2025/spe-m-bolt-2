import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { registerSchema, type RegisterFormData } from '../lib/validation';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function Register() {
  const navigate = useNavigate();
  const { signUp, loading } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register: reg,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const getPasswordStrength = (): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: '', color: 'bg-slate-700' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const labels = ['Fraca', 'Fraca', 'Media', 'Forte', 'Excelente'];
    const colors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-400'];
    return { level: strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength();

  const translateAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('already registered') || lower.includes('already been registered'))
      return 'Este e-mail ja possui uma conta cadastrada. Tente fazer login.';
    if (lower.includes('password') && (lower.includes('short') || lower.includes('weak') || lower.includes('least')))
      return 'A senha deve ter pelo menos 8 caracteres.';
    if (lower.includes('valid email') || lower.includes('invalid email'))
      return 'Informe um endereco de e-mail valido.';
    if (lower.includes('rate limit') || lower.includes('too many'))
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    return msg;
  };

  const onSubmit = async (data: RegisterFormData) => {
    const { error } = await signUp(data.email, data.password, data.full_name);
    if (error) {
      showToast(translateAuthError(error), 'error');
    } else {
      showToast('Conta criada com sucesso!', 'success');
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout>
      <div>
        <h2 className="text-2xl font-bold text-slate-50 mb-1">Criar Conta</h2>
        <p className="text-sm text-slate-400 mb-8">
          Registre-se para acessar a plataforma
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome Completo"
            placeholder="Dr. Joao Silva"
            icon={<User className="h-4 w-4" />}
            error={errors.full_name?.message}
            {...reg('full_name')}
          />

          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...reg('email')}
          />

          <Input
            label="CRM"
            placeholder="CRM/SP 123456"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={errors.crm_number?.message}
            {...reg('crm_number')}
          />

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimo 8 caracteres"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...reg('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= passwordStrength.level ? passwordStrength.color : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Forca: <span className="text-slate-400">{passwordStrength.label}</span>
              </p>
            </div>
          )}

          <Input
            label="Confirmar Senha"
            type="password"
            placeholder="Repita sua senha"
            icon={<Lock className="h-4 w-4" />}
            error={errors.confirm_password?.message}
            {...reg('confirm_password')}
          />

          <Button type="submit" loading={loading} className="w-full">
            <UserPlus className="h-4 w-4" />
            Criar Conta
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Ja tem uma conta?{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-400 transition-colors font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
