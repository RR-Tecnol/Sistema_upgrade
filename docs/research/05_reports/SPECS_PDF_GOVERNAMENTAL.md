# SPECS PDF GOVERNAMENTAL — Modelos Reais Aprovados pelo Cliente
## Sistema Upgrade | Robert S. Pimentel | Gravity 2.0 | 15/03/2026

> **CRÍTICO PARA O NEGÓCIO:** Estes são os modelos reais de PDF enviados pelo Robert.
> O PDF gerado pelo sistema DEVE corresponder exatamente a esses modelos.
> Se não corresponder, a secretaria do governo NÃO aceita e a empresa NÃO recebe o pagamento.
>
> **Referencia:** Lido obrigatoriamente antes de executar EXEC-05.

---

# HANDOFF S3-01 e S3-02 — TEMPLATES PDF REAIS
## Para o Antygravity executar · Gravity 2.0 · 15/03/2026

> Os modelos reais chegaram do Robert (3 arquivos).
> Este handoff descreve EXATAMENTE o que muda no PdfService.
> A lógica de dados (queries Prisma) está CORRETA — não tocar.
> Substituir APENAS as funções buildFrequencyHtml() e buildConcludentsHtml().

---

## TASK S3-01: buildFrequencyHtml() — MODELO REAL

### Estrutura real (extraída do PDF FREQUENCIA_CORTE_E_COSTURA.pdf)

**Cabeçalho (topo da página):**
- Faixa com 4 logos em linha: SETRE | Governo do Piauí (Aqui tem Trabalho) | UPGRADE | (brasão)
- Abaixo: bloco de texto alinhado à direita com endereço, site, CNPJ da Upgrade
- Título centralizado em negrito: cidade e período (ex: "PARNAÍBA – PI, DE 12 DE JANEIRO À 11 DE FEVEREIRO")

**Tabela principal:**
- Header da tabela: fundo amarelo-ouro com texto escuro
  - Coluna 1: "Nº" (estreita)
  - Coluna 2: "NOME" (larga, ~40% da largura)
  - Demais colunas: UMA COLUNA POR DIA DE AULA com header = dia_semana abreviado (TER/QUA/QUI/SEX/SEG)
  - Subheader: número do dia do mês (13, 14, 15, 16, 19, 20...)
- Linhas: alternadas branco/azul claro
- Células de presença: "P" = presente, "F" = falta
- Células P: fundo azul, texto branco ou negrito
- Células F: sem destaque (fundo branco)
- NÃO tem coluna de % ou situação — só P/F por dia

**Rodapé:**
- Linha de assinatura centralizada
- Nome do instrutor em negrito + cargo abaixo (ex: "LUIZA PEREIRA DE SOUSA / Instrutor(a) Corte e Costura")

**Identificação da turma:**
- Linha de header antes da tabela: fundo azul-marinho com texto branco/amarelo
- Ex: "CORTE E COSTURA (1ª TURMA) 08:00H às 11:00H"

**Logos necessários (usar URLs do MinIO ou base64):**
- Logo SETRE (Secretaria do Trabalho e Emprego)
- Logo Governo do Piauí "Aqui Tem Trabalho, Aqui Tem Futuro"
- Logo UPGRADE Tecnologia Educacional
- Endereço/CNPJ da Upgrade no cabeçalho

**Importante:** O sistema deve buscar logo_url de SystemConfig.
Se não configurado, usar placeholder com texto.

---

### Mudança técnica necessária no buildFrequencyHtml()

**O que MUDA:**
1. Estrutura da tabela: de "colunas de contagem" para "uma coluna por dia de aula"
2. Cabeçalho: adicionar bloco de logos + endereço institucional
3. Identificação da turma: faixa colorida antes da tabela com nome do curso + turno + horário
4. Rodapé: assinatura simples (nome + cargo do instrutor)

**O que NÃO muda:**
- Queries Prisma (generateFrequencyReport permanece idêntico)
- Lógica de cálculo de presença/falta por aluno
- htmlToPdf() (Puppeteer)

**Dado adicional necessário na query** (adicionar em generateFrequencyReport):
```typescript
// Buscar todas as datas de aula registradas + quais alunos estavam presentes
attendances: {
  select: { studentId: true, date: true, present: true }, // present: true já inclui F
  // REMOVER o where: { present: true } — precisamos de P e F
}
```
Atualmente a query filtra só `where: { present: true }`. Para montar a tabela P/F por dia,
precisamos de TODOS os registros (presentes e ausentes).

---

## TASK S3-02: buildConcludentsHtml() — MODELO REAL

### Estrutura real (extraída do PDF CONCLUDENTES_MORRO_CABECA.pdf)

**Cabeçalho:**
- Mesmos 4 logos da frequência (SETRE + Gov.PI + Upgrade + brasão)
- Faixa escura: "MORRO CABEÇA NO TEMPO" (cidade)
- Subtítulo: "QUALIFICA PIAUÍ"

**Título central:**
- "LISTA DE CONCLUDENTES" com linha separadora abaixo
- Subtítulo: "NOME DO CURSO (TURNO HORÁRIO)"
  - Ex: "CABELEIREIRO BÁSICO (MANHÃ 08H)"

**Tabela de concludentes:**
- 2 colunas apenas: NOME | ASSINATURA
- Header: fundo escuro, texto branco, negrito
- Linhas numeradas (01, 02, 03...)
- Células de assinatura: espaço em branco para assinar fisicamente
- Sem % de frequência — lista pura de nomes

**Documento de desistentes (página separada):**
- Mesmo cabeçalho com logos
- Título: "LISTA DE DESISTENTES"
- Subtítulo: "NOME DO CURSO"
- Tabela: 1 coluna apenas (NOME) — sem assinatura
- Linhas numeradas

**Data e assinatura:**
- "Cidade, DD de mês de AAAA."
- Linha de assinatura com nome e cargo do instrutor abaixo

**Turmas separadas:**
- Uma lista por turno (manhã/tarde/tarde-noite)
- Título diferente por turno: "(MANHÃ 08H)", "(TARDE 13H)", "(TARDE 16H)"

---

### Mudança técnica em buildConcludentsHtml()

**O que MUDA:**
1. Tabela de aprovados: simplificar para apenas NOME + ASSINATURA (remover colunas de %)
2. Tabela de desistentes: só NOME (sem assinatura, sem %)
3. Cabeçalho: logos institucionais reais
4. Data por extenso no rodapé
5. Suporte a múltiplas turmas por período (separadas em seções)

**O que NÃO muda:**
- Queries Prisma (generateConcludentsList permanece)
- Lógica de classificação aprovado/desistente (≥75% vs <75%)
- htmlToPdf()

---

## TASK S3-03: PayrollService — Lógica da planilha CLT

### Estrutura real (extraída da imagem WhatsApp)

**Modelo da planilha de Diego Rafael — Buriti dos Montes:**
```
Instrutor: DIEGO RAFAEL DE OLIVEIRA PRAXEDES
Curso: REFRIGERAÇÃO E CLIMATIZAÇÃO
Cidade: BURITI DOS MONTES

DIÁRIAS:
  Período 1: 01/03 a 13/03 → R$ 1.560,00  (13 dias × R$120 = R$1.560)
  Período 2: 16/03 a 02/04 → R$ 2.160,00  (18 dias × R$120 = R$2.160)

PASSAGENS:
  Ida: 28/02 + Retorno: 13/02 → R$ 270,00
  Ida: 15/02 + Retorno: 02/04 → R$ 270,00

PERÍODO DO CURSO: 03/03 a 01/04

PAGAMENTOS (2 parcelas):
  1ª Parcela: R$ 1.830,00 em 27/02/2026
  2ª Parcela: R$ 2.430,00 em 13/03/2026

TOTAL: R$ 4.260,00

DADOS BANCÁRIOS: AG: 0001 · CC: 53241935-9 · PicPay
PIX (CPF): 39252346830 · STONE
```

**Regra de cálculo confirmada:**
- Diária = R$120/dia de permanência na cidade
- Passagem = valor fixo por viagem (ida + volta) → R$270 no exemplo (R$135 cada)
- Total = diárias + passagens (2 idas + 2 voltas para curso de 1 mês)
- Pagamento em 2 parcelas quinzenais (confirma regra da reunião 00:23:15)

**Para o PayrollService (GAP-02):**
```typescript
// Campos novos necessários em AcaoFuncionario ou Employee:
travelCostPerTrip Decimal @db.Decimal(10, 2)  // custo por viagem (ex: R$135)
// Cálculo completo:
diarias = dailyCost * daysWorked           // R$120 × dias
passagens = (parcelas * 2) * travelCostPerTrip  // ida+volta por parcela
total = salarioCLT_proporcional + diarias + passagens
```

---

## ARQUIVOS A MODIFICAR (para o Antygravity — EXEC-05)

```
backend/src/reports/pdf.service.ts
  - Reescrever buildFrequencyHtml() — nova estrutura de tabela P/F por dia + logos
  - Reescrever buildConcludentsHtml() — tabela NOME+ASSINATURA + desistentes separados
  - Modificar generateFrequencyReport() — remover where: { present: true } nas attendances
  - Adicionar generateConcludentsListByPeriod() — suporte a turno/período específico

backend/src/payroll/ (CRIAR DO ZERO — GAP-02)
  payroll.module.ts
  payroll.service.ts     — lógica diárias + passagens + salário CLT proporcional
  payroll.controller.ts  — endpoints de cálculo
  dto/calculate-cost.dto.ts
```

## COMANDOS APÓS IMPLEMENTAÇÃO

```powershell
cd backend
npm run build
npx tsc --noEmit
# Se build OK:
npm run start:dev
# Testar via Swagger: GET /reports/frequency/:classId
# Testar via Swagger: GET /reports/concludents/:classId
```

## DOD (Definition of Done)

- [ ] buildFrequencyHtml() gera tabela com colunas P/F por dia (não contagem)
- [ ] Cabeçalho com bloco de logos (ou placeholder bem formatado enquanto logo não vem)
- [ ] Turno e horário da turma aparecem no header da tabela
- [ ] buildConcludentsHtml() gera tabela NOME + ASSINATURA para aprovados
- [ ] Lista de desistentes separada (só NOME)
- [ ] Data por extenso no rodapé
- [ ] npm run build sem erros
- [ ] npx tsc --noEmit limpo

## BLOQUEADOR PARCIAL

Os logos reais (SETRE, Gov.PI, Upgrade) precisam ser adicionados ao MinIO
ou referenciados por URL pública. Enquanto não estiverem disponíveis,
usar texto formatado como placeholder — mas a estrutura já deve estar correta.

---

*Gravity 2.0 · Handoff S3-01/S3-02/S3-03 · Sistema Upgrade · 15/03/2026*
*Baseado nos modelos reais enviados por Robert S. Pimentel*
