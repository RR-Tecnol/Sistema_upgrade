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

6. **[DOCUMENTACAO_COMPLETA.md](./DOCUMENTACAO_COMPLETA.md)**: Relatório técnico completo do sistema — arquitetura, módulos (12 no backend), banco de dados (30+ tabelas), endpoints REST e fluxos operacionais. **(Envie ao Gemini como contexto base antes de qualquer sessão de desenvolvimento)**
7. **[SETUP.md](./SETUP.md)**: Guia passo a passo de instalação e configuração do ambiente de desenvolvimento local (Docker, migrações Prisma, scripts de criação de admin).

---

## Status Atual do Sistema (Último Check: 12/03/2026)

| Componente | Status | Endereço |
|------------|--------|----------|
| Frontend (Next.js 14) | ✅ Rodando | http://localhost:3000 |
| Backend (NestJS 10) | ✅ Rodando | http://localhost:3001 |
| API Docs (Swagger) | ✅ Disponível | http://localhost:3001/api/docs |
| PostgreSQL 15 (Docker) | ✅ Rodando | localhost:5432 |
| Redis 7 (Docker) | ✅ Rodando | localhost:6379 |
| MinIO (Docker) | ✅ Rodando | http://localhost:9001 |

**Credenciais Admin Local:** CPF `123.456.789-09` / Senha `admin123`