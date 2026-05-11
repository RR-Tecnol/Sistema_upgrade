# ⚙️ METODOLOGIA DE TRABALHO — Método RR Technology
## Sistema Upgrade | RR Tecnol | v4.0 | 19/03/2026

> Este documento define como a equipe opera. É o contrato de trabalho entre
> humanos e agentes de IA. Leia antes de qualquer sessão de desenvolvimento.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Ler este documento junto com:**
> - [`sobre-sistema.md`](./sobre-sistema.md) — o quê o sistema é e como funciona
> - [`LIVRO_DE_REGRAS.md`](./LIVRO_DE_REGRAS.md) — as regras técnicas que governam o código
> - [`seguranca/MR_ROBOT_MENTALIDADE.md`](../seguranca/MR_ROBOT_MENTALIDADE.md) — checklist de segurança obrigatório
> - [`DIARIO_DE_BORDO.md`](./DIARIO_DE_BORDO.md) — histórico de como a metodologia foi aplicada
>
> **Documentos citados no fluxo de trabalho:**
> | Etapa do fluxo | Doc |
> |----------------|-----|
> | PLANEJAMENTO | `PROX-PASSOS.md` (o que fazer) + `ESTADO_SISTEMA.md` (estado atual) |
> | EXECUÇÃO | `LIVRO_DE_REGRAS.md` (como fazer) + `ERROS_E_SOLUCOES.md` (o que evitar) |
> | VALIDAÇÃO | `MR_ROBOT_MENTALIDADE.md` (checklist) + navegador (F12) |
> | DOCUMENTAÇÃO | `ESTADO_SISTEMA.md` + `DIARIO_DE_BORDO.md` + `PROX-PASSOS.md` |
> | COMMIT | `SEEDS_GUIDE.md` (se dados foram alterados) |

---

## OS PAPIS DA EQUIPE

| Papel | Quem | Responsabilidade |
|-------|------|-----------------|
| **👨‍💻 Comandante / Tech Lead** | Davi (RR Tecnol) | Autoridade final. Define visão, aprova decisões arquiteturais, valida no browser, dá o sinal verde para cada EXEC |
| **🧠 Gravity 2.0** | Claude (este agente) | Analisa, planeja, audita código, escreve prompts, valida visualmente, atualiza docs, escaneamento de segurança |
| **⚡ Antygravity** | Windsurf / Claude Sonnet | Executor de código. Recebe prompts do Gravity e implementa — nunca age sem prompt aprovado |
| **🔎 Deep Research** | Gemini / Perplexity | Acionado antes de features complexas para pesquisar padrões, bibliotecas e soluções |
| **🏢 Cliente** | Robert S. Pimentel (Upgrade) | Define regras de negócio, fornece modelos de PDF, valida entregáveis |

---

## O FLUXO DE TRABALHO (nunca pular etapas)

```
DEMANDA (Davi identifica o que precisa ser feito)
    ↓
PESQUISA (Deep Research — apenas para features complexas)
    ↓
PLANEJAMENTO (Gravity lê os docs, analisa o código, planeja)
    ↓
APROVAÇÃO (Davi lê o plano e dá o sinal verde)
    ↓
EXECUÇÃO (Antygravity implementa o código)
    ↓
VALIDAÇÃO VISUAL (Gravity abre o browser, F12 aberto, testa tudo)
    ↓
CHECKLIST MR. ROBOT (Gravity verifica segurança — ver MR_ROBOT_MENTALIDADE.md)
    ↓
DOCUMENTAÇÃO (Gravity atualiza ESTADO_SISTEMA + ROADMAP + DIARIO_DE_BORDO)
    ↓
COMMIT (Antygravity commita com mensagem no padrão Conventional Commits)
```

**Regra de Ouro:** Nenhum EXEC é declarado DONE sem:
1. Validação visual no browser confirmada pelo Gravity
2. Checklist Mr. Robot executado sem pendências críticas
3. Três docs atualizados: ESTADO_SISTEMA, ROADMAP_EPICOS, DIARIO_DE_BORDO
4. Commit com mensagem correta no GitHub

---

## O PROTOCOLO DE BYPASS (quando algo trava)

Se o Antygravity encontrar um obstáculo técnico durante a execução:

1. **PARE** — não tente resolver sozinho com soluções criativas não documentadas
2. **DOCUMENTE** o erro exato (stack trace resumido, linha, arquivo)
3. **REPORTE** ao Gravity descrevendo: o que tentou, o que falhou, o que precisa
4. **AGUARDE** — o Gravity analisa e aciona o Deep Research se necessário
5. **BYPASS TEMPORÁRIO** — se o Davi autorizar, aplique o contorno E:
   - Comente o código original com `// BYPASS: motivo`
   - Registre no DIARIO_DE_BORDO com `[BYPASS]` na entrada
   - Crie alerta `// TODO: resolver bypass — data` no código

---

## COMO O GRAVITY VALIDA VISUALMENTE

A validação visual é obrigatória após qualquer EXEC. O Gravity:

1. **Abre o browser** com F12 ativo — Console, Network e Application visíveis
2. **Testa o fluxo principal** da feature implementada
3. **Testa os casos de borda** (usuário sem permissão, dados vazios, erros)
4. **Escaneia o Console** — zero erros vermelhos tolerados
5. **Escaneia o Network** — verifica status codes e payloads de resposta
6. **Testa em múltiplas resoluções** se envolver frontend (390px, 768px, 1440px)
7. **Executa o Checklist Mr. Robot** — ver docs/seguranca/MR_ROBOT_MENTALIDADE.md

Só após todos esses passos o Gravity declara o EXEC como validado.

---

## COMO OS DOCS SÃO ATUALIZADOS

Ao final de **cada EXEC validado**, o Gravity atualiza obrigatoriamente:

### ESTADO_SISTEMA.md
- Marca o EXEC como ✅ com a data
- Lista os arquivos modificados
- Adiciona dados de teste criados (usuários, registros)
- Atualiza a seção de Pendências Imediatas
- Remove alertas que foram resolvidos

### ROADMAP_EPICOS.md
- Muda o status do EXEC de 🔴 para ✅
- Aponta o próximo EXEC como 🔴 PRÓXIMO

### DIARIO_DE_BORDO.md
Nova entrada sempre no TOPO com:
- Data e nome da sessão
- Contexto (quem estava online, foco da sessão)
- O que foi feito (narrativa técnica)
- Decisões importantes tomadas e por quê
- O que ficou para a próxima sessão

---

## PADRÃO DE COMMITS

```
feat: descrição da nova funcionalidade
fix: descrição do bug corrigido
fix(sec): descrição da vulnerabilidade corrigida
docs: atualização de documentação
refactor: refatoração sem mudança de comportamento
chore: infraestrutura, configs, scripts
```

Exemplos corretos:
```
feat: EXEC-03 professor filtra turmas por teacherId
fix: GET /reimbursements/my retorna 404 para role DRIVER
fix(sec): privilege escalation via POST /auth/register
docs: atualiza ESTADO_SISTEMA e ROADMAP pos EXEC-03
```

---

## MENTALIDADE DE SEGURANÇA PERMANENTE (Mr. Robot)

O Gravity opera com mentalidade de hacker ético em todo momento.
Cada linha de código implementada é analisada com a pergunta:
**"Como um atacante abusaria disso?"**

O documento completo está em:
`docs/seguranca/MR_ROBOT_MENTALIDADE.md`

Leitura obrigatória antes da primeira sessão de desenvolvimento.

---

## REGRAS DE COMUNICAÇÃO

**O Gravity reporta ao Davi:**
- Quando precisa de aprovação para iniciar um EXEC
- Quando encontra uma vulnerabilidade de segurança
- Quando encontra uma ambiguidade nas regras de negócio
- Quando um EXEC foi validado e está pronto para commit
- Quando precisa de autorização para um bypass

**O Gravity NÃO age sem aprovação do Davi:**
- Implementar código novo
- Fazer merge ou push para o repositório
- Alterar regras de negócio documentadas
- Deletar dados do banco (mesmo em desenvolvimento)
- Iniciar um EXEC que não estava no plano acordado

---

*Sistema Upgrade | RR Tecnol | Método RR Technology v4.0 | 19/03/2026*
*"Planeja devagar, executa rápido, valida sempre."*
