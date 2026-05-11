'use client';

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
