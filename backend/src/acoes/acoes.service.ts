import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AcaoStatus, ClassWeekendPolicy } from '@prisma/client';
import { CreateAcaoDto } from './dto/create-acao.dto';
import { CreateAcaoCustoDto } from './dto/create-acao-custo.dto';
import { CreateAcaoEquipeDto } from './dto/create-acao-equipe.dto';
import { CreateAcaoFuncionarioDto } from './dto/create-acao-funcionario.dto';
import { calcularDiasEfetivos } from '../common/calcular-dias-efetivos.util';
import { fetchMergedHolidayDatesForClass } from '../common/holiday-catalog.util';
import { getAcaoCalendarioResumo } from '../common/class-teaching-end-date.helper';
import {
    syncTeacherToAcao,
    syncTeacherToAcaoClasses,
    ensureTeacherForUserId,
} from '../common/teacher-academic-link.util';
import { paginatedResult, resolvePagination } from '../common/pagination.util';
import {
    recalcularPeriodoPelasTurmas,
    suggestInstructorDiasForClasses,
} from '../common/acao-motor-recalc.util';
import { resolveTeacherOrThrow } from '../common/resolve-teacher.util';
import {
    assignDriverToAcaoPeriod,
    assignDriverToClass,
    listTeacherPoolForAcao,
    syncTurmaLinkedToAcao,
    findTurmasForCourseContext,
    findTurmasEligibleForAcao,
    completeTurmasWhenAcaoConcluded,
    syncDriverForEmployeeOnAcao,
    tryGenerateTripsForNewTurmaOnAcao,
    startTurmasWhenAcaoStarted,
    type TripGenPerClass,
} from '../common/academic-ecosystem-sync.util';
import { EmployeeRole } from '@prisma/client';
import { TripsService } from '../trips/trips.service';
import { CoursesService } from '../courses/courses.service';
import {
    createContaPagarForAcaoCusto,
    deactivateContaPagarForAcaoCusto,
    syncMissingContasForAcaoCustos,
} from '../common/acao-custo-conta-pagar.util';
import {
    computeFuncionarioPeriodPayment,
    funcionarioAcaoCustoDescricao,
    isCltContract,
} from '../common/employee-period-payment.util';
import { resolveStoredMediaUrl } from '../common/resolve-stored-media-url.util';

@Injectable()
export class AcoesService {
    private readonly logger = new Logger(AcoesService.name);

    constructor(
        private prisma: PrismaService,
        private coursesService: CoursesService,
        private settingsService: SettingsService,
        private readonly notifications: NotificationsGateway,
        private readonly tripsService: TripsService,
    ) { }

    private parseDateSafe(dateInput: string | Date | null | undefined): Date | undefined {
        if (!dateInput) return undefined;
        if (dateInput instanceof Date) return dateInput;
        const trimmed = dateInput.trim();
        const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (isoDay) {
            const y = Number(isoDay[1]);
            const m = Number(isoDay[2]) - 1;
            const d = Number(isoDay[3]);
            return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
        }
        return new Date(trimmed);
    }

    private emitFinanceiroListagemRefresh(source: string, extra: Record<string, unknown> = {}) {
        try {
            this.notifications.notifyFinanceiroListagemRefresh({ source, ...extra });
        } catch { /* WS nunca bloqueia */ }
    }

    async findAll(filters?: {
        status?: AcaoStatus;
        grupoId?: string;
        cidadeId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.grupoId) where.grupoId = filters.grupoId;
        if (filters?.cidadeId) where.cidadeId = filters.cidadeId;
        if (filters?.search) {
            where.OR = [
                { nome: { contains: filters.search, mode: 'insensitive' } },
                { cidadeNome: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const { skip, page, limit } = resolvePagination(filters?.page, filters?.limit, 12);
        const include = {
            cidade: { select: { id: true, name: true, state: true } },
            grupo: { select: { id: true, name: true, state: true } },
            carreta: { select: { id: true, identifier: true, licensePlate: true, type: true } },
            _count: {
                select: { turmas: true, custos: true, equipe: true },
            },
        };

        const [acoes, total] = await Promise.all([
            this.prisma.acao.findMany({
                where,
                include,
                orderBy: { dataInicio: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.acao.count({ where }),
        ]);

        return paginatedResult(acoes, total, page, limit);
    }

    // Autocomplete: busca cidades existentes pelo nome digitado
    async searchCidades(q: string) {
        if (!q || q.length < 2) return [];
        return this.prisma.city.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, state: true },
            take: 10,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const acao = await this.prisma.acao.findUnique({
            where: { id },
            include: {
                cidade: true,
                grupo: true,
                carreta: true,
                turmas: {
                    include: {
                        turma: {
                            include: {
                                course: { select: { id: true, name: true } },
                                _count: { select: { enrollments: true } },
                            },
                        },
                    },
                },
                custos: {
                    include: {
                        funcionario: { select: { id: true, name: true } },
                    },
                    orderBy: { data: 'desc' },
                },
                equipe: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                funcionarios: {
                    include: {
                        employee: {
                            select: { id: true, name: true, role: true, department: true, phone: true, email: true, specialty: true, dailyCost: true, photoUrl: true, active: true, contractType: true, monthlySalaryCLT: true, travelRuleKm: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!acao) {
            throw new NotFoundException(`Ação com ID ${id} não encontrada`);
        }

        const acaoCtx = {
            id,
            cidadeNome: (acao as any).cidadeNome,
            dataFim: (acao as any).dataFim,
        };
        let contaPagarFinanceiroSync = 0;
        contaPagarFinanceiroSync += await syncMissingContasForAcaoCustos(
            this.prisma,
            acaoCtx,
            (acao as any).custos ?? [],
        );

        // Auto-sync: criar AcaoCusto para funcionários que ainda não têm lançamento
        let contaPagarDiariaCriada = false;
        if ((acao as any).funcionarios?.length) {
            const finSettings = this.settingsService.get();
            for (const f of (acao as any).funcionarios) {
                const emp = f.employee;
                const descricao = funcionarioAcaoCustoDescricao(emp.name, emp.contractType);
                const legacyDescricoes = [descricao, `Diária - ${emp.name}`, `CLT - ${emp.name}`];
                const jaExiste = await this.prisma.acaoCusto.findFirst({
                    where: { acaoId: id, tipo: 'DIARIA_FUNCIONARIO', descricao: { in: legacyDescricoes } },
                });
                let paymentObs = '';
                let valor = 0;
                try {
                    const payment = computeFuncionarioPeriodPayment({
                        contractType: emp.contractType,
                        valorDiaria: Number(f.valorDiaria) || Number(emp.dailyCost) || 0,
                        diasTrabalhados: f.diasTrabalhados,
                        monthlySalaryCLT: emp.monthlySalaryCLT ? Number(emp.monthlySalaryCLT) : null,
                        travelRuleKm: emp.travelRuleKm,
                        settings: {
                            diasUteisReferenciaMes: finSettings.diasUteisReferenciaMes,
                            kmLimitePassagemSemanal: finSettings.kmLimitePassagemSemanal,
                            valorPassagemViagem: finSettings.valorPassagemViagem,
                        },
                    });
                    valor = payment.valorTotal;
                    paymentObs = payment.observacoes;
                } catch {
                    valor = Number(f.valorDiaria) * f.diasTrabalhados;
                    paymentObs = `${f.diasTrabalhados} dia(s) × R$ ${Number(f.valorDiaria).toFixed(2)}/dia`;
                }
                if (!jaExiste) {
                    await this.prisma.acaoCusto.create({
                        data: {
                            acaoId: id,
                            tipo: 'DIARIA_FUNCIONARIO',
                            descricao,
                            valor,
                            data: (acao as any).dataInicio || new Date(),
                            observacoes: paymentObs,
                        },
                    });
                }
                // Criar ContaPagar se também não existir
                const contaExiste = await this.prisma.contaPagar.findFirst({
                    where: {
                        acaoId: id,
                        tipo_conta: 'diaria_funcionario',
                        descricao: { in: legacyDescricoes },
                    },
                });
                if (!contaExiste) {
                    await this.prisma.contaPagar.create({
                        data: {
                            tipo_conta: 'diaria_funcionario',
                            descricao,
                            valor,
                            data_vencimento: (acao as any).dataFim || new Date(),
                            status: 'pendente',
                            recorrente: false,
                            acaoId: id,
                            cidade: (acao as any).cidadeNome || undefined,
                            observacoes: paymentObs,
                        },
                    });
                    contaPagarDiariaCriada = true;
                }
            }
            // Recarregar ação com custos atualizados
            const acaoAtualizada = await this.prisma.acao.findUnique({
                where: { id },
                include: {
                    cidade: true, grupo: true, carreta: true,
                    turmas: { include: { turma: { include: { course: { select: { id: true, name: true } }, _count: { select: { enrollments: true } } } } } },
                    custos: { include: { funcionario: { select: { id: true, name: true } } }, orderBy: { data: 'desc' } },
                    equipe: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
                    funcionarios: { include: { employee: { select: { id: true, name: true, role: true, department: true, phone: true, email: true, specialty: true, dailyCost: true, photoUrl: true, active: true } } }, orderBy: { createdAt: 'asc' } },
                },
            });
            if (acaoAtualizada) {
                if (contaPagarDiariaCriada || contaPagarFinanceiroSync > 0) {
                    this.emitFinanceiroListagemRefresh('acao_find_one_sync_financeiro', { acaoId: id });
                }
                const resumoFinanceiro = this.calcularResumoFinanceiro(acaoAtualizada);
                return { ...acaoAtualizada, resumoFinanceiro };
            }
        }

        if (contaPagarFinanceiroSync > 0) {
            this.emitFinanceiroListagemRefresh('acao_find_one_sync_custos', { acaoId: id });
            const acaoAtualizadaCustos = await this.prisma.acao.findUnique({
                where: { id },
                include: {
                    cidade: true,
                    grupo: true,
                    carreta: true,
                    turmas: {
                        include: {
                            turma: {
                                include: {
                                    course: { select: { id: true, name: true } },
                                    _count: { select: { enrollments: true } },
                                },
                            },
                        },
                    },
                    custos: {
                        include: { funcionario: { select: { id: true, name: true } } },
                        orderBy: { data: 'desc' },
                    },
                    equipe: {
                        include: { user: { select: { id: true, name: true, email: true, role: true } } },
                    },
                    funcionarios: {
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    name: true,
                                    role: true,
                                    department: true,
                                    phone: true,
                                    email: true,
                                    specialty: true,
                                    dailyCost: true,
                                    photoUrl: true,
                                    active: true,
                                    contractType: true,
                                    monthlySalaryCLT: true,
                                    travelRuleKm: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
            if (acaoAtualizadaCustos) {
                const resumoFinanceiro = this.calcularResumoFinanceiro(acaoAtualizadaCustos);
                return { ...acaoAtualizadaCustos, resumoFinanceiro };
            }
        }

        // Calcular resumo financeiro
        const resumoFinanceiro = this.calcularResumoFinanceiro(acao);

        return { ...acao, resumoFinanceiro };
    }

    private calcularResumoFinanceiro(acao: any) {
        const distancia = Number(acao.distanciaKm || 0);
        const precoCombustivel = Number(acao.precoCombustivelL || 0);
        const autonomia = Number(acao.autonomiaKmL || 1);

        // Custo estimado de combustível (ida + volta)
        const litrosEstimados = (distancia * 2) / autonomia;
        const custoEstimadoCombustivel = litrosEstimados * precoCombustivel;

        // Custo estimado de diárias — somente AcaoFuncionario (funcionários registrados)
        // GAP-F2: para instrutores CLT, incluir salário proporcional + passagens (Sprint 2)
        // S3-00: parâmetros agora consumidos do SettingsService (não mais hardcoded)
        const settings = this.settingsService.get();
        const custoEstimadoDiarias = (acao.funcionarios || []).reduce((sum: number, f: any) => {
            const diarias = Number(f.valorDiaria) * (f.diasTrabalhados || 0);

            let salarioProporcional = 0;
            let passagens = 0;
            if (f.employee?.contractType === 'CLT' && f.employee?.monthlySalaryCLT) {
                const diasUteisMes = settings.diasUteisReferenciaMes;
                salarioProporcional = (Number(f.employee.monthlySalaryCLT) / diasUteisMes)
                    * (f.diasTrabalhados || 0);

                // Regra passagem: ≤kmLimite semanal / >kmLimite quinzenal (reunião 00:23:15)
                const kmLimite = f.employee.travelRuleKm || settings.kmLimitePassagemSemanal;
                const semanas = Math.ceil((f.diasTrabalhados || 0) / 5);
                const viagens = kmLimite <= settings.kmLimitePassagemSemanal
                    ? semanas * 2               // ida+volta por semana
                    : Math.ceil(semanas / 2) * 2; // ida+volta quinzenal
                const custoPassagem = settings.valorPassagemViagem;
                passagens = viagens * custoPassagem;
            }

            return sum + diarias + salarioProporcional + passagens;
        }, 0);

        // Custos reais por tipo
        const abastecimentos = acao.custos
            .filter((c: any) => c.tipo === 'ABASTECIMENTO')
            .reduce((sum: number, c: any) => sum + Number(c.valor), 0);

        const despesasGerais = acao.custos
            .filter((c: any) => c.tipo === 'DESPESA_GERAL')
            .reduce((sum: number, c: any) => sum + Number(c.valor), 0);

        const diariasPagas = acao.custos
            .filter((c: any) => c.tipo === 'DIARIA_FUNCIONARIO')
            .reduce((sum: number, c: any) => sum + Number(c.valor), 0);

        const totalEstimado = custoEstimadoCombustivel + custoEstimadoDiarias;
        const totalReal = abastecimentos + despesasGerais + diariasPagas;

        return {
            estimado: {
                combustivel: custoEstimadoCombustivel,
                diarias: custoEstimadoDiarias,
                total: totalEstimado,
                litrosEstimados,
            },
            real: {
                abastecimentos,
                despesasGerais,
                diariasPagas,
                total: totalReal,
            },
            economia: totalEstimado - totalReal,
        };
    }

    async create(data: CreateAcaoDto) {
        return this.prisma.acao.create({
            data: {
                nome: data.nome,
                cidadeNome: data.cidadeNome,
                cidadeId: data.cidadeId || undefined,
                grupoId: data.grupoId,
                carretaId: data.carretaId,
                status: data.status ?? AcaoStatus.PLANEJADA,
                dataInicio: this.parseDateSafe(data.dataInicio) as Date,
                dataFim: this.parseDateSafe(data.dataFim) as Date,
                driverDepartureDate: data.driverDepartureDate
                    ? this.parseDateSafe(data.driverDepartureDate)
                    : undefined,
                motorCourseId: data.motorCourseId || undefined,
                period: data.period,
                startTime: data.startTime,
                endTime: data.endTime,
                weekendPolicy: data.weekendPolicy,
                weekendExtraDates:
                    Array.isArray(data.weekendExtraDates) && data.weekendExtraDates.length
                        ? data.weekendExtraDates.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x))
                        : undefined,
                teachingDaysOverride: data.teachingDaysOverride,
                localExecucao: data.localExecucao,
                // ── REQ-LOCAL-2026: detalhes adicionais do local físico ──
                localEndereco: data.localEndereco,
                localReferencia: data.localReferencia,
                localLatitude: data.localLatitude,
                localLongitude: data.localLongitude,
                // ── Tipo de rota (REQ-ROUTE-2026) ──
                routeType: data.routeType ?? 'INTERCIDADE',
                originCidadeId: data.originCidadeId,
                originNeighborhood: data.originNeighborhood,
                destinationNeighborhood: data.destinationNeighborhood,
                distanciaKm: data.distanciaKm,
                precoCombustivelL: data.precoCombustivelL,
                autonomiaKmL: data.autonomiaKmL,
                observacoes: data.observacoes,
                permitirInscricoes: data.permitirInscricoes ?? true,
            },
            include: {
                cidade: true,
                grupo: true,
                carreta: true,
            },
        });
    }

    async update(id: string, data: Partial<CreateAcaoDto>) {
        await this.findOne(id);
        const { driverDepartureDate: rawDriverDeparture, ...rest } = data;
        const driverDepartureTouched = rawDriverDeparture !== undefined;
        const updated = await this.prisma.acao.update({
            where: { id },
            data: {
                ...rest,
                dataInicio: data.dataInicio ? this.parseDateSafe(data.dataInicio) : undefined,
                dataFim: data.dataFim ? this.parseDateSafe(data.dataFim) : undefined,
                driverDepartureDate:
                    rawDriverDeparture === undefined
                        ? undefined
                        : rawDriverDeparture
                          ? this.parseDateSafe(rawDriverDeparture)
                          : null,
                weekendExtraDates:
                    data.weekendExtraDates === undefined
                        ? undefined
                        : Array.isArray(data.weekendExtraDates) && data.weekendExtraDates.length
                          ? data.weekendExtraDates.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x))
                          : [],
            },
            include: {
                cidade: true,
                grupo: true,
                carreta: true,
            },
        });

        if (driverDepartureTouched) {
            const drivers = await this.prisma.acaoFuncionario.findMany({
                where: { acaoId: id, employee: { role: EmployeeRole.DRIVER, userId: { not: null } } },
                select: { employee: { select: { userId: true } } },
            });
            for (const d of drivers) {
                if (!d.employee.userId) continue;
                try {
                    await syncDriverForEmployeeOnAcao(
                        this.prisma,
                        this.tripsService,
                        id,
                        d.employee.userId,
                    );
                } catch (e: any) {
                    this.logger.warn(
                        `Regenerar viagens após driverDepartureDate (${id}): ${e?.message}`,
                    );
                }
            }
        }

        return updated;
    }

    async updateStatus(id: string, status: AcaoStatus) {
        const acao = await this.findOne(id);

        // Auto-gerar ContaPagar para cada funcionário vinculado ao mudar para EM_ANDAMENTO
        if (status === AcaoStatus.EM_ANDAMENTO) {
            const vinculados = await this.prisma.acaoFuncionario.findMany({
                where: { acaoId: id },
                include: { employee: { select: { id: true, name: true } } },
            });

            if (vinculados.length > 0) {
                // Remover diárias anteriores para evitar duplicatas em reativações
                await this.prisma.contaPagar.deleteMany({
                    where: {
                        acaoId: id,
                        tipo_conta: 'diaria_funcionario',
                    },
                });

                // Criar uma ContaPagar para cada funcionário
                await this.prisma.contaPagar.createMany({
                    data: vinculados.map(v => ({
                        tipo_conta: 'diaria_funcionario',
                        descricao: `Diária - ${v.employee.name}`,
                        valor: Number(v.valorDiaria) * v.diasTrabalhados,
                        data_vencimento: (acao as any).dataFim ? new Date((acao as any).dataFim) : new Date(),
                        status: 'pendente',
                        recorrente: false,
                        acaoId: id,
                        cidade: (acao as any).cidadeNome || undefined,
                        observacoes: `${v.diasTrabalhados} dia(s) × R$ ${Number(v.valorDiaria).toFixed(2)}/dia`,
                    })),
                });
                this.emitFinanceiroListagemRefresh('acao_status_em_andamento_diarias', { acaoId: id });
            }
        }

        const updated = await this.prisma.acao.update({ where: { id }, data: { status } });

        if (status === AcaoStatus.EM_ANDAMENTO) {
            const started = await startTurmasWhenAcaoStarted(this.prisma, id);
            if (started.updated > 0) {
                this.logger.log(`Período ${id} iniciado: ${started.updated} turma(s) marcada(s) como IN_PROGRESS.`);
            }
        }

        if (status === AcaoStatus.CONCLUIDA) {
            const closed = await completeTurmasWhenAcaoConcluded(this.prisma, id);
            if (closed.updated > 0) {
                this.logger.log(
                    `Período ${id} concluído: ${closed.updated} turma(s) marcada(s) como COMPLETED.`,
                );
            }
        }

        return updated;
    }

    async delete(id: string) {
        await this.findOne(id);
        // Soft delete via status CANCELADA (LIVRO_DE_REGRAS §3)
        return this.prisma.acao.update({ where: { id }, data: { status: 'CANCELADA' } });
    }

    // ── Turmas ──────────────────────────────────────────────────
    async getCalendarioResumo(acaoId: string) {
        await this.findOne(acaoId);
        const link = await this.prisma.acaoTurma.findFirst({
            where: { acaoId },
            include: { turma: { include: { course: true } } },
        });
        const course = link?.turma?.course;
        const stateConfig = course
            ? this.coursesService.getCourseStateConfig({
                  id: course.id,
                  durationDaysMA: course.durationDaysMA,
                  durationDaysPI: course.durationDaysPI,
                  availableInMA: course.availableInMA,
                  availableInPI: course.availableInPI,
                  workloadHours: course.workloadHours,
              })
            : null;
        return getAcaoCalendarioResumo(this.prisma, acaoId, stateConfig);
    }

    private resolveCourseStateConfig(course: {
        id: string;
        durationDaysMA: number;
        durationDaysPI: number;
        availableInMA: boolean;
        availableInPI: boolean;
        workloadHours: number;
    }) {
        return this.coursesService.getCourseStateConfig(course);
    }

    async recalcularMotorPeriodo(acaoId: string) {
        await this.findOne(acaoId);
        return recalcularPeriodoPelasTurmas(this.prisma, acaoId, (course) =>
            this.resolveCourseStateConfig(course),
        );
    }

    async previewInstructorDias(acaoId: string, classIds: string[]) {
        await this.findOne(acaoId);
        const ids = [...new Set(classIds.filter(Boolean))].sort();
        return suggestInstructorDiasForClasses(this.prisma, acaoId, ids, (course) =>
            this.resolveCourseStateConfig(course),
        );
    }

    async addTurma(acaoId: string, turmaId: string) {
        await this.findOne(acaoId);
        try {
            const link = await this.prisma.acaoTurma.create({
                data: { acaoId, turmaId },
                include: { turma: { include: { course: true } } },
            });
            const sync = await syncTurmaLinkedToAcao(this.prisma, acaoId, turmaId);
            const tripSync = await tryGenerateTripsForNewTurmaOnAcao(
                this.prisma,
                this.tripsService,
                acaoId,
                turmaId,
            );
            return {
                ...link,
                ...sync,
                driverTripSync: {
                    totalGenerated: tripSync.totalGenerated,
                    warnings: tripSync.warnings,
                    perClass: tripSync.perClass,
                },
            };
        } catch {
            throw new ConflictException('Turma já vinculada a esta ação');
        }
    }

    async removeTurma(acaoId: string, turmaId: string) {
        await this.prisma.acaoTurma.deleteMany({ where: { acaoId, turmaId } });
        return { message: 'Turma removida da ação com sucesso' };
    }

    // ── Professores (período → turmas + cursos) ─────────────────
    async listTeachers(acaoId: string) {
        await this.findOne(acaoId);

        const acaoTurmas = await this.prisma.acaoTurma.findMany({
            where: { acaoId },
            include: {
                turma: {
                    include: {
                        course: { select: { id: true, name: true } },
                        teachers: {
                            include: {
                                teacher: {
                                    include: {
                                        user: { select: { id: true, name: true, email: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const courseIds = new Set<string>();
        const byTeacherId = new Map<
            string,
            {
                teacherId: string;
                userId: string;
                name: string;
                email: string;
                courses: { id: string; name: string }[];
                classIdentifiers: string[];
            }
        >();

        for (const at of acaoTurmas) {
            const turma = at.turma;
            if (!turma) continue;
            courseIds.add(turma.courseId);

            for (const ct of turma.teachers || []) {
                const t = ct.teacher;
                if (!t?.user) continue;
                const prev = byTeacherId.get(t.id) || {
                    teacherId: t.id,
                    userId: t.user.id,
                    name: t.user.name,
                    email: t.user.email,
                    courses: [],
                    classIdentifiers: [],
                };
                if (!prev.courses.some(c => c.id === turma.course.id)) {
                    prev.courses.push({ id: turma.course.id, name: turma.course.name });
                }
                if (!prev.classIdentifiers.includes(turma.classIdentifier)) {
                    prev.classIdentifiers.push(turma.classIdentifier);
                }
                byTeacherId.set(t.id, prev);
            }
        }

        if (courseIds.size > 0) {
            const courseTeachers = await this.prisma.teacherCourse.findMany({
                where: { courseId: { in: [...courseIds] } },
                include: {
                    teacher: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                    course: { select: { id: true, name: true } },
                },
            });
            for (const tc of courseTeachers) {
                const t = tc.teacher;
                if (!t?.user) continue;
                const prev = byTeacherId.get(t.id) || {
                    teacherId: t.id,
                    userId: t.user.id,
                    name: t.user.name,
                    email: t.user.email,
                    courses: [],
                    classIdentifiers: [],
                };
                if (!prev.courses.some(c => c.id === tc.course.id)) {
                    prev.courses.push({ id: tc.course.id, name: tc.course.name });
                }
                byTeacherId.set(t.id, prev);
            }
        }

        return Array.from(byTeacherId.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    async listTeacherPool(acaoId: string) {
        await this.findOne(acaoId);
        return listTeacherPoolForAcao(this.prisma, acaoId);
    }

    async assignTeacher(acaoId: string, teacherIdOrUserId: string) {
        await this.findOne(acaoId);
        const turmasNoPeriodo = await this.prisma.acaoTurma.count({ where: { acaoId } });
        if (turmasNoPeriodo === 0) {
            throw new BadRequestException(
                'Vincule pelo menos uma turma a este período antes de atribuir professores.',
            );
        }

        const pool = await listTeacherPoolForAcao(this.prisma, acaoId);
        const teacher = await resolveTeacherOrThrow(this.prisma, teacherIdOrUserId);
        if (pool.length > 0) {
            const allowed = pool.some(p => p.teacherId === teacher.id || p.userId === teacherIdOrUserId);
            if (!allowed) {
                throw new BadRequestException(
                    'Este professor não está vinculado ao curso base das turmas deste período. Vincule-o primeiro no cadastro do curso.',
                );
            }
        }

        const sync = await syncTeacherToAcao(this.prisma, acaoId, teacherIdOrUserId);
        const turmasAtivas = sync.classIds.length;
        const novosVinculos = sync.classLinks;
        const message =
            turmasAtivas === 0
                ? 'Nenhuma turma ativa no período para vincular o professor.'
                : novosVinculos === 0
                  ? `Professor já estava vinculado às ${turmasAtivas} turma(s) deste período.`
                  : `Professor vinculado em ${novosVinculos} turma(s) (${turmasAtivas} no período).`;
        return {
            teacherId: teacher.id,
            message,
            academicSync: {
                ...sync,
                turmasNoPeriodo: turmasAtivas,
                novosVinculosTurma: novosVinculos,
            },
        };
    }

    async assignDriver(acaoId: string, driverUserId: string) {
        await this.findOne(acaoId);
        return assignDriverToAcaoPeriod(this.prisma, this.tripsService, acaoId, driverUserId);
    }

    async assignDriverToTurma(acaoId: string, turmaId: string, driverUserId: string) {
        await this.findOne(acaoId);
        const link = await this.prisma.acaoTurma.findFirst({ where: { acaoId, turmaId } });
        if (!link) throw new BadRequestException('Turma não pertence a este período.');
        return assignDriverToClass(this.prisma, this.tripsService, turmaId, driverUserId, acaoId);
    }

    async listTurmasByCourse(courseId: string, groupId?: string, excludeAcaoId?: string) {
        return findTurmasForCourseContext(this.prisma, courseId, {
            groupId,
            excludeLinkedToAcaoId: excludeAcaoId,
        });
    }

    async listTurmasElegiveis(acaoId: string) {
        await this.findOne(acaoId);
        return findTurmasEligibleForAcao(this.prisma, acaoId);
    }

    // ── Equipe ───────────────────────────────────────────────────
    async addEquipe(acaoId: string, data: CreateAcaoEquipeDto) {
        await this.findOne(acaoId);
        try {
            return await this.prisma.acaoEquipe.create({
                data: {
                    acaoId,
                    userId: data.userId,
                    funcao: data.funcao,
                    diaria: data.diaria,
                    diasTrabalhados: data.diasTrabalhados ?? 0,
                },
                include: { user: { select: { id: true, name: true, email: true, role: true } } },
            });
        } catch {
            throw new ConflictException('Usuário já adicionado à equipe desta ação');
        }
    }

    async updateEquipeDias(acaoId: string, userId: string, diasTrabalhados: number) {
        return this.prisma.acaoEquipe.updateMany({
            where: { acaoId, userId },
            data: { diasTrabalhados },
        });
    }

    async removeEquipe(acaoId: string, userId: string) {
        await this.prisma.acaoEquipe.deleteMany({ where: { acaoId, userId } });
        return { message: 'Membro removido da equipe com sucesso' };
    }

    // ── Custos ───────────────────────────────────────────────────
    async addCusto(acaoId: string, data: CreateAcaoCustoDto) {
        const acao = await this.prisma.acao.findUnique({
            where: { id: acaoId },
            select: { id: true, cidadeNome: true, dataFim: true, nome: true },
        });
        if (!acao) throw new NotFoundException(`Ação com ID ${acaoId} não encontrada`);

        const novoCusto = await this.prisma.$transaction(async (tx) => {
            const created = await tx.acaoCusto.create({
                data: {
                    acaoId,
                    tipo: data.tipo,
                    descricao: data.descricao,
                    valor: data.valor,
                    data: this.parseDateSafe(data.data) as Date,
                    litros: data.litros,
                    funcionarioId: data.funcionarioId,
                    observacoes: data.observacoes,
                },
                include: {
                    funcionario: { select: { id: true, name: true } },
                },
            });

            if (data.tipo === 'ABASTECIMENTO' || data.tipo === 'DESPESA_GERAL') {
                await createContaPagarForAcaoCusto(tx, acao, created);
            }

            return created;
        });

        this.emitFinanceiroListagemRefresh('acao_add_custo', {
            acaoId,
            custoId: novoCusto.id,
            tipo: data.tipo,
        });

        // GAP-F3: alerta quando custo real > estimado × (percentualAlertaCusto/100) (Sprint 2)
        // S3-00: percentual configuravel via SettingsService
        try {
            const acaoAtual = await this.prisma.acao.findUnique({
                where: { id: acaoId },
                include: {
                    funcionarios: { include: { employee: true } },
                    custos: true,
                },
            });
            if (acaoAtual) {
                const resumo = this.calcularResumoFinanceiro(acaoAtual);
                const settings = this.settingsService.get();
                const fatorAlerta = settings.percentualAlertaCusto / 100;
                if (resumo.estimado.total > 0 &&
                    resumo.real.total > resumo.estimado.total * fatorAlerta) {
                    this.logger.warn(
                        `ALERTA CUSTO: Rota "${acaoAtual.nome}" atingiu ` +
                        `R$ ${resumo.real.total.toFixed(2)}, acima de ${settings.percentualAlertaCusto}% ` +
                        `do estimado (R$ ${resumo.estimado.total.toFixed(2)}).`
                    );
                    await this.prisma.notification.create({
                        data: {
                            userId: acaoAtual.grupoId,
                            type: 'GENERAL_ANNOUNCEMENT',
                            title: '⚠️ Custo da rota acima do estimado',
                            message: `A rota "${acaoAtual.nome}" atingiu R$ ${resumo.real.total.toFixed(2)}, ` +
                                `acima de ${settings.percentualAlertaCusto}% do estimado (R$ ${resumo.estimado.total.toFixed(2)}).`,
                            channel: 'IN_APP',
                        },
                    }).catch(() => { /* silencia se userId for inválido */ });
                }
            }
        } catch {
            // Não bloquear o fluxo principal se o alerta falhar
        }

        return novoCusto;
    }

    async removeCusto(custoId: string) {
        const custo = await this.prisma.acaoCusto.findUnique({ where: { id: custoId } });
        if (!custo) throw new NotFoundException('Custo não encontrado');

        await this.prisma.$transaction(async (tx) => {
            await deactivateContaPagarForAcaoCusto(tx, custoId);
            await tx.acaoCusto.delete({ where: { id: custoId } });
        });

        this.emitFinanceiroListagemRefresh('acao_remove_custo', {
            acaoId: custo.acaoId,
            custoId,
            tipo: custo.tipo,
        });

        return { message: 'Custo removido com sucesso' };
    }

    async getResumoFinanceiro(id: string) {
        const acao = await this.findOne(id);
        return (acao as any).resumoFinanceiro;
    }

    async getEstatisticas() {
        const [total, planejadas, emAndamento, concluidas, canceladas] = await Promise.all([
            this.prisma.acao.count(),
            this.prisma.acao.count({ where: { status: 'PLANEJADA' } }),
            this.prisma.acao.count({ where: { status: 'EM_ANDAMENTO' } }),
            this.prisma.acao.count({ where: { status: 'CONCLUIDA' } }),
            this.prisma.acao.count({ where: { status: 'CANCELADA' } }),
        ]);
        return { total, planejadas, emAndamento, concluidas, canceladas };
    }

    // ── Funcionários da Ação ─────────────────────────────────────────
    async listFuncionariosDisponiveis(
        acaoId: string,
        filters?: { search?: string; role?: string; page?: number; limit?: number },
    ) {
        await this.findOne(acaoId);
        const vinculados = await this.prisma.acaoFuncionario.findMany({
            where: { acaoId },
            select: { employeeId: true },
        });
        const excludeIds = vinculados.map(v => v.employeeId);
        const page = Math.max(1, filters?.page ?? 1);
        const limit = Math.min(50, Math.max(1, filters?.limit ?? 12));
        const skip = (page - 1) * limit;

        const where: any = { active: true };
        if (excludeIds.length) where.id = { notIn: excludeIds };
        if (filters?.role) where.role = filters.role;
        if (filters?.search?.trim()) {
            const q = filters.search.trim();
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { cpf: { contains: q, mode: 'insensitive' } },
                { specialty: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [employees, total] = await Promise.all([
            this.prisma.employee.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    role: true,
                    department: true,
                    dailyCost: true,
                    contractType: true,
                    monthlySalaryCLT: true,
                    travelRuleKm: true,
                    userId: true,
                    specialty: true,
                    phone: true,
                    email: true,
                    photoUrl: true,
                },
            }),
            this.prisma.employee.count({ where }),
        ]);

        const mapped = employees.map(e => ({
            ...e,
            photoUrl: e.photoUrl ? resolveStoredMediaUrl(e.photoUrl) ?? e.photoUrl : e.photoUrl,
        }));

        return {
            employees: mapped,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async listFuncionarios(
        acaoId: string,
        opts?: { page?: number; limit?: number },
    ) {
        const { skip, page, limit } = resolvePagination(opts?.page, opts?.limit, 12);
        const where = { acaoId };
        const include = {
            employee: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                    department: true,
                    phone: true,
                    email: true,
                    specialty: true,
                    dailyCost: true,
                    photoUrl: true,
                    active: true,
                },
            },
        };
        const [data, total] = await Promise.all([
            this.prisma.acaoFuncionario.findMany({
                where,
                include,
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.acaoFuncionario.count({ where }),
        ]);
        return paginatedResult(data, total, page, limit);
    }

    /** Dias efetivos do período — motor letivo do período (FDS, feriados, grade). */
    private async computeDiasEfetivosForAcao(acaoId: string): Promise<number> {
        const resumo = await this.getCalendarioResumo(acaoId);
        return resumo.suggestedDiasPagamento ?? resumo.diasLetivos;
    }

    async addFuncionario(acaoId: string, dto: CreateAcaoFuncionarioDto) {
        const acao = await this.findOne(acaoId);
        const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (!emp) throw new NotFoundException('Funcionário não encontrado');

        const turmaCount = await this.prisma.acaoTurma.count({ where: { acaoId } });
        if (turmaCount === 0) {
            throw new BadRequestException(
                'Vincule uma turma ao período antes de adicionar funcionários. ' +
                    'Os dias de diária seguem o motor letivo do período de curso (FDS, feriados e turno).',
            );
        }

        const settings = this.settingsService.get();
        const empIsClt = isCltContract(emp.contractType);
        const valorDiariaInput =
            dto.valorDiaria ?? (emp.dailyCost ? Number(emp.dailyCost) : 0);

        if (!empIsClt && (!valorDiariaInput || valorDiariaInput <= 0)) {
            throw new BadRequestException(
                'Informe o valor da diária ou cadastre o custo diário do funcionário.',
            );
        }
        if (empIsClt && (!emp.monthlySalaryCLT || Number(emp.monthlySalaryCLT) <= 0)) {
            throw new BadRequestException(
                'Funcionário CLT sem salário mensal. Defina o salário em Funcionários antes de vincular.',
            );
        }

        const dataInicio = new Date((acao as any).dataInicio);
        const dataFim = new Date((acao as any).dataFim);
        const calResumo = await this.getCalendarioResumo(acaoId);
        let diasCalc = calResumo.suggestedDiasPagamento ?? calResumo.diasLetivos;

        if (emp.role === EmployeeRole.INSTRUCTOR && dto.classIds?.length) {
            const instPreview = await suggestInstructorDiasForClasses(
                this.prisma,
                acaoId,
                dto.classIds,
                (course) => this.resolveCourseStateConfig(course),
            );
            diasCalc = instPreview.suggestedDiasPagamento;
        }

        const diasCorridosHint =
            Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / 86400000) + 1);
        const diasFinal =
            dto.diasTrabalhados != null && dto.diasTrabalhados > 0
                ? dto.diasTrabalhados
                : diasCalc;
        this.logger.log(
            `BUG-05: dias calculados para ${emp.name}: ${diasCalc} ` +
            `(de ${dataInicio.toISOString().slice(0, 10)} até ${dataFim.toISOString().slice(0, 10)})`,
        );

        let payment: ReturnType<typeof computeFuncionarioPeriodPayment>;
        try {
            payment = computeFuncionarioPeriodPayment({
                contractType: emp.contractType,
                valorDiaria: valorDiariaInput,
                diasTrabalhados: diasFinal,
                monthlySalaryCLT: emp.monthlySalaryCLT ? Number(emp.monthlySalaryCLT) : null,
                travelRuleKm: emp.travelRuleKm,
                settings: {
                    diasUteisReferenciaMes: settings.diasUteisReferenciaMes,
                    kmLimitePassagemSemanal: settings.kmLimitePassagemSemanal,
                    valorPassagemViagem: settings.valorPassagemViagem,
                },
            });
        } catch (err: any) {
            throw new BadRequestException(err?.message || 'Não foi possível calcular o custo do funcionário.');
        }

        const descricao = funcionarioAcaoCustoDescricao(emp.name, emp.contractType);
        const valorTotal = payment.valorTotal;

        let vinculo: any;
        try {
            vinculo = await this.prisma.acaoFuncionario.create({
                data: {
                    acaoId,
                    employeeId: dto.employeeId,
                    valorDiaria: payment.valorDiariaRecord,
                    diasTrabalhados: diasFinal,
                },
                include: {
                    employee: {
                        select: { id: true, name: true, role: true, department: true, specialty: true, dailyCost: true, photoUrl: true, active: true },
                    },
                },
            });
        } catch {
            throw new ConflictException('Funcionário já vinculado a esta ação');
        }

        // Criar AcaoCusto imediatamente ao vincular (CLT ou diária)
        await this.prisma.acaoCusto.create({
            data: {
                acaoId,
                tipo: 'DIARIA_FUNCIONARIO',
                descricao,
                valor: valorTotal,
                data: dataInicio,
                observacoes: payment.observacoes,
            },
        });

        // Criar/atualizar ContaPagar vinculada
        await this.prisma.contaPagar.deleteMany({
            where: {
                acaoId,
                tipo_conta: 'diaria_funcionario',
                OR: [
                    { descricao },
                    { descricao: `Diária - ${emp.name}` },
                    { descricao: `CLT - ${emp.name}` },
                ],
            },
        });
        await this.prisma.contaPagar.create({
            data: {
                tipo_conta: 'diaria_funcionario',
                descricao,
                valor: valorTotal,
                data_vencimento: dataFim,
                status: 'pendente',
                recorrente: false,
                acaoId,
                cidade: (acao as any).cidadeNome || undefined,
                observacoes: payment.observacoes,
            },
        });
        this.emitFinanceiroListagemRefresh('acao_add_funcionario_diaria', { acaoId, employeeId: dto.employeeId });

        const roleEffects: {
            instructor?: {
                turmasNoPeriodo: number;
                novosVinculosTurma: number;
                message: string;
            };
            driver?: {
                truckSynced: boolean;
                turmasAtualizadas: number;
                tripsGenerated: number;
                tripsWarning?: string;
                perClass?: TripGenPerClass[];
                message: string;
            };
        } = {};

        if (emp.role === EmployeeRole.INSTRUCTOR) {
            if (!dto.classIds?.length) {
                throw new BadRequestException(
                    'Selecione ao menos uma turma do período para o instrutor (cada curso tem carga horária própria).',
                );
            }
            if (!emp.userId) {
                throw new BadRequestException(
                    'Instrutor sem acesso ao sistema. Aprove o cadastro em Funcionários com login antes de vincular ao período.',
                );
            }
            await ensureTeacherForUserId(this.prisma, emp.userId);
            const sync = await syncTeacherToAcaoClasses(this.prisma, acaoId, emp.userId, dto.classIds!);
            const turmasAtivas = sync.classIds.length;
            const novos = sync.classLinks;
            const turmaLabel =
                dto.classIds?.length && dto.classIds.length < turmasAtivas
                    ? `${turmasAtivas} turma(s) selecionada(s)`
                    : `${turmasAtivas} turma(s) no período`;
            roleEffects.instructor = {
                turmasNoPeriodo: turmasAtivas,
                novosVinculosTurma: novos,
                message:
                    turmasAtivas === 0
                        ? 'Nenhuma turma ativa no período.'
                        : novos === 0
                          ? `Professor já estava vinculado às ${turmaLabel}.`
                          : `Professor vinculado em ${novos} turma(s) (${turmaLabel}).`,
            };
        }

        if (emp.role === EmployeeRole.DRIVER) {
            const driverSync = await syncDriverForEmployeeOnAcao(
                this.prisma,
                this.tripsService,
                acaoId,
                emp.userId,
            );
            roleEffects.driver = {
                truckSynced: driverSync.truckSynced,
                turmasAtualizadas: driverSync.turmasAtualizadas,
                tripsGenerated: driverSync.totalGenerated,
                tripsWarning: driverSync.tripsWarning,
                perClass: driverSync.perClass,
                message: driverSync.message,
            };
        }

        return {
            ...vinculo,
            diasTrabalhados: diasFinal,
            diasCalculados: diasCalc,
            diasCorridos: diasCorridosHint,
            roleEffects,
        };
    }

    /** Reaplica carreta + geração de viagens para motorista já vinculado ao período. */
    async regenerateFuncionarioTrips(acaoId: string, employeeId: string) {
        const vinculo = await this.prisma.acaoFuncionario.findFirst({
            where: { acaoId, employeeId },
            include: { employee: { select: { id: true, name: true, role: true, userId: true } } },
        });
        if (!vinculo) throw new NotFoundException('Vínculo de funcionário não encontrado');
        if (vinculo.employee.role !== EmployeeRole.DRIVER) {
            throw new BadRequestException('Apenas motoristas podem regenerar viagens do período.');
        }
        if (!vinculo.employee.userId) {
            throw new BadRequestException(
                'Motorista sem login no sistema. Vincule um usuário DRIVER em Funcionários.',
            );
        }

        const driverSync = await syncDriverForEmployeeOnAcao(
            this.prisma,
            this.tripsService,
            acaoId,
            vinculo.employee.userId,
        );

        return {
            employeeId,
            employeeName: vinculo.employee.name,
            truckSynced: driverSync.truckSynced,
            turmasAtualizadas: driverSync.turmasAtualizadas,
            tripsGenerated: driverSync.totalGenerated,
            tripsWarning: driverSync.tripsWarning,
            perClass: driverSync.perClass,
            message: driverSync.message,
        };
    }

    async updateFuncionarioDias(acaoId: string, employeeId: string, diasTrabalhados: number) {
        const vinculo = await this.prisma.acaoFuncionario.findFirst({
            where: { acaoId, employeeId },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        contractType: true,
                        monthlySalaryCLT: true,
                        travelRuleKm: true,
                        dailyCost: true,
                    },
                },
            },
        });
        if (!vinculo) throw new NotFoundException('Vínculo de funcionário não encontrado');

        const diasCalc = await this.computeDiasEfetivosForAcao(acaoId);
        const diasFinal = diasTrabalhados > 0 ? diasTrabalhados : diasCalc;
        this.logger.log(
            `BUG-05: atualizar dias ${vinculo.employee.name}: informado=${diasTrabalhados}, calc=${diasCalc}, final=${diasFinal}`,
        );

        const settings = this.settingsService.get();
        const emp = vinculo.employee;
        let payment: ReturnType<typeof computeFuncionarioPeriodPayment>;
        try {
            payment = computeFuncionarioPeriodPayment({
                contractType: emp.contractType,
                valorDiaria: Number(vinculo.valorDiaria) || Number(emp.dailyCost) || 0,
                diasTrabalhados: diasFinal,
                monthlySalaryCLT: emp.monthlySalaryCLT ? Number(emp.monthlySalaryCLT) : null,
                travelRuleKm: emp.travelRuleKm,
                settings: {
                    diasUteisReferenciaMes: settings.diasUteisReferenciaMes,
                    kmLimitePassagemSemanal: settings.kmLimitePassagemSemanal,
                    valorPassagemViagem: settings.valorPassagemViagem,
                },
            });
        } catch (err: any) {
            throw new BadRequestException(err?.message || 'Não foi possível recalcular o custo.');
        }

        const novoValor = payment.valorTotal;
        const descricao = funcionarioAcaoCustoDescricao(emp.name, emp.contractType);
        const obs = payment.observacoes;

        // 1. Atualizar AcaoFuncionario
        await this.prisma.acaoFuncionario.updateMany({
            where: { acaoId, employeeId },
            data: { diasTrabalhados: diasFinal, valorDiaria: payment.valorDiariaRecord },
        });

        // 2. Upsert AcaoCusto — cria se não existir (funcionários vinculados antes do auto-create)
        const legacyDescricoes = [
            descricao,
            `Diária - ${emp.name}`,
            `CLT - ${emp.name}`,
        ];
        const acaoCusto = await this.prisma.acaoCusto.findFirst({
            where: { acaoId, tipo: 'DIARIA_FUNCIONARIO', descricao: { in: legacyDescricoes } },
        });
        if (acaoCusto) {
            await this.prisma.acaoCusto.update({
                where: { id: acaoCusto.id },
                data: { valor: novoValor, descricao, observacoes: obs },
            });
        } else {
            const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
            await this.prisma.acaoCusto.create({
                data: {
                    acaoId,
                    tipo: 'DIARIA_FUNCIONARIO',
                    descricao,
                    valor: novoValor,
                    data: acao?.dataInicio || new Date(),
                    observacoes: obs,
                },
            });
        }

        // 3. Upsert ContaPagar
        const conta = await this.prisma.contaPagar.findFirst({
            where: {
                acaoId,
                tipo_conta: 'diaria_funcionario',
                descricao: { in: legacyDescricoes },
            },
        });
        if (conta) {
            await this.prisma.contaPagar.update({
                where: { id: conta.id },
                data: { valor: novoValor, descricao, observacoes: obs },
            });
        } else {
            const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
            await this.prisma.contaPagar.create({
                data: {
                    tipo_conta: 'diaria_funcionario',
                    descricao,
                    valor: novoValor,
                    data_vencimento: acao?.dataFim || new Date(),
                    status: 'pendente',
                    recorrente: false,
                    acaoId,
                    cidade: acao?.cidadeNome || undefined,
                    observacoes: obs,
                },
            });
        }
        this.emitFinanceiroListagemRefresh('acao_update_funcionario_dias_diaria', { acaoId, employeeId });

        return {
            message: 'Dias e custos atualizados com sucesso',
            valor: novoValor,
            dias: diasFinal,
            diasCalculados: diasCalc,
        };
    }

    async removeFuncionario(acaoId: string, employeeId: string) {
        // Buscar nome para encontrar os custos relacionados
        const vinculo = await this.prisma.acaoFuncionario.findFirst({
            where: { acaoId, employeeId },
            include: { employee: { select: { name: true } } },
        });

        if (vinculo) {
            const name = vinculo.employee.name;
            const descricoes = [`Diária - ${name}`, `CLT - ${name}`];
            await this.prisma.acaoCusto.deleteMany({
                where: { acaoId, tipo: 'DIARIA_FUNCIONARIO', descricao: { in: descricoes } },
            });
            await this.prisma.contaPagar.deleteMany({
                where: { acaoId, tipo_conta: 'diaria_funcionario', descricao: { in: descricoes } },
            });
            this.emitFinanceiroListagemRefresh('acao_remove_funcionario_diaria', { acaoId, employeeId });
        }

        await this.prisma.acaoFuncionario.deleteMany({ where: { acaoId, employeeId } });
        return { message: 'Funcionário e custos removidos da ação' };
    }
}
