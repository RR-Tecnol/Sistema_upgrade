
SISTEMA UPGRADE    RR TECNOL  ·  Auditoria VPS
Relatório de Testes — VPS Upgrade
7 itens adicionais identificados em produção · 18/05/2026
Resumo executivo — visão geral dos 7 itens
ID
Severidade
Resumo
BUG-09
ALTO
Reembolsos do motorista renderiza centralizado em vez de tela cheia (regressão na VPS)
MEL-10
MÉDIO
Criar Viagem manual bloqueado por validação de coordenadas — propor vínculo automático via Período de Curso
BUG-11
ALTO
Registrar Manutenção sem seletor de carreta — conflito se motorista tiver 2 vínculos
MEL-12
MÉDIO
Edição do Período de Curso não cobre todos os campos do cadastro original
BUG-13
ALTO
Aba &apos;Módulos do curso&apos; em Gerenciar Turmas aparece vazia mesmo com curso vinculado
BUG-14
MÉDIO
Contas a Pagar mostra &apos;Funcionário / RH / reembolso&apos; em vez do tipo real (motorista/professor)
BUG-15
ALTO
Pré-carregar Feriados Nacionais/Estaduais só funciona com turma ativa — lógica invertida
Continuação da numeração da auditoria v2 (itens 09 a 15). Itens marcados como &apos;verificar arquivo&apos; indicam pontos onde o código real precisa ser inspecionado via MCP — esta documentação aponta a direção, sem inventar caminhos exatos.

MEL-10 — Criar Viagem bloqueado · proposta de automação via Período de Curso
MEL-10
MÉDIO
Form de criação manual exige validação de coordenadas/CEP que hoje não passa. Proposta: gerar viagem automaticamente a partir do Período de Curso.
Módulo: Admin · Solicitações de Viagem · Criar Viagem Manual
O que está acontecendo
Hoje a vinculação motorista ↔ carreta ↔ viagem é feita via &apos;Solicitações de Viagem&apos;. O fluxo está correto, mas a criação manual exige validação de coordenadas que depende da implementação das APIs de localização (paga + gratuita) ainda pendente. Como consequência: a tela de &apos;Criar Viagem Manual&apos; não permite salvar — aparece o aviso &apos;CEP encontrado, mas não foi possível validar coordenadas automáticas. Não será permitido salvar rota até corrigir o CEP.&apos;

Tela &apos;Criar Viagem Manual&apos; com aviso de validação de coordenadas. Origem Caxias/MA → São Luís/MA, 19/05 → 16/06/2026.
Proposta de solução (Ronaldo)
Reaproveitar os dados que já existem em Período de Curso + Turmas + Cursos para gerar a viagem automaticamente, sem depender de &apos;Solicitações de Viagem&apos;:
Ao vincular o motorista a um Período de Curso, vinculá-lo automaticamente à carreta referente desse período.
No perfil do motorista, exibir: carreta vinculada, curso, dia de ida e volta, horários de ida e saída (dados que já existem em Turmas e Período de Curso).
A viagem continua acontecendo — só que pegando dados já existentes em 3 áreas do sistema (Turmas, Período de Curso, Cursos) em vez de exigir cadastro manual.
Mantém o ecossistema funcional sem depender de &apos;Solicitações de Viagem&apos; enquanto a integração com APIs de localização não for concluída.
Onde corrigir
Backend: serviço de vinculação de motorista — propagar carreta do Período de Curso (verificar em backend/src/motoristas/... e backend/src/periodos/...).
Backend: serviço de viagens — adicionar leitor que monta a viagem a partir de Period + Class + Course (verificar em backend/src/viagens/... ou backend/src/trips/...).
Frontend portal motorista: card &apos;Minhas Viagens&apos; deve consumir o endpoint novo (verificar em frontend/app/motorista/...).

BUG-09 — Reembolsos do motorista renderiza centralizado
BUG-09
ALTO
Conteúdo ocupa só o meio da tela em vez de tela cheia. Regressão: erro já havia sido corrigido localmente e retornou na VPS.
Módulo: Portal do Motorista · Reembolsos · Listagem
O que está acontecendo
Na listagem de Reembolsos do perfil do motorista, o card &apos;Alimentação · R$ 50,00 · FOME&apos; e os tabs &apos;PENDENTES/APROVADOS/REJEITADOS&apos; aparecem centralizados ocupando apenas a região central da tela, deixando grande área lateral vazia. Em localhost o layout já havia sido ajustado para tela cheia, mas ao subir para VPS a versão antiga voltou a aparecer.

Listagem de Reembolsos · perfil Motorista: card e tabs concentrados no centro da viewport, com laterais vazias.
Possíveis causas
Build da VPS está rodando uma versão anterior do componente (cache de build, pasta .next não regenerada, ou commit local não foi pushado antes do deploy).
Container/wrapper do reembolso do motorista herdou max-width ou margin: 0 auto de um container pai genérico do portal.
Branch da VPS divergiu da branch local — fix do layout está só no repositório local.
Como confirmar e corrigir
1. Confirmar se o último commit do fix está no remoto e na branch que a VPS usa:
# em localhost
git log --oneline -- frontend/app/motorista/reembolsos/
git status
git push origin &lt;branch&gt;
 
# na VPS
git log --oneline -- frontend/app/motorista/reembolsos/
git pull &amp;&amp; npm run build &amp;&amp; pm2 restart frontend  # ou systemctl
2. Comparar o componente entre local e VPS (verificar em frontend/app/motorista/reembolsos/page.tsx ou similar) — procurar wrapper com max-width fixo, margin: 0 auto, ou className compartilhado com outro layout.
3. Validar visualmente na VPS após rebuild — o layout deve preencher 100% da largura útil (descontada a sidebar).

BUG-11 — Registrar Manutenção sem seletor de carreta
BUG-11
ALTO
Modal de manutenção não permite escolher a carreta. Conflito se o motorista tiver 2 ou mais carretas vinculadas.
Módulo: Portal do Motorista · Registrar Manutenção
O que está acontecendo
O modal &apos;Registrar Manutenção&apos; contém os campos Tipo, Prioridade, Descrição, KM Atual e Custo — mas não tem um seletor de carreta. Se o motorista estiver vinculado a 2 carretas, o registro vai para a carreta errada (ou tenta deduzir e falha — print mostra mensagem &apos;Erro ao registrar. Tente novamente.&apos;).

Modal &apos;Registrar Manutenção&apos;: KM 232 / Custo R$ 32. Erro &apos;Erro ao registrar. Tente novamente.&apos; visível no topo. Sem campo de carreta.
Como deve ficar
Adicionar um dropdown &apos;Carreta&apos; no topo do modal, populado com as carretas vinculadas ao motorista logado.
Se o motorista tiver apenas 1 carreta vinculada, o dropdown pode vir pré-selecionado e desabilitado (ou ocultado), mas o ID da carreta deve ser sempre enviado ao backend.
Backend deve rejeitar registros sem truckId/vehicleId explícito (validation no DTO).
Onde corrigir
Frontend: componente do modal &apos;Registrar Manutenção&apos; no portal do motorista (verificar em frontend/app/motorista/manutencao/... ou frontend/components/motorista/...).
Backend: DTO da maintenance/manutenção — tornar truckId obrigatório (verificar em backend/src/maintenance/... ou backend/src/manutencao/...).
Prisma: confirmar que a tabela de manutenção tem FK obrigatória para Truck (não nullable).

MEL-12 — Edição do Período de Curso incompleta
MEL-12
MÉDIO
Tela de edição não cobre todos os campos do cadastro original — só algumas informações são editáveis.
Módulo: Admin · Período de Curso · Editar
O que está acontecendo
Ao editar um Período de Curso já existente (no exemplo: &apos;Curso Upgrade Qualifica TI&apos;), o modal exibe campos como Nome, Distância (km), Combustível (R$/L), Autonomia (km/L), Local Físico, CEP, Latitude/Longitude e mapa — mas não cobre todos os campos que existem no cadastro original (Curso Base, Status, inscrições online, Grupo, Carreta, Data de início/fim, Cidade, etc., presentes no modal &apos;Novo Período de Curso&apos; já documentado na auditoria v2).

Edição do Período de Curso: aba &apos;Informações Básicas&apos; aberta. Faltam campos presentes no cadastro original (Curso Base, Cidade, Grupo, Carreta, Datas, Status, etc.).
Como deve ficar
A tela de edição deve ter paridade com a tela de criação (&apos;Novo Período de Curso&apos;): todos os campos editáveis na criação devem ser editáveis na edição.
Exceções (se houver) devem ser explícitas — ex: campos imutáveis após criação como ID/protocolo. Hoje a omissão parece não-intencional.
Onde corrigir
Frontend: comparar o componente de criação com o de edição do Período de Curso. Provavelmente compartilham um form base que está sendo renderizado parcialmente no modo edit.
Verificar em frontend/app/admin/periodos-de-curso/... (ou nome equivalente) e checar se há condicional do tipo isEdit ? &lt;FormParcial /&gt; : &lt;FormCompleto /&gt;.

BUG-13 — &apos;Módulos do curso&apos; vazio em Gerenciar Turmas
BUG-13
ALTO
Aba &apos;Módulos do curso&apos; mostra &apos;(0) Nenhum módulo estruturado vinculado&apos; mesmo quando o curso vinculado à turma tem módulos cadastrados.
Módulo: Admin · Turmas · Gerenciar Turmas → Módulos do curso
O que está acontecendo
Dentro de &apos;Gerenciar Turmas&apos;, o bloco &apos;MÓDULOS DO CURSO (0)&apos; aparece com a mensagem &apos;Nenhum módulo estruturado vinculado&apos; — mas o curso referenciado por essa turma tem módulos cadastrados na tela de Cursos. Há falta de comunicação entre as duas abas: a turma não está lendo os módulos do curso pai.

Bloco &apos;MÓDULOS DO CURSO (0) — Nenhum módulo estruturado vinculado&apos;, exibido em Gerenciar Turmas mesmo com módulos existentes no curso pai.
Possíveis causas
Frontend da turma está consultando o endpoint de módulos sem incluir o courseId (ou usando turmaId no lugar de courseId).
Backend tem dois endpoints distintos (módulos por curso vs módulos por turma) e o frontend está chamando o errado.
Relação Prisma Class ↔ CourseModule não está sendo eager-loaded no service da turma (faltando include: { course: { include: { modules: true } } }).
Como confirmar e corrigir
1. Abrir DevTools → Network ao entrar na tela de Gerenciar Turmas. Identificar a request que busca os módulos. Verificar:
Qual ID foi enviado (turmaId ou courseId)?
Qual foi a resposta do backend? Array vazio ou erro?
2. Conferir o service de turmas no backend (verificar em backend/src/turmas/... ou backend/src/classes/...) e garantir o include do course.modules.
3. Conferir o componente de Gerenciar Turmas no frontend (verificar em frontend/app/admin/turmas/... ) e garantir que está usando o courseId da turma para buscar os módulos.

BUG-14 — Contas a Pagar exibe tipo genérico em vez do tipo real
BUG-14
MÉDIO
Campo &apos;TIPO DE CONTA&apos; e badge do header mostram &apos;Funcionário / RH / reembolso&apos; (texto fixo) em vez de exibir &apos;Motorista&apos;, &apos;Professor&apos; ou o tipo cadastrado.
Módulo: Admin · Contas a Pagar · Detalhe do registro
O que está acontecendo
Ao abrir o detalhe de um Reembolso de Despesas em Contas a Pagar, tanto a badge no topo quanto o campo &apos;TIPO DE CONTA&apos; do Resumo Financeiro exibem a string &apos;Funcionário / RH / reembolso&apos; — um placeholder fixo. O dado real (motorista / professor / outro perfil) já existe no cadastro do funcionário, mas não é exibido aqui.

Detalhe da conta a pagar: &apos;Funcionário / RH / reembolso&apos; aparece tanto na badge do header (sob o nome &apos;DAVI RHUAN DA SILVA — FOME&apos;) quanto no campo TIPO DE CONTA.
Como deve ficar
O campo &apos;TIPO DE CONTA&apos; deve refletir o perfil do funcionário origem (ex: &apos;Motorista&apos;, &apos;Professor&apos;, etc.) — informação já cadastrada em Employee/User.
A badge do header pode manter um identificador semântico (&apos;Reembolso · Motorista&apos;) desde que use o tipo real.
Onde corrigir
Backend: serviço de Contas a Pagar — incluir join com Employee/User e expor o perfil do funcionário no DTO de resposta (verificar em backend/src/contas-pagar/... ou backend/src/financeiro/...).
Frontend: componente de detalhe — substituir a string fixa pelo campo dinâmico vindo da API (verificar em frontend/app/admin/contas-pagar/... ou similar).

BUG-15 — Pré-carregar Feriados só funciona com turma ativa
BUG-15
ALTO
Botões &apos;Pré-carregar 26 Feriados Nacionais&apos; e &apos;Pré-carregar Feriados Estaduais&apos; não funcionam sem turma ativa — lógica invertida.
Módulo: Admin · Feriados · Botões de pré-carregar
O que está acontecendo
Na tela de Feriados, os dois botões de pré-carga (&apos;26 Feriados Nacionais 2025/2026&apos; e &apos;Feriados Estaduais (UF da turma) 2026/2027&apos;) exigem que exista uma turma ativa para funcionar. A lógica correta é inversa: os feriados precisam estar carregados ANTES, para que as turmas possam consultá-los e ajustar o calendário letivo.

Tela Feriados: cards &apos;Feriado Nacional&apos;, &apos;Feriado Local&apos;, &apos;Imprevisto Climático&apos;, &apos;Outro Imprevisto&apos; e &apos;NENHUMA OCORRÊNCIA REGISTRADA&apos;. Botões de pré-carga inativos sem turma.
Comportamento desejado (Ronaldo)
Os botões de pré-carregar feriados (nacionais e estaduais) devem funcionar independente de turma ativa — feriados são dado global do sistema.
As turmas é que consultam a tabela de feriados ao computar o calendário letivo, conforme a Política de Fins de Semana escolhida no curso.
Quando uma data tem feriado e a política exige cobrir a carga horária prevista, o sistema deve estender automaticamente o calendário (avançar mais um dia útil ou um final de semana — depende da opção escolhida no cadastro do curso).

Referência: opções de &apos;Política de Fins de Semana&apos; no cadastro de curso — define como o sistema reage a feriados e fins de semana.
Onde corrigir
Frontend: remover o guard que desabilita os botões quando não há turma ativa (verificar em frontend/app/admin/feriados/... ).
Backend: confirmar que o endpoint de seed de feriados não exige classId no payload (verificar em backend/src/feriados/... ou backend/src/holidays/...). Se exigir, tornar opcional para esses dois fluxos.
Service de cálculo de calendário letivo: garantir que lê a tabela de feriados global e aplica a Política de Fins de Semana do curso para estender o período de aulas quando necessário.

Próximos passos
Priorizar BUG-09, BUG-11, BUG-13 e BUG-15 (alto): afetam fluxos operacionais do motorista e admin diretamente.
BUG-14 (médio) é UX/clareza para o financeiro — pode entrar junto da próxima sprint de Contas a Pagar.
MEL-10 (criar viagem automática) requer alinhamento de produto com Robert antes de implementar — depende de decisão sobre o futuro de &apos;Solicitações de Viagem&apos;.
MEL-12 (paridade do form de edição) é refactor frontend — risco baixo, ganho de consistência.
Toda correção segue as regras: zero commits sem aprovação, npx tsc --noEmit zero erros, validação visual antes de commitar.
Sistema Upgrade  |  RR TECNOL  |  Auditoria VPS v3.0  |  18/05/2026
