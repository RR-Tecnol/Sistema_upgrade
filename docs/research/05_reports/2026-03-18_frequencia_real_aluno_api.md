# PESQ-F2-02 — Frequência Real via API REST (Motor Analítico)
## Deep Research Result | Sistema Upgrade | 18/03/2026
## Enriquece: EXEC-04

> Pesquisa sobre como calcular e expor frequência real do aluno via API, substituindo o mock hardcoded de 87%.
> Base legal: LDB Art. 24, inciso VI — frequência mínima de 75% para aprovação.

---

## 1. FUNDAMENTO LEGAL — A MATEMÁTICA DA LDB

A aprovação está condicionada a 75% de frequência (não 80% como estava em docs antigas).
Isso é lei federal — não pode ser alterado sem impacto no contrato B2G.

As variáveis formais do cálculo:
- `T_planejadas` = total de aulas previstas (derivado do intervalo startDate→endDate da Class)
- `F_permitidas` = floor(T_planejadas × 0.25) — limite absoluto de faltas
- `P` = presenças validadas (present: true)
- `A_injustificadas` = ausências sem respaldo (present: false, justified: false)
- `A_justificadas` = ausências com atestado (present: false, justified: true)
- `F_atuais` = A_injustificadas + A_justificadas (falta justificada AINDA CONTA para reprovar)
- `F_restantes` = F_permitidas - F_atuais
- `R_atual` = (P / (P + F_atuais)) × 100 — calculado sobre aulas JÁ realizadas

**Ponto crítico:** falta justificada conta para o limite de 75% da LDB. O campo `justified: true`
serve apenas para fins pedagógicos internos (compensação domiciliar), não para isentar o aluno
da reprovação por falta. Sistemas que ignoram isso criam divergências nas auditorias do TCE/MEC.

**Proteção contra divisão por zero:** Se nenhuma aula foi ministrada ainda (P + F_atuais = 0),
retornar `status: "NO_DATA"` em vez de calcular 0/0. Nunca lançar exceção em produção.

---

## 2. TRATAMENTO DE MÚLTIPLAS TURMAS

Um aluno pode estar matriculado em várias turmas simultâneas. A frequência NUNCA deve ser
agregada globalmente — aprovação em Mecânica Diesel não compensa reprovação em Segurança do Trabalho.

**Regra:** Retornar um array de sumários, um por turma onde:
- Enrollment.status IN ['ENROLLED', 'APPROVED']
- Class.status IN ['IN_PROGRESS', 'COMPLETED']
- Turmas PLANNED são excluídas — sem histórico de presença para calcular

No frontend: um card de gauge circular por turma, não um gauge global único.

---

## 3. A QUERY OTIMIZADA (sem problema N+1)

O problema N+1 aqui seria: buscar turmas (1 query) + loop para contar presenças/faltas de cada
turma separadamente (N queries). Com 4 turmas = 13 queries. Com 1000 alunos no dashboard = 13.000 queries.

**Solução em 2 queries analíticas:**

**Query 1 — Elegibilidade (1 query plana):**
```typescript
const activeEnrollments = await prisma.enrollment.findMany({
  where: {
    studentId: currentStudent.id,
    status: { in: ['ENROLLED', 'APPROVED'] },
    class: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } }
  },
  select: {
    classId: true,
    class: { select: { startDate: true, endDate: true, status: true } }
  }
});
const validClassIds = activeEnrollments.map(e => e.classId);
```

**Query 2 — Agregação combinatória (1 query analítica via groupBy):**
```typescript
const rawAttendances = await prisma.attendance.groupBy({
  by: ['classId', 'present', 'justified'],
  where: {
    studentId: currentStudent.id,
    classId: { in: validClassIds }
  },
  _count: { _all: true }
});
```

O PostgreSQL retorna 2-3 objetos por turma (ex: { classId, present: true, justified: false, _count: 12 }).
O Node.js reduz esses grupos com um `.reduce()` — complexidade O(N) microscópica.
Total: 2 queries para qualquer número de turmas. Sem N+1.

---

## 4. ESTRUTURA DE RETORNO (payload JSON tipado)

```typescript
// GET /students/me/attendance-summary
interface AttendanceSummary {
  studentId: string;
  summaries: ClassAttendanceSummary[];
}

interface ClassAttendanceSummary {
  classId: string;
  className: string;         // nome do curso
  classStatus: string;       // IN_PROGRESS | COMPLETED
  totalClasses: number;      // aulas já ministradas
  presentCount: number;      // P
  absentCount: number;       // A_injustificadas + A_justificadas
  justifiedAbsences: number; // A_justificadas (informativo)
  attendanceRate: number;    // R_atual em percentual (ex: 87.5)
  remainingAllowedAbsences: number; // F_restantes
  isApproved: boolean;       // attendanceRate >= 75
  uiStatus: 'NO_DATA' | 'SAFE' | 'AT_RISK' | 'APPROVED';
}
```

---

## 5. ESTADOS VISUAIS DO GAUGE CIRCULAR

**NO_DATA (cinza):** Nenhuma aula registrada ainda. Mostrar ícone de calendário no centro.
Evita pânico do aluno que acessa na primeira semana com 0% aparente.

**AT_RISK (vermelho/laranja):** Acionado quando `attendanceRate < 75` OU `remainingAllowedAbsences <= 3`.
O operador OR é intencional — alerta mesmo quando o percentual ainda está acima de 75%, se as
faltas restantes estão acabando. Copy sugerida: "Atenção: Você corre risco de reprovação."

**SAFE (verde/ciano):** `attendanceRate >= 75` com margem confortável. Reforço positivo.
Mostra o percentual numérico no centro do gauge.

**APPROVED (verde esmeralda):** Turma com status COMPLETED e frequência aprovada. Estado final.

---

## 6. ENDPOINT A CRIAR NO NESTJS

```
GET /students/me/attendance-summary
Guard: JwtAuthGuard (qualquer role autenticado)
```

O service recebe `req.user.id`, busca o Student associado, executa as 2 queries acima,
reduz os dados e retorna o array tipado. O endpoint não deve expor dados de outros alunos.

---

*PESQ-F2-02 | Concluída em 18/03/2026 | Enriquece EXEC-04*
*Implementação: criar endpoint GET /students/me/attendance-summary + conectar ao gauge do dashboard do aluno*
