FEEDBACK DO DAVI:

"
AUDITORIA DE ERROS

PORTAL DO ALUNO:

1 - ERRO NO BOTÃO DO SIDEBAR
2 - INCRIÇÕES DEVE APARECER O OUTROS CURSOS PARA ELE PODER SE CADASTRAR(SUGESTÃO) 
3 - REFORMULAR O CALÉNDARIO PARA TER UM VISUAL MAIS ADEQUADO E BONITO
4 - CALÉNDARIO DEVE TER FILTRO POR CURSO
5 - AO CLICAR NO CARD DO CALENDARIO MOSTRAR AS INFORMAÇÕES DO CURSO NO DIA
6 - INCRIÇÕES TA SEM A FUNÇÃO DO BOTÃO 
7 - REFORMULAR O FUNDO DO QR CODE PARA COBRIR A OPACIDADE NA TELA TODA. 
8 - IMPREVISTO SEM ANIMAÇÕES
9 - CONFIGURAÇÕES NÃO ESTÁ SALVANDO DADOS
10 - CONFIGURAÇÕES NÃO ESTÁ SALVANDO DADOS

PROTAL DO PROFESSOR: 

1 - REGISTRAR PONTO NÃO APARECE EM HISTORICO E NÃO ESPECIFICA QUAL TURMA ELE QUER FAZER O REGISTRO DE PONTO.
2 - NA DESCRIÇÃO REGISTRO DE PONTO INVES DE TA COM NOME DO USUARIO ESTÁ COMO PADRÃO O NOME 
"Registro de Ponto
Professor: João da Silva (Teste)"
3 - AO ENVIAR SOLICITAÇÃO DE REEMBOLSO ELA NÃO APARECE NO HISTORICO.
4 - NOTIFICAÇÕES NÃO ESTÃO TOTALMENTE RESPONSIVAS A AÇÕES DO USÚARIO E ESTÁ FALTANDO CONECTIVIDADE COM O ADM PARA ELE RECEBER NOTIFICAÇÕES PARA ELE ( EX: PROFESSOR SOLICITA REEMBOLSO, APARECE PARA O ADM )
5 - CONFIGURAÇÕES NÃO ESTÁ SALVANDO DADOS 
6 - PADRONIZAR MODELO DO REEMBOLSO PARA FICAR IGUAL A DO MOTORISTAS NOS PERFIS DE ALUNO E PROFESSOR.
7 - o estado da frequência tem que ser salvo após apertar no botão de salvar, pois ele está popr padrão sempre presente e não para refletir o estado atual. 	

PORTAL DO MOTORISTA:

1 - DASHBOARD DISTINTO DO PERFIL ALUNO E PROFESSOR, PADRONIZAR PARA FICAR IGUAL AO DO ALUNO E DO PROFESSOR. 
2 - EM VALOR DA PARA DIGITAR LETRA NO REEMBOLSO,
3 - REEMBOLSO E MANUTENÇÃO FALTA CENTRALIZAR A SOLICITAÇÃO DE REEMBOLSO PARA FICAR ESTATICA NO MEIO DA TELA, INVES DE FICAR NO MEIO DA PAGINA
4 - MANUTENÇÃO TEM ERRO DE UTF-8 
5 - IMPREVISTOS FALTA COBRIR A OPACIDADE NA TELA TODA, FALTA TAMBÉM APLICAR O CRUD, NO CASO O BOTÃO DE INATIVAR OU APAGAR A SOLICITAÇÃO DE IMPREVISTO.
6 - EM AUTENTICAÇÃO DE 2 FATORES FALTA AJEITAR A MANEIRA QUE O QR CODE TA FORMATADO E COMO ELE APARECE NA TELA. 
7 - CONFIGURAÇÕES NÃO ESTÁ SALVANDO DADOS
8 - REGISTRAR MANUALMENTE CADA OPÇÃO DO SISTEMA PARA VERIFICAR A FUNCIONALIDADE DELE NO TOTAL


PORTAL DO ADMINISTRADOR:

1 - ROTAS % BI NÃO FUNCIONA
2 - DENTRO DE CURSOS / ASSISTENTE ADMINISTRATIVO AO CLICAR EM TURMAS VINCULADAS NA OPÇÃO DE VER DA ERRO "Algo deu errado
Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte." "Unhandled Runtime Error
TypeError: enrollments.map is not a function

Source
app\admin\turmas\[id]\page.tsx (252:46) @ map

  250 |                             </thead>
  251 |                             <tbody>
> 252 |                                 {enrollments.map((enr: any) => {
      |                                              ^
  253 |                                     const rate = enr.attendanceRate ?? null;
  254 |                                     const statusColors: Record<string, string> = {
  255 |                                         ENROLLED:'#059669', PENDING:'#D97706', CANCELLED:'#DC2626',"
3 - EM TURMAS NÃO DA PRA EDITAR UM CURSO, DA ERRO
"

12 of 12 errors
Next.js (14.2.35) is outdated (learn more)

Unhandled Runtime Error
TypeError: enrollments.map is not a function

Source
app\admin\turmas\[id]\page.tsx (252:46) @ map

  250 |                             </thead>
  251 |                             <tbody>
> 252 |                                 {enrollments.map((enr: any) => {
      |                                              ^
  253 |                                     const rate = enr.attendanceRate ?? null;
  254 |                                     const statusColors: Record<string, string> = {
  255 |                                         ENROLLED:'#059669', PENDING:'#D97706', CANCELLED:'#DC2626'," 
4 - EM INSCRIÇÕES ESTÁ COM BUGG com erro na movimentação dos cards, APROVAR E REIJEITAR. 
5 - ERRO NO " NOME COMPLETO " ao salvar todo cadastro do aluno. 
6 - FREQUENCIA PADRONIZAR PARA TER APENAS 2 QUADRADOS INVES DE CLICAR NA TELA 1 VEZ PARA APROVAR 2 VEZES PRA REPROVAR E 3 VEZES PARA RESETAR. 
7 - SALVAR FREQUENCIA NÃO SALVA REALMENTE A FREQUENCIA POR DIA, OS DADOS FICAM OS MESMOS IDEPENDENTE DO DIA QUE COLOCA.
8 - erro no cadastro das carretas
"✕
Erro ao cadastrar
Internal server error" 
9 - em funcionários, novo funcionário está com texto centralizado no meio da pagina.colocar ele para ficar estático no meio da tela 
10 - Em funcionários, nos cards em ver detalhes direciona a pessoa para baixo enquanto o conteúdo fica acima
11 - editar e botão de excluir funcionário o card está centralizado no meio da pagina e não estático no meio da tela
12 - ao apagar um feriado teria que aparecer o motivo do apagamento. 
13 - CRUD nos imprevistos, para caso ele de penalidade a alguém e por algum motivo decide voltar atrás ou ele valide alguém errado conseguir desvalidar. 
14 - em reembolsos está faltado UTF-8
15 - faltando também a aba de excluídos em contas a pagar para poder reverter caso uma conta seja apagada sozinha. 
16 - criar um desing melhor em excel em contas a pagar 
17 - desenvolver e melhorar a área de histórico de atividades que engloba as atividades de todos os usuários.


GERAL(TODOS OS PERFIS TEM QUE TER)
1 - notificações relacionadas ao uso do perfil, exemplo, professor coloca que felipe barbosa Duarte está como faltante e salva a frequência, isso deve aparecer para o perfil do felipe, para o ADM e so que do adm vai contabilizar ele como faltante ( pois eu estava pensando em colocar turma X, falto Y pessoas, teve z de alunos presentes) ou um professor teve um imprevisto e cadastrou na área dele de imprevistos que vai faltar no dia tal, dai o ADM vai receber a notificação.

2 - em frequência do professor ela está certíssima, ta linda ela, falta so ter um filtro para caso o professor de 2 aulas em 2 turmas diferentes o mesmo padrão que tem no professor para frequência deve aparecer para o ADM, so que ele é bem mais abrangente, por exemplo a frequência dele vai ser para os funcionários, diferente do professor que é pros alunos.

3 - tutorial assistido, implementar um ícone de ? em cada página e que ao ser clicado ele explicará cada parte da página que ele esta, deixando a tela opaca aonde ele não está explicando, a explicação vem através de um balão que está apontado para aonde ele estará explicando. 

4 - fechamento de um cadastro deve guardar as informações mais recentes anotadas durante a sessão, resetando so quando usario sai da sua área de perfil."