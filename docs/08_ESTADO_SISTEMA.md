# 📊 08_ESTADO_SISTEMA — Referência Rápida de Status

> **O que é este documento?**
> Snapshot do estado real do sistema em 16/03/2026.
> Atualizado ao final de cada ciclo de sprints.
> Leia antes de qualquer nova implementação para entender o contexto.

---

## 🟢 O QUE ESTÁ FUNCIONANDO (confirmado nos arquivos)

### Backend (19 módulos NestJS)

| Módulo | Arquivo principal | Status | Observação |
|--------|------------------|--------|------------|
| Auth + 2FA | auth.service.ts | ✅ | JWT duplo + speakeasy TOTP |
| Notifications WS | notifications.gateway.ts | ✅ | Socket.io /notifications |
| Classes + Bulk Attendance | classes.service.ts | ✅ | upsert classId_studentId_date |
| Enrollments + WS | enrollments.service.ts | ✅ | Emite nova_inscricao |
| Dashboard + BI | dashboard.service.ts | ✅ | getRotasBi() com filtros |
| Settings (financeiro) | settings.service.ts | ✅ | 5 params configuráveis |
| PDF frequência | pdf.service.ts | ✅ | P/F por dia, 4 logos |
| PDF concludentes | pdf.service.ts | ✅ | NOME+ASSINATURA + desistentes |
| Reimbursement | reimbursement.service.ts | ✅ | Presigned URL MinIO |
| Holiday | holiday.service.ts | ✅ | 26 feriados + recálculo |
| Employees (CLT) | employees.service.ts | ✅ | contractType+salary+km |
| Acoes (financeiro) | acoes.service.ts | ✅ | calcularResumoFinanceiro |
| Certificates | certificate.service.ts | ✅ | Geração + MinIO |
| Modo Manutenção | main.ts | ✅ | Middleware 503 |
| CI/CD | .github/workflows/ci.yml | ✅ | tsc + build nos 2 jobs |

### Frontend (20+ telas)

| Área | Telas | Status |
|------|-------|--------|
| Admin Dashboard | dashboard/ | ✅ BI + Mapa + Socket.io |
| Admin Configurações | configuracoes/ | ✅ 2FA fluxo completo |
| Portal Professor | teacher/ (7 telas) | ✅ Mobile-first |
| Portal Aluno | student/ | ✅ |
| Responsividade | globals.css | ✅ Breakpoints sistemáticos |
| Sidebar Mobile | Sidebar.tsx + Header.tsx | ✅ Drawer + hamburger |
| Login | login/page.tsx | ✅ Redirect corrigido para todos os roles |

### Banco de Dados

| Item | Status |
|------|--------|
| Encoding UTF-8 | ✅ POSTGRES_INITDB_ARGS configurado |
| Migration 2FA | ✅ 20260316130235_add_two_factor |
| Seed MA + PI + AC | ✅ 4 grupos + 30 cidades |
| unique classId_studentId_date | ✅ Attendance sem duplicatas |

---

## 🟡 PENDÊNCIAS REAIS (não bugs, apenas próximos passos)

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Manual de testes | Documento com roteiro de teste manual completo | Alta |
| SF-03 teste ao vivo | Validar handshake WS + badge real-time no browser | Alta |
| Seed AC executar | npm run prisma:seed para criar cidades do Acre no banco | Média |

---

## 🔴 BUGS CONHECIDOS (nenhum aberto)

Todos os bugs identificados foram resolvidos. Ver `04_ERROS_E_SOLUCOES.md` para histórico completo com causa raiz + solução + prevenção.

---

## 📋 DECISÕES TÉCNICAS PERMANENTES

Estas decisões foram tomadas e NÃO devem ser revertidas sem aprovação do Tech Lead:

| Decisão | Motivo | Impacto se reverter |
|---------|--------|---------------------|
| Decimal(10,2) — nunca Float | Precisão financeira exigida pelo TCE | Erros de arredondamento em cálculos CLT |
| Soft delete (active=false) | Relatórios históricos do governo | Perda de dados para auditorias |
| MinIO para todos os uploads | Persistência entre deploys | Perda de certificados e recibos |
| Socket.io com auth JWT | Segurança governamental | Vazamento de notificações entre usuários |
| Approval threshold = 75% | Definição do stakeholder (Robert) | Alunos reprovados que deveriam ser aprovados |
| Parâmetros financeiros em SettingsService | Nunca hardcodar valores de negócio | Robert não poderia ajustar diárias sem deploy |
| Sistema web responsivo (não app nativo) | Alunos não instalam apps | Necessidade de recriar tudo em React Native |
| capture="environment" no upload | Câmera traseira no celular do professor | Professor precisaria rodar câmera manualmente |
| req.user.id (nunca req.user.sub) | JwtStrategy.validate() retorna id não sub | Endpoints retornam dados de usuário errado |

---

## 🏗️ ARQUITETURA DE REFERÊNCIA

- [GRAVITY_2_BRAIN.md](./GRAVITY_2_BRAIN.md) (Parte 13) → arquitetura completa atualizada
- [02_LIVRO_DE_REGRAS.md](./02_LIVRO_DE_REGRAS.md) → regras de código e padrões
- [03_DIARIO_DE_BORDO.md](./03_DIARIO_DE_BORDO.md) → histórico de todas as decisões
- [04_ERROS_E_SOLUCOES.md](./04_ERROS_E_SOLUCOES.md) → bugs + soluções + prevenção

---

*Atualizado em 16/03/2026 após conclusão dos Sprints 0→Final*
*Próxima atualização: após manual de testes e validação SF-03*
