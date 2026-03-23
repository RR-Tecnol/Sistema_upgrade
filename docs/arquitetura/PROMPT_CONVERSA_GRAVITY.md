# PROMPT DA CONVERSA — Para copiar e colar direto no chat com o Gravity
## Este é o primeiro e único prompt que você manda. Tudo mais vem dos docs.

---

## VERSÃO CURTA (recomendada — copiar isso)

```
Gravity, antes de fazer qualquer coisa — não escreva uma linha de código ainda.

Você está entrando no sprint final do Sistema Upgrade. Existe documentação completa
que define exatamente o que fazer, em que ordem, e como. Seu trabalho é seguir essa
documentação à risca, não improvisar.

Faça isso agora, nesta ordem:

1. Leia docs/arquitetura/LIVRO_DE_REGRAS.md — são as regras absolutas do projeto.
   Se uma regra conflitar com sua intuição, a regra vence.

2. Leia docs/seguranca/ERROS_E_SOLUCOES.md — bugs ativos com causa raiz já confirmada
   por leitura de código. Não redescubra o que já foi descoberto.

3. Leia docs/arquitetura/PROX-PASSOS.md — seu roteiro. Cada passo tem o código de
   referência baseado no que já existe no projeto.

4. Leia docs/arquitetura/ESTADO_SISTEMA.md — snapshot do que funciona e o que não funciona.

Depois de ler os quatro, me diga:
- Quais são os 3 primeiros passos do Grupo 0 (infraestrutura)?
- Qual é a causa raiz do BUG-04 (reembolso vazio)?
- Qual é a regra sobre `@Roles()` sem `RolesGuard`?

Se você responder essas três perguntas corretamente, eu sei que você leu os docs e
podemos começar. Se você tentar adivinhar sem ler, vou saber.

Só após a confirmação das respostas você executa o PASSO 0.1.
```

---

## POR QUE ESSE FORMATO FUNCIONA

O Gravity tende a:
- Começar a escrever código imediatamente sem ler contexto
- Tomar decisões por intuição em vez de seguir documentação
- Commitar sem aprovação

As três perguntas no final criam uma verificação objetiva:
- Se ele leu os docs → responde certo → você libera a execução
- Se ele não leu → responde errado ou vago → você manda ler antes de continuar
- Não tem como fingir que leu sem ler, porque as respostas são específicas

---

## MENSAGENS DE CONTROLE (use durante a execução)

### Quando ele quiser pular um passo:
```
Não. Siga a ordem do PROX-PASSOS.md. O passo atual é o [X.Y].
Complete ele com tsc --noEmit passando antes de avançar.
```

### Quando ele começar a criar código sem referência:
```
Pausa. Antes de escrever isso, me mostra qual arquivo existente
no projeto você está usando como referência. Se não tem referência,
releia o PROX-PASSOS.md — cada passo tem código baseado no projeto real.
```

### Quando ele quiser commitar:
```
Não commita ainda. Eu preciso ver o resultado ao vivo primeiro.
Abre o portal [X] e testa [fluxo específico]. Me mostra o resultado.
```

### Quando ele criar mock/array hardcoded:
```
Isso é dado mockado. LIVRO_DE_REGRAS seção 8C proíbe explicitamente.
Cria o endpoint real ou me explica por que não é possível agora.
```

### Quando ele ignorar um erro de TypeScript:
```
npx tsc --noEmit precisa passar com zero erros. Se está quebrando,
resolva o erro antes de continuar. Não use `as any` para suprimir.
```

### Quando o contexto estiver ficando longo e ele começar a esquecer:
```
Releia docs/arquitetura/LIVRO_DE_REGRAS.md seção 8 antes de continuar.
O contexto tá longo e você tá começando a cometer os erros que estão
documentados lá. Especificamente: [citar o anti-padrão que ele cometeu].
```

---

## CHECKLIST PÓS-PASSO (pedir após cada passo concluído)

Antes de liberar o próximo passo, confirme esses 4 pontos:

```
✓ npx tsc --noEmit → zero erros?
✓ Testou ao vivo o fluxo afetado?
✓ O que mudou (arquivo + o que foi alterado)?
✓ Tem algo pendente desse passo ou está 100% concluído?
```

---

## RESPOSTA QUE VOCÊ ESPERA DO GRAVITY APÓS MANDAR O PROMPT

Algo como:

> "Lidos os quatro arquivos. Respondendo as verificações:
> 
> **3 primeiros passos do Grupo 0:**
> 0.1 — Corrigir package.json (seed aponta para seed.ts que não existe, mudar para seed-full.ts)
> 0.2 — npx prisma generate e remover casts `as any` em absences.service.ts
> 0.3 — Adicionar @UseGuards(RolesGuard) nos métodos approve/reject do reimbursement controller
>
> **Causa raiz do BUG-04:**
> reimbursement.service.ts retorna `{ data: [], meta: {} }` paginado. Frontend faz
> Array.isArray(res.data) que é false para objetos. Retorna [] sempre.
>
> **Regra sobre @Roles() sem RolesGuard:**
> @Roles() apenas define metadata. Sem @UseGuards(RolesGuard) ninguém lê essa metadata.
> Zero proteção de role acontece. Sempre usar os dois juntos.
>
> Pronto para iniciar o PASSO 0.1?"

Se a resposta for assim → **libera.** Se for vaga ou errada → **manda ler de novo.**

---

*Sistema Upgrade | RR TECNOL | 23/03/2026*
