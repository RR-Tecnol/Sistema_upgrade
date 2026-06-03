import { OperacaoRoteiro } from '@prisma/client';

export interface GateChecklistItem {
  item: string;
  label: string;
  obrigatorio: boolean;
  minFotos?: number;           // exige N fotos para marcar o item como conforme
  medicao?: { campo: string; min: number; max: number };
  condicional?: 'MULTICOURSE';
}

export const GATE_CHECKLISTS: Record<OperacaoRoteiro, GateChecklistItem[]> = {

  // ── OP010 · Aquisição e Legalização ────────────────────────────────────────
  OP010_VISTORIA_DESMANCHE: [
    { item: 'contrato_assinado',         label: 'Contrato de compra/aquisição assinado',                       obrigatorio: true },
    { item: 'pagamento_efetuado',         label: 'Pagamento efetuado / confirmado',                             obrigatorio: true },
    { item: 'carreta_recebida',           label: 'Carreta recebida no galpão (data e responsável registrados)', obrigatorio: true },
    { item: 'checklist_recebimento',      label: 'Checklist de recebimento preenchido (fotos do estado inicial)',obrigatorio: true },
    { item: 'vistoria_estrutural',        label: 'Vistoria estrutural do baú realizada',                        obrigatorio: true },
    { item: 'desmanche_concluido',        label: 'Interior antigo desmanchado (se carreta usada)',              obrigatorio: false },
    { item: 'transferencia_nome_iniciada',label: 'Transferência de nome iniciada no DETRAN',                   obrigatorio: true },
    { item: 'vistoria_cautelar_ecv',      label: 'Vistoria Cautelar / ECV realizada',                          obrigatorio: true },
    { item: 'taxas_recolhidas',           label: 'Recolhimento de taxas concluído',                             obrigatorio: true },
    { item: 'docs_despachante',           label: 'Documentação enviada ao despachante',                         obrigatorio: true },
    { item: 'relatorio_fotos_inicial',    label: 'Relatório fotográfico do estado inicial (se houver danos)',   obrigatorio: false },
  ],

  // ── OP020 · Estrutura Externa — Serralheiro ─────────────────────────────────
  OP020_SERRALHERIA: [
    { item: 'rebaixamento_teto',          label: '3.1 Rebaixamento do teto realizado (pé-direito 2,80m ±2cm)', obrigatorio: true, medicao: { campo: 'altura_teto_cm', min: 278, max: 282 } },
    { item: 'fechamento_traseira',        label: '3.2 Fechamento traseiro concluído',                           obrigatorio: true },
    { item: 'troca_chapas',              label: '3.3 Troca de chapas laterais e teto conforme Ficha Técnica',  obrigatorio: true },
    { item: 'estruturais_34_35',          label: '3.4–3.5 Subetapas estruturais concluídas',                   obrigatorio: true },
    { item: 'gaveteiro_construido',       label: '3.6–3.7 Construção de gaveteiros (saia da carreta) concluída',obrigatorio: true },
    { item: 'reparos_trocas',             label: '3.8 Reparos e trocas estruturais concluídos',                obrigatorio: true },
    { item: 'portas_laterais',            label: '3.9 Corte e instalação de portas laterais',                  obrigatorio: true },
    { item: 'suporte_ac',                 label: '3.10 Suportes de ar-condicionado instalados',                 obrigatorio: true },
    { item: 'pintura_externa',            label: '3.11 Pintura externa aplicada (lixamento + primer + tinta)',  obrigatorio: true },
    { item: 'ajuste_2_eixos',             label: 'Ajuste para padrão de 2 eixos realizado (se aplicável)',      obrigatorio: false },
    { item: 'foto_estrutura_externa',     label: 'Fotos da estrutura externa finalizada (mín. 4 fotos)',        obrigatorio: true, minFotos: 4 },
  ],

  // ── OP025 · Elétrica Automotiva ─────────────────────────────────────────────
  OP025_ELETRICA_AUTOMOTIVA: [
    { item: 'vistoria_eletrica_auto',     label: '4. Vistoria completa do sistema elétrico automotivo',        obrigatorio: true },
    { item: 'motor_alternador_bateria',   label: 'Motor, alternador e bateria verificados e aprovados',         obrigatorio: true },
    { item: 'iluminacao_automotiva',      label: 'Sistema de iluminação automotiva testado (faróis, lanternas)', obrigatorio: true },
    { item: 'chicote_painel',             label: 'Chicote elétrico e painel revisados (sem curto-circuito)',    obrigatorio: true },
    { item: 'teste_partida_carga',        label: 'Teste de partida e carga aprovado',                           obrigatorio: true },
    { item: 'foto_eletrica_auto',         label: 'Relatório fotográfico da elétrica automotiva',                obrigatorio: false },
  ],

  // ── OP030 · Estrutura Interna ────────────────────────────────────────────────
  OP030_INFRAESTRUTURA: [
    { item: 'ferro_interno',              label: '5. Estrutura de ferro interna instalada e fixada',            obrigatorio: true },
    { item: 'fiacao_interna',             label: '6. Fiação elétrica interna passada (paredes ainda abertas)',  obrigatorio: true },
    { item: 'caixas_eletrica',            label: '6. Caixas elétricas posicionadas conforme planta',            obrigatorio: true },
    { item: 'teste_continuidade',         label: '6. Teste de continuidade elétrica interna realizado',         obrigatorio: true },
    { item: 'sem_gerador',               label: '6. Preparado para rede da cidade (sem gerador próprio)',       obrigatorio: true },
    { item: 'tubulacao_ar',              label: '7. Tubulação de ar-condicionado interna instalada',            obrigatorio: true },
    { item: 'foto_estrutura_interna',     label: 'Fotos da estrutura interna (ferro + infraestrutura elétrica)',obrigatorio: false },
  ],

  // ── OP040 · Serviço Interno ─────────────────────────────────────────────────
  OP040_ACABAMENTO: [
    { item: 'ferro_interno_finalizado',   label: '8. Estrutura de ferro interna finalizada',                    obrigatorio: true },
    { item: 'ripado_compensado',          label: '9. Ripado / compensado instalado',                            obrigatorio: true },
    { item: 'teto_mdf',                  label: '10. Teto MDF Naval instalado',                                 obrigatorio: true },
    { item: 'paredes_mdf',               label: '10. Paredes MDF Naval instaladas',                             obrigatorio: true },
    { item: 'ac_instalado_testado',       label: '11. Ar-condicionados instalados e testados (resfriamento OK)',obrigatorio: true },
    { item: 'mobiliario_completo',        label: '12. Mobiliário completo instalado e fixado (sem risco em trânsito)', obrigatorio: true },
    { item: 'duas_salas_multicurso',      label: '[MULTICURSO] 12. 2 salas independentes obrigatórias',         obrigatorio: false, condicional: 'MULTICOURSE' },
    { item: 'acabamento_eletrico',        label: '13. Acabamento elétrico concluído (tomadas, lâmpadas, quadro)',obrigatorio: true },
    { item: 'teste_sistemas',             label: '14. Teste de todos os sistemas (elétrico, AC, hidráulico)',    obrigatorio: true },
    { item: 'inspecao_final_interna',     label: '15. Inspeção final interna aprovada',                         obrigatorio: true },
    { item: 'foto_servico_interno',       label: 'Fotos do serviço interno finalizado (mín. 4 fotos)',          obrigatorio: true, minFotos: 4 },
  ],

  // ── OP050 · Serviço de Acabamento ───────────────────────────────────────────
  OP050_MARCENARIA: [
    { item: 'acabamento_marcenaria',      label: '16. Acabamentos de marcenaria concluídos',                    obrigatorio: true },
    { item: 'plotagem_externa',           label: '17. Plotagem externa aplicada (adesivagem conforme arte)',     obrigatorio: true },
    { item: 'plotagem_interna',           label: '17. Plotagem interna aplicada',                               obrigatorio: true },
    { item: 'limpeza_final',             label: '18. Limpeza final realizada (interna e externa)',              obrigatorio: true },
    { item: 'material_didatico',          label: '19. Material didático guardado e organizado',                  obrigatorio: true },
    { item: 'foto_acabamento_externo',    label: 'Fotos do acabamento externo (mín. 4 fotos)',                  obrigatorio: true, minFotos: 4 },
    { item: 'foto_acabamento_interno',    label: 'Fotos do acabamento interno (mín. 4 fotos)',                  obrigatorio: true, minFotos: 4 },
  ],

  // ── OP060 · Gate de Liberação Final ─────────────────────────────────────────
  OP060_GATE_LIBERACAO: [
    { item: 'todas_ops_aprovadas',        label: 'Gates OP010–OP050 todos aprovados',                           obrigatorio: true },
    { item: 'fotos_panoramicas',          label: 'Fotos panorâmicas da unidade finalizada (mín. 8 fotos)',      obrigatorio: true, minFotos: 8 },
    { item: 'sem_nc_aberta',             label: 'Sem não-conformidades ABERTA ou EM_TRATATIVA',                obrigatorio: true },
    { item: 'bom_validado',              label: 'BOM: consumo real registrado em todos os apontamentos',        obrigatorio: true },
    { item: 'custos_lancados',            label: 'Todos os custos lançados em ContasPagar (FABRICACAO)',         obrigatorio: true },
    { item: 'transferencia_concluida',    label: 'Transferência de nome concluída (documento DETRAN anexo)',     obrigatorio: true },
    { item: 'responsavel_assinou',        label: 'Responsável técnico assinou a liberação',                      obrigatorio: true },
  ],
};
