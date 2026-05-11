# LIVRO DE REGRAS — RESPONSIVIDADE DO PORTAL DO MOTORISTA
**Criado:** 18/03/2026 | **Autor:** Gravity 2.0

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Quando ler este documento:**
> Sempre que for alterar qualquer arquivo dentro de `frontend/app/driver/*` ou componentes usados exclusivamente pelo portal do motorista.
>
> **Ler antes deste:**
> - [`sobre-sistema.md §7.3`](./sobre-sistema.md) — fluxo completo do perfil Motorista
> - [`sobre-sistema.md §11.8`](./sobre-sistema.md) — módulo GPS/DriverLocation
> - [`sobre-sistema.md §16`](./sobre-sistema.md) — `useDriverTracking` hook e stores
> - [`LIVRO_DE_REGRAS.md §1`](./LIVRO_DE_REGRAS.md) — regras gerais de UI/UX
> - [`LIVRO_DE_REGRAS.md §8G`](./LIVRO_DE_REGRAS.md) — anti-padrões GPS e mapas
>
> **Arquivos impactados por estas regras:**
> | Arquivo | Regras críticas |
> |---------|----------------|
> | `frontend/app/driver/layout.tsx` | Regra 1 (shell fixed), Regra 3 (sidebar transform) |
> | `frontend/app/driver/dashboard/page.tsx` | Regra 4 (sem maxWidth), Regra 5 (grid auto-fill) |
> | `frontend/app/driver/viagens/page.tsx` | Regra 2 (content left), Regra 8 (5 resoluções) |
> | `frontend/components/MapaMotoristas.tsx` | Relação com `RASTREAMENTO_PRODUCAO_APRESENTACAO.md` |

---

## Por que este documento existe


Entre EXEC-02 e a sessão de 18/03/2026, o portal do motorista passou por mais de 10 tentativas
de correção de responsividade, cada uma gerando novos problemas. O diagnóstico final revelou
que o problema nunca foi falta de código — foi ausência de regras arquiteturais claras.

Este documento registra as 8 regras imutáveis que devem ser seguidas em qualquer implementação
do portal do motorista. Qualquer PR que viole uma dessas regras deve ser rejeitado.

---

## Regra 1 — O shell usa `position: fixed; inset: 0`

O container raiz do portal usa exclusivamente `position: fixed; inset: 0`.

`inset: 0` é equivalente a `top: 0; right: 0; bottom: 0; left: 0` e **garante cobertura
total do viewport independente do tamanho da tela**, sem precisar de `100vw`, `100vh`,
`width: 100%`, ou qualquer cálculo JavaScript.

Nunca usar:
- `width: 100vw` (causa overflow com scrollbar no Windows)
- `height: 100vh` (no iOS Safari inclui a barra do browser)
- `width: 100%` no root (pode herdar comportamento do body/html de forma inesperada)

```tsx
// ✅ CORRETO — cobre 100% do viewport garantido em qualquer resolução
<div className="drv-shell" style={{ position:'fixed', inset:0 }}>

// ❌ ERRADO — pode ter gaps por causa do scrollbar, iOS, ou herança CSS
<div style={{ width:'100vw', height:'100vh' }}>
```

---

## Regra 2 — Conteúdo principal com `position: fixed; inset: 0; left: var(--drv-left)`

O container do conteúdo principal usa `position: fixed` com `right: 0; bottom: 0; top: 0`
e `left: var(--drv-left, 0px)`.

A CSS custom property `--drv-left` é definida no shell e transiciona entre `0px` (sidebar
fechada ou overlay mode) e `240px` (sidebar aberta em push mode). O CSS faz o cálculo — não
o JavaScript.

```tsx
// No shell (pai)
<div style={{ '--drv-left': `${contentLeft}px` }}>

// No conteúdo (filho)
.drv-content {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    left: var(--drv-left, 0px);
    transition: left .28s cubic-bezier(.4,0,.2,1);
}
```

**Por quê isso é melhor que `margin-left`:**
`margin-left` em um elemento `flex: 1` pode causar overflow quando o viewport é menor que
`SIDEBAR_W + conteúdo_mínimo`. Com `position: fixed; right: 0`, o conteúdo sempre vai até
a borda direita, independente da matemática de flexbox.

---

## Regra 3 — Sidebar usa `transform: translateX()` para visibilidade, nunca `width: 0`

A sidebar tem sempre `width: 240px`. Sua visibilidade é controlada por `transform`:

```css
.drv-sidebar.closed { transform: translateX(-240px); }
.drv-sidebar.open   { transform: translateX(0); }
```

**Por quê não `width: 0`:**
Quando `width: 0`, `overflow: hidden` esconde todo o conteúdo interno. Ao animar de volta
para `240px`, o conteúdo interno reaparece com layout quebrado ou inconsistente porque o
browser não calculou o layout quando estava em `width: 0`.

Com `transform`, a sidebar sempre existe com 240px de largura — o conteúdo sempre está
renderizado e calculado. A transformação só muda a posição visual, não o layout.

---

## Regra 4 — Nenhum `maxWidth` em containers de página

Containers de página (`.drv-page`) usam `width: 100%` e zero `maxWidth`. O conteúdo preenche
todo o espaço disponível do `<main>`.

Em telas muito grandes (acima de 1600px), os cards de viagem e o hero ficam mais largos
naturalmente — isso é desejável. Se em algum momento um limite de largura for necessário
por motivos de legibilidade, ele deve ser implementado no `padding` do `<main>`, nunca em
`maxWidth` de um container filho.

```css
/* ✅ CORRETO */
.drv-page { width: 100%; }

/* ❌ ERRADO — cria espaço branco em qualquer tela acima de 580px */
.drv-page { width: 100%; max-width: 580px; margin: 0 auto; }
```

---

## Regra 5 — Grids com `auto-fill + minmax`, sem breakpoints fixos

Grids que devem ter colunas variáveis usam:

```css
grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
```

O browser calcula quantas colunas de no mínimo 130px cabem no espaço disponível.
Resultado: 4 colunas em 600px, 3 em 450px, 2 em 300px — automático, sem media queries.

Grids com número fixo de colunas (como os KPIs, que são sempre 3) usam:

```css
grid-template-columns: repeat(3, 1fr);
```

`1fr` significa "um fraction unit" — cada coluna recebe 1/3 do espaço disponível, crescendo
e encolhendo proporcionalmente.

---

## Regra 6 — `clamp()` apenas com valores simples ou `calc()` explícito

`clamp(0.5rem, 1vw + 0.3rem, 1rem)` é **CSS inválido** — o segundo argumento aceita apenas
um valor ou uma expressão `calc()`.

```css
/* ✅ CORRETO */
font-size: clamp(0.5rem, calc(1vw + 0.3rem), 1rem);

/* ❌ INVÁLIDO — ignorado silenciosamente pelo browser */
font-size: clamp(0.5rem, 1vw + 0.3rem, 1rem);
```

Na prática, para o portal do motorista, tamanhos fixos em `rem` são preferíveis a `clamp()`.
`rem` respeita o zoom do browser e não causa escala irregular em viewports intermediários.

---

## Regra 7 — CSS em constante fora do componente, nunca inline na função

CSS definido como `const CSS = \`...\`` deve ficar **fora** da função do componente. Se
definido dentro, o parser JSX pode confundir expressões JS com JSX:

```tsx
// ✅ CORRETO — CSS fora do componente
const DASHBOARD_CSS = `...`;
export default function Dashboard() {
    return (
        <>
        <style>{DASHBOARD_CSS}</style>
        <div className="drv-page">...</div>
        </>
    );
}

// ❌ ERRADO — CSS dentro da função, antes do return, pode corromper o JSX
export default function Dashboard() {
    const css = `...`;          // parser JSX pode falhar ao encontrar <> depois
    return (<><style>{css}</style>...</>);
}
```

---

## Regra 8 — Validar em 5 resoluções antes de declarar qualquer coisa como resolvido

O critério de aceite para qualquer mudança de layout do portal do motorista é:

| Resolução | Cenário | Critério |
|-----------|---------|----------|
| 390px     | Mobile iPhone SE | `shellGap === 0` e `shellLeft === 0` |
| 610px     | Split window (Claude + Upgrade) | `shellGap === 0` e `shellLeft === 0` |
| 1024px    | Laptop | `shellGap === 0` |
| 1440px    | Desktop padrão | `shellGap === 0` |
| 1920px    | Full HD | `shellGap === 0` |

O teste automatizado usa Playwright para medir `shell.getBoundingClientRect()` e comparar
com `window.innerWidth`. Diferença > 0px significa falha.

---

## Modo overlay vs push mode

O layout suporta dois modos de sidebar dependendo da largura do viewport:

**Overlay mode (< 1100px):** A sidebar flutua sobre o conteúdo (overlay escuro por baixo).
O conteúdo principal ocupa 100% da largura (`--drv-left: 0px`). Ao abrir a sidebar, ela
desliza sobre o conteúdo sem mover nada. Clicar no overlay fecha a sidebar.

**Push mode (>= 1100px):** A sidebar faz parte do layout. Quando aberta, `--drv-left`
transiciona para `240px` e o conteúdo "empurra" para a direita. O botão hamburger no
header permite colapsar e expandir a sidebar mesmo no desktop.

A transição entre modos é gerenciada por um `resize` event listener que roda ao montar
o componente e sempre que a janela é redimensionada.

---

## Estado validado em 18/03/2026

Após implementação seguindo estas regras:

```
Mobile 390px:    shellW=390, shellGap=0  ✅
Split 610px:     shellW=610, shellGap=0  ✅
Laptop 1024px:   shellW=1024, shellGap=0 ✅
Desktop 1440px:  shellW=1440, shellGap=0 ✅
FullHD 1920px:   shellW=1920, shellGap=0 ✅
```
