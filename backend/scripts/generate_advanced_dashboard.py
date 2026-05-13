#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import xlsxwriter
from xlsxwriter.utility import xl_col_to_name


COLORS = {
    "primary": "#FFD600",
    "contrast": "#1E3A8A",
    "contrast_dark": "#1A3A6A",
    "success": "#059669",
    "danger": "#DC2626",
    "warning": "#F59E0B",
    "bg": "#FFFBEA",
    "card": "#FFFDF2",
    "text": "#111827",
    "muted": "#64748B",
    "border": "#D1D5DB",
}


def _safe(v, fallback=""):
    return fallback if v is None else v


def _parse_date(s):
    return datetime.strptime(s, "%Y-%m-%d").date()


def _period_days(start_s, end_s):
    s = _parse_date(start_s)
    e = _parse_date(end_s)
    if e < s:
        s, e = e, s
    return (e - s).days + 1


def _status_band(pct):
    if pct >= 80:
        return "VERDE"
    if pct >= 60:
        return "ATENÇÃO"
    return "CRÍTICO"


def _col(idx):
    return xl_col_to_name(idx)


def _mk_formats(wb):
    return {
        "title": wb.add_format({"bold": True, "font_size": 20, "font_color": COLORS["text"], "bg_color": COLORS["bg"]}),
        "subtitle": wb.add_format({"font_size": 10, "font_color": COLORS["text"]}),
        "section": wb.add_format({"bold": True, "font_size": 14, "font_color": COLORS["contrast_dark"]}),
        "kpi_t": wb.add_format(
            {
                "bold": True,
                "font_size": 10,
                "font_color": COLORS["text"],
                "bg_color": COLORS["card"],
                "top": 1,
                "left": 1,
                "right": 1,
                "border_color": COLORS["border"],
                "align": "center",
                "valign": "vcenter",
            }
        ),
        "kpi_v": wb.add_format(
            {
                "bold": True,
                "font_size": 24,
                "font_color": COLORS["text"],
                "bg_color": COLORS["card"],
                "bottom": 1,
                "left": 1,
                "right": 1,
                "border_color": COLORS["border"],
                "align": "center",
                "valign": "vcenter",
            }
        ),
        "kpi_v_pct": wb.add_format(
            {
                "bold": True,
                "font_size": 24,
                "font_color": COLORS["text"],
                "bg_color": COLORS["card"],
                "bottom": 1,
                "left": 1,
                "right": 1,
                "border_color": COLORS["border"],
                "align": "center",
                "valign": "vcenter",
                "num_format": "0.0%",
            }
        ),
        "kpi_delta": wb.add_format(
            {
                "bold": True,
                "font_size": 10,
                "font_color": COLORS["text"],
                "align": "center",
                "valign": "vcenter",
            }
        ),
        "hdr": wb.add_format(
            {
                "bold": True,
                "bg_color": COLORS["primary"],
                "font_color": "#FFFFFF",
                "border": 1,
                "align": "center",
                "valign": "vcenter",
            }
        ),
        "cell": wb.add_format({"border": 1, "border_color": "#E5E7EB", "align": "center", "valign": "vcenter"}),
        "cell_name": wb.add_format(
            {"border": 1, "border_color": "#E5E7EB", "align": "left", "valign": "vcenter", "bold": True}
        ),
        "insight": wb.add_format({"font_size": 10, "font_color": "#334155", "text_wrap": True, "valign": "top", "locked": False}),
        "insight_box": wb.add_format({"bg_color": COLORS["card"], "border": 1, "border_color": "#E2E8F0"}),
        "progress_text": wb.add_format({"font_size": 9, "font_color": "#334155"}),
        "link": wb.add_format({"font_color": COLORS["contrast_dark"], "underline": 1, "bold": True, "bg_color": COLORS["bg"], "locked": False}),
        "bg_fill": wb.add_format({"bg_color": COLORS["bg"]}),
    }


def _student_metrics(payload):
    students = payload.get("students", []) or []
    lesson_dates = payload.get("lessonDates", []) or []
    matrix = (payload.get("matrix", {}) or {}).get("byStudent", {}) or {}
    summary = payload.get("summary", {}) or {}
    period = payload.get("period", {}) or {}
    prev = payload.get("prevSummary", {}) or {}

    total = int(summary.get("totalAlunos", len(students)) or 0)
    risk = int(summary.get("emRisco", 0) or 0)
    approved = int(summary.get("aprovados", 0) or 0)
    avg_pct = float(summary.get("mediaPercentualTurma", 0) or 0)
    risk_pct = (risk / total * 100) if total else 0
    prev_risk = int(prev.get("emRisco", 0) or 0)
    prev_total = int(prev.get("totalAlunos", 0) or 0)
    prev_risk_pct = (prev_risk / prev_total * 100) if prev_total else 0
    risk_pp_delta = risk_pct - prev_risk_pct

    total_faltas = sum(int(s.get("faltas", 0) or 0) for s in students)
    top3 = sorted(students, key=lambda s: int(s.get("faltas", 0) or 0), reverse=True)[:3]
    top3_faltas = sum(int(s.get("faltas", 0) or 0) for s in top3)
    top3_concentration = (top3_faltas / total_faltas * 100) if total_faltas else 0

    critical = min(students, key=lambda s: float(s.get("percentual", 0) or 0), default=None)
    critical_name = _safe(critical.get("nome"), "—") if critical else "—"
    critical_pct = float(critical.get("percentual", 0) or 0) if critical else 0

    start_s = _safe(period.get("start"), "")
    end_s = _safe(period.get("end"), "")
    expected_days = _period_days(start_s, end_s) if start_s and end_s else max(1, len(lesson_dates))
    launched_days = len(lesson_dates)
    coverage_pct = (launched_days / expected_days * 100) if expected_days else 0

    daily_ratio = []
    for d in lesson_dates:
        marked = 0
        present = 0
        for st in students:
            sid = st.get("studentId")
            by_day = matrix.get(sid, {}) if isinstance(matrix, dict) else {}
            if d in by_day:
                marked += 1
                if bool(by_day[d]):
                    present += 1
        daily_ratio.append((present / marked * 100) if marked else 0)
    last7 = daily_ratio[-7:] if len(daily_ratio) >= 1 else []
    prev7 = daily_ratio[-14:-7] if len(daily_ratio) >= 8 else []
    avg_last7 = sum(last7) / len(last7) if last7 else 0
    avg_prev7 = sum(prev7) / len(prev7) if prev7 else 0
    trend7_pp = avg_last7 - avg_prev7

    below60 = sum(1 for s in students if float(s.get("percentual", 0) or 0) < 60)
    target_pct = (approved / total * 100) if total else 0

    insights = [
        f"Cobertura de lançamento: {launched_days} de {expected_days} dias ({coverage_pct:.1f}%).",
        f"Risco geral: {risk} alunos em risco (<80%), equivalente a {risk_pct:.1f}% da base.",
        f"Mudança vs período anterior: risco {'subiu' if risk_pp_delta >= 0 else 'caiu'} {abs(risk_pp_delta):.1f} p.p.",
        f"Concentração de faltas: top 3 concentram {top3_concentration:.1f}% das faltas totais.",
        f"Pessoa crítica: {critical_name} com {critical_pct:.1f}% de frequência.",
        f"Tendência 7 dias: {'alta' if trend7_pp >= 0 else 'queda'} de {abs(trend7_pp):.1f} p.p. na presença média.",
        f"Meta certificação: {approved} de {total} atingindo >=80% ({target_pct:.1f}%).",
        f"Ação recomendada: priorizar {below60} aluno(s) <60% e revisar {max(0, expected_days-launched_days)} dia(s) sem lançamento.",
    ]

    dist_ge80 = sum(1 for s in students if float(s.get("percentual", 0) or 0) >= 80)
    dist_60_79 = sum(1 for s in students if 60 <= float(s.get("percentual", 0) or 0) < 80)
    dist_lt60 = sum(1 for s in students if float(s.get("percentual", 0) or 0) < 60)
    return {
        "total": total,
        "approved": approved,
        "risk": risk,
        "avg_pct": avg_pct,
        "risk_pct": risk_pct,
        "risk_pp_delta": risk_pp_delta,
        "coverage_pct": coverage_pct,
        "launched_days": launched_days,
        "expected_days": expected_days,
        "trend7_pp": trend7_pp,
        "below60": below60,
        "insights": insights,
        "dist": (dist_ge80, dist_60_79, dist_lt60),
        "daily_ratio": daily_ratio,
    }


def _build_student(payload, output_xlsx: Path):
    wb = xlsxwriter.Workbook(str(output_xlsx))
    fmt = _mk_formats(wb)
    class_info = payload.get("classInfo", {}) or {}
    period = payload.get("period", {}) or {}
    lesson_dates = payload.get("lessonDates", []) or []
    students = payload.get("students", []) or []
    matrix = (payload.get("matrix", {}) or {}).get("byStudent", {}) or {}
    m = _student_metrics(payload)

    course = _safe((class_info.get("course", {}) or {}).get("name"), "Curso")
    turma = _safe(class_info.get("classIdentifier"), "TURMA")
    city = class_info.get("city", {}) or {}
    city_label = f"{_safe(city.get('name'), '-')}/{_safe(city.get('state'), '-')}"
    p_start = _safe(period.get("start"), "")
    p_end = _safe(period.get("end"), "")

    dash = wb.add_worksheet("Dash_Executive")
    dash.hide_gridlines(2)
    base_painel = wb.add_worksheet("Base_Painel")
    base_alunos = wb.add_worksheet("Base_Alunos")
    base_matriz = wb.add_worksheet("Base_Matriz")
    model = wb.add_worksheet("Model_Metrics")
    dash_anal = wb.add_worksheet("Dash_Analitico")

    for ws in (base_painel, base_alunos, base_matriz, model):
        ws.hide()

    # Base data
    base_painel.write_column("A1", ["Infos", "", "", "Total", "", ">=80%", "Risco", "Média %"])
    base_painel.write_column("B1", ["", "", "", m["total"], "", m["approved"], m["risk"], m["avg_pct"]])
    base_alunos.write_row("A1", ["ID", "Nome", "CPF", "ID Aluno", "P", "F", "%", "Status"])
    for i, st in enumerate(students, start=2):
        pct = float(st.get("percentual", 0) or 0) / 100.0
        base_alunos.write_row(
            i - 1,
            0,
            [
                int(st.get("ordem", i - 1)),
                _safe(st.get("nome"), "—"),
                _safe(st.get("cpf"), ""),
                _safe(st.get("studentId"), ""),
                int(st.get("presencas", 0)),
                int(st.get("faltas", 0)),
                pct,
                _status_band(pct * 100),
            ],
        )

    base_matriz.write_row(0, 0, ["Ordem", "Nome"] + [d[5:] for d in lesson_dates])
    for i, st in enumerate(students, start=2):
        sid = st.get("studentId")
        row = [int(st.get("ordem", i - 1)), _safe(st.get("nome"), "—")]
        by_day = matrix.get(sid, {}) if isinstance(matrix, dict) else {}
        for d in lesson_dates:
            row.append("P" if d in by_day and bool(by_day[d]) else ("F" if d in by_day else ""))
        base_matriz.write_row(i - 1, 0, row)

    model.write_row("A1", ["Metric", "Value"])
    model.write_row("A2", ["Cobertura", m["coverage_pct"] / 100.0])
    model.write_row("A3", ["Risco%", m["risk_pct"] / 100.0])
    model.write_row("A4", ["Risco pp Δ", m["risk_pp_delta"] / 100.0])
    model.write_row("A5", ["Trend7 pp", m["trend7_pp"] / 100.0])
    model.write_row("A7", ["Dist >=80", m["dist"][0]])
    model.write_row("A8", ["Dist 60-79", m["dist"][1]])
    model.write_row("A9", ["Dist <60", m["dist"][2]])
    model.write_row("D1", ["Data", "Taxa"])
    for i, d in enumerate(lesson_dates, start=2):
        model.write_row(i - 1, 3, [d, m["daily_ratio"][i - 2] / 100.0 if i - 2 < len(m["daily_ratio"]) else 0])

    # Dashboard layout
    dash.set_column("A:A", 2)
    dash.set_column("B:B", 32)
    dash.set_column("C:E", 12)
    dash.set_column("F:F", 10)
    dash.set_column("G:Q", 4.8)
    dash.set_column("R:Y", 14)
    dash.set_default_row(20)
    dash.set_row(1, 32)
    dash.set_row(2, 22)
    dash.set_row(7, 24)

    dash.merge_range("B2:F2", "DASHBOARD DE FREQUÊNCIA E RETENÇÃO", fmt["title"])
    dash.merge_range("B3:M3", f"{course} · {turma} · {city_label} · {p_start} até {p_end}", fmt["subtitle"])

    dash.write("B5", "Total de Alunos", fmt["kpi_t"])
    dash.write_number("B6", m["total"], fmt["kpi_v"])
    dash.write("C5", "Média Turma", fmt["kpi_t"])
    dash.write_number("C6", m["avg_pct"] / 100.0, fmt["kpi_v_pct"])
    dash.write("D5", "Acima de 80%", fmt["kpi_t"])
    dash.write_number("D6", m["approved"], fmt["kpi_v"])
    dash.write("E5", "Em Risco (<80%)", fmt["kpi_t"])
    dash.write_number("E6", m["risk"], fmt["kpi_v"])

    risk_dir = "▲" if m["risk_pp_delta"] >= 0 else "▼"
    trend_dir = "▲" if m["trend7_pp"] >= 0 else "▼"
    dash.write("B7", f"{risk_dir} {abs(m['risk_pp_delta']):.1f} p.p.", fmt["kpi_delta"])
    dash.write("C7", f"{trend_dir} {abs(m['trend7_pp']):.1f} p.p.", fmt["kpi_delta"])
    dash.write("D7", f"{(m['approved'] / m['total'] * 100) if m['total'] else 0:.1f}%", fmt["kpi_delta"])
    dash.write("E7", f"{(m['risk'] / m['total'] * 100) if m['total'] else 0:.1f}%", fmt["kpi_delta"])

    table_header_row = 12
    table_start_row = table_header_row + 1
    headers = ["Nome do Aluno", "Freq %", "P", "F", "Trend"] + [f"{d[8:10]}/{d[5:7]}" for d in lesson_dates]
    for c, h in enumerate(headers, start=1):
        dash.write(table_header_row - 1, c, h, fmt["hdr"])

    max_rows = max(8, len(students))
    for i in range(max_rows):
        row = table_start_row + i
        if i < len(students):
            st = students[i]
            sid = st.get("studentId")
            pct = float(st.get("percentual", 0) or 0) / 100.0
            pres = int(st.get("presencas", 0) or 0)
            falt = int(st.get("faltas", 0) or 0)
            by_day = matrix.get(sid, {}) if isinstance(matrix, dict) else {}
            dash.write_string(row - 1, 1, _safe(st.get("nome"), "—"), fmt["cell_name"])
            dash.write_number(row - 1, 2, pct, fmt["cell"])
            dash.write_number(row - 1, 3, pres, fmt["cell"])
            dash.write_number(row - 1, 4, falt, fmt["cell"])
            dash.write_string(row - 1, 5, "▲" if pct >= 0.8 else "▼", fmt["cell"])
            if lesson_dates:
                start_col = 6
                for d_idx, d in enumerate(lesson_dates):
                    v = "P" if d in by_day and bool(by_day[d]) else ("F" if d in by_day else "")
                    dash.write_string(row - 1, start_col + d_idx, v, fmt["cell"])
        else:
            dash.write_blank(row - 1, 1, None, fmt["cell_name"])
            for c in range(2, 6 + len(lesson_dates)):
                dash.write_blank(row - 1, c, None, fmt["cell"])

    last_row = table_header_row + max_rows
    if lesson_dates:
        dash.autofilter(table_header_row - 1, 1, last_row, 6 + len(lesson_dates))
    else:
        dash.autofilter(table_header_row - 1, 1, last_row, 6)
    dash.conditional_format(f"C{table_start_row}:C{last_row}", {"type": "data_bar", "bar_color": COLORS["primary"]})
    if lesson_dates:
        end_letter = _col(6 + len(lesson_dates))
        start_letter = _col(6)
        dash.conditional_format(f"{start_letter}{table_start_row}:{end_letter}{last_row}", {"type": "cell", "criteria": "==", "value": '"P"', "format": wb.add_format({"bg_color": "#D1FAE5", "font_color": "#065F46", "bold": True})})
        dash.conditional_format(f"{start_letter}{table_start_row}:{end_letter}{last_row}", {"type": "cell", "criteria": "==", "value": '"F"', "format": wb.add_format({"bg_color": "#FEE2E2", "font_color": "#991B1B", "bold": True})})

    # Diagnóstico sempre após a tabela (fluxo visual linear)
    diag_header_row = last_row + 3
    diag_start_row = diag_header_row + 1
    dash.write(f"B{diag_header_row}", "DIAGNÓSTICO DO PERÍODO", fmt["section"])
    insight_count = min(8, len(m["insights"]))
    for i, txt in enumerate(m["insights"][:insight_count], start=diag_start_row):
        dash.merge_range(i - 1, 1, i - 1, 12, txt, fmt["insight_box"])
        dash.write(i - 1, 1, txt, fmt["insight"])
    diag_end_row = diag_start_row + insight_count - 1

    # Gráfico 1 (linha) no mesmo nível do diagnóstico, à direita.
    line_chart_row = diag_header_row
    line = wb.add_chart({"type": "line"})
    if lesson_dates:
        end_idx = 1 + len(lesson_dates)
        line.add_series({"name": "Presença diária", "categories": ["Model_Metrics", 1, 3, end_idx, 3], "values": ["Model_Metrics", 1, 4, end_idx, 4], "line": {"color": COLORS["contrast_dark"]}})
    line.set_title({"name": "Série temporal (presença)"})
    line.set_y_axis({"num_format": "0%"})
    line.set_size({"width": 320, "height": 185})
    dash.insert_chart(f"N{line_chart_row}", line)

    # Gráficos 2 e 3 logo abaixo (lado a lado), sem afastamento excessivo.
    charts_base_row = max(diag_end_row + 2, line_chart_row + 11)
    donut = wb.add_chart({"type": "doughnut"})
    donut.add_series({"name": "Situação", "categories": ["Model_Metrics", 6, 0, 8, 0], "values": ["Model_Metrics", 6, 1, 8, 1], "points": [{"fill": {"color": COLORS["success"]}}, {"fill": {"color": COLORS["warning"]}}, {"fill": {"color": COLORS["danger"]}}]})
    donut.set_title({"name": "Engajamento Global"})
    donut.set_size({"width": 320, "height": 205})
    dash.insert_chart(f"B{charts_base_row}", donut)

    col = wb.add_chart({"type": "column"})
    col.add_series({"name": "Distribuição", "categories": ["Model_Metrics", 6, 0, 8, 0], "values": ["Model_Metrics", 6, 1, 8, 1]})
    col.set_title({"name": "Faixas de Risco"})
    col.set_size({"width": 320, "height": 185})
    dash.insert_chart(f"J{charts_base_row}", col)

    # Dash analítico / operacional
    dash_anal.set_column("A:A", 2)
    dash_anal.set_column("B:B", 30)
    dash_anal.set_column("C:H", 12)
    dash_anal.write("B2", "VISÃO ANALÍTICA E OPERACIONAL", fmt["section"])
    dash_anal.write("B3", "Ranking de risco e lista de ação para administração", fmt["subtitle"])
    dash_anal.write_row("B5", ["Nome", "Freq %", "P", "F", "Status", "Ação"], fmt["hdr"])
    order = sorted(students, key=lambda s: float(s.get("percentual", 0) or 0))
    for i, st in enumerate(order[:30], start=6):
        pct = float(st.get("percentual", 0) or 0)
        status = _status_band(pct)
        action = "Contatar e plano de recuperação" if pct < 60 else ("Monitorar semanalmente" if pct < 80 else "Manter acompanhamento")
        dash_anal.write_row(i - 1, 1, [_safe(st.get("nome"), "—"), pct / 100.0, int(st.get("presencas", 0)), int(st.get("faltas", 0)), status, action], fmt["cell"])
    dash_anal.conditional_format("C6:C40", {"type": "data_bar", "bar_color": COLORS["primary"]})
    dash_anal.autofilter(4, 1, 40, 7)
    dash_anal.conditional_format("F6:F40", {"type": "text", "criteria": "containing", "value": "VERDE", "format": wb.add_format({"bg_color": "#DCFCE7", "font_color": "#166534"})})
    dash_anal.conditional_format("F6:F40", {"type": "text", "criteria": "containing", "value": "ATENÇÃO", "format": wb.add_format({"bg_color": "#FEF3C7", "font_color": "#B45309"})})
    dash_anal.conditional_format("F6:F40", {"type": "text", "criteria": "containing", "value": "CRÍTICO", "format": wb.add_format({"bg_color": "#FEE2E2", "font_color": "#991B1B"})})

    wb.define_name("kpi_total", "=Base_Painel!$B$4")
    wb.define_name("kpi_media", "=Base_Painel!$B$8")
    wb.define_name("kpi_risco", "=Base_Painel!$B$7")

    wb.close()


def _employee_metrics(payload):
    recs = payload.get("records", []) or []
    summary = payload.get("summary", {}) or {}
    total = int(summary.get("totalFuncionarios", len(recs)) or 0)
    risk = int(summary.get("emRisco", 0) or 0)
    above = int(summary.get("acima80", 0) or 0)
    avg_pct = float(summary.get("mediaPercentual", 0) or 0)
    risk_pct = (risk / total * 100) if total else 0
    below60 = sum(1 for r in recs if float(r.get("percentual", 0) or 0) < 60)
    total_abs = sum(int(r.get("faltas", 0) or 0) for r in recs)
    top3 = sorted(recs, key=lambda r: int(r.get("faltas", 0) or 0), reverse=True)[:3]
    top3_abs = sum(int(r.get("faltas", 0) or 0) for r in top3)
    conc = (top3_abs / total_abs * 100) if total_abs else 0
    critical = min(recs, key=lambda r: float(r.get("percentual", 0) or 0), default=None)
    c_name = _safe(critical.get("nome"), "—") if critical else "—"
    c_pct = float(critical.get("percentual", 0) or 0) if critical else 0
    insights = [
        f"Cobertura operacional: {total} colaboradores monitorados no período.",
        f"Risco geral: {risk} em risco (<80%), equivalente a {risk_pct:.1f}% da base.",
        f"Concentração de faltas: top 3 concentram {conc:.1f}% das faltas.",
        f"Pessoa crítica: {c_name} com {c_pct:.1f}% de assiduidade.",
        f"Meta >=80%: {above} de {total} ({(above/total*100 if total else 0):.1f}%).",
        f"Faixa crítica (<60%): {below60} colaborador(es).",
        f"Régua visual aplicada: verde >=80, atenção 60-79, crítico <60.",
        f"Ação recomendada: focar coaching em {below60} críticos + validar justificativas pendentes.",
    ]
    return {"total": total, "risk": risk, "above": above, "avg_pct": avg_pct, "insights": insights, "below60": below60}


def _build_employee(payload, output_xlsx: Path):
    wb = xlsxwriter.Workbook(str(output_xlsx))
    fmt = _mk_formats(wb)
    meta = payload.get("meta", {}) or {}
    recs = payload.get("records", []) or []
    m = _employee_metrics(payload)

    role_label = _safe(meta.get("roleLabel"), "Funcionários")
    p_start = _safe(meta.get("start"), "")
    p_end = _safe(meta.get("end"), "")

    dash = wb.add_worksheet("Dash_Executive")
    dash.hide_gridlines(2)
    base_painel = wb.add_worksheet("Base_Painel")
    base_func = wb.add_worksheet("Base_Funcionarios")
    dash_ops = wb.add_worksheet("Dash_Operacional")
    base_painel.hide()
    base_func.hide()

    base_painel.write_column("A4", ["Total", "Média %", ">=80%", "Risco"])
    base_painel.write_column("B4", [m["total"], m["avg_pct"], m["above"], m["risk"]])
    base_func.write_row("A1", ["#", "Nome", "Perfil", "P", "F", "J", "Total", "Freq %"])
    for i, r in enumerate(recs, start=2):
        base_func.write_row(i - 1, 0, [int(r.get("ordem", i - 1)), _safe(r.get("nome"), "—"), _safe(r.get("role"), "—"), int(r.get("presencas", 0)), int(r.get("faltas", 0)), int(r.get("justificadas", 0)), int(r.get("totalLancamentos", 0)), float(r.get("percentual", 0)) / 100.0])

    dash.set_column("A:A", 2)
    dash.set_column("B:B", 34)
    dash.set_column("C:E", 12)
    dash.set_column("F:G", 12)
    dash.set_column("H:N", 16)
    dash.set_default_row(20)
    dash.merge_range("B2:F2", f"DASHBOARD DE FREQUÊNCIA — {role_label.upper()}", fmt["title"])
    dash.merge_range("B3:F3", f"Período customizado: {p_start} até {p_end}", fmt["subtitle"])

    dash.write("B5", "Total", fmt["kpi_t"])
    dash.write_number("B6", m["total"], fmt["kpi_v"])
    dash.write("C5", "Média Turma", fmt["kpi_t"])
    dash.write_number("C6", m["avg_pct"] / 100.0, fmt["kpi_v_pct"])
    dash.write("D5", "Acima de 80%", fmt["kpi_t"])
    dash.write_number("D6", m["above"], fmt["kpi_v"])
    dash.write("E5", "Em Risco (<80%)", fmt["kpi_t"])
    dash.write_number("E6", m["risk"], fmt["kpi_v"])

    table_header_row = 12
    table_start_row = table_header_row + 1
    headers = ["Nome", "Perfil", "P", "F", "J", "Freq %", "Tendência"]
    for c, h in enumerate(headers, start=1):
        dash.write(table_header_row - 1, c, h, fmt["hdr"])

    max_rows = max(8, len(recs))
    for i in range(max_rows):
        row = table_start_row + i
        if i < len(recs):
            r = recs[i]
            pct = float(r.get("percentual", 0) or 0) / 100.0
            dash.write_string(row - 1, 1, _safe(r.get("nome"), "—"), fmt["cell_name"])
            dash.write_string(row - 1, 2, _safe(r.get("role"), "—"), fmt["cell"])
            dash.write_number(row - 1, 3, int(r.get("presencas", 0) or 0), fmt["cell"])
            dash.write_number(row - 1, 4, int(r.get("faltas", 0) or 0), fmt["cell"])
            dash.write_number(row - 1, 5, int(r.get("justificadas", 0) or 0), fmt["cell"])
            dash.write_number(row - 1, 6, pct, fmt["cell"])
            dash.write_string(row - 1, 7, "▲" if pct >= 0.8 else ("■" if pct >= 0.6 else "▼"), fmt["cell"])
        else:
            for c in range(1, 8):
                dash.write_blank(row - 1, c, None, fmt["cell"])

    last_row = table_header_row + max_rows
    dash.autofilter(table_header_row - 1, 1, last_row, 7)
    dash.conditional_format(f"G{table_start_row}:G{last_row}", {"type": "data_bar", "bar_color": COLORS["primary"]})

    diag_header_row = last_row + 3
    diag_start_row = diag_header_row + 1
    dash.write(f"B{diag_header_row}", "DIAGNÓSTICO DO PERÍODO", fmt["section"])
    for i, txt in enumerate(m["insights"][:8], start=diag_start_row):
        dash.merge_range(i - 1, 1, i - 1, 10, txt, fmt["insight_box"])
        dash.write(i - 1, 1, txt, fmt["insight"])

    # doughnut
    chart_row = diag_start_row + 10
    chart = wb.add_chart({"type": "doughnut"})
    chart.add_series({"name": "Situação", "categories": ["Base_Painel", 5, 0, 6, 0], "values": ["Base_Painel", 5, 1, 6, 1], "points": [{"fill": {"color": COLORS["success"]}}, {"fill": {"color": COLORS["danger"]}}]})
    chart.set_title({"name": "Engajamento Global"})
    chart.set_size({"width": 320, "height": 210})
    dash.insert_chart(f"B{chart_row}", chart)

    # ops tab
    dash_ops.set_column("A:A", 2)
    dash_ops.set_column("B:B", 34)
    dash_ops.set_column("C:H", 12)
    dash_ops.write("B2", "VISÃO OPERACIONAL", fmt["section"])
    dash_ops.write("B3", "Fila de ação por criticidade (baixo percentual primeiro)", fmt["subtitle"])
    dash_ops.write_row("B5", ["Nome", "Perfil", "Freq %", "P", "F", "Status", "Ação"], fmt["hdr"])
    order = sorted(recs, key=lambda r: float(r.get("percentual", 0) or 0))
    for i, r in enumerate(order[:40], start=6):
        pct = float(r.get("percentual", 0) or 0)
        status = _status_band(pct)
        action = "Ação imediata" if pct < 60 else ("Monitorar" if pct < 80 else "OK")
        dash_ops.write_row(i - 1, 1, [_safe(r.get("nome"), "—"), _safe(r.get("role"), "—"), pct / 100.0, int(r.get("presencas", 0)), int(r.get("faltas", 0)), status, action], fmt["cell"])
    dash_ops.conditional_format("D6:D45", {"type": "data_bar", "bar_color": COLORS["primary"]})
    dash_ops.autofilter(4, 1, 45, 7)

    wb.define_name("emp_total", "=Base_Painel!$B$4")
    wb.close()


def main():
    if len(sys.argv) != 4:
        print("usage: generate_advanced_dashboard.py <kind> <payload.json> <output.xlsx>", file=sys.stderr)
        sys.exit(2)
    kind = sys.argv[1].strip().lower()
    payload_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve()
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if kind == "student":
        _build_student(payload, output_path)
    elif kind == "employee":
        _build_employee(payload, output_path)
    else:
        raise ValueError(f"invalid kind: {kind}")


if __name__ == "__main__":
    main()

