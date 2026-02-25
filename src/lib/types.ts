export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  crm_number: string | null;
  specialty: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  date_of_birth: string | null;
  gender: string;
  phone: string;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  classification: 'I' | 'II' | 'III' | 'IV';
  medical_history: string | null;
  allergies: string | null;
  medications: string | null;
  notes: string | null;
  status: 'Ativo' | 'Inativo';
  created_at: string;
  updated_at: string;
}

export type EvaluationStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export interface Evaluation {
  id: string;
  patient_id: string;
  user_id: string;
  status: EvaluationStatus;
  total_score: number;
  max_score: number;
  current_step: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface EvaluationCriterion {
  id: string;
  evaluation_id: string;
  criterion_key: string;
  criterion_group: string;
  criterion_label: string;
  selected_option: string;
  score: number;
  max_score: number;
  step_number: number;
  created_at: string;
}

export interface PatientPhoto {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  viewport: 'Frontal' | 'Lateral_L' | 'Lateral_R' | 'Oblique_L' | 'Oblique_R';
  file_url: string;
  annotations_json: DrawingOperation[];
  uploaded_at: string;
}

export interface DrawingOperation {
  type: 'pen' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface CriterionOption {
  label: string;
  value: string;
  score: number;
}

export interface CriterionDefinition {
  key: string;
  label: string;
  options: CriterionOption[];
  maxScore: number;
}

export interface EvaluationStep {
  id: number;
  title: string;
  description: string;
  criteria: CriterionDefinition[];
}
