import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { patientSchema, type PatientFormData } from '../lib/validation';
import { usePatientStore } from '../stores/patientStore';
import { useUIStore } from '../stores/uiStore';
import { BRAZILIAN_STATES } from '../data/constants';
import { PageSkeleton } from '../components/ui/Skeleton';

export default function PatientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchPatientById, createPatient, updatePatient } = usePatientStore();
  const showToast = useUIStore((s) => s.showToast);
  const [pageLoading, setPageLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'Masculino',
      classification: 'I',
    },
  });

  useEffect(() => {
    if (id) {
      setPageLoading(true);
      fetchPatientById(id).then((patient) => {
        if (patient) {
          reset({
            full_name: patient.full_name,
            cpf: patient.cpf,
            date_of_birth: patient.date_of_birth ?? '',
            gender: patient.gender as PatientFormData['gender'],
            phone: patient.phone,
            email: patient.email ?? '',
            street: patient.street ?? '',
            city: patient.city ?? '',
            state: patient.state ?? '',
            zip_code: patient.zip_code ?? '',
            classification: patient.classification,
            medical_history: patient.medical_history ?? '',
            allergies: patient.allergies ?? '',
            medications: patient.medications ?? '',
            notes: patient.notes ?? '',
          });
        } else {
          setNotFound(true);
        }
        setPageLoading(false);
      });
    }
  }, [id, fetchPatientById, reset]);

  const onSubmit = async (data: PatientFormData) => {
    const payload = {
      ...data,
      date_of_birth: data.date_of_birth || null,
      email: data.email || null,
      street: data.street || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      medical_history: data.medical_history || null,
      allergies: data.allergies || null,
      medications: data.medications || null,
      notes: data.notes || null,
    };

    if (isEdit && id) {
      const { error } = await updatePatient(id, payload);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Paciente atualizado com sucesso', 'success');
        navigate(`/patients/${id}`);
      }
    } else {
      const result = await createPatient({
        ...payload,
        status: 'Ativo',
      });
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Paciente cadastrado com sucesso', 'success');
        navigate(result.id ? `/patients/${result.id}` : '/patients');
      }
    }
  };

  if (pageLoading) return <PageSkeleton />;

  if (notFound) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Paciente nao encontrado</h2>
        <p className="text-sm text-slate-500 mb-6">O paciente solicitado nao existe ou foi removido.</p>
        <Button variant="secondary" onClick={() => navigate('/patients')}>
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            {isEdit ? 'Editar Paciente' : 'Novo Paciente'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isEdit ? 'Atualize os dados do paciente' : 'Preencha os dados para cadastrar'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informacoes basicas do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-6">
              <Input label="Nome Completo" error={errors.full_name?.message} {...register('full_name')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message} {...register('cpf')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="Data de Nascimento" type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Select
                label="Genero"
                options={[
                  { label: 'Masculino', value: 'Masculino' },
                  { label: 'Feminino', value: 'Feminino' },
                  { label: 'Outro', value: 'Outro' },
                ]}
                error={errors.gender?.message}
                {...register('gender')}
              />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Select
                label="Classificacao"
                options={[
                  { label: 'Classe I', value: 'I' },
                  { label: 'Classe II', value: 'II' },
                  { label: 'Classe III', value: 'III' },
                  { label: 'Classe IV', value: 'IV' },
                ]}
                error={errors.classification?.message}
                {...register('classification')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Telefone e e-mail do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-4">
              <Input label="Telefone" placeholder="(11) 99999-9999" error={errors.phone?.message} {...register('phone')} />
            </div>
            <div className="col-span-12 sm:col-span-8">
              <Input label="E-mail" type="email" placeholder="paciente@email.com" error={errors.email?.message} {...register('email')} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Endereco</CardTitle>
          <CardDescription>Endereco residencial do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-6">
              <Input label="Rua" placeholder="Rua, numero, complemento" {...register('street')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="Cidade" {...register('city')} />
            </div>
            <div className="col-span-6 sm:col-span-1">
              <Select
                label="UF"
                options={BRAZILIAN_STATES.map((s) => ({ label: s, value: s }))}
                placeholder="UF"
                {...register('state')}
              />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Input label="CEP" placeholder="00000-000" {...register('zip_code')} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Historico Medico</CardTitle>
          <CardDescription>Informacoes clinicas relevantes</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12">
              <Textarea label="Historico Medico" placeholder="Descreva o historico medico do paciente..." {...register('medical_history')} />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Textarea label="Alergias" placeholder="Liste as alergias conhecidas..." {...register('allergies')} />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Textarea label="Medicamentos" placeholder="Medicamentos de uso continuo..." {...register('medications')} />
            </div>
            <div className="col-span-12">
              <Textarea label="Observacoes" placeholder="Observacoes adicionais..." {...register('notes')} />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Salvar Alteracoes' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
