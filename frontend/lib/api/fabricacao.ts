import api from './client';
import { stockApi, StockItem } from './stock';

// ── Types ──────────────────────────────────────────────────────────────────

export type StatusOrdemFabricacao =
  | 'RASCUNHO'
  | 'AGUARDANDO_MATERIAL'
  | 'EM_PRODUCAO'
  | 'BLOQUEADA'
  | 'INSPECAO_FINAL'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type OperacaoRoteiro =
  | 'OP010_VISTORIA_DESMANCHE'
  | 'OP020_SERRALHERIA'
  | 'OP025_ELETRICA_AUTOMOTIVA'
  | 'OP030_INFRAESTRUTURA'
  | 'OP040_ACABAMENTO'
  | 'OP050_MARCENARIA'
  | 'OP060_GATE_LIBERACAO';

export type StatusOperacao =
  | 'AGUARDANDO'
  | 'LIBERADA'
  | 'EM_ANDAMENTO'
  | 'GATE_PENDENTE'
  | 'CONCLUIDA'
  | 'BLOQUEADA';

export interface OrdemFabricacao {
  id: string;
  codigo: string;
  qrCodeUrl?: string;
  descricaoBau: string;
  configuracao: string;
  tipoContratacao: string;
  cliente?: string;
  status: StatusOrdemFabricacao;
  andoneAtivo: boolean;
  orcamentoTotal: number;
  custoRealAcumulado: number;
  valorAgregadoTotal: number;
  alertaCustoPercent: number;
  dataEntradaGalpao: string;
  dataInicioBaseline: string;
  dataConclusaoBaseline: string;
  dataEntregaPrevista: string;
  dataInicioReal?: string;
  dataConclusaoReal?: string;
  grupoId?: string;
  responsavelId: string;
  observacoes?: string;
  // Custo de aquisição
  cursoEspecifico?: string;
  valorBauComprado?: number;
  valorBauDescricao?: string;
  valorFreteAquisicao?: number;
  valorFreteDescricao?: string;
  createdAt: string;
  updatedAt: string;
  grupo?: { id: string; name: string };
  responsavel?: { id: string; name: string; email: string };
  truck?: { id: string; identifier: string; licensePlate: string };
  operacoes?: OperacaoProducao[];
  custos?: CustoOf[];
  _count?: { naoConformidades: number; apontamentos: number };
}

export type TipoPrestador = 'PF' | 'PJ';

export interface Prestador {
  id: string;
  nome: string;
  funcao: string;
  tipoPrestador: TipoPrestador;
  cpf?: string;
  cnpj?: string;
  telefone?: string;
  contato?: string;
  custo?: {
    id: string;
    tipo: string;
    oficio?: string;
    valor: number;
    valorDiaria?: number;
    numeroDiarias?: number;
    diasTrabalhados: string[];
    dataVencimento: string;
    operacao?: string;
    contaPagar?: { id: string; status: string } | null;
  } | null;
}

export interface CustoOf {
  id: string;
  ordemId: string;
  tipo: string;
  oficio?: string;
  descricao: string;
  valor: number;
  operacao?: string;
  dataVencimento: string;
  contaPagarId?: string;
  createdAt: string;
  tipoPrestador?: TipoPrestador;
  prestadorNome?: string;
  prestadorCpf?: string;
  prestadorCnpj?: string;
  prestadorTelefone?: string;
  prestadorContato?: string;
  diasTrabalhados?: string[];
  numeroDiarias?: number;
  valorDiaria?: number;
  fornecedor?: { id: string; nome: string };
}

export interface OperacaoProducao {
  id: string;
  ordemId: string;
  operacao: OperacaoRoteiro;
  ordemNumero: number;
  descricao: string;
  duracaoPrevistaHoras: number;
  duracaoRealHoras?: number;
  status: StatusOperacao;
  percentualConcluido: number;
  isCritical: boolean;
  folga?: number;
  esDate?: string;
  efDate?: string;
  lsDate?: string;
  lfDate?: string;
  pesoEvm: number;
  gateAprovado: boolean;
  gateAprovadoPor?: string;
  gateAprovadoEm?: string;
  dataInicioReal?: string;
  dataConclusaoReal?: string;
}

export interface EvmMetrics {
  bac: number;
  ev: number;
  pv: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
  percentualFisico: number;
  statusCusto: 'GREEN' | 'YELLOW' | 'RED';
  statusPrazo: 'GREEN' | 'YELLOW' | 'RED';
  statusTcpi: 'GREEN' | 'YELLOW' | 'RED';
  interpretacaoCpi: string;
  interpretacaoSpi: string;
}

export interface SnapshotEvm {
  id: string;
  ordemId: string;
  data: string;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
  percentualFisico: number;
}

export interface NaoConformidade {
  id: string;
  codigo: string;
  ordemId: string;
  operacaoId?: string;
  tipo: string;
  descricao: string;
  acaoCorretiva?: string;
  isBloqueante: boolean;
  bloqueiaProducao: boolean;
  impactoFinanceiro?: number;
  impactoDias?: number;
  status: string;
  resolucao?: string;
  fotoUrls: string[];
  registradoPor?: { id: string; name: string };
  resolvidoPor?: string;
  createdAt: string;
}

export interface ApontamentoDiario {
  id: string;
  ordemId: string;
  operacaoId: string;
  funcionarioId: string;
  data: string;
  horasTrabalhadas: number;
  turno?: string;
  percentualAvanco: number;
  descricaoAtividade: string;
  fotoUrls: string[];
  observacoes?: string;
  createdAt: string;
  operador?: { id: string; name: string; role?: string };
  funcionario?: { id: string; nome: string; funcao: string };
  operacao?: OperacaoProducao;
}

export interface BomItem {
  id: string;
  ordemId: string;
  insumoId: string;
  operacao: OperacaoRoteiro;
  quantidadePrevista: number;
  quantidadeConsumida: number;
  quantidadeRealizada?: number; // alias de quantidadeConsumida (compatibilidade backend)
  unidade: string;
  custoUnitarioPrev: number;
  custoUnitarioReal?: number;
  isPhantom: boolean;
  observacoes?: string;
  insumo?: {
    id: string;
    nome: string;
    codigoInterno?: string;
    unidadeMedida?: string;
    unidade?: string;
    precoUnitario?: number;
    quantidadeAtual?: number;   // estoque real do Central
    quantidadeMinima?: number;  // mínimo configurado
  };
}

export interface InsumoFabricacao {
  id: string;
  nome: string;
  codigoInterno?: string;
  categoria: string;
  unidade: string;
  unidadeMedida?: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  precoUnitario: number;
  fornecedorPadrao?: string;
  active: boolean;
  _source?: 'fabricacao' | 'estoque'; // identifica a origem do item
  _stockItemId?: string;              // ID do StockItem quando _source = 'estoque'
}

export interface FuncionarioProducao {
  id: string;
  nome: string;
  cpf?: string;
  funcao: string;
  telefone?: string;
  pix?: string;
  valorDiaria?: number;
  active: boolean;
}

export interface BomTemplate {
  id: string;
  nome: string;
  configuracao: string;
  descricao?: string;
  versao: string;
  ativo: boolean;
  criadoPor: string;
  createdAt: string;
}

export interface GateQualidade {
  id: string;
  ordemId: string;
  operacaoId: string;
  operacao: OperacaoRoteiro;
  itensChecklist: any[];
  fotosUrls: string[];
  medicoes?: Record<string, number>;
  aprovado: boolean;
  aprovadoPor?: string;
  aprovadoEm?: string;
  observacaoFinal?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── API Client ─────────────────────────────────────────────────────────────

export const fabricacaoApi = {
  // Ordens
  ordens: {
    list: (params?: { status?: string; grupoId?: string; page?: number; limit?: number }) =>
      api.get<PaginatedResult<OrdemFabricacao>>('/fabricacao/ordens', { params }).then(r => r.data),

    get: (id: string) =>
      api.get<OrdemFabricacao>(`/fabricacao/ordens/${id}`).then(r => r.data),

    create: (dto: {
      descricaoBau: string;
      configuracao: string;
      tipoContratacao: string;
      bomTemplateId?: string;
      dataEntradaGalpao: string;
      dataInicioBaseline: string;
      dataConclusaoBaseline: string;
      orcamentoTotal: number;
      grupoId?: string;
      alertaCustoPercent?: number;
      observacoes?: string;
      cursoEspecifico?: string;
      valorBauComprado?: number;
      valorBauDescricao?: string;
      valorFreteAquisicao?: number;
      valorFreteDescricao?: string;
    }) => api.post<OrdemFabricacao>('/fabricacao/ordens', dto).then(r => r.data),

    getEvm: (id: string) =>
      api.get<EvmMetrics>(`/fabricacao/ordens/${id}/evm`).then(r => r.data),



    getEvmHistorico: (id: string) =>
      api.get<SnapshotEvm[]>(`/fabricacao/ordens/${id}/evm/historico`).then(r => r.data),

    getOperacoes: (id: string) =>
      api.get<OperacaoProducao[]>(`/fabricacao/ordens/${id}/operacoes`).then(r => r.data),

    getBom: (id: string) =>
      api.get<BomItem[]>(`/fabricacao/ordens/${id}/bom`).then(r => r.data),

    getNcs: (id: string) =>
      api.get<NaoConformidade[]>(`/fabricacao/ordens/${id}/nc`).then(r => r.data),

    getApontamentos: (id: string) =>
      api.get<ApontamentoDiario[]>(`/fabricacao/ordens/${id}/apontamentos`).then(r => r.data),

    getFornecedores: (id: string) =>
      api.get<any[]>(`/fabricacao/ordens/${id}/fornecedores`).then(r => r.data),

    registrarCusto: (id: string, dto: {
      tipo: string;
      oficio?: string;
      descricao: string;
      valor: number;
      operacao?: string;
      dataVencimento: string;
      fornecedorId?: string;
      // Prestador
      tipoPrestador?: TipoPrestador;
      prestadorNome?: string;
      prestadorCpf?: string;
      prestadorCnpj?: string;
      prestadorTelefone?: string;
      prestadorContato?: string;
      // Diária
      diasTrabalhados?: string[];
      valorDiaria?: number;
    }) => api.post(`/fabricacao/ordens/${id}/custos`, dto).then(r => r.data),

    getCustos: (id: string) =>
      api.get<CustoOf[]>(`/fabricacao/ordens/${id}/custos`).then(r => r.data),

    deletarCusto: (id: string, custoId: string) =>
      api.delete(`/fabricacao/ordens/${id}/custos/${custoId}`).then(r => r.data),

    getPrestadores: (id: string) =>
      api.get<Prestador[]>(`/fabricacao/ordens/${id}/prestadores`).then(r => r.data),

    update: (id: string, dto: Partial<{
      observacoes: string;
      alertaCustoPercent: number;
      cursoEspecifico: string;
      valorBauComprado: number;
      valorBauDescricao: string;
      valorFreteAquisicao: number;
      valorFreteDescricao: string;
    }>) => api.patch<OrdemFabricacao>(`/fabricacao/ordens/${id}`, dto).then(r => r.data),

    updateStatus: (id: string, status: StatusOrdemFabricacao) =>
      api.patch(`/fabricacao/ordens/${id}/status`, { status }).then(r => r.data),
  },

  // Gates
  gates: {
    get: (ordemId: string, operacao: string) =>
      api.get(`/fabricacao/ordens/${ordemId}/gates/${operacao}`).then(r => r.data).catch(() => null),

    updateChecklist: (ordemId: string, operacao: string, itens: any[]) =>
      api.patch(`/fabricacao/ordens/${ordemId}/gates/${operacao}`, { itens }).then(r => r.data),

    approve: (ordemId: string, operacao: string) =>
      api.post(`/fabricacao/ordens/${ordemId}/gates/${operacao}/aprovar`, { itens: [], fotosUrls: [] }).then(r => r.data),

    // Compat alias
    getChecklist: (ordemId: string, operacao: OperacaoRoteiro) =>
      api.get(`/fabricacao/ordens/${ordemId}/gates/${operacao}`).then(r => r.data).catch(() => null),

    aprovar: (ordemId: string, operacao: OperacaoRoteiro, dto: {
      itens: Array<{ item: string; ok: boolean; obs?: string }>;
      fotosUrls: string[];
      medicoes?: Record<string, number>;
      observacao?: string;
    }) => api.post(`/fabricacao/ordens/${ordemId}/gates/${operacao}/aprovar`, dto).then(r => r.data),
  },

  // NCs
  ncs: {
    list: (ordemId: string) =>
      api.get<NaoConformidade[]>(`/fabricacao/ordens/${ordemId}/nc`).then(r => r.data),

    create: (ordemId: string, dto: {
      tipo: string;
      descricao: string;
      operacaoId?: string;
      isBloqueante?: boolean;
      bloqueiaProducao?: boolean;
      impactoFinanceiro?: number;
      impactoDias?: number;
      acaoCorretiva?: string;
    }) => api.post(`/fabricacao/ordens/${ordemId}/nc`, { ...dto, bloqueiaProducao: dto.isBloqueante ?? dto.bloqueiaProducao ?? false }).then(r => r.data),

    resolver: (ordemId: string, ncId: string, dto: { resolucao: string; status: string }) =>
      api.patch(`/fabricacao/ordens/${ordemId}/nc/${ncId}/resolver`, dto).then(r => r.data),
  },

  // NC (compat alias)
  nc: {
    registrar: (ordemId: string, dto: any) =>
      api.post(`/fabricacao/ordens/${ordemId}/nc`, dto).then(r => r.data),
    resolver: (ordemId: string, ncId: string, dto: any) =>
      api.patch(`/fabricacao/ordens/${ordemId}/nc/${ncId}/resolver`, dto).then(r => r.data),
  },

  // Apontamentos
  apontamentos: {
    list: (ordemId: string) =>
      api.get<ApontamentoDiario[]>(`/fabricacao/ordens/${ordemId}/apontamentos`).then(r => r.data),

    registrar: (ordemId: string, dto: {
      operacaoId: string;
      funcionarioId: string;
      data: string;
      horasTrabalhadas: number;
      percentualAvanco: number;
      descricaoAtividade: string;
      materiaisConsumidos?: Array<{
        insumoId?: string;    // InsumoFabricacao.id
        stockItemId?: string; // StockItem.id (categoria MATERIAL_FABRICACAO)
        quantidade: number;
      }>;
      fotoUrls?: string[];
      observacoes?: string;
    }) => api.post(`/fabricacao/ordens/${ordemId}/apontamentos`, dto).then(r => r.data),
  },

  // BOM
  bom: {
    list: (ordemId: string) =>
      api.get<BomItem[]>(`/fabricacao/ordens/${ordemId}/bom`).then(r => r.data),
    templates: () =>
      api.get<BomTemplate[]>('/fabricacao/bom/templates').then(r => r.data),
    getTemplate: (id: string) =>
      api.get<BomTemplate>(`/fabricacao/bom/templates/${id}`).then(r => r.data),
  },

  // Insumos (fabricação própria + estoque categoria MATERIAL_FABRICACAO)
  insumos: {
    list: async (): Promise<InsumoFabricacao[]> => {
      const [fab, stock] = await Promise.allSettled([
        api.get<InsumoFabricacao[]>('/fabricacao/insumos').then(r => r.data),
        stockApi.items.getAll({ categoria: 'MATERIAL_FABRICACAO' }) as Promise<StockItem[]>,
      ]);

      const fabricacaoItems: InsumoFabricacao[] =
        fab.status === 'fulfilled' ? fab.value.map(i => ({ ...i, _source: 'fabricacao' as const })) : [];

      const stockItems: InsumoFabricacao[] =
        stock.status === 'fulfilled'
          ? (stock.value as StockItem[]).map(s => ({
              id: s.id,
              nome: s.nome,
              codigoInterno: s.codigoInterno ?? undefined,
              categoria: 'MATERIAL_FABRICACAO',
              unidade: s.unidade,
              unidadeMedida: s.unidade,
              quantidadeAtual: Number(s.quantidadeAtual),
              quantidadeMinima: Number(s.quantidadeMinima),
              precoUnitario: Number(s.precoUnitario ?? 0),
              active: s.active,
              _source: 'estoque' as const,
              _stockItemId: s.id,
            }))
          : [];

      // Deduplica por nome (prioriza fabricação)
      const fabNomes = new Set(fabricacaoItems.map(i => i.nome.toLowerCase()));
      const stockFiltrado = stockItems.filter(s => !fabNomes.has(s.nome.toLowerCase()));

      return [...fabricacaoItems, ...stockFiltrado];
    },
  },

  // Funcionários
  funcionarios: {
    list: (ordemId?: string) => {
      const params = ordemId ? `?ordemId=${ordemId}` : '';
      return api.get<FuncionarioProducao[]>(`/fabricacao/funcionarios${params}`).then(r => r.data);
    },
  },

  // BI
  bi: {
    dashboard: () =>
      api.get('/fabricacao/bi/dashboard').then(r => r.data),
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

export const OPERACAO_LABELS: Record<string, string> = {
  OP010_VISTORIA_DESMANCHE:   'OP010 · Aquisição e Legalização',
  OP020_SERRALHERIA:          'OP020 · Estrutura Externa — Serralheiro',
  OP025_ELETRICA_AUTOMOTIVA:  'OP025 · Elétrica Automotiva',
  OP030_INFRAESTRUTURA:       'OP030 · Estrutura Interna',
  OP040_ACABAMENTO:           'OP040 · Serviço Interno',
  OP050_MARCENARIA:           'OP050 · Serviço de Acabamento',
  OP060_GATE_LIBERACAO:       'OP060 · Gate de Liberação Final',
  // compat aliases (dados legados)
  OP060_INSTALACOES_FINAIS:   'OP050 · Serviço de Acabamento',
  OP070_GATE_LIBERACAO:       'OP060 · Gate de Liberação Final',
};

export const STATUS_COLORS: Record<StatusOrdemFabricacao, string> = {
  RASCUNHO: '#64748b',
  AGUARDANDO_MATERIAL: '#f59e0b',
  EM_PRODUCAO: '#00F5FF',
  BLOQUEADA: '#FF2D55',
  INSPECAO_FINAL: '#a855f7',
  CONCLUIDA: '#00FF8A',
  CANCELADA: '#374151',
};

export const STATUS_LABELS: Record<StatusOrdemFabricacao, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_MATERIAL: 'Aguardando Material',
  EM_PRODUCAO: 'Em Produção',
  BLOQUEADA: 'BLOQUEADA',
  INSPECAO_FINAL: 'Inspeção Final',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const OP_STATUS_COLORS: Record<StatusOperacao, string> = {
  AGUARDANDO: '#374151',
  LIBERADA: '#f59e0b',
  EM_ANDAMENTO: '#00F5FF',
  GATE_PENDENTE: '#a855f7',
  CONCLUIDA: '#00FF8A',
  BLOQUEADA: '#FF2D55',
};
