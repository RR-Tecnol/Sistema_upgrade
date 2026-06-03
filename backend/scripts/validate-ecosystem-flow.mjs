/**
 * Validação E2E (API): período com motor → turma → calendário/diárias.
 * Uso: node scripts/validate-ecosystem-flow.mjs
 * Requer backend em http://localhost:3001 e credenciais admin no .env ou variáveis.
 */
const API = process.env.API_URL || 'http://localhost:3001/api';

async function req(method, path, body, token) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

async function login() {
    const email = process.env.ADMIN_EMAIL || 'admin@qualifica.com';
    const password = process.env.ADMIN_PASSWORD || 'RR@@Upgrade';
    const r = await req('POST', '/auth/login', { email, password });
    return r.access_token || r.accessToken;
}

async function main() {
    const checks = [];
    const ok = (name, detail = '') => {
        checks.push({ name, ok: true, detail });
        console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
    };
    const fail = (name, err) => {
        checks.push({ name, ok: false, detail: String(err) });
        console.error(`✗ ${name}:`, err);
    };

    let token;
    try {
        token = await login();
        ok('Login admin');
    } catch (e) {
        fail('Login admin', e.message);
        process.exit(1);
    }

    let groups, courses, cities, trucks;
    try {
        [groups, courses, cities, trucks] = await Promise.all([
            req('GET', '/groups', null, token),
            req('GET', '/courses', null, token),
            req('GET', '/cities', null, token),
            req('GET', '/trucks', null, token),
        ]);
        groups = Array.isArray(groups) ? groups : groups.data || [];
        courses = Array.isArray(courses) ? courses : courses.data || [];
        cities = Array.isArray(cities) ? cities : cities.data || [];
        trucks = Array.isArray(trucks) ? trucks : trucks.data || [];
        ok('1. Catálogo base', `${groups.length} grupos, ${courses.length} cursos, ${cities.length} cidades`);
    } catch (e) {
        fail('1. Catálogo base', e.message);
        process.exit(1);
    }

    const group = groups[0];
    const course = courses.find(c => c.active !== false && (c.workloadHours || 0) > 0) || courses[0];
    const city = cities.find(c => c.state === group?.state) || cities[0];
    const truck = trucks.find(t => t.state === group?.state) || trucks[0];
    if (!group || !course || !city) {
        fail('Dados mínimos', 'grupo/curso/cidade ausentes');
        process.exit(1);
    }
    if (!(course.workloadHours > 0)) {
        fail('2. Curso (carga horária)', 'curso sem workloadHours — motor não calcula');
        process.exit(1);
    }
    ok('2. Curso referência', `${course.name} · ${course.workloadHours}h`);

    const startDate = '2026-06-02';
    let acao;
    try {
        const preview = await req(
            'POST',
            '/classes/preview-end-date',
            {
                startDate,
                courseId: course.id,
                groupId: group.id,
                cityId: city.id,
                weekendPolicy: 'WEEKDAYS_ONLY',
                startTime: '07:00',
                endTime: '12:00',
            },
            token,
        );
        acao = await req(
            'POST',
            '/acoes',
            {
                nome: `Validação motor ${Date.now()}`,
                cidadeNome: city.name,
                cidadeId: city.id,
                grupoId: group.id,
                carretaId: truck?.id,
                motorCourseId: course.id,
                period: 'MORNING',
                startTime: '07:00',
                endTime: '12:00',
                weekendPolicy: 'WEEKDAYS_ONLY',
                dataInicio: startDate,
                dataFim: preview.endDate,
                status: 'PLANEJADA',
                permitirInscricoes: true,
            },
            token,
        );
        const acaoFull = await req('GET', `/acoes/${acao.id}`, null, token);
        if (acaoFull.motorCourseId !== course.id) throw new Error('motorCourseId não persistiu');
        if (acaoFull.period !== 'MORNING') throw new Error('period não persistiu');
        if (!acaoFull.carretaId && truck?.id) throw new Error('carretaId não persistiu');
        ok('3. Período + motor (modal)', `id=${acao.id} fim=${preview.endDate} · turno Manhã`);
    } catch (e) {
        fail('3. Período + motor', e.message);
        process.exit(1);
    }

    let turma;
    try {
        const abbr = course.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
        turma = await req(
            'POST',
            '/classes',
            {
                courseId: course.id,
                groupId: group.id,
                cityId: city.id,
                classIdentifier: `${abbr}-VAL-${Date.now()}`,
                startDate,
                endDate: acao.dataFim?.slice(0, 10),
                period: 'MORNING',
                startTime: '07:00',
                endTime: '12:00',
                vacancies: 25,
                status: 'PLANNED',
                useAutoEndDate: false,
                acaoId: acao.id,
            },
            token,
        );
        const turmaFull = await req('GET', `/classes/${turma.id}`, null, token);
        const acaoFim = acao.dataFim?.slice(0, 10);
        const turmaFim = String(turmaFull.endDate).slice(0, 10);
        if (turmaFim !== acaoFim) throw new Error(`turma fim ${turmaFim} ≠ período ${acaoFim}`);
        if (turmaFull.weekendPolicy !== 'WEEKDAYS_ONLY') throw new Error('turma não herdou weekendPolicy');
        const links = await req('GET', `/acoes/${acao.id}`, null, token);
        const nTurmas = links.turmas?.length ?? links._count?.turmas ?? 0;
        if (nTurmas < 1) throw new Error('vínculo acao_turma ausente');
        ok('4. Turma no período', `${turma.classIdentifier} · sincronizada com período`);
    } catch (e) {
        fail('4. Turma no período', e.message);
        process.exit(1);
    }

    let resumo;
    try {
        resumo = await req('GET', `/acoes/${acao.id}/calendario-resumo`, null, token);
        if (resumo.diasLetivos > 0 && resumo.diasLetivos <= resumo.diasCorridos) {
            ok('5. Motor → diárias (calendário)', `${resumo.diasLetivos} letivos / ${resumo.diasCorridos} corridos`);
        } else {
            fail('5. Motor → diárias', JSON.stringify(resumo));
        }
    } catch (e) {
        fail('5. Motor → diárias', e.message);
    }

    try {
        const disp = await req(
            'GET',
            `/acoes/${acao.id}/funcionarios/disponiveis?page=1&limit=12`,
            null,
            token,
        );
        if (!Array.isArray(disp.employees)) throw new Error('resposta disponiveis inválida');
        if (disp.totalPages == null || disp.page !== 1) throw new Error('paginação ausente');
        ok('6. Disponíveis paginados', `${disp.total} funcionário(s) · ${disp.employees.length} na página`);

        const emp = disp.employees[0];
        if (!emp) throw new Error('nenhum funcionário disponível');
        const valorDiaria = Number(emp.dailyCost) > 0 ? Number(emp.dailyCost) : 120;
        const vinc = await req(
            'POST',
            `/acoes/${acao.id}/funcionarios`,
            { employeeId: emp.id, valorDiaria },
            token,
        );
        const dias = vinc.diasTrabalhados;
        const sugerido = resumo?.suggestedDiasPagamento ?? resumo?.diasLetivos;
        const roleFx = vinc.roleEffects ? 'roleEffects ok' : 'sem roleEffects';
        if (dias > 0 && (sugerido == null || Math.abs(dias - sugerido) <= 2)) {
            ok('7. Vínculo unificado', `${emp.name}: ${dias} dias (motor≈${sugerido}) · ${roleFx}`);
        } else {
            fail('7. Vínculo unificado', `dias=${dias} sugerido=${sugerido}`);
        }
    } catch (e) {
        fail('6–7. Equipe no período', e.message);
    }

    const failed = checks.filter(c => !c.ok);
    console.log('\n---');
    console.log(
        failed.length
            ? `FALHOU: ${failed.length} etapa(s)`
            : 'Fluxo E2E OK: Curso → Período (motor) → Turma → Funcionário (diárias).',
    );
    process.exit(failed.length ? 1 : 0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
