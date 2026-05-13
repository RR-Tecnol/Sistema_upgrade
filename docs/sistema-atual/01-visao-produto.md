# Visão de produto e domínio

## O que é o sistema

Plataforma **web** para gestão de **cursos itinerantes** (programas tipo Qualifica Maranhão / Piauí): unidades móveis, turmas, inscrições, frequência, certificados, viagens, reembolsos, imprevistos, finanças operacionais e comunicação com alunos e equipa de campo.

## Portais e rotas de alto nível

O frontend organiza a experiência em **quatro portais** principais (prefixos de URL):

| Portal | Prefixo típico | Público-alvo |
|--------|------------------|--------------|
| Administração | `/admin/*` | Gestão global, TI, operações |
| Professor | `/teacher/*` | Instrutores, frequência e turmas atribuídas |
| Motorista | `/driver/*` | Operação de veículo, viagens, imprevistos |
| Aluno | `/student/*` | Matrícula, frequência, certificados, feedback |

Existem ainda fluxos **públicos ou transversais**: login (`/login`), inscrição pública, verificação de certificado, recuperação / primeiro acesso de senha, 2FA, registo de funcionário por token, etc. (Listagem completa em [04-frontend-portais-e-rotas.md](./04-frontend-portais-e-rotas.md).)

## Perfis no modelo de dados

No Prisma, o utilizador tem `role` do tipo `UserRole`. Valores atuais no schema:

- `IT_ADMIN` — super-admin TI (acesso alargado)
- `ADMIN`
- `COORDINATOR`
- `FINANCIAL`
- `TEACHER`
- `STUDENT`
- `DRIVER`

A UI e as APIs aplicam **autorização por role** (guards NestJS + verificações no serviço). Nem todas as combinações role × rota estão expostas no menu; regras exatas estão nos controllers e no frontend (redirecionamentos pós-login).

## Domínios funcionais (para leitura humana)

- **Cadastro académico:** cursos, turmas (`classes`), grupos, cidades, instituições.
- **Pessoas:** alunos, utilizadores, funcionários, vínculos professor–turma quando aplicável.
- **Operação de campo:** viagens, manutenção de carretas, localização de motoristas, ausências/imprevistos.
- **Financeiro operacional:** reembolsos, contas a pagar (módulo dedicado).
- **Comprovação e relatórios:** frequência, relatórios (incl. exportações), certificados (templates, PDF, verificação pública).
- **Pós-curso:** fluxo de feedbacks e recompensas (ex.: PIX), conforme implementação em `feedbacks`.
- **Transversal:** notificações (tempo real), auditoria, definições globais, modo manutenção.

Cada domínio mapeia para um ou mais **módulos NestJS** listados em [03-arquitetura-backend.md](./03-arquitetura-backend.md).
