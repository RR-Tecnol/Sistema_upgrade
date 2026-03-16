# 🗺️ 00_INDEX — O Mapa do Tesouro (Leia-me Primeiro)

Bem-vindo ao Sistema Upgrade. Este diretório de governança define como nossa equipe opera. 
**Gravity (Agente de Código), você DEVE ler este índice e os documentos referenciados antes de iniciar qualquer alteração no código.**

## Hierarquia de Documentação (leia cada arquivo individualmente sempre)

1. **[01_METODOLOGIA_TRABALHO.md](./01_METODOLOGIA_TRABALHO.md)**: Define QUEM faz O QUÊ. Explica o papel de cada IA (Gravity, Deep Research, Gemini) e do Tech Lead Humano. **(Leitura Obrigatória)**
2. **[02_LIVRO_DE_REGRAS.md](./02_LIVRO_DE_REGRAS.md)**: Os limites do que você NÃO pode fazer. Padrões de código, UI estrita e segurança. **(Leitura Obrigatória)**
3. **[03_DIARIO_DE_BORDO.md](./03_DIARIO_DE_BORDO.md)**: Histórico das decisões arquiteturais, contornos (bypasses) e evolução das features diárias. **(Consulte para entender o contexto atual)**
4. **[04_ERROS_E_SOLUCOES.md](./04_ERROS_E_SOLUCOES.md)**: Base de conhecimento de bugs resolvidos. **(Consulte sempre que esbarrar em um erro técnico antes de tentar resolver sozinho)**
5. **`/05_reports/` (Diretório)**: Pasta contendo pesquisas arquiteturais profundas geradas pelo Deep Research.
6. **[06_PLANEJAMENTO.md](./06_PLANEJAMENTO.md)**: Backlog de requisitos extraídos da reunião de alinhamento Upgrade × RR Tecnol (12/03/2026). Contém 14 requisitos rastreados (REQ-01 a REQ-14), impactos no schema Prisma e checklist de follow-up. **(Consulte antes de iniciar qualquer nova implementação)**

**Diretriz de Execução:** Nunca presuma regras de negócio. Se algo não estiver coberto nestes documentos ou na documentação geral, PARE e pergunte ao usuário.

---

## Documentação Técnica

6. **[DOCUMENTACAO_COMPLETA.md](./DOCUMENTACAO_COMPLETA.md)**: Relatório técnico completo do sistema — arquitetura, módulos (19 no backend), banco de dados (35+ tabelas), endpoints REST e fluxos operacionais. **(Envie ao Gemini como contexto base antes de qualquer sessão de desenvolvimento)**
7. **[SETUP.md](./SETUP.md)**: Guia passo a passo de instalação e configuração do ambiente de desenvolvimento local (Docker, migrações Prisma, scripts de criação de admin).
8. **[GRAVITY_2_BRAIN.md](./GRAVITY_2_BRAIN.md)**: Cérebro completo do agente Gravity 2.0 — identidade, padrões de código, conhecimento do projeto em 13 partes. **(Leitura obrigatória para Gravity)**
9. **[AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md)**: Sequência de ativação do Gravity 2.0 e regras absolutas de operação.
10. **[ESTRATEGIA_DUAL_AGENT.md](./ESTRATEGIA_DUAL_AGENT.md)**: Protocolo de operação com dois agentes (Gravity 2.0 + Antygravity).
11. **[PLANO_MESTRE_V3.md](./PLANO_MESTRE_V3.md)**: Plano definitivo pós-auditoria completa — substitui todos os planos anteriores.
12. **[08_ESTADO_SISTEMA.md](./08_ESTADO_SISTEMA.md)**: Snapshot do estado real do sistema — o que está funcionando, pendências e decisões técnicas permanentes. **(Leia antes de qualquer nova implementação)**

---

## Status Atual do Sistema (Último Check: 16/03/2026)

| Componente | Status | Endereço |
|------------|--------|----------|
| Frontend (Next.js 14) | ✅ Rodando | http://localhost:3000 |
| Backend (NestJS 10) | ✅ Rodando | http://localhost:3001 |
| API Docs (Swagger) | ✅ Disponível | http://localhost:3001/api/docs |
| PostgreSQL 15 (Docker) | ✅ Rodando com UTF-8 | localhost:5432 |
| Redis 7 (Docker) | ✅ Rodando | localhost:6379 |
| MinIO (Docker) | ✅ Configurado | http://localhost:9001 |
| WebSocket (Socket.io) | ✅ Ativo | ws://localhost:3001/notifications |

**Estado geral do sistema:** ~95% completo (Sprints 0→5 + Mobile + Final entregues)
**Último commit:** Sprint Final (Socket.io real-time) + 7 bugs críticos corrigidos
**Credenciais Admin Local:** admin@qualifica.com / admin123 | CPF 123.456.789-09 / admin123