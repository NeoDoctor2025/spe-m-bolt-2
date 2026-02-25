import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Search, ChevronDown, Mail, HelpCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

const FAQ_SECTIONS = [
  {
    title: 'Primeiros Passos',
    items: [
      {
        question: 'Como criar minha conta no SPE-M?',
        answer:
          'Acesse a pagina de registro, preencha seu nome completo, e-mail, numero do CRM e crie uma senha segura. Apos o cadastro, voce sera redirecionado automaticamente para o dashboard.',
      },
      {
        question: 'Como acessar o sistema pela primeira vez?',
        answer:
          'Apos criar sua conta, faca login com seu e-mail e senha. O sistema exibira o dashboard principal com uma visao geral de todos os seus pacientes e avaliacoes.',
      },
      {
        question: 'Quais navegadores sao suportados?',
        answer:
          'O SPE-M funciona em todos os navegadores modernos: Chrome, Firefox, Safari e Edge. Recomendamos manter seu navegador atualizado para a melhor experiencia.',
      },
    ],
  },
  {
    title: 'Gerenciamento de Pacientes',
    items: [
      {
        question: 'Como cadastrar um novo paciente?',
        answer:
          'Acesse a secao "Pacientes" no menu superior e clique em "Novo Paciente". Preencha os dados pessoais, contato, endereco e historico medico. O CPF e o nome completo sao obrigatorios.',
      },
      {
        question: 'Como editar os dados de um paciente?',
        answer:
          'Na lista de pacientes, clique nos tres pontos ao lado do paciente e selecione "Editar". Voce tambem pode acessar a pagina de detalhes do paciente e clicar no botao "Editar".',
      },
      {
        question: 'Como funciona a classificacao dos pacientes?',
        answer:
          'Os pacientes sao classificados em 4 niveis (I a IV) baseados no risco cirurgico. Classe I indica menor risco, enquanto Classe IV indica maior risco. Esta classificacao auxilia no planejamento cirurgico.',
      },
      {
        question: 'Posso filtrar e buscar pacientes?',
        answer:
          'Sim. Na lista de pacientes, utilize a barra de busca para pesquisar por nome ou CPF. Voce tambem pode filtrar por classificacao e ordenar por nome ou data de cadastro.',
      },
    ],
  },
  {
    title: 'Avaliacoes',
    items: [
      {
        question: 'Como iniciar uma nova avaliacao?',
        answer:
          'Acesse a pagina de detalhes do paciente e clique em "Nova Avaliacao". O sistema criara uma ficha de avaliacao e abrira o wizard com as etapas de avaliacao.',
      },
      {
        question: 'Quais sao as etapas da avaliacao?',
        answer:
          'A avaliacao possui 5 etapas: Anamnese, Exame Fisico, Classificacao de Risco, Planejamento Cirurgico e Revisao Final. Cada etapa contem criterios especificos com pontuacoes.',
      },
      {
        question: 'Como funciona o sistema de scoring?',
        answer:
          'Cada criterio possui opcoes com pontuacoes diferentes. O score total e calculado em tempo real e exibido no painel lateral. Scores acima de 80% indicam risco baixo, entre 50-80% risco moderado, e abaixo de 50% risco elevado.',
      },
      {
        question: 'Posso salvar e continuar uma avaliacao depois?',
        answer:
          'Sim. Clique no botao "Salvar" a qualquer momento. A avaliacao ficara com status "Em Andamento" e voce pode continua-la quando desejar acessando a lista de avaliacoes.',
      },
    ],
  },
  {
    title: 'Fotos e Anotacoes',
    items: [
      {
        question: 'Como adicionar fotos de um paciente?',
        answer:
          'Acesse a secao "Fotos", selecione o paciente desejado e faca upload das fotos em cada viewport (Frontal, Lateral, Obliqua). Arraste a imagem ou clique na area de upload.',
      },
      {
        question: 'Como fazer anotacoes nas fotos?',
        answer:
          'Clique em uma foto ja enviada para abrir o editor de anotacoes. Use as ferramentas de desenho (caneta, borracha, cores) para marcar areas de interesse. Clique em "Salvar" ao finalizar.',
      },
      {
        question: 'Quais formatos de imagem sao aceitos?',
        answer:
          'O sistema aceita imagens nos formatos JPG, PNG e WebP. Recomendamos imagens com boa resolucao para melhor visualizacao e anotacao.',
      },
    ],
  },
  {
    title: 'Relatorios',
    items: [
      {
        question: 'Que tipo de relatorios estao disponiveis?',
        answer:
          'O sistema oferece graficos de avaliacoes ao longo do tempo, distribuicao de pacientes por classificacao e scores medios por criterio de avaliacao.',
      },
      {
        question: 'Posso filtrar relatorios por periodo?',
        answer:
          'Sim. Na pagina de relatorios, utilize os campos de data para definir o periodo desejado. Todos os graficos serao atualizados automaticamente.',
      },
    ],
  },
  {
    title: 'Conta e Configuracoes',
    items: [
      {
        question: 'Como alterar meus dados pessoais?',
        answer:
          'Acesse "Configuracoes" no menu do perfil (canto superior direito). Na aba "Perfil", voce pode atualizar seu nome, CRM, especialidade e telefone.',
      },
      {
        question: 'Como alterar dados da clinica?',
        answer:
          'Nas Configuracoes, acesse a aba "Clinica" para atualizar o nome, endereco e informacoes do local de atendimento.',
      },
      {
        question: 'Como recuperar minha senha?',
        answer:
          'Na tela de login, clique em "Esqueceu a senha?" e informe seu e-mail. Voce recebera um link para redefinir sua senha.',
      },
    ],
  },
];

export default function Help() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-serif text-editorial-navy">Central de Ajuda</h1>
        <p className="text-sm text-editorial-muted mt-1">Encontre respostas para suas duvidas</p>
      </div>

      <Input
        placeholder="Buscar ajuda..."
        icon={<Search className="h-4 w-4" />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {filteredSections.length === 0 ? (
        <Card className="text-center py-12">
          <HelpCircle className="h-10 w-10 text-editorial-warm mx-auto mb-3" />
          <p className="text-sm text-editorial-muted">Nenhum resultado encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <Card key={section.title} padding={false}>
              <div className="px-6 pt-5 pb-3">
                <h2 className="text-base font-semibold font-serif text-editorial-navy">{section.title}</h2>
              </div>
              <Accordion.Root type="multiple" className="divide-y divide-editorial-cream">
                {section.items.map((item, index) => (
                  <Accordion.Item key={index} value={`${section.title}-${index}`}>
                    <Accordion.Trigger className="flex items-center justify-between w-full px-6 py-4 text-left text-sm text-editorial-navy/80 hover:text-editorial-navy transition-colors group">
                      <span>{item.question}</span>
                      <ChevronDown className="h-4 w-4 text-editorial-muted shrink-0 ml-4 transition-transform group-data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-fade-in">
                      <p className="px-6 pb-4 text-sm text-editorial-muted leading-relaxed">
                        {item.answer}
                      </p>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Card>
          ))}
        </div>
      )}

      <Card className="text-center">
        <Mail className="h-8 w-8 text-editorial-warm mx-auto mb-3" />
        <h3 className="text-base font-semibold font-serif text-editorial-navy mb-1">Precisa de mais ajuda?</h3>
        <p className="text-sm text-editorial-muted mb-4">
          Entre em contato com nossa equipe de suporte
        </p>
        <a
          href="mailto:suporte@spem.com.br"
          className="inline-flex items-center gap-2 text-sm text-editorial-gold hover:text-editorial-gold-light transition-colors"
        >
          <Mail className="h-4 w-4" />
          suporte@spem.com.br
        </a>
      </Card>
    </div>
  );
}
