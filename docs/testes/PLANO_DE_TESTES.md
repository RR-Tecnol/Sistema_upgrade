# 📋 PLANO DE TESTES — Sistema Upgrade
## Versão 1.0 | 27/03/2026 | RR TECNOL / Qualifica MA/PI/AC
## Cobertura: Funcional · Fluxos Interconectados · Notificações · Sessão · Segurança

> **Como usar este documento:**
> Execute cada teste em ordem. Marque ✅ PASS ou ❌ FAIL com observação.
> Todo FAIL gera bug report no ERROS_E_SOLUCOES.md antes de avançar.
> Testes de cibersegurança ficam no final — executar somente após todos funcionais passarem.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Ler antes de executar qualquer teste:**
> - [`sobre-sistema.md §7`](../arquitetura/sobre-sistema.md) — fluxos por perfil (o que cada portal deve fazer)
> - [`ESTADO_SISTEMA.md`](../arquitetura/ESTADO_SISTEMA.md) — o que está implementado e funcionando hoje
> - [`seguranca/README.md`](../seguranca/README.md) — postura atual de segurança
> - [`seguranca/MR_ROBOT_MENTALIDADE.md`](../seguranca/MR_ROBOT_MENTALIDADE.md) — checklist do MÓDULO 12
>
> **Registrar TODOS os FAILs em:**
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — com causa raiz + solução + prevenção
>
> **Credenciais para os testes (ver pré-requisitos):**
> Mesmas do [`SEEDS_GUIDE.md`](../SEEDS_GUIDE.md) e [`ONBOARDING.md`](../ONBOARDING.md)

---

## 🏗️ PRÉ-REQUISITOS DE AMBIENTE

```powershell
docker-compose up -d
cd backend; Remove-Item Env:PORT -ErrorAction SilentlyContinue; npm run start:dev
cd frontend; npm run dev
npx tsx prisma/seed-full.ts   # apenas no primeiro setup
```

**Credenciais:**
| Perfil | Email | Senha |
|--------|-------|-------|
| ADMIN | admin@qualifica.com | RR@@Upgrade |
| TEACHER | maria.professora.visual@qualifica.com | RR@@Upgrade |
| DRIVER | joao.driver.test99@qualifica.com | RR@@Upgrade |
| STUDENT | aluno@qualifica.com | RR@@Upgrade |

---

## MÓDULO 1 — AUTENTICAÇÃO E SESSÃO

### T01 — Login com credenciais válidas (cada perfil)
**Pré:** Sistema em pé, banco com seed
**Passos:**
1. Acesse `/login`
2. Entre com admin@qualifica.com / RR@@Upgrade
3. Repita para TEACHER, DRIVER, STUDENT
**Esperado:**
- ADMIN → redireciona `/admin/dashboard`
- TEACHER → redireciona `/teacher/dashboard`
- DRIVER → redireciona `/driver/dashboard`
- STUDENT → redireciona `/student/dashboard`
- Header exibe nome e role corretos em cada portal
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T02 — Login com credenciais inválidas
**Passos:** Email válido + senha errada → clicar Entrar
**Esperado:** Mensagem de erro "Credenciais inválidas" — sem redirecionamento
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T03 — 2FA obrigatório para ADMIN
**Passos:** Login como admin@qualifica.com
**Esperado:** Se 2FA configurado → tela de OTP aparece antes do dashboard
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T04 — Isolamento de sessão entre abas (BUG CRÍTICO RESOLVIDO)
**Passos:**
1. Tab 1: login como ADMIN → chegar em `/admin/dashboard`
2. Tab 2: abrir nova aba → login como TEACHER → chegar em `/teacher/dashboard`
3. Voltar para Tab 1
**Esperado:**
- Tab 1 continua mostrando "Administrador / ADMIN" no header
- Tab 2 continua mostrando "Maria Professora Visual / TEACHER"
- **NÃO há mesclagem de dados entre abas**
- DevTools → Application → Session Storage → diferentes tokens por aba
- DevTools → Application → Local Storage → vazio (auth migrado para sessionStorage)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T05 — Isolamento com 4 perfis simultâneos
**Passos:** Abrir 4 abas, login como ADMIN, TEACHER, DRIVER, STUDENT em cada
**Esperado:** Cada aba exibe exclusivamente os dados do seu usuário — zero contaminação cruzada
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T06 — Logout completo
**Passos:** Login → clicar "Sair do Sistema"
**Esperado:**
- Redireciona para `/login`
- sessionStorage limpo (token, user, auth-storage removidos)
- Botão voltar do browser não recarrega a sessão anterior
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T07 — Acesso direto a rota protegida sem login
**Passos:** Sem login, acessar `/admin/dashboard` diretamente
**Esperado:** Redireciona para `/login`
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T08 — Acesso de perfil errado a portal alheio
**Passos:** Login como STUDENT, tentar acessar `/admin/dashboard` na URL
**Esperado:** Redireciona para `/login` ou nega com 403 — nunca exibe dados de admin
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T09 — Refresh (F5) mantém sessão
**Passos:** Login como qualquer usuário → F5
**Esperado:** Sessão mantida, usuário continua logado (sessionStorage sobrevive ao refresh)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 2 — PORTAL DO ADMINISTRADOR

### T10 — Dashboard com dados reais
**Passos:** Login como ADMIN → observar dashboard
**Esperado:** KPIs com números reais (cursos ativos, alunos, turmas, inscrições pendentes), gráficos carregados
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T11 — CRUD Alunos
**Passos:**
1. Ir em Alunos → clicar Novo Aluno
2. Preencher todos os campos obrigatórios
3. Salvar → verificar na lista
4. Editar o aluno criado → alterar nome → salvar
5. Desativar o aluno (soft delete)
**Esperado:** Aluno criado, editado e desativado. Aluno desativado não aparece na lista ativa.
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T12 — CRUD Cursos e Turmas
**Passos:** Criar novo curso → criar turma vinculada ao curso → verificar
**Esperado:** Curso e turma aparecem nas respectivas listagens
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T13 — Kanban de Inscrições: fluxo completo
**Passos:**
1. Ter inscrição com status PENDING
2. Arrastar card PENDING → APPROVED
3. Verificar botão "Confirmar Matrícula" aparece
4. Clicar "Confirmar Matrícula" → status vira ENROLLED
5. Tentar arrastar card ENROLLED → qualquer coluna
6. Tentar arrastar REJECTED → qualquer coluna
**Esperado:**
- Transições válidas funcionam
- ENROLLED e REJECTED: card não arrasta (`draggable=false`)
- Toast de sucesso em cada transição
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T14 — Kanban: transição inválida
**Passos:** Tentar `updateStatus` via chamada direta para transição inválida (ex: ENROLLED→PENDING via API)
**Esperado:** Backend retorna 400 + mensagem clara; frontend mostra toast de erro do servidor
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T15 — Kanban: rejeição com motivo
**Passos:** Arrastar card para coluna REJECTED
**Esperado:** Modal de motivo abre — botão "Confirmar Rejeição" desabilitado se textarea vazio
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T16 — Frequência de Alunos: registro e histórico
**Passos:**
1. Selecionar turma em andamento
2. Selecionar data de hoje
3. Marcar P/F para cada aluno
4. Salvar
5. Voltar e selecionar o mesmo dia
**Esperado:**
- Salva com sucesso (toast verde)
- Calendário marca dia com ponto colorido
- Ao reabrir o dia: estado P/F pré-carregado + banner "Editando registro existente"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T17 — Frequência de Funcionários: calendário + registro
**Passos:**
1. Ir em Freq. Funcionários
2. Verificar calendário com mês atual e dias clicáveis
3. Clicar em dia diferente do calendário
4. Marcar presença de funcionários → salvar
5. Navegar meses no calendário
**Esperado:**
- Calendário renderiza com Dom→Sáb, legenda e data selecionada
- Registro salva e calendário colore o dia
- Navegação de mês funciona
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T18 — Reembolsos: aprovação e rejeição
**Passos:**
1. Criar reembolso como TEACHER
2. No portal ADMIN → Reembolsos → aprovar
3. Criar outro → rejeitar com motivo
**Esperado:**
- TEACHER não consegue aprovar/rejeitar (403)
- ADMIN aprova: status vira APPROVED
- Notificação WS chega ao professor
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T19 — Contas a Pagar: soft delete e restauração
**Passos:**
1. Criar conta a pagar
2. Excluir (soft delete) → verificar aba "Excluídos"
3. Restaurar da aba Excluídos
**Esperado:** Conta aparece em Excluídos após exclusão; volta para lista ativa após restauração
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T20 — Configurações: salvar preferências ADMIN
**Passos:** Configurações → aba Preferências → desativar animações → salvar
**Esperado:** Toggle salva; ao recarregar a página, animações permanecem desativadas
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---


## MÓDULO 3 — PORTAL DO PROFESSOR

### T21 — Dashboard com turmas reais
**Esperado:** 3 KPIs (turmas ativas, próxima aula, reembolsos pendentes) com dados reais
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T22 — Frequência: selecionar turma e registrar
**Passos:**
1. Ir em Frequência → ver lista de turmas
2. Clicar em uma turma → calendário abre
3. Clicar em "Registrar Frequência de Hoje"
4. Marcar P/F para alunos → salvar
**Esperado:** Frequência salva, calendário do dia fica colorido, toast de sucesso
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T23 — Frequência: "Todos Presentes" e "Todos Ausentes"
**Passos:** Na tela de registro → clicar "✓ Todos Presentes" → verificar → "✕ Todos Ausentes" → verificar
**Esperado:** Todos os alunos marcados instantaneamente
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T24 — Histórico: frequências lançadas
**Passos:** Histórico → aba "Frequência de Alunos"
**Esperado:** Grupos por dia com % de presença, nome do curso, cidade; clique expande lista de alunos
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T25 — Histórico: turmas do professor
**Passos:** Histórico → aba "Minhas Turmas"
**Esperado:** Lista todas as turmas do professor (não apenas IN_PROGRESS) com status coloridos
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T26 — Meu Ponto: registrar e ver histórico
**Passos:**
1. Histórico → aba "⏱ Meu Ponto"
2. Verificar data/hora atual exibida
3. Clicar "⏱ REGISTRAR PONTO"
4. Verificar toast de sucesso + aviso "✓ Ponto registrado hoje às HH:MM"
5. Verificar entrada no histórico de pontos
**Esperado:** Check-in salvo no banco, aparece na lista com "HOJE" badge
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T27 — Reembolsos: criar com tipo correto
**Passos:** Reembolsos → novo → preencher tipo (FOOD, CLASSROOM_MATERIAL etc.) + valor + arquivo
**Esperado:** Reembolso criado com status PENDING; aparece no histórico com valor formatado
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T28 — Imprevistos: CRUD completo
**Passos:** Criar imprevisto → editar descrição → excluir (soft delete)
**Esperado:** Admin recebe notificação WS ao criar; imprevisto desaparece da lista após exclusão
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 4 — PORTAL DO ALUNO

### T29 — Dashboard com frequência real
**Esperado:** % de frequência real por turma; progresso visível
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T30 — Inscrições: ver minhas inscrições + disponíveis
**Passos:**
1. Ir em Inscrições → aba "Minhas Inscrições"
2. Verificar status de cada inscrição
3. Aba "Cursos Disponíveis"
4. Clicar "🎓 Inscrever-se" em um curso disponível
**Esperado:**
- Minhas Inscrições: lista com status coloridos
- Cursos Disponíveis: cards com vagas, datas, botão de inscrição
- Inscrição cria registro e aparece em "Minhas Inscrições" com status PENDING
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T31 — Calendário de frequência interativo
**Passos:**
1. Frequência → selecionar turma
2. Navegar meses no calendário
3. Clicar em um dia com registro
**Esperado:** Dias com presença em verde, faltas em vermelho; modal de detalhe ao clicar
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T32 — Certificado QR Code
**Passos:** Certificados → clicar em um certificado → exibir QR Code
**Esperado:** Modal abre com QR Code; body.overflow = 'hidden' ao abrir; restaurado ao fechar
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T33 — Verificação pública de certificado
**Passos:** Acessar `/cursos/verificar/[código]` sem login
**Esperado:** Página pública exibe informações do certificado sem exigir autenticação
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 5 — PORTAL DO MOTORISTA

### T34 — Dashboard: 4 KPIs corretos
**Esperado:**
- Viagens/mês: número de viagens do motorista no mês
- Km rodados: soma de km (apenas viagens com kmStart E kmEnd)
- R$ a receber: soma de reembolsos PENDING
- Imprevistos pendentes: contagem
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T35 — Viagens: iniciar e finalizar
**Passos:**
1. Dashboard → viagem planejada → "Iniciar Viagem" → informar km inicial
2. Verificar card "EM TRÂNSITO" no dashboard
3. "Cheguei ao Destino" → informar km final
4. Verificar viagem concluída
**Esperado:** Status correto em cada etapa; km calculado corretamente
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T36 — Reembolsos: criar e acompanhar status
**Passos:** Reembolsos → criar com tipo FOOD + valor + comprovante → salvar
**Esperado:** Reembolso criado; admin recebe notificação; status visível no histórico
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---


## MÓDULO 6 — FLUXOS INTERCONECTADOS (END-TO-END)

> Estes testes validam que múltiplos portais funcionam corretamente juntos.

### T37 — Fluxo completo de inscrição (STUDENT → ADMIN → STUDENT)
**Passos:**
1. [STUDENT] Inscrever-se em uma turma disponível
2. [ADMIN] Kanban → card aparece em "Pendentes"
3. [ADMIN] Aprovar inscrição → card vai para "Aprovados"
4. [STUDENT] Verificar status "APPROVED" em Minhas Inscrições
5. [ADMIN] Confirmar Matrícula → card vai para "Matriculados"
6. [STUDENT] Verificar status "ENROLLED"
**Esperado:** Cada portal reflete o estado correto em tempo real (ou após refresh)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T38 — Fluxo de frequência (TEACHER → ADMIN → STUDENT)
**Passos:**
1. [TEACHER] Registrar frequência da turma para hoje
2. [ADMIN] Frequência → selecionar a mesma turma e data → verificar dados
3. [STUDENT] Calendário de frequência → dia de hoje deve aparecer marcado
**Esperado:** Consistência dos dados em todos os 3 portais
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T39 — Fluxo de reembolso (TEACHER → ADMIN → TEACHER)
**Passos:**
1. [TEACHER] Criar reembolso R$ 45,00 tipo FOOD
2. [ADMIN] Reembolsos → ver o reembolso → Aprovar
3. [TEACHER] Histórico de reembolsos → status aparece como APPROVED
4. [TEACHER] Verificar notificação "Reembolso aprovado"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T40 — Fluxo de reembolso motorista (DRIVER → ADMIN → DRIVER)
**Passos:**
1. [DRIVER] Criar reembolso vinculado à viagem ativa
2. [ADMIN] Aprovar reembolso
3. [DRIVER] Dashboard → KPI "R$ a receber" deve atualizar
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T41 — Fluxo de imprevisto (TEACHER → ADMIN)
**Passos:**
1. [TEACHER] Registrar imprevisto: "Aula cancelada por falta de energia"
2. [ADMIN] Imprevistos → imprevisto aparece na lista
3. [ADMIN] Recebe notificação WS "Novo imprevisto registrado"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T42 — Fluxo de certificado (ADMIN → STUDENT → Público)
**Passos:**
1. [ADMIN] Certificados → aluno elegível (freq ≥ 75%) → emitir certificado
2. [STUDENT] Certificados → certificado aparece na lista
3. [STUDENT] Abrir QR Code → copiar código UPG-...
4. [Sem login] Acessar `/cursos/verificar/[código]` → verificar autenticidade
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T43 — Fluxo de período de curso (ADMIN → MOTORISTA → ADMIN)
**Passos:**
1. [ADMIN] Períodos de Curso → criar ação → vincular funcionário + carreta
2. [DRIVER] Dashboard → viagem planejada aparece
3. [DRIVER] Iniciar viagem → adicionar custo de abastecimento
4. [ADMIN] Período de Curso → resumo financeiro atualizado
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 7 — NOTIFICAÇÕES WS (TEMPO REAL)

### T44 — Notificação: nova inscrição → ADMIN
**Passos:** [STUDENT] Inscrever-se → [ADMIN] Verificar sino de notificações
**Esperado:** Badge incrementa; notificação "Nova inscrição" aparece no painel
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T45 — Notificação: reembolso solicitado → ADMIN
**Passos:** [TEACHER] Criar reembolso → [ADMIN] Verificar notificação
**Esperado:** Notificação "Reembolso solicitado: R$ X,XX por [nome]"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T46 — Notificação: reembolso revisado → TEACHER
**Passos:** [ADMIN] Aprovar/Rejeitar reembolso do professor → [TEACHER] Verificar
**Esperado:** Professor recebe "Reembolso aprovado ✓" ou "Reembolso rejeitado ✗"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T47 — Notificação: imprevisto cadastrado → ADMIN
**Passos:** [STUDENT/DRIVER] Criar imprevisto → [ADMIN] Verificar
**Esperado:** Notificação "Novo imprevisto registrado por [nome]"
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T48 — Notificação: custo excessivo → ADMIN
**Passos:** [ADMIN] Adicionar custo real acima do percentual configurado na ação
**Esperado:** Notificação "⚠️ Custo da rota acima do estimado" aparece para o admin
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T49 — Histórico de notificações persiste após reload
**Passos:**
1. Receber 3 notificações
2. Recarregar a página (F5)
3. Verificar sino
**Esperado:** Notificações históricas recarregadas do banco (GET /notifications ao montar)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T50 — Marcar todas como lidas
**Passos:** Abrir painel de notificações → clicar "Marcar todas lidas"
**Esperado:** Badge some; todas as notificações mostram como lidas
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 8 — PREFERÊNCIAS E CONFIGURAÇÕES

### T51 — Alterar nome (4 portais)
**Passos:** Configurações → Meu Perfil → alterar nome → Salvar Alterações
**Esperado:** Nome atualizado no header e no card de perfil; persiste após reload
**Resultado (Admin):** ☐ PASS ☐ FAIL | Obs:
**Resultado (Teacher):** ☐ PASS ☐ FAIL | Obs:
**Resultado (Student):** ☐ PASS ☐ FAIL | Obs:
**Resultado (Driver):** ☐ PASS ☐ FAIL | Obs:

### T52 — Preferências de notificação
**Passos:** Configurações → Notificações → desativar "Notificações de Certificado" → salvar → reload
**Esperado:** Toggle desativado persiste após reload
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T53 — Toggle de animações
**Passos:** Configurações → Preferências → desativar animações → salvar → navegar no portal
**Esperado:**
- `body.no-animations` class adicionada ao DOM
- Animações `.animate-fade-in` e transições CSS desativadas
- Persiste entre navegação dentro do mesmo portal
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T54 — Foto de perfil: upload
**Passos:** Configurações → Adicionar foto → selecionar imagem ≤ 2MB
**Esperado:** Preview exibido; foto salva no MinIO; avatar atualiza no sidebar
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---


## MÓDULO 9 — ONBOARDING E UX

### T55 — Tutorial assistido: primeira visita
**Passos:** Login com usuário que nunca viu o tutorial → observar
**Esperado:** Tutorial abre automaticamente na 1ª visita com steps navegáveis
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T56 — Tutorial: "Não mostrar novamente"
**Passos:** Clicar "Não mostrar novamente" no tutorial → recarregar → navegar
**Esperado:** Tutorial NÃO reabre nas próximas visitas
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T57 — Tutorial: botão ? reabre
**Passos:** Botão ? (flutuante canto inferior direito) → clicar
**Esperado:** Tutorial reabre manualmente
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T58 — Responsividade: mobile (< 768px)
**Passos:** Redimensionar browser para 390px de largura → navegar em cada portal
**Esperado:**
- Sidebar some (hamburger aparece)
- Botões respeitam `min-height: 44px`
- Formulários sem zoom no iOS (font-size ≥ 16px nos inputs)
- Nenhum overflow horizontal visível
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 10 — EDGE CASES E VALIDAÇÕES

### T59 — Campo monetário: rejeita texto
**Passos:** Campo de valor em reembolsos → digitar "abc" → tentar submeter
**Esperado:** Campo `type="number"` não aceita letras; validação impede submissão
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T60 — Modal: overflow do body ao abrir/fechar
**Passos:** Abrir qualquer modal → checar que página não rola por baixo → fechar
**Esperado:** `body.overflow = 'hidden'` ao abrir; `= ''` ao fechar — scroll restaurado
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T61 — Soft delete: item desaparece da lista principal
**Passos:** Excluir qualquer entidade (aluno, conta a pagar, imprevisto) → verificar lista
**Esperado:** Item some da lista ativa imediatamente (UI atualizada sem reload)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T62 — Frequência: normalização UTC (datas corretas)
**Passos:** Registrar frequência para dia D → recarregar → verificar se ainda aparece no mesmo dia D
**Esperado:** Sem deslocamento de 1 dia por causa de timezone
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T63 — Toast de erro real ao falhar API
**Passos:** Com network throttled, tentar salvar um formulário
**Esperado:** Toast de erro com mensagem real do servidor (não "Erro desconhecido")
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T64 — Relatório PDF (admin/frequência)
**Passos:** Admin → Frequência → turma selecionada → "Gerar PDF de Frequência"
**Esperado:** Download de .pdf com dados corretos (requer Chromium instalado)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 11 — MODO MANUTENÇÃO

### T65 — Ativar modo manutenção
**Passos:** Backend .env → definir `MAINTENANCE_MODE=true` → reiniciar backend → acessar qualquer rota da API
**Esperado:** API retorna 503 com `{ maintenance: true }` → frontend redireciona para `/manutencao`
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### T66 — Bypass com chave correta
**Passos:** Header `x-maintenance-key: [MAINTENANCE_KEY do .env]` na request
**Esperado:** Bypass funciona; sem a chave correta, bypass não funciona
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## MÓDULO 12 — CIBERSEGURANÇA
## ⚠️ EXECUTAR APENAS APÓS TODOS OS MÓDULOS 1–11 PASSAREM

> Este módulo testa ameaças reais de segurança. Execute em ambiente isolado.
> Nunca executar em banco de dados de produção com dados reais.

### S01 — Autenticação: Brute Force Protection
**Passos:** Tentar 10+ logins com senha errada para o mesmo email
**Esperado:** Rate limiting ativo (429 Too Many Requests) após N tentativas configurado
**Critério de aprovação:** Bloqueio por IP ou por conta após limite configurado
**Resultado:** ☐ PASS ☐ FAIL ☐ N/A | Obs:

### S02 — JWT: Token expirado rejeitado
**Passos:** Aguardar/forçar expiração do token → tentar chamada autenticada
**Esperado:** 401 Unauthorized → frontend redireciona para /login automaticamente
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S03 — JWT: Token de outro usuário
**Passos:** Usar token JWT de TEACHER para chamar endpoint de ADMIN
**Esperado:** 403 Forbidden (RolesGuard bloqueia)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S04 — Privilege Escalation: registro com role injetada
**Passos:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hack@test.com","password":"Test1234","name":"Hacker","role":"ADMIN"}'
```
**Esperado:** Usuário criado com `role: STUDENT` — o campo role do body é ignorado
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S05 — IDOR: acessar dados de outro usuário
**Passos:**
1. Login como STUDENT com ID X
2. Tentar `GET /students/[ID_DE_OUTRO_ALUNO]` com o token do aluno X
**Esperado:** 403 Forbidden ou 404 — nunca retorna dados do outro aluno
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S06 — IDOR: professor ver frequência de turma alheia
**Passos:** Token de professor A → `GET /classes/[turma_do_professor_B]/attendance/history`
**Esperado:** 403 Forbidden (professor só acessa suas turmas)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S07 — SQL Injection via parâmetros de busca
**Passos:** Campos de busca com: `'; DROP TABLE users; --` e `' OR '1'='1`
**Esperado:** Prisma usa queries parametrizadas → nenhuma query injetada executada; erro 400 ou resultado vazio limpo
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S08 — XSS: campos de texto
**Passos:** Inserir `<script>alert('xss')</script>` em nome de aluno, imprevisto, observações
**Esperado:** Script não executa — React escapa HTML por padrão
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S09 — Upload de arquivo malicioso
**Passos:** Tentar upload de arquivo `.php`, `.exe`, `.html` no campo de foto ou documentos
**Esperado:** Rejeitado com erro; somente PNG/JPG/WebP aceitos em fotos; PDF em documentos
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S10 — CSRF: chamada cross-origin sem token
**Passos:** Fazer requisição POST para `/api/enrollments` de origem diferente sem header Authorization
**Esperado:** 401 Unauthorized (JWT obrigatório em todas as rotas protegidas)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S11 — Dados sensíveis na resposta
**Passos:** `GET /users/me` como qualquer usuário → inspecionar resposta JSON
**Esperado:** Campos `password` (hash), `twoFactorSecret`, `refreshTokens` NÃO aparecem na resposta
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S12 — sessionStorage: isolamento entre abas (regressão)
**Passos:** Abrir 4 abas, logar com perfis diferentes (ver T04 e T05)
**Esperado:**
- localStorage.getItem('token') === null em todas as abas
- sessionStorage.getItem('token') !== null apenas na aba que fez login
- Zustand auth-storage em sessionStorage, não localStorage
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S13 — Redis: sem acesso público
**Passos:** Tentar conectar ao Redis sem senha: `redis-cli -h localhost -p 6379 PING`
**Esperado:** NOAUTH Authentication required (requirepass configurado)
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S14 — MinIO: buckets sem acesso público
**Passos:** Acessar URL direta de arquivo no MinIO sem presigned URL
**Esperado:** 403 Access Denied — arquivos não são públicos
**Resultado:** ☐ PASS ☐ FAIL | Obs:

### S15 — 2FA bypass attempt
**Passos:** Login como ADMIN → na etapa de 2FA, tentar pular enviando request direto para `/auth/login` com credenciais válidas
**Esperado:** Sem OTP válido, token de acesso não é emitido
**Resultado:** ☐ PASS ☐ FAIL | Obs:

---

## 📊 RESUMO DE RESULTADOS

| Módulo | Total | PASS | FAIL | N/A |
|--------|-------|------|------|-----|
| 1 — Autenticação e Sessão (T01–T09) | 9 | | | |
| 2 — Portal Admin (T10–T20) | 11 | | | |
| 3 — Portal Professor (T21–T28) | 8 | | | |
| 4 — Portal Aluno (T29–T33) | 5 | | | |
| 5 — Portal Motorista (T34–T36) | 3 | | | |
| 6 — Fluxos Interconectados (T37–T43) | 7 | | | |
| 7 — Notificações WS (T44–T50) | 7 | | | |
| 8 — Preferências (T51–T54) | 4 | | | |
| 9 — Onboarding e UX (T55–T58) | 4 | | | |
| 10 — Edge Cases (T59–T64) | 6 | | | |
| 11 — Modo Manutenção (T65–T66) | 2 | | | |
| **SUBTOTAL FUNCIONAL** | **66** | | | |
| 12 — Cibersegurança (S01–S15) | 15 | | | |
| **TOTAL GERAL** | **81** | | | |

**Data de execução:** ___/___/______
**Executado por:** _______________
**Versão testada:** v_______
**Aprovação para deploy:** ☐ SIM ☐ NÃO

---

## 📝 REGISTRO DE BUGS ENCONTRADOS

| # | Teste | Descrição do Problema | Severidade | Status |
|---|-------|-----------------------|------------|--------|
| | | | | |

---

## 📌 CRITÉRIOS DE APROVAÇÃO PARA DEPLOY

- [ ] **100%** dos testes Módulos 1–5 (portais individuais): PASS
- [ ] **100%** dos testes Módulo 6 (fluxos interconectados): PASS
- [ ] **100%** dos testes Módulo 7 (notificações): PASS
- [ ] **T04 e T05** (isolamento de sessão): PASS obrigatório
- [ ] **S04** (privilege escalation): PASS obrigatório
- [ ] **S12** (sessionStorage): PASS obrigatório
- [ ] Nenhum bug com severidade CRÍTICA ou ALTA em aberto
- [ ] `npx tsc --noEmit` → 0 erros no backend
- [ ] `npm run build` → 0 erros no frontend

---

*Sistema Upgrade | RR TECNOL | Plano de Testes v1.0 | 27/03/2026*
