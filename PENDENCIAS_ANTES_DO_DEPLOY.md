# ⚠️ CHECKLIST ANTES DO DEPLOY NA VPS

> **IMPORTANTE**: Este arquivo documenta os "atalhos" e configurações temporárias que criamos apenas para facilitar o desenvolvimento local. **Tudo o que está aqui DEVE ser revertido ou revisado antes de fazer o push para o GitHub e deploy na VPS de produção.**

### 1. Backdoor de Autenticação (OTP)
- **Arquivo modificado**: `backend/src/auth/auth.service.ts` (linha ~260, dentro de `verifyEmailOtp`).
- **O que foi feito**: Adicionada uma verificação `if (process.env.NODE_ENV !== 'production' && code.trim() === '123456')` que permite pular o OTP de e-mail ao digitar a senha universal `123456`.
- **Ação antes do deploy**: Remover esse bloco de código `// ── DEV BACKDOOR...` inteiro para garantir que nenhum usuário em produção consiga burlar o acesso 2FA, ou garantir que a VPS esteja rodando estritamente com `NODE_ENV=production`. O ideal é **remover o código**.

### 2. Bypass de Permissões / Autenticação Local (Alterações de Ontem)
- **Anotação**: Certifique-se de que variáveis como `AUTH_BYPASS_MFA` e `AUTH_BYPASS_EMAIL_OTP` no seu `.env` da VPS não estejam ativadas (`true`).
- **Ação antes do deploy**: Validar o arquivo `.env` de produção para garantir que todas as travas de segurança do `auth.service.ts` voltem a atuar 100%.

### 3. Sincronização do Banco de Dados
- **Anotação**: Alteramos a lógica de consumo de verbas (`AcaoStockBudget`) para ler as movimentações (`StockMovement`) e não as solicitações de compra (`StockPurchaseRequest`).
- **Ação antes do deploy**: Garantir que o banco da VPS seja atualizado com `npx prisma db push` (ou migrate) para refletir os novos campos (`categoriaEnum`, `categoriaCustom`) criados em `StockBudget` e `AcaoStockBudget`.

---
*Mantenha este arquivo atualizado sempre que precisarmos criar um atalho para testes locais.*

---

### 4. Ativar Moldes Mestres de Certificado na VPS

- **Contexto**: O sistema de templates de certificado usa Moldes Mestres (MA e PI) que precisam ser inicializados no banco de dados. Na VPS, esse seed nunca foi executado, o que causa o erro 404 ao clicar em **"📄 Ver/Baixar Modelo Atual"**.
- **Sintoma**: `{"message":"Template oficial de certificado não encontrado","error":"Not Found","statusCode":404}` ao acessar `sistemaupgrade.com.br/api/certificates/template/model`.
- **Ação após o deploy**:
  1. Acesse o painel admin na VPS: `sistemaupgrade.com.br/admin/certificados`
  2. Clique na aba **"Modelos de Documento"**
  3. Clique no botão verde **🛠️ Ativar Moldes Mestres por UF**
  4. Aguarde a confirmação de sucesso — os modelos MA e PI serão criados/atualizados no banco
  5. Após isso, o botão "📄 Ver/Baixar Modelo Atual" funcionará corretamente
- **Alternativa via API**: `POST /api/certificates/admin/seed-master-templates` (autenticado como ADMIN).
- **Nenhum arquivo de código precisa ser alterado** — é apenas uma configuração de banco de dados.

