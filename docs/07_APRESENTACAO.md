# 🚀 Sistema Upgrade — Apresentação Executiva

**Programa Qualifica Maranhão & Qualifica Piauí**
**Reunião de alinhamento: 12/03/2026**
**Preparado por: RR Tecnol**

---

> 📌 **Para quem é este documento?**
> Para os gestores e tomadores de decisão do projeto. Explica **o que o sistema vai fazer**, **por que cada decisão foi tomada** e **o que acontece quando estiver pronto** — sem linguagem técnica.

---

## 🎯 O QUE É O SISTEMA UPGRADE?

O Sistema Upgrade é uma **plataforma digital completa** para gerenciar os programas de qualificação profissional nas carretas do Qualifica Maranhão e Qualifica Piauí. Ele centraliza tudo: do cadastro do aluno ao certificado final, passando pelo controle de frequência, pagamento dos professores e prestação de contas ao governo.

**Quem usa o sistema:**
| Perfil | O que faz no sistema |
|--------|---------------------|
| 👨‍💼 Administrador / Coordenador | Gerencia turmas, alunos, professores, relatórios e aprovações |
| 👨‍🏫 Professor / Instrutor | Registra frequência, solicita reembolso de despesas |
| 🚛 Motorista | Acompanha rota, registra manutenção da carreta |
| 🎓 Aluno / Cidadão | Vê localização da carreta, acompanha frequência, baixa certificado |

---

## 📋 O QUE FOI DECIDIDO NA REUNIÃO (12/03/2026)?

A reunião entre Robert S. Pimentel e Ronaldo Ribeiro definiu todas as funcionalidades. Aqui estão os pontos principais em linguagem simples:

---

### ✅ 1. O Aluno Sabe Onde a Carreta Está

**O que foi pedido:**
> *"Para quando a gente for fazer o cadastro, já aparece lá a cidade e a escola que o caminhão vai permanecer. O aluno também vai ter ciência disso."* — Robert

**O que o sistema vai fazer:**
Quando o aluno acessar o portal pelo celular, a primeira tela já mostra: **"Sua carreta está em: Caxias-MA, Escola Estadual João XXIII — dias 14/04 a 14/05."** Com link direto para o Google Maps.

**Por que isso importa:**
Hoje o aluno precisa ligar, mandar mensagem, perguntar para alguém. Com o sistema, ele acessa a qualquer hora no celular e tem a informação na mão.

---

### ✅ 2. Inscrição Digital com Lista de Espera

**O que foi pedido:**
> *"Enquanto a inscrição não tiver concluída você pega uma vaga de reserva para quem tem certa urgência... são 4 vagas de reserva por padrão."* — Robert

**O que o sistema vai fazer:**
Cada turma tem um número fixo de vagas + **4 vagas de reserva** automáticas. O sistema controla tudo online. O candidato faz a inscrição pelo portal, o administrador aprova ou redireciona para a fila de espera — sem papel, sem planilha Excel.

**Por que isso importa:**
Elimina o risco de uma turma fechar com vagas sobrando ou de candidatos prioritários (como beneficiários do Bolsa Família) ficarem de fora por falta de controle manual.

---

### ✅ 3. Aprovação Automática por Frequência (Sem Prova)

**O que foi pedido:**
> *"Frequência de 80%? [Ronaldo:] Isso, frequência de 80%. Não tem prova."* — Robert confirmou

**O que o sistema vai fazer:**
O sistema calcula a frequência de cada aluno automaticamente. Quando um aluno atinge as aulas necessárias, o botão de emitir certificado aparece no portal dele — **automaticamente, sem ninguém precisar autorizar manualmente.**

**Por que isso importa:**
Com centenas de alunos em várias carretas ao mesmo tempo, é impossível fazer isso manualmente sem erro. O sistema não erra.

---

### ✅ 4. Portal do Aluno — Simples como WhatsApp

**O que foi pedido:**
Aluno acessa pelo celular, vê localização da carreta e baixa certificado.

**O que o sistema vai fazer:**
O portal funciona assim:

```
📱 Aluno abre o link no celular
   ↓
📲 Digita o CPF + código que chega por SMS (sem precisar lembrar senha)
   ↓
🗺️ Vê: onde está a carreta, seu curso, sua frequência
   ↓
🏆 Quando aprovado: botão "Baixar meu Certificado" aparece
   ↓
📄 PDF do certificado baixa em segundos, mesmo no 3G do interior
```

**Por que isso importa:**
Muitos alunos são pessoas de baixa renda, com celular básico e internet precária no interior do MA e PI. O sistema foi projetado especificamente para funcionar nessas condições. **Sem senha para lembrar, sem app para instalar, sem precisar de WiFi rápido.**

---

### ✅ 5. Pagamento dos Professores é Calculado Automaticamente

**O que foi pedido:**
> *"O professor é CLT então a gente paga salário base mais diária de custo... quando a cidade for a menos de 200km ele recebe uma passagem por semana, mais de 200km é quinzenal."* — Robert

**O que o sistema vai fazer:**
O sistema calcula automaticamente para cada professor:
- **Salário base mensal** (fixo, configurado no cadastro)
- **Diária de custo:** R$ 120,00 × dias trabalhados
- **Passagem:** automática por semana (cidade < 200km) ou a cada 2 semanas (> 200km)

**Por que isso importa:**
Sem o sistema, calcular isso manualmente para 15 professores em 5 cidades diferentes, todo mês, é fonte garantida de erro e conflito. Com o sistema, é um relatório gerado em 1 clique.

---

### ✅ 6. Foto do Recibo pelo Celular — Sem Papel

**O que foi pedido:**
Professores e motoristas precisam solicitar reembolso de despesas com recibo.

**O que o sistema vai fazer:**
```
📱 Professor acessa o portal → "Solicitar Reembolso"
   ↓
📷 Tira foto do recibo com a câmera do celular
   ↓
📤 Foto enviada com barra de progresso (funciona mesmo em 3G fraco)
   ↓
✅ Admin recebe alerta no WhatsApp: "João pediu reembolso de R$ 85,00"
   ↓
👍 Admin aprova → João recebe confirmação
```

**Por que isso importa:**
Elimina papel, elimina extravio de recibo, cria histórico digital de todas as despesas. Auditável pelo governo a qualquer momento.

---

### ✅ 7. PDF de Frequência no Dia 20 — Automático e com Logo

**O que foi pedido:**
> *"Dia 20 a gente precisa do PDF de frequência."* — Robert (vai enviar o modelo pelo WhatsApp)

**O que o sistema vai fazer:**
Todo dia 20, automaticamente:
1. O sistema gera o PDF de frequência de cada turma ativa
2. Com a **logo da empresa** no cabeçalho (configurável)
3. Envia por **e-mail direto** para os responsáveis
4. Salva no sistema para consulta futura

**Por que isso importa:**
Não depende de ninguém lembrar de gerar e enviar. Não tem atraso, não tem versão errada, não tem "o arquivo corrompeu".

---

### ✅ 8. Certificados na 3ª Semana — Lista de Concludentes

**O que foi pedido:**
> *"3ª semana do mês: lista de concludentes."* — Robert

**O que o sistema vai fazer:**
Na terceira semana de cada mês, o sistema:
1. Verifica automaticamente quem atingiu 80% de frequência
2. Gera a lista de concludentes em PDF (com logo, pronto para apresentar ao governo)
3. Emite todos os certificados digitais
4. Notifica cada aluno: **"Seu certificado está disponível no portal"**

---

### ✅ 9. Relatórios com Filtros — Qualquer Dado, a Qualquer Hora

**O que foi pedido:**
> *"Quero todos os alunos da cidade X no ano Y que receberam certificado. No Piauí, em 2025, tivemos 11 rotas — quais cidades foram beneficiadas?"*

**O que o sistema vai fazer:**
Um painel de relatórios onde o gestor escolhe os filtros:
- Estado (MA ou PI)
- Ano
- Cidade
- Curso
- Status (certificado emitido / não emitido)

E exporta em **Excel, PDF, CSV** — com a logo, formatado corretamente, pronto para apresentar para a Secretaria ou para qualquer órgão de controle.

**Por que isso importa:**
Hoje para responder "quantos alunos do MA receberam certificado em 2025?" é necessário cruzar várias planilhas manualmente. Com o sistema: **1 clique = relatório completo.**

---

### ✅ 10. Segurança e Backup — Sistema Protegido e Confiável

**O que foi pedido:**
> *"Modo de manutenção, 2 fatores de autenticação, backup automático, logout por inatividade."*

**O que o sistema vai fazer:**

| Proteção | Como funciona |
|----------|--------------|
| **Login em 2 etapas** | Administradores precisam de código extra (Google Authenticator) além da senha |
| **Logout automático** | Se o admin deixar o computador sem usar por 30 minutos, o sistema desconecta sozinho |
| **Modo manutenção** | Com 1 clique, o admin bloqueia o acesso de alunos para fazer atualizações — sem derrubar o sistema inteiro |
| **Backup automático** | Todo dia às 3h da manhã, o banco de dados é copiado automaticamente para nuvem segura. 30 dias de histórico guardado |

**Por que isso importa:**
Sistema governamental com dados de cidadãos vulneráveis precisa ter segurança reforçada. Um vazamento de dados pode gerar processo judicial e multa da LGPD.

---

### ✅ 11. Validação com CadÚnico — Quem Realmente É Vulnerável

**O que foi pedido:**
Alunos declaram programa social (Bolsa Família, BPC, Pé de Meia) no cadastro.

**O que o sistema vai fazer:**
O sistema cruza automaticamente os dados declarados pelo aluno com a **base nacional do CadÚnico** (Cadastro Único do Governo Federal):
- Se o aluno disse que é beneficiário do Bolsa Família → sistema confirma com o banco do governo
- Resultado aparece no cadastro do aluno: ✅ Validado ou ⚠️ Divergência (para análise manual)

**Por que isso importa:**
Garante que as vagas prioritárias chegam para quem realmente precisa. Evita cadastros fraudulentos. **Exigência legal** para programas com recurso federal.

---

### ✅ 12. Notificações em 3 Canais

**O que foi pedido:**
Alertas de frequência baixa, nova inscrição, certificado emitido, manutenção de carreta.

**O que o sistema vai fazer:**
Cada notificação chega por:
- 📱 **No próprio sistema** (sino com número de não lidas)
- 💬 **WhatsApp** (para alertas urgentes)
- 📧 **E-mail** (para registros formais)

O usuário escolhe quais canais prefere para cada tipo de alerta.

---

## 💰 POR QUE AS DECISÕES TÉCNICAS FAZEM SENTIDO (SEM JARGÃO)

Esta seção explica em linguagem simples por que cada escolha técnica foi feita — e o que aconteceria se a gente tivesse feito diferente.

---

### "Por que o aluno não precisa de senha?"

**O que foi feito:** Login com CPF + código por SMS.

**Por que funciona:** O aluno do interior do MA muitas vezes nunca criou uma conta em nada na vida. Ele não tem e-mail. Se pedir senha, ele não acessa. Com CPF + SMS, qualquer pessoa que tenha celular consegue entrar.

**O que aconteceria se fizesse diferente:** Se exigisse e-mail e senha, estimamos que mais de 60% do público-alvo não conseguiria acessar o sistema sem ajuda de terceiro. O portal seria inútil.

---

### "Por que o certificado já fica pronto antes do aluno pedir?"

**O que foi feito:** Assim que o aluno é aprovado, o certificado é gerado e guardado na nuvem.

**Por que funciona:** Gerar um PDF profissional leva de 2 a 5 segundos. Numa internet 3G precária do interior, o aluno esperando 5 segundos pode achar que o sistema travou e fechar o app. Guardando antes, quando ele clica, o download começa imediatamente.

**O que aconteceria se fizesse diferente:** Alta taxa de abandono. Aluno tentaria 3 vezes, desistiria, iria até a secretaria buscar o papel — voltando ao processo manual que o sistema quis eliminar.

---

### "Por que o relatório de 50 mil alunos não trava o sistema?"

**O que foi feito:** Relatórios grandes são gerados em segundo plano (fila de processamento) enquanto o sistema continua funcionando normalmente.

**Por que funciona:** Imagine tentar imprimir um documento de 500 páginas no computador enquanto continua trabalhando. O sistema funciona do mesmo jeito — gera o relatório em background, avisa quando está pronto, o gestor baixa.

**O que aconteceria se fizesse diferente:** Se processasse na hora, enquanto 10 gestores pedissem relatórios grandes ao mesmo tempo, o sistema ficaria lento ou travaria para todos os outros usuários que estão simplesmente registrando frequência ou fazendo inscrições.

---

### "Por que o Excel abre corretamente no Brasil?"

**O que foi feito:** O arquivo Excel é gerado com configurações específicas para o Brasil (separador ponto-e-vírgula, codificação correta).

**Por que funciona:** O Excel brasileiro é diferente do internacional. Se gerar com as configurações padrão internacionais, ao abrir no computador do gestor em São Luís, todas as colunas aparecem juntas numa só, e palavras como "ação" aparecem como "aÃ§Ã£o". O sistema já gera no formato certo.

**O que aconteceria se fizesse diferente:** O gestor iria abrir o Excel, ver tudo errado, achar que o sistema não funciona, e voltar a fazer na mão.

---

### "Por que o backup é automático todo dia?"

**O que foi feito:** Todo dia às 3h da manhã, uma cópia do banco de dados vai para a nuvem.

**Por que funciona:** Se o servidor tiver um problema (queda de energia, pane de hardware, ataque), todos os dados até a última madrugada são recuperáveis em poucas horas.

**O que aconteceria se fizesse diferente:** Sem backup, um problema técnico poderia apagar meses de cadastros, frequências e certificados. Com dados de programa governamental, isso geraria processo no Tribunal de Contas.

---

### "Por que o login do admin tem 2 etapas?"

**O que foi feito:** Além de senha, o administrador precisa de um código que muda a cada 30 segundos no celular.

**Por que funciona:** Se alguém descobrir a senha do admin (phishing, senha vazada em outro site), ainda assim não consegue entrar sem o celular físico. A conta fica protegida.

**O que aconteceria se fizesse diferente:** Um único e-mail de phishing bem feito poderia dar acesso completo ao sistema para terceiros mal-intencionados — com dados de centenas de cidadãos vulneráveis.

---

## 📅 ROADMAP — ORDEM DE IMPLEMENTAÇÃO

As funcionalidades foram priorizadas pelo impacto operacional:

### 🔥 FASE 1 — Base Operacional (Alta Prioridade)
Estas são as funcionalidades sem as quais o programa não consegue operar:

| # | Funcionalidade | Quem é impactado |
|---|---|---|
| 1 | Fluxo de turma com etapas + vagas de reserva | Coordenador |
| 2 | Aprovação por 80% de frequência (automático) | Todo o programa |
| 3 | Campo "Escola pública?" no cadastro do aluno | Coordenador, Secretaria |
| 4 | Renomear "Ação" para "Período de Curso" em toda a tela | Todo usuário |
| 5 | Recálculo automático de datas quando há feriado | Coordenador |
| 6 | PDF de frequência no dia 20 com logo | Coordenador, Secretaria |

### 🟠 FASE 2 — Experiência do Usuário (Média Prioridade)
Funcionalidades que melhoram muito a operação, mas que não travam tudo se não estiverem no dia 1:

| # | Funcionalidade | Quem é impactado |
|---|---|---|
| 7 | Portal do aluno: localização + certificado | Aluno/Cidadão |
| 8 | Modelo financeiro CLT — cálculo automático de passagens | Professor |
| 9 | Portal de reembolso: foto de recibo pelo celular | Professor, Motorista |
| 10 | Lista de concludentes (3ª semana) + certificado digital | Aluno, Secretaria |

### 🟡 FASE 3 — Controle e Escala (Baixa Prioridade imediata)
Funcionalidades importantes para o longo prazo e para escalar o programa para mais estados:

| # | Funcionalidade | Quem é impactado |
|---|---|---|
| 11 | Relatórios com filtros avançados + exportação Excel/PDF | Coordenador, Secretaria |
| 12 | Segurança: 2FA, backup automático, modo manutenção | Administrador |
| 13 | Validação com CadÚnico (cruzamento automático) | Coordenador, Secretaria |
| 14 | Notificações: WhatsApp + E-mail + painel | Todos |

---

## ✅ O QUE MUDA NA PRÁTICA — ANTES E DEPOIS

| Situação | **ANTES (Hoje)** | **DEPOIS (Sistema Upgrade)** |
|---|---|---|
| Aluno sabe onde está a carreta | Liga ou manda mensagem para alguém | Abre o link no celular → vê em 2 segundos |
| Aluno pega certificado | Vai pessoalmente à secretaria | Clica no portal → baixa PDF na hora |
| Controle de frequência | Planilha manual, risco de erro | Automático, tela em tempo real |
| Relatório para a Secretaria | Planilha Excel manual, horas de trabalho | 1 clique → relatório pronto em segundos |
| Pagamento do professor | Cálculo manual, risco de erro, conflito | Automático, transparente, auditável |
| Reembolso de despesas | Papel, pode perder, demora | Foto no celular → aprovação em 24h |
| Backup dos dados | Depende de alguém lembrar | Todo dia às 3h, automático, 30 dias |
| Acesso ao sistema por hacker | Um vazamento de senha = acesso total | Mesmo com senha vazada, sem o celular não entra |

---

## 🤝 PRÓXIMOS PASSOS

1. **Robert** enviará o modelo de PDF de frequência pelo WhatsApp (para replicar no sistema)
2. **Robert** enviará a planilha de cálculo de despesas dos instrutores
3. **Ronaldo** apresentará na próxima reunião: acesso do motorista, professor e aluno
4. **Ronaldo** aplicará a logo da empresa nos PDFs (confirmado que recebeu no WhatsApp)

---

> 📄 **Documento técnico completo:** [`06_PLANEJAMENTO.md`](./06_PLANEJAMENTO.md)
> 📊 **Pesquisas arquiteturais:** [`05_reports/`](./05_reports/README.md)
