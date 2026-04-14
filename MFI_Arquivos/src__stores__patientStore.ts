// src/stores/patientStore.ts
// Alterações: org_id nos INSERTs + advanceStatus() para pipeline
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { canTransition, checkClinicalBlocks } from '../lib/patientPipeline';
import type { Patient } from '../lib/types';

interface PatientFilters {
  search: string;
  classification: string;
  status: string;
  sortBy: string;
}

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  filters: PatientFilters;
  page: number;
  pageSize: number;
  totalCount: number;
  setFilters: (filters: Partial<PatientFilters>) => void;
  setPage: (page: number) => void;
  fetchPatients: () => Promise<void>;
  fetchPatientById: (id: string) => Promise<Patient | null>;
  createPatient: (data: Omit<Patient, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>) => Promise<{ id: string | null; error: string | null }>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<{ error: string | null }>;
  deletePatient: (id: string) => Promise<{ error: string | null }>;
  advanceStatus: (id: string, toStatus: string) => Promise<{ error: string | null }>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  loading: false,
  filters: { search: '', classification: '', status: '', sortBy: 'created_at_desc' },
  page: 1,
  pageSize: 10,
  totalCount: 0,

  setFilters: (newFilters) => {
    set((s) => ({ filters: { ...s.filters, ...newFilters }, page: 1 }));
    get().fetchPatients();
  },

  setPage: (page) => {
    set({ page });
    get().fetchPatients();
  },

  fetchPatients: async () => {
    set({ loading: true });
    const { filters, page, pageSize } = get();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // RLS filtra por org_id automaticamente — sem .eq('user_id', ...) aqui
    let query = supabase.from('patients').select('*', { count: 'exact' });

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`);
    }
    if (filters.classification) {
      query = query.eq('classification', filters.classification);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    switch (filters.sortBy) {
      case 'name_asc':    query = query.order('full_name', { ascending: true });  break;
      case 'name_desc':   query = query.order('full_name', { ascending: false }); break;
      case 'created_at_asc': query = query.order('created_at', { ascending: true }); break;
      default:            query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (!error) {
      set({ patients: data ?? [], totalCount: count ?? 0 });
    }
    set({ loading: false });
  },

  fetchPatientById: async (id) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) set({ selectedPatient: data });
    return data;
  },

  createPatient: async (patientData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    // ← org_id obrigatório
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada. Faça login novamente.' };

    const { data, error } = await supabase
      .from('patients')
      .insert({ ...patientData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchPatients();
    return { id: data?.id ?? null, error: null };
  },

  updatePatient: async (id, patientData) => {
    const { error } = await supabase
      .from('patients')
      .update({ ...patientData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    await get().fetchPatients();
    const p = get().selectedPatient;
    if (p?.id === id) await get().fetchPatientById(id);
    return { error: null };
  },

  deletePatient: async (id) => {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) return { error: error.message };
    await get().fetchPatients();
    return { error: null };
  },

  // ← novo: avançar workflow_status via máquina de estados
  advanceStatus: async (id, toStatus) => {
    // 1. Buscar status atual
    const patient = await get().fetchPatientById(id);
    if (!patient) return { error: 'Paciente não encontrado.' };

    const currentStatus = (patient as Record<string, unknown>).workflow_status as string ?? 'lead';

    // 2. Validar transição (lógica pura)
    const transition = canTransition(currentStatus, toStatus);
    if (!transition.allowed) return { error: transition.reason ?? 'Transição não permitida.' };

    // 3. Buscar ClinicalContext (score SPE-M mais recente)
    const { data: latestEval } = await supabase
      .from('spe_m_evaluations')
      .select('total_score')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const context = {
      spemScore: latestEval?.total_score ?? null,
      cioSignedOut: false, // implementar em sprint futuro
    };

    // 4. Verificar bloqueios clínicos (lógica pura)
    const block = checkClinicalBlocks(context, currentStatus, toStatus);
    if (!block.allowed) return { error: block.reason ?? 'Bloqueio clínico.' };

    // 5. UPDATE com verificação de race condition
    const { error, count } = await supabase
      .from('patients')
      .update({ workflow_status: toStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workflow_status', currentStatus) // ← previne race condition
      .select('id', { count: 'exact', head: true });

    if (error) return { error: error.message };
    if (count === 0) return { error: 'Status foi alterado por outro usuário. Recarregue a página.' };

    await get().fetchPatientById(id);
    return { error: null };
  },
}));
