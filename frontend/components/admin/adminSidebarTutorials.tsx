'use client';

import type { ReactNode } from 'react';
import AdminCollapsibleTutorial from '@/components/admin/AdminCollapsibleTutorial';

/** Tutoriais colapsáveis partilhados pelas páginas do menu lateral admin (persistência por storageKey). */

export function TurmasSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-turmas-tutorial-expanded"
            emoji="🏫"
            title="COMO USAR TURMAS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Lista e navegação', body: 'Consulte turmas por curso, estado e período. Clique numa linha ou em Ver detalhes para abrir a ficha da turma (alunos, frequência, estatísticas).' },
                { num: '2', color: '#F59E0B', title: 'Nova turma', body: 'Use Nova turma para vincular curso, cidade/UF, datas e capacidade. Confirme requisitos do curso antes de publicar inscrições.' },
                { num: '3', color: '#10B981', title: 'Estados da turma', body: 'O ciclo inclui planeamento, inscrições abertas/fechadas e turma em curso. Alterações de estado impactam matrículas e relatórios.' },
                { num: '4', color: '#8B5CF6', title: 'Ligações úteis', body: 'Da ficha da turma acede a frequência, certificados elegíveis e viagens de campo quando aplicável.' },
                { num: '5', color: '#64748B', title: 'Boas práticas', body: 'Revise identificador da turma e cidade antes de comunicar aos alunos; erros de UF afectam custos de viagem e certificação.' },
            ]}
        />
    );
}

export function InscricoesSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-inscricoes-tutorial-expanded"
            emoji="📝"
            title="COMO USAR INSCRIÇÕES"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Filas de trabalho', body: 'Filtre por pendente, documentação em falta, aprovadas ou rejeitadas. Priorize documentação antes de aprovar matrícula final.' },
                { num: '2', color: '#F59E0B', title: 'Revisão de documentos', body: 'Abra o detalhe da inscrição para validar dados do aluno e ficheiros. Use rejeição com motivo claro para permitir correção pelo aluno.' },
                { num: '3', color: '#10B981', title: 'Aprovação', body: 'Ao aprovar, o aluno passa ao fluxo de matrícula na turma conforme regras do curso e vagas disponíveis.' },
                { num: '4', color: '#EF4444', title: 'Rejeição e reabertura', body: 'Inscrições rejeitadas podem ser reenviadas pelo candidato; acompanhe o histórico no detalhe.' },
                { num: '5', color: '#64748B', title: 'Relatórios', body: 'Para visão agregada use Relatórios ou exportações quando disponíveis na mesma área administrativa.' },
            ]}
        />
    );
}

export function AlunosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-alunos-tutorial-expanded"
            emoji="👥"
            title="COMO USAR ALUNOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Pesquisa e lista', body: 'Utilize busca por nome, e-mail ou CPF. A listagem suporta vista em tabela com ordenação conforme colunas visíveis.' },
                { num: '2', color: '#F59E0B', title: 'Ficha do aluno', body: 'Ao abrir um aluno consulte dados pessoais, matrículas, frequência, certificados e feedbacks associados.' },
                { num: '3', color: '#10B981', title: 'Novo aluno', body: 'Cadastre apenas quando necessário; muitos alunos chegam via inscrição online e portal do estudante.' },
                { num: '4', color: '#8B5CF6', title: 'Proteção de dados', body: 'Evite copiar dados para fora do sistema; use exportações oficiais quando existirem.' },
                { num: '5', color: '#64748B', title: 'Integração', body: 'Turmas, frequência e certificados referenciam sempre o mesmo registo de aluno — mantenha o e-mail de login actualizado.' },
            ]}
        />
    );
}

export function FrequenciaSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-frequencia-tutorial-expanded"
            emoji="✅"
            title="COMO USAR FREQUÊNCIA"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Visão por turma ou global', body: 'Seleccione turma e período para lançar ou rever presenças. Os percentuais alimentam elegibilidade para certificado (regra mínima de presença).' },
                { num: '2', color: '#F59E0B', title: 'Lançamento', body: 'Registe presença por aula ou em lote quando a página oferecer essa opção; confirme datas para não duplicar sessões.' },
                { num: '3', color: '#10B981', title: 'Justificativas', body: 'Justificativas aprovadas podem ajustar o cálculo — siga o fluxo definido na sua organização.' },
                { num: '4', color: '#8B5CF6', title: 'Lista em PDF', body: 'Quando existir exportação ou impressão da lista, gere o ficheiro e guarde ou partilhe pelo canal habitual da equipa. Se o PDF falhar, tente de novo mais tarde ou peça apoio à equipa técnica.' },
                { num: '5', color: '#64748B', title: 'Sincronização', body: 'Após alterações, confirme na ficha do aluno e na turma se os totais batem com o esperado.' },
            ]}
        />
    );
}

export function CarretasSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-carretas-tutorial-expanded"
            emoji="🚛"
            title="COMO USAR CARRETAS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Cadastro de veículos', body: 'Mantenha identificação, capacidade e estado operacional actualizados para planeamento de viagens.' },
                { num: '2', color: '#F59E0B', title: 'Manutenção', body: 'Use a área de manutenção da carreta para registar serviços e lembretes — reduz imprevistos em campo.' },
                { num: '3', color: '#10B981', title: 'Viagens', body: 'Carretas aparecem como recurso nas viagens de campo; associe sempre motorista e trajeto correctos.' },
                { num: '4', color: '#64748B', title: 'Boas práticas', body: 'Inactivar uma carreta impedindo novas viagens pode ser preferível a apagar histórico.' },
            ]}
        />
    );
}

export function GruposSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-grupos-tutorial-expanded"
            emoji="🏢"
            title="COMO USAR GRUPOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'O que são grupos', body: 'Agrupe cidades ou polos para operações em campo, relatórios e custos de viagem coerentes.' },
                { num: '2', color: '#F59E0B', title: 'Criar e editar', body: 'Defina nome, UF e cidades membros; valide antes de associar turmas ou motoristas.' },
                { num: '3', color: '#10B981', title: 'Impacto', body: 'Alterações podem afectar rotas e despesas — coordene com Viagens e Reembolsos.' },
                { num: '4', color: '#64748B', title: 'Consulta', body: 'Use a lista para auditar que cidades pertencem a cada grupo operacional.' },
            ]}
        />
    );
}

export function AcoesSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-acoes-tutorial-expanded"
            emoji="⚡"
            title="COMO USAR PERÍODOS DE CURSO (AÇÕES)"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Planeamento', body: 'Períodos de curso organizam acções por datas e metas (presença mínima, certificação, encerramento).' },
                { num: '2', color: '#F59E0B', title: 'Criação', body: 'Ao criar uma acção associe turma, datas e responsáveis; confirme calendário escolar e feriados.' },
                { num: '3', color: '#10B981', title: 'Acompanhamento', body: 'Use o detalhe da acção para marcar progresso e registar notas operacionais.' },
                { num: '4', color: '#8B5CF6', title: 'Ligações', body: 'Viagens e imprevistos podem referenciar o mesmo período — mantenha identificadores alinhados.' },
                { num: '5', color: '#64748B', title: 'Encerramento', body: 'Só finalize quando frequência e certificados estiverem coerentes com a turma.' },
            ]}
        />
    );
}

export function ViagensSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-viagens-tutorial-expanded"
            emoji="🗺️"
            title="COMO USAR VIAGENS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Mapa e lista', body: 'Visualize viagens activas, filtros por estado/motorista e criação manual quando necessário.' },
                { num: '2', color: '#F59E0B', title: 'Custo e diárias', body: 'Custos sugerem-se a partir das configurações (passagem, diária); ajuste valores com documentação suporte.' },
                { num: '3', color: '#10B981', title: 'Motoristas', body: 'Atribua motorista e carreta compatíveis com o trajeto e janela de tempo.' },
                { num: '4', color: '#8B5CF6', title: 'Reembolsos', body: 'Fluxos aprovados podem gerar ou ligar-se a reembolsos — verifique estado na área financeira.' },
                { num: '5', color: '#64748B', title: 'Imprevistos', body: 'Registe desvios na página de Imprevistos para auditoria e reposição de rota.' },
            ]}
        />
    );
}

export function FuncionariosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-funcionarios-tutorial-expanded"
            emoji="💼"
            title="COMO USAR FUNCIONÁRIOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Cadastro', body: 'Inclua dados contratuais, departamento e vínculos académicos quando for instrutor ou coordenador.' },
                { num: '2', color: '#F59E0B', title: 'Reembolsos e recibos', body: 'Do detalhe do funcionário pode pré-visualizar recibos e reembolsos associados conforme permissões.' },
                { num: '3', color: '#10B981', title: 'Frequência específica', body: 'Existe fluxo dedicado à frequência de funcionários em campo — use o link do menu quando disponível.' },
                { num: '4', color: '#64748B', title: 'Privacidade', body: 'Dados salariais e documentos só devem ser vistos por quem precisa deles para o trabalho.' },
            ]}
        />
    );
}

export function FeriadosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-feriados-tutorial-expanded"
            emoji="📅"
            title="COMO USAR FERIADOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Finalidade', body: 'Marca datas em que não há aula ou em que o sistema deve alertar conflitos de calendário.' },
                { num: '2', color: '#F59E0B', title: 'Criação', body: 'Indique nome, data e âmbito (nacional, estadual ou municipal quando aplicável).' },
                { num: '3', color: '#10B981', title: 'Planeamento', body: 'Turmas e períodos de curso devem respeitar feriados para frequência e encerramento.' },
                { num: '4', color: '#64748B', title: 'Manutenção', body: 'Actualize anualmente e remova duplicados para evitar alertas falsos.' },
            ]}
        />
    );
}

export function ImprevistosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-imprevistos-tutorial-expanded"
            emoji="⚠️"
            title="COMO USAR IMPREVISTOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Registo', body: 'Documente atrasos, faltas de transporte, clima ou falhas mecânicas com data e responsável.' },
                { num: '2', color: '#F59E0B', title: 'Triagem', body: 'Classifique gravidade e impacto na turma ou viagem para priorizar resposta.' },
                { num: '3', color: '#10B981', title: 'Resolução', body: 'Ao encerrar, registe a acção tomada (reagendar, substituir motorista, etc.).' },
                { num: '4', color: '#64748B', title: 'Auditoria', body: 'Relatórios operacionais usam estes registos — evite apagar; prefira estado encerrado.' },
            ]}
        />
    );
}

export function ReembolsosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-reembolsos-tutorial-expanded"
            emoji="💰"
            title="COMO USAR REEMBOLSOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Filas', body: 'Separe pendentes, aprovados e pagos; use totais do topo para conciliação rápida.' },
                { num: '2', color: '#F59E0B', title: 'Aprovação', body: 'Valide comprovantes e valores de diária/passagem segundo a política interna e configurações do sistema.' },
                { num: '3', color: '#10B981', title: 'Pagamento', body: 'Após marcar pago, confira se Contas a pagar ou extratos reflectem o mesmo movimento.' },
                { num: '4', color: '#8B5CF6', title: 'Integração', body: 'Viagens e funcionários ligam-se aos pedidos — abra o detalhe para ver histórico completo.' },
                { num: '5', color: '#64748B', title: 'Disputas', body: 'Em divergência, mantenha notas na própria solicitação para auditoria futura.' },
            ]}
        />
    );
}

export function ContasAPagarSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-contas-a-pagar-tutorial-expanded"
            emoji="🏦"
            title="COMO USAR CONTAS A PAGAR"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Dashboard financeiro', body: 'Cards por status e tipo resumem o que está pendente, vencido ou pago.' },
                { num: '2', color: '#F59E0B', title: 'Novo lançamento', body: 'Crie conta com valor, vencimento, fornecedor e referência (feedback, viagem, etc.).' },
                { num: '3', color: '#10B981', title: 'Liquidação', body: 'Ao marcar pago registe data e método para fechar o ciclo com reembolsos e PIX.' },
                { num: '4', color: '#8B5CF6', title: 'Relatórios', body: 'Exporte ou filtre por período para fechos mensais.' },
                { num: '5', color: '#64748B', title: 'Controlo', body: 'Reconcilie periodicamente com banco para evitar duplicidade de pagamento.' },
            ]}
        />
    );
}

export function RelatoriosSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-relatorios-tutorial-expanded"
            emoji="📈"
            title="COMO USAR RELATÓRIOS"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Parâmetros', body: 'Escolha intervalo de datas e, quando existir, turma, curso ou UF para segmentar métricas.' },
                { num: '2', color: '#F59E0B', title: 'Gráficos', body: 'Os gráficos respeitam o filtro activo; amplie janelas para tendências mais estáveis.' },
                { num: '3', color: '#10B981', title: 'Exportação em PDF', body: 'Use o botão ou menu de exportação da página; prefira intervalos de datas curtos se o relatório for grande. Se a geração falhar, reduza o período ou tente novamente — persistindo, contacte a equipa técnica.' },
                { num: '4', color: '#8B5CF6', title: 'Certificados e concludentes', body: 'Listagens de concludentes e frequência seguem as mesmas regras académicas da turma.' },
                { num: '5', color: '#64748B', title: 'Partilha', body: 'Prefira download oficial em vez de cópias de ecrã para dados sensíveis.' },
            ]}
        />
    );
}

export function HistoricoSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-historico-tutorial-expanded"
            emoji="🕐"
            title="COMO USAR HISTÓRICO"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Auditoria', body: 'Consulte eventos administrativos por data, utilizador ou tipo de acção conforme filtros disponíveis.' },
                { num: '2', color: '#F59E0B', title: 'Rastreio', body: 'Use para responder “quem alterou o quê” em disputas ou conformidade.' },
                { num: '3', color: '#10B981', title: 'Retenção', body: 'A política de dias de retenção pode estar nas Configurações — dados antigos podem expirar.' },
                { num: '4', color: '#64748B', title: 'Exportação', body: 'Se existir exportação, limite o período para ficheiros mais leves.' },
            ]}
        />
    );
}

// ═══════════════════════════════════════════════════════════════════
//   ESTOQUE — 1 tutorial por sub-página (mesmo storageKey padrão)
// ═══════════════════════════════════════════════════════════════════

// Bloco reutilizável de "dica" usado dentro dos passos de tutorial — destaque amarelo padrão.
function TutorialHint({ children }: { children: ReactNode }) {
    return (
        <div style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,214,0,0.08)',
            border: '1px solid rgba(255,214,0,0.35)',
            fontSize: '0.78rem',
            color: '#78350F',
            lineHeight: 1.55,
        }}>
            💡 {children}
        </div>
    );
}

// Lista compacta dentro de um passo — semântica simples, sem reinventar tipografia.
function TutorialList({ items }: { items: ReactNode[] }) {
    return (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.82rem', lineHeight: 1.6 }}>
            {items.map((it, i) => <li key={i} style={{ marginBottom: 3 }}>{it}</li>)}
        </ul>
    );
}

export function EstoqueSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-tutorial-expanded"
            emoji="📦"
            title="COMO USAR ESTOQUE — DASHBOARD"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'O que é o módulo de Estoque',
                    body: (
                        <>
                            <div>O módulo controla <strong>todo o material físico</strong> da operação: equipamentos, insumos didáticos, EPIs, alimentação e qualquer outro item que entra, sai, é transferido ou é consumido em ação. Ele responde a três perguntas:</div>
                            <TutorialList items={[
                                <><strong>O que eu tenho hoje?</strong> Saldo central + saldo por carreta + valor financeiro total.</>,
                                <><strong>O que está em movimento?</strong> Compras aprovadas (em trânsito), solicitações pendentes, baixas em ações.</>,
                                <><strong>O que aconteceu?</strong> Histórico completo, imutável, com quem fez e quando.</>,
                            ]}/>
                            <TutorialHint>O saldo do item é separado em <strong>central</strong> (depósito) e <strong>carretas</strong> (móvel). Eles SÓ somam quando você consulta o total — operacionalmente são contas diferentes.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'Botões do topo (hero)',
                    body: (
                        <>
                            <div>O topo do controlo de estoque reúne <strong>abas</strong> e atalhos. Use-os para ir direto à operação:</div>
                            <TutorialList items={[
                                <><strong>↔ Movimentação</strong> — abre o modal genérico de movimentação (entrada, saída, transferência, ajuste, perda, devolução).</>,
                                <><strong>Aba Movimentações recentes</strong> — lista cronológica de movimentações, com filtros por item, carreta, ação, tipo e período; opcionalmente ligue a <em>auditoria técnica</em> (histórico de alterações).</>,
                                <><strong>Aba Solicitações pendentes</strong> — fila de compras (PENDENTE, APROVADA, RECEBIDA, REJEITADA, CANCELADA).</>,
                                <><strong>Aba Estoque Central</strong> — tabela de insumos com saldo no depósito, filtros e ações por linha.</>,
                                <><strong>Aba Estoque por Caminhão</strong> — mesma tabela contextualizada na carreta selecionada.</>,
                                <><strong>Baixa por ação</strong> — registe o consumo na ficha da ação em <strong>Ações</strong> (aba Baixa de Estoque). Fecha o ciclo das reservas.</>,
                                <><strong>⚡ Novo Insumo</strong> — wizard de cadastro (vários passos) com atalho opcional para abrir a primeira Solicitação de Compra no mesmo fluxo.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'Cards de KPI (clique abre painel à direita)',
                    body: (
                        <>
                            <div>Os <strong>quatro indicadores</strong> no topo resumem o estado do catálogo e dos alertas. Quando existir o painel lateral de KPIs (dashboard clássico), clicar num cartão continua a abrir explicações e atalhos relacionados.</div>
                            <TutorialList items={[
                                'Explicação detalhada do que o número significa.',
                                'Como o número aumenta e como diminui (regras de cálculo).',
                                'Ações rápidas relacionadas (ex.: abrir solicitações pendentes, ver itens em alerta, abrir auditoria de transferências).',
                            ]}/>
                            <div style={{ marginTop: 6 }}>No layout atual do hub, os cartões mostram: total de insumos ativos, estoque crítico, estoque baixo (não crítico) e itens a vencer em 30 dias. Outros totais (valor, em trânsito, movimentações no mês) continuam disponíveis no dashboard financeiro e nos filtros das abas.</div>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'Visão por Categoria e Por Carreta',
                    body: (
                        <>
                            <div style={{ marginTop: 6 }}><strong>Visão por Categoria</strong> e <strong>por carreta</strong> continuam disponíveis através dos filtros da aba <em>Estoque Central</em>, dos cartões de alerta e da ficha de cada carreta (com a zona de estoque por abas).</div>
                            <TutorialHint>Se você cadastrou item antes de ter o vínculo de carreta, o dashboard reaproveita os <em>truckStocks</em> de cada item para preencher a visão por carreta — não fica em branco.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '5', color: '#EF4444', title: 'Fluxo: comprar → receber → consumir',
                    body: (
                        <>
                            <div>O ciclo padrão de um item novo é:</div>
                            <TutorialList items={[
                                <><strong>Cadastro:</strong> ⚡ Novo Item → o item nasce com saldo zero. Marque "gerar solicitação automaticamente" se já souber quantidade/preço, OU clique em 💰 Repor agora depois.</>,
                                <><strong>Solicitação:</strong> a PR vai para a fila com estado <em>pendente de análise</em>.</>,
                                <><strong>Aprovação:</strong> um administrador aprova. O sistema cria automaticamente uma <em>conta a pagar</em> (tipo <code>estoque_reposicao</code>) e marca a quantidade como <em>em trânsito</em>.</>,
                                <><strong>Recebimento:</strong> quando a conta é marcada como paga OU você clica em "Marcar como recebido", o saldo real sobe e uma movimentação de <em>reposição</em> é gerada.</>,
                                <><strong>Consumo:</strong> em ações de campo, registre o uso por "Baixa por ação". Sobra pode voltar pra central (devolução) ou ficar na carreta (ajuste).</>,
                            ]}/>
                            <TutorialHint>O saldo NUNCA sobe sem rastreio financeiro. Toda quantidade que entra no sistema veio de uma PR aprovada (ou de um ajuste manual com justificativa).</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '6', color: '#06B6D4', title: 'Conexão com outros módulos',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Contas a Pagar:</strong> cada PR aprovada gera uma conta tipo <em>Reposição de estoque</em>. Pagar a conta confirma o recebimento automaticamente.</>,
                                <><strong>Ações:</strong> cada ação tem aba "Kit de Insumos" (planejamento) e "Baixa de Estoque" (consumo real). Abra a lista em <strong>Ações</strong> e entre na ficha da ação para registar a baixa.</>,
                                <><strong>Carretas:</strong> na ficha da carreta, a secção <em>Estoque da carreta</em> mostra solicitações, insumos a bordo e movimentações recentes, com atalho para o controlo global.</>,
                                <><strong>Auditoria geral:</strong> todo evento aparece em Auditoria de Estoque (com filtros de item, ação, usuário, período).</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '7', color: '#64748B', title: 'Boas práticas',
                    body: (
                        <>
                            <TutorialList items={[
                                'Sempre escreva justificativas claras — elas ficam visíveis para o financeiro e para a auditoria.',
                                'Categorias customizadas precisam ser pensadas — não criar 20 categorias com pouca diferença. Use as 8 padrão sempre que possível.',
                                'Preço unitário no cadastro deve ser o ÚLTIMO preço de compra conhecido. Ao aprovar PR com preço diferente, o sistema atualiza este valor.',
                                'Quantidade mínima é o gatilho dos alertas. Se você nunca recebe alertas, ela está zerada — revise os itens críticos.',
                                'Em caso de dúvida, NÃO apague: desative (soft-delete). Manter o histórico vale ouro em discussões com fornecedor ou auditoria.',
                            ]}/>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function EstoqueItensSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-itens-tutorial-expanded"
            emoji="📋"
            title="COMO USAR O CATÁLOGO DE ITENS"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'O que é o catálogo',
                    body: (
                        <>
                            <div>É a lista <strong>mestre</strong> de todos os itens que o sistema reconhece. Cada item tem código interno único, categoria, unidade, preço unitário, quantidade mínima e validade opcional. O catálogo NÃO é o saldo — é a definição. Saldos vivem em <em>Saldo central</em> e em cada <em>carreta</em>.</div>
                            <TutorialHint>Um item desativado (soft-delete) continua aqui, escondido por padrão — para preservar movimentações, contas a pagar e auditoria antiga.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'Filtros e busca',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Busca textual</strong> — nome, código interno ou descrição. Funciona com texto parcial (ex.: "luva" encontra "Luva nitrílica P").</>,
                                <><strong>Filtro por categoria</strong> — combina as 8 padrão (Consumível, Didático, Limpeza, Equipamento, EPI, Alimentação, Escritório, Outro) com qualquer customizada ativa.</>,
                                <><strong>Estoque baixo</strong> — itens com saldo abaixo da quantidade mínima cadastrada.</>,
                                <><strong>Vencendo</strong> — itens com validade nos próximos 30 dias.</>,
                                <><strong>Inativos</strong> — alterna para ver o que foi desativado (útil para auditoria ou para reativar).</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'Badges do card — leia antes de agir',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>🛒 Aguardando 1ª Solicitação</strong> — item recém-criado, saldo zero, sem PR pendente. O CTA principal "💰 Repor agora" fica destacado.</>,
                                <><strong>⏳ N solicitação(ões) pendente(s)</strong> — já há PR pendente esperando aprovação. Não crie outra antes de revisar a fila.</>,
                                <><strong>📦 EM TRÂNSITO</strong> — PR aprovada, aguardando recebimento físico ou pagamento da conta. A quantidade aparece logo abaixo.</>,
                                <><strong>⚠️ Estoque baixo / 🚨 Crítico</strong> — saldo abaixo do mínimo. Crítico = ≤ 50% do mínimo.</>,
                                <><strong>⏰ Vencendo / 🚨 Vencido</strong> — calculado da validade cadastrada. Itens vencidos devem virar baixa por PERDA.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'Ações por card',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Ver detalhes</strong> — abre a ficha completa do item: estoque por carreta, movimentações recentes, reservas em ações futuras, histórico de PRs e contas a pagar.</>,
                                <><strong>Movimentar</strong> — abre o modal de movimentação pré-selecionando este item (você só escolhe tipo, origem/destino, quantidade e observação).</>,
                                <><strong>💰 Repor agora</strong> — abre a Solicitação de Compra pré-preenchida com este item, sugerindo quantidade = (mínimo − saldo atual) e preço = último preço cadastrado.</>,
                                <><strong>🗑</strong> — soft-delete. Não some do banco; só fica escondido. Pode reativar a qualquer momento.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '5', color: '#EF4444', title: 'Conflito de código interno + Reativação',
                    body: (
                        <>
                            <div>O <strong>código interno</strong> é único no banco. Se você apagar o item "Luva-P-001" e tentar cadastrar de novo com o mesmo código:</div>
                            <TutorialList items={[
                                'O sistema reconhece que existe inativo com o mesmo código.',
                                'Mostra "Já existe item com este código (desativado). Reativar?".',
                                'Se reativar, mantém TODO o histórico antigo (movimentações, PRs, contas) e atualiza nome/preço/categoria com o que você digitou.',
                                'Saldo volta a zero — o item antigo já tinha sido zerado antes da desativação.',
                            ]}/>
                            <TutorialHint>Reativar é melhor que recriar. Recriação cria orfãs no histórico. Reativação preserva auditoria contábil.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '6', color: '#06B6D4', title: 'Wizard de cadastro (3 passos)',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Passo 1 — Identificação:</strong> nome, código interno, categoria (padrão ou customizada com paleta de cor), unidade (caixa, kg, un, par…), foto opcional.</>,
                                <><strong>Passo 2 — Saldo e parâmetros:</strong> quantidade inicial (zero por padrão), quantidade mínima (gatilho de alertas), preço unitário, validade opcional, carreta inicial (se for vincular a uma).</>,
                                <><strong>Passo 3 — Atalho de Solicitação:</strong> ATIVE "Gerar Solicitação de Compra agora" para já abrir a PR transacionalmente. Se preferir só cadastrar e pedir depois, deixe desativado.</>,
                            ]}/>
                            <TutorialHint>Com o atalho ATIVO, item e PR são criados na MESMA transação. Se a PR falhar por validação, o item também NÃO é criado (atomicidade).</TutorialHint>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function EstoqueMovimentacoesSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-movimentacoes-tutorial-expanded"
            emoji="↔"
            title="COMO USAR MOVIMENTAÇÕES"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'O que é uma movimentação',
                    body: (
                        <>
                            <div>É um <strong>evento</strong> que altera o saldo de algum item, em algum lugar. NENHUM saldo muda no sistema sem uma movimentação correspondente — essa é a regra de ouro do estoque. Por isso a tabela é <strong>imutável</strong>: para "corrigir" uma movimentação errada, registre uma movimentação inversa (Devolução, Ajuste, Perda…) com justificativa.</div>
                            <TutorialHint>Pense numa movimentação como uma linha de extrato bancário. Você nunca apaga uma linha — você lança outra que compensa.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'Os 8 tipos disponíveis',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Entrada</strong> (central → carreta) — abastece uma carreta tirando do depósito. Diminui central, aumenta carreta.</>,
                                <><strong>Saída</strong> (carreta → ação) — consumo em campo. Diminui carreta, registra consumo na ação. <em>Exige acaoId.</em></>,
                                <><strong>Transferência</strong> (carreta → carreta) — troca entre carretas sem passar pela central. Diminui origem, aumenta destino. Central não mexe.</>,
                                <><strong>Devolução</strong> (carreta → central) — retorna material da carreta para o depósito (típico no fim de ação com sobra).</>,
                                <><strong>Ajuste</strong> — correção manual. A quantidade informada vira o NOVO SALDO (não soma). Exige justificativa. Use após conferência física.</>,
                                <><strong>Perda</strong> — quebra, descarte, vencimento, dano. Diminui central ou carreta, sem retorno. Exige justificativa.</>,
                                <><strong>Reposição</strong> — gerada AUTOMATICAMENTE quando uma Solicitação de Compra é confirmada como recebida. Você não cria essa manualmente.</>,
                                <><strong>Encomenda</strong> — também automática quando uma PR é APROVADA. Marca a quantidade em trânsito do item.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'Regras de validação por tipo',
                    body: (
                        <>
                            <TutorialList items={[
                                'Entrada: exige carreta destino e quantidade > 0; central precisa ter saldo suficiente.',
                                'Saída: exige carreta origem e acaoId; carreta precisa ter saldo suficiente.',
                                'Transferência: origem ≠ destino, ambas existentes, saldo suficiente na origem.',
                                'Devolução: exige carreta origem, saldo suficiente na carreta.',
                                'Ajuste e Perda: observação obrigatória (mínimo 5 caracteres). Sem carreta = ajuste/perda na central.',
                            ]}/>
                            <TutorialHint>Se a validação falhar (saldo insuficiente, ação inexistente etc.), o sistema rejeita com mensagem clara — e nada é gravado, garantido por transação atômica.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'Filtros e investigação',
                    body: (
                        <>
                            <div>Use a barra de filtros para responder perguntas específicas:</div>
                            <TutorialList items={[
                                <>"Onde foi parar tudo do item X?" → filtro <em>item</em>.</>,
                                <>"O que entrou/saiu da carreta Y este mês?" → filtros <em>carreta</em> + <em>período</em>.</>,
                                <>"Quanto consumimos na ação Z?" → filtro <em>ação</em> + tipo <em>Saída</em>.</>,
                                <>"Quem registrou as perdas em maio?" → filtro <em>tipo Perda</em> + <em>período</em>; cada linha mostra o autor.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '5', color: '#06B6D4', title: 'Diferença entre Movimentações e Auditoria',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Movimentações</strong> = lista funcional, focada em estoque (qual item, quanto, onde, por quê).</>,
                                <><strong>Auditoria</strong> = lista técnica, focada em mudanças no banco (quem alterou o quê, antes × depois, IP, navegador, hora exata).</>,
                            ]}/>
                            <div style={{ marginTop: 6 }}>Toda movimentação gera UMA linha aqui + UMA linha na Auditoria. Aqui você opera; lá você investiga.</div>
                        </>
                    ),
                },
                {
                    num: '6', color: '#64748B', title: 'Boas práticas de observação',
                    body: (
                        <>
                            <TutorialList items={[
                                'Em transferências: explique POR QUE está movendo (ex.: "redirecionando para ação X").',
                                'Em ajustes: cite a conferência física (ex.: "auditoria 03/05, central conferida com 47 unidades").',
                                'Em perdas: explique o dano (ex.: "5 testes vencidos descartados após auditoria mensal").',
                                'Lembre: o financeiro e a auditoria leem essas observações. Frases técnicas claras evitam idas e voltas.',
                            ]}/>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function EstoqueSolicitacoesSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-solicitacoes-tutorial-expanded"
            emoji="🛒"
            title="COMO USAR SOLICITAÇÕES DE COMPRA"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'O que é uma Solicitação de Compra (PR)',
                    body: (
                        <>
                            <div>É a <strong>autorização formal</strong> para repor estoque com compra externa. Diferente de uma simples movimentação, uma PR conecta TRÊS módulos:</div>
                            <TutorialList items={[
                                <><strong>Estoque</strong> — marca quantidade em trânsito e, ao receber, sobe saldo.</>,
                                <><strong>Contas a Pagar</strong> — uma conta tipo <em>Reposição de estoque</em> é criada na aprovação.</>,
                                <><strong>Auditoria</strong> — cada transição (criar, aprovar, receber, rejeitar) gera linha imutável.</>,
                            ]}/>
                            <TutorialHint>Saldo real do estoque <strong>nunca</strong> sobe sem passar por uma PR aprovada ou um ajuste manual com justificativa. É o trilho que garante rastreio financeiro completo.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'Os 5 estados',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Pendente de análise</strong> — criada, aguardando admin. Não afeta estoque nem financeiro ainda.</>,
                                <><strong>Aprovada (em trânsito)</strong> — admin aprovou; sistema gerou movimentação de Encomenda + conta a pagar.</>,
                                <><strong>Recebida</strong> — recebimento confirmado; saldo real do item subiu; em trânsito zerou.</>,
                                <><strong>Rejeitada</strong> — admin negou com motivo. Nenhum efeito no estoque.</>,
                                <><strong>Cancelada</strong> — solicitante cancelou antes da aprovação. Nenhum efeito.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'O que acontece na APROVAÇÃO',
                    body: (
                        <>
                            <div>Tudo abaixo numa única transação atômica:</div>
                            <TutorialList items={[
                                <>① Cria <strong>conta a pagar</strong> com tipo <em>estoque_reposicao</em>, vencimento +30 dias, valor = quantidade × preço unitário.</>,
                                <>② Atualiza a PR para estado <em>Aprovada</em> e registra reviewer + nota.</>,
                                <>③ Soma a quantidade em <em>quantidadeEmTransito</em> do item (badge "EM TRÂNSITO" no card).</>,
                                <>④ Registra <strong>movimentação de Encomenda</strong> no histórico.</>,
                                <>⑤ Linha na auditoria com antes × depois.</>,
                            ]}/>
                            <TutorialHint>Se qualquer um desses passos falhar, NADA é gravado. Sua aprovação é tudo ou nada — não existe "PR meio aprovada".</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'O que acontece no RECEBIMENTO',
                    body: (
                        <>
                            <div>Existem DUAS formas de marcar uma PR como recebida:</div>
                            <TutorialList items={[
                                <><strong>Manual</strong> — botão "📦 Marcar como recebido" no card da PR aprovada.</>,
                                <><strong>Automático</strong> — quando a conta a pagar gerada é marcada como <em>paga</em> em /admin/contas-a-pagar.</>,
                            ]}/>
                            <div style={{ marginTop: 6 }}>A operação é <strong>idempotente</strong>: clicar duas vezes não duplica o saldo. Em qualquer caminho, o resultado é o mesmo:</div>
                            <TutorialList items={[
                                'Quantidade em trânsito → zera.',
                                'Saldo central do item → sobe pela quantidade da PR.',
                                'Movimentação de Reposição → registrada.',
                                'PR → estado "Recebida".',
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '5', color: '#EF4444', title: 'Aprovando e rejeitando — boas práticas',
                    body: (
                        <>
                            <TutorialList items={[
                                'Antes de aprovar, confira preço unitário (atualiza o cadastro do item) e fornecedor (vai na descrição da conta).',
                                'Ao aprovar, ESCREVA uma nota — fica visível no histórico e na conta a pagar gerada.',
                                'Ao rejeitar, EXPLIQUE o motivo (ex.: "preço acima do mercado", "fornecedor alternativo disponível"). O solicitante pode reabrir com correção.',
                                'Marque PRs URGENTES para reposições críticas (turma em andamento, EPI sem alternativa).',
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '6', color: '#06B6D4', title: 'Links cruzados úteis',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Nome do item</strong> no card → ficha completa do item.</>,
                                <><strong>"💳 Abrir conta a pagar →"</strong> em PRs aprovadas → leva direto para a conta gerada no módulo Contas a Pagar.</>,
                                <><strong>"Ver todas →"</strong> no dashboard de estoque → vem para esta página com filtro <em>Pendentes</em>.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '7', color: '#64748B', title: 'Por que justificativa de 10+ caracteres',
                    body: (
                        <>
                            <div>O backend exige <strong>mínimo 10, máximo 1000</strong> caracteres. O motivo:</div>
                            <TutorialList items={[
                                'Aparece no histórico de auditoria (rastreio).',
                                'Vai na descrição da conta a pagar (o financeiro lê).',
                                'Frases curtas como "ok" não respondem "por quê" — geram retrabalho.',
                            ]}/>
                            <div style={{ marginTop: 6 }}>Bom exemplo: <em>"Estoque mínimo atingido; ação 'Curso XYZ' começa em 15 dias e prevê consumo de 30 unidades."</em></div>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function EstoqueHistoricoSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-historico-tutorial-expanded"
            emoji="🕐"
            title="COMO USAR AUDITORIA DE ESTOQUE"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'O que é a Auditoria',
                    body: (
                        <>
                            <div>É o <strong>registro técnico imutável</strong> de TODA alteração feita no módulo de estoque, no nível de banco. Diferente de "Movimentações" (foco em saldo), aqui o foco é <strong>quem fez o quê, antes e depois</strong>.</div>
                            <TutorialHint>Existem operações que aparecem SÓ aqui (ex.: cadastro/edição/exclusão de item, criação de categoria customizada, aprovação de PR). Por isso a auditoria é a fonte definitiva.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'Tipos de eventos registrados',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Itens:</strong> criação, edição, desativação, reativação.</>,
                                <><strong>Categorias:</strong> criação de categoria customizada, desativação.</>,
                                <><strong>Movimentações:</strong> qualquer entrada, saída, ajuste, perda, devolução, transferência.</>,
                                <><strong>Solicitações de Compra:</strong> criação, aprovação, rejeição, cancelamento, recebimento.</>,
                                <><strong>Baixas por ação:</strong> consumo em lote, tratamento de sobra, conclusão de ação.</>,
                                <><strong>Reservas em ações (kit):</strong> adição/remoção de item ao kit, alteração de prioridade.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'Como ler uma linha',
                    body: (
                        <>
                            <div>Cada linha mostra:</div>
                            <TutorialList items={[
                                <><strong>Data/hora exata</strong> da alteração.</>,
                                <><strong>Usuário + perfil</strong> que fez (Administrador, Coordenador, Motorista…).</>,
                                <><strong>Tipo de evento</strong> (criação, edição, exclusão…).</>,
                                <><strong>Tabela/área afetada</strong> (item, movimentação, solicitação…).</>,
                                <><strong>Antes × Depois</strong> dos campos relevantes — sob o botão "Ver detalhes".</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'Filtros para investigação',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Por usuário</strong> — "tudo o que o operador X fez no estoque".</>,
                                <><strong>Por item</strong> — "histórico completo de mudanças do item Y" (cole o ID a partir da ficha do item).</>,
                                <><strong>Por tipo de evento</strong> — "todas as desativações de itens em maio".</>,
                                <><strong>Por período</strong> — recorte temporal para fechamentos mensais.</>,
                                <><strong>Por registro (ID)</strong> — quando você quer rastrear UMA movimentação ou PR específica e ver todas as ações nela.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '5', color: '#EF4444', title: 'Casos de uso reais',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>"Por que o saldo do item caiu de 100 para 30?"</strong> → filtro item + período. Verá movimentações + edições no campo quantidade.</>,
                                <><strong>"Quem aprovou aquela PR cara?"</strong> → filtro tipo = aprovação PR. Verá reviewer + nota + valor.</>,
                                <><strong>"Esse item foi alterado depois da ação?"</strong> → filtro item + data ≥ data da ação. Mostra qualquer edição posterior.</>,
                                <><strong>Fechamento mensal contábil</strong> → filtro período = mês passado. Exporte se necessário.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '6', color: '#64748B', title: 'Limitações e retenção',
                    body: (
                        <>
                            <TutorialList items={[
                                'A auditoria é IMUTÁVEL — você não consegue editar nem apagar linhas. Mesmo um admin não pode.',
                                'Não há expiração automática — registros antigos permanecem indefinidamente (preservam auditoria contábil).',
                                'Logs de leitura (GET) não aparecem aqui — só alterações (POST/PUT/DELETE).',
                                'Para investigação de erros de sistema (não de uso), use logs do servidor (não esta tela).',
                            ]}/>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function EstoqueBaixaAcaoSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-estoque-baixa-acao-tutorial-expanded"
            emoji="↧"
            title="COMO USAR BAIXA POR AÇÃO"
            steps={[
                {
                    num: '1', color: '#3B82F6', title: 'Por que essa página existe',
                    body: (
                        <>
                            <div>Sem essa tela, seu estoque cresceria mas nunca cairia "corretamente". Cada ação em campo (curso, viagem, intervenção) consome material — e o consumo precisa virar movimentação <strong>SAÍDA</strong> ligada à ação para fechar o ciclo: planejei → carreguei → consumi → devolvi a sobra.</div>
                            <TutorialHint>É o equivalente do "fechamento de caixa" do estoque. Sem ele, sobras e perdas ficam invisíveis e o saldo da carreta nunca casa com o físico.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '2', color: '#F59E0B', title: 'O conceito de Reserva (kit)',
                    body: (
                        <>
                            <div>Antes da ação acontecer, ela tem um <strong>kit</strong>: lista de itens previstos para consumo, por carreta. Cada linha do kit é uma <em>Reserva</em> com:</div>
                            <TutorialList items={[
                                <><strong>stockItemId</strong> — qual item.</>,
                                <><strong>truckId</strong> — qual carreta vai levar (ou origem do consumo).</>,
                                <><strong>quantidadePrevista</strong> — quanto a equipe acha que vai usar.</>,
                                <><strong>prioridade</strong> — alta / média / baixa (ajuda a equipe a decidir o que carregar primeiro se faltar espaço).</>,
                            ]}/>
                            <div style={{ marginTop: 6 }}>O kit é montado na ação (aba "Kit de Insumos"). Essa página parte do kit já existente.</div>
                        </>
                    ),
                },
                {
                    num: '3', color: '#10B981', title: 'Cards de ação na lista',
                    body: (
                        <>
                            <div>Cada card mostra:</div>
                            <TutorialList items={[
                                <><strong>Nome e status da ação</strong>.</>,
                                <><strong>🚛 Carreta vinculada</strong> (clicável → ficha da carreta).</>,
                                <><strong>Cobertura X / Y</strong> — quantos itens já foram consumidos × quantos previstos.</>,
                                <><strong>Barra de progresso</strong> — cor cinza = não começou, azul = parcial, verde = 100%+.</>,
                                <><strong>⚠ Sobra</strong> — quando há reserva com consumo &lt; previsão (precisa decidir o destino).</>,
                                <><strong>↧ Dar baixa</strong> → vai direto pra aba "Baixa de Estoque" da ação. <strong>Detalhes</strong> → aba "Visão Geral".</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '4', color: '#8B5CF6', title: 'Operações disponíveis dentro da ação',
                    body: (
                        <>
                            <TutorialList items={[
                                <><strong>Baixa em lote</strong> — selecione vários itens da reserva e registre a quantidade consumida em cada um. Vai gerar UMA transação atômica com várias movimentações SAÍDA.</>,
                                <><strong>Baixa item-a-item</strong> — útil quando o consumo é pontual ao longo do tempo.</>,
                                <><strong>Adicionar item fora do kit</strong> — consumiu algo que não estava planejado? Adicione ao registro com observação. Vai gerar SAÍDA marcada como "fora do kit".</>,
                                <><strong>Tratar sobra</strong> — para cada item com sobra: <em>Devolver à central</em> (gera DEVOLUÇÃO) ou <em>Manter na carreta</em> (gera AJUSTE com observação).</>,
                                <><strong>Concluir ação</strong> — quando tudo está tratado, o sistema valida sobras pendentes e marca a ação como concluída.</>,
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '5', color: '#EF4444', title: 'Regras de saldo',
                    body: (
                        <>
                            <TutorialList items={[
                                'A baixa SEMPRE consome saldo da CARRETA (não da central). Se a carreta não tem saldo suficiente, o sistema rejeita.',
                                'Devolução de sobra: aumenta central, diminui carreta.',
                                'Manter sobra na carreta: gera AJUSTE com observação ("ação X encerrada, item ficou na carreta para próxima ação").',
                                'Consumo fora do kit também sai da carreta — se for da central, transferir primeiro (movimentação ENTRADA).',
                            ]}/>
                            <TutorialHint>Quem registra a baixa precisa ser ADMIN, COORDINATOR ou DRIVER. Todos os perfis veem o histórico depois.</TutorialHint>
                        </>
                    ),
                },
                {
                    num: '6', color: '#06B6D4', title: 'Auditoria e rastreio',
                    body: (
                        <>
                            <TutorialList items={[
                                'Toda baixa gera movimentação SAÍDA com acaoId = ação atual.',
                                'Cada SAÍDA gera linha na Auditoria com antes × depois.',
                                'O total consumido fica visível na ficha da ação e na ficha do item (aba "Reservas em ações").',
                                'Se você precisar reverter uma baixa errada, registre uma movimentação inversa (Devolução ou Ajuste) com justificativa — NUNCA edita ou apaga.',
                            ]}/>
                        </>
                    ),
                },
                {
                    num: '7', color: '#64748B', title: 'Filtros e fluxo recomendado',
                    body: (
                        <>
                            <TutorialList items={[
                                'Aba "Em andamento" → trabalho do dia (ações ativas).',
                                'Aba "Concluídas" → fechamento e auditoria.',
                                'Filtros por carreta, cidade, período da ação.',
                                'Fluxo recomendado: ao chegar do campo → baixa em lote → tratar sobra → concluir ação no mesmo dia (evita esquecer detalhes).',
                            ]}/>
                        </>
                    ),
                },
            ]}
        />
    );
}

export function ConfiguracoesSidebarTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="admin-configuracoes-tutorial-expanded"
            emoji="⚙️"
            title="COMO USAR CONFIGURAÇÕES"
            steps={[
                { num: '1', color: '#3B82F6', title: 'Abas', body: 'Navegue por separadores (perfil, notificações, segurança, sistema) — cada um persiste dados diferentes.' },
                { num: '2', color: '#F59E0B', title: 'Operacional', body: 'Cidades e UF disponíveis alimentam o dashboard e restrições geográficas; altere com impacto consciente.' },
                { num: '3', color: '#10B981', title: 'Segurança e 2FA', body: 'Active Google Authenticator para contas administrativas; desactive apenas com código válido.' },
                { num: '4', color: '#8B5CF6', title: 'E-mail, ficheiros e certificados', body: 'Nesta área configuram-se envio de notificações por e-mail, armazenamento de anexos e opções ligadas aos certificados. Alterações sensíveis devem ser alinhadas com a equipa técnica antes de usar em produção.' },
                { num: '5', color: '#64748B', title: 'Backup e sessões', body: 'Opções avançadas de cópia de segurança e tempo de sessão afectam toda a organização — confirme com quem gere o sistema antes de alterar.' },
            ]}
        />
    );
}
