import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AcaoStatus } from '@prisma/client';
import { CreateAcaoDto } from './dto/create-acao.dto';
import { CreateAcaoCustoDto } from './dto/create-acao-custo.dto';
import { CreateAcaoEquipeDto } from './dto/create-acao-equipe.dto';
import { CreateAcaoFuncionarioDto } from './dto/create-acao-funcionario.dto';

@Injectable()
export class AcoesService {
    private readonly logger = new Logger(AcoesService.name);

    constructor(
        private prisma: PrismaService,
        private settingsService: SettingsService,
        private readonly notifications: NotificationsGateway,
    ) { }

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

        const acoes = await this.prisma.acao.findMany({
            where,
            include: {
                cidade: { select: { id: true, name: true, state: true } },
                grupo: { select: { id: true, name: true, state: true } },
                carreta: { select: { id: true, identifier: true, licensePlate: true, type: true } },
                _count: {
                    select: { turmas: true, custos: true, equipe: true },
                },
            },
            orderBy: { dataInicio: 'desc' },
        });

        return acoes;
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

        // Auto-sync: criar AcaoCusto para funcionários que ainda não têm lançamento
        let contaPagarDiariaCriada = false;
        if ((acao as any).funcionarios?.length) {
            for (const f of (acao as any).funcionarios) {
                const descricao = `Diária - ${f.employee.name}`;
                const jaExiste = await this.prisma.acaoCusto.findFirst({
                    where: { acaoId: id, tipo: 'DIARIA_FUNCIONARIO', descricao },
                });
                if (!jaExiste) {
                    const valor = Number(f.valorDiaria) * f.diasTrabalhados;
                    await this.prisma.acaoCusto.create({
                        data: {
                            acaoId: id,
                            tipo: 'DIARIA_FUNCIONARIO',
                            descricao,
                            valor,
                            data: (acao as any).dataInicio || new Date(),
                            observacoes: `${f.diasTrabalhados} dia(s) × R$ ${Number(f.valorDiaria).toFixed(2)}/dia`,
                        },
                    });
                }
                // Criar ContaPagar se também não existir
                const contaExiste = await this.prisma.contaPagar.findFirst({
                    where: { acaoId: id, tipo_conta: 'diaria_funcionario', descricao },
                });
                if (!contaExiste) {
                    const valor = Number(f.valorDiaria) * f.diasTrabalhados;
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
                            observacoes: `${f.diasTrabalhados} dia(s) × R$ ${Number(f.valorDiaria).toFixed(2)}/dia`,
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
                if (contaPagarDiariaCriada) {
                    this.emitFinanceiroListagemRefresh('acao_find_one_sync_diaria', { acaoId: id });
                }
                const resumoFinanceiro = this.calcularResumoFinanceiro(acaoAtualizada);
                return { ...acaoAtualizada, resumoFinanceiro };
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
                dataInicio: new Date(data.dataInicio),
                dataFim: new Date(data.dataFim),
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
        return this.prisma.acao.update({
            where: { id },
            data: {
                ...data,
                dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
                dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
            },
            include: {
                cidade: true,
                grupo: true,
                carreta: true,
            },
        });
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

        return this.prisma.acao.update({ where: { id }, data: { status } });
    }

    async delete(id: string) {
        await this.findOne(id);
        // Soft delete via status CANCELADA (LIVRO_DE_REGRAS §3)
        return this.prisma.acao.update({ where: { id }, data: { status: 'CANCELADA' } });
    }

    // ── Turmas ──────────────────────────────────────────────────
    async addTurma(acaoId: string, turmaId: string) {
        await this.findOne(acaoId);
        try {
            return await this.prisma.acaoTurma.create({
                data: { acaoId, turmaId },
                include: { turma: { include: { course: true } } },
            });
        } catch {
            throw new ConflictException('Turma já vinculada a esta ação');
        }
    }

    async removeTurma(acaoId: string, turmaId: string) {
        await this.prisma.acaoTurma.deleteMany({ where: { acaoId, turmaId } });
        return { message: 'Turma removida da ação com sucesso' };
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
        await this.findOne(acaoId);
        const novoCusto = await this.prisma.acaoCusto.create({
            data: {
                acaoId,
                tipo: data.tipo,
                descricao: data.descricao,
                valor: data.valor,
                data: new Date(data.data),
                litros: data.litros,
                funcionarioId: data.funcionarioId,
                observacoes: data.observacoes,
            },
            include: {
                funcionario: { select: { id: true, name: true } },
            },
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
        return this.prisma.acaoCusto.delete({ where: { id: custoId } });
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
    async listFuncionarios(acaoId: string) {
        return this.prisma.acaoFuncionario.findMany({
            where: { acaoId },
            include: {
                employee: {
                    select: { id: true, name: true, role: true, department: true, phone: true, email: true, specialty: true, dailyCost: true, photoUrl: true, active: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async addFuncionario(acaoId: string, dto: CreateAcaoFuncionarioDto) {
        const acao = await this.findOne(acaoId);
        const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (!emp) throw new NotFoundException('Funcionário não encontrado');

        // GAP-F1: usar dailyCost do cadastro como default quando valorDiaria
        // não for informado no DTO (evita que admin re-digite manualmente)
        const valorDiariaFinal = dto.valorDiaria ?? (emp.dailyCost ? Number(emp.dailyCost) : 0);

        // Auto-calcular dias trabalhados com base nas datas da ação
        const dataInicio = new Date((acao as any).dataInicio);
        const dataFim = new Date((acao as any).dataFim);
        const diffMs = dataFim.getTime() - dataInicio.getTime();
        const diasCalc = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
        const diasFinal = dto.diasTrabalhados ?? diasCalc;

        let vinculo: any;
        try {
            vinculo = await this.prisma.acaoFuncionario.create({
                data: {
                    acaoId,
                    employeeId: dto.employeeId,
                    valorDiaria: valorDiariaFinal,
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

        // Criar AcaoCusto imediatamente ao vincular
        const valorTotal = valorDiariaFinal * diasFinal;
        await this.prisma.acaoCusto.create({
            data: {
                acaoId,
                tipo: 'DIARIA_FUNCIONARIO',
                descricao: `Diária - ${emp.name}`,
                valor: valorTotal,
                data: dataInicio,
                observacoes: `${diasFinal} dia(s) × R$ ${valorDiariaFinal.toFixed(2)}/dia`,
            },
        });

        // Criar/atualizar ContaPagar vinculada
        await this.prisma.contaPagar.deleteMany({
            where: { acaoId, tipo_conta: 'diaria_funcionario', descricao: `Diária - ${emp.name}` },
        });
        await this.prisma.contaPagar.create({
            data: {
                tipo_conta: 'diaria_funcionario',
                descricao: `Diária - ${emp.name}`,
                valor: valorTotal,
                data_vencimento: dataFim,
                status: 'pendente',
                recorrente: false,
                acaoId,
                cidade: (acao as any).cidadeNome || undefined,
                observacoes: `${diasFinal} dia(s) × R$ ${valorDiariaFinal.toFixed(2)}/dia`,
            },
        });
        this.emitFinanceiroListagemRefresh('acao_add_funcionario_diaria', { acaoId, employeeId: dto.employeeId });

        return vinculo;
    }

    async updateFuncionarioDias(acaoId: string, employeeId: string, diasTrabalhados: number) {
        // Buscar o vínculo para obter valorDiaria e nome do funcionário
        const vinculo = await this.prisma.acaoFuncionario.findFirst({
            where: { acaoId, employeeId },
            include: { employee: { select: { id: true, name: true } } },
        });
        if (!vinculo) throw new NotFoundException('Vínculo de funcionário não encontrado');

        const novoValor = Number(vinculo.valorDiaria) * diasTrabalhados;
        const descricao = `Diária - ${vinculo.employee.name}`;

        // 1. Atualizar AcaoFuncionario
        await this.prisma.acaoFuncionario.updateMany({
            where: { acaoId, employeeId },
            data: { diasTrabalhados },
        });

        // 2. Upsert AcaoCusto — cria se não existir (funcionários vinculados antes do auto-create)
        const acaoCusto = await this.prisma.acaoCusto.findFirst({
            where: { acaoId, tipo: 'DIARIA_FUNCIONARIO', descricao },
        });
        if (acaoCusto) {
            await this.prisma.acaoCusto.update({
                where: { id: acaoCusto.id },
                data: {
                    valor: novoValor,
                    observacoes: `${diasTrabalhados} dia(s) × R$ ${Number(vinculo.valorDiaria).toFixed(2)}/dia`,
                },
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
                    observacoes: `${diasTrabalhados} dia(s) × R$ ${Number(vinculo.valorDiaria).toFixed(2)}/dia`,
                },
            });
        }

        // 3. Upsert ContaPagar
        const conta = await this.prisma.contaPagar.findFirst({
            where: { acaoId, tipo_conta: 'diaria_funcionario', descricao },
        });
        if (conta) {
            await this.prisma.contaPagar.update({
                where: { id: conta.id },
                data: {
                    valor: novoValor,
                    observacoes: `${diasTrabalhados} dia(s) × R$ ${Number(vinculo.valorDiaria).toFixed(2)}/dia`,
                },
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
                    observacoes: `${diasTrabalhados} dia(s) × R$ ${Number(vinculo.valorDiaria).toFixed(2)}/dia`,
                },
            });
        }
        this.emitFinanceiroListagemRefresh('acao_update_funcionario_dias_diaria', { acaoId, employeeId });

        return { message: 'Dias e custos atualizados com sucesso', valor: novoValor, dias: diasTrabalhados };
    }

    async removeFuncionario(acaoId: string, employeeId: string) {
        // Buscar nome para encontrar os custos relacionados
        const vinculo = await this.prisma.acaoFuncionario.findFirst({
            where: { acaoId, employeeId },
            include: { employee: { select: { name: true } } },
        });

        if (vinculo) {
            const descricao = `Diária - ${vinculo.employee.name}`;
            // Remover AcaoCusto relacionado
            await this.prisma.acaoCusto.deleteMany({ where: { acaoId, tipo: 'DIARIA_FUNCIONARIO', descricao } });
            // Remover ContaPagar relacionada
            await this.prisma.contaPagar.deleteMany({ where: { acaoId, tipo_conta: 'diaria_funcionario', descricao } });
            this.emitFinanceiroListagemRefresh('acao_remove_funcionario_diaria', { acaoId, employeeId });
        }

        await this.prisma.acaoFuncionario.deleteMany({ where: { acaoId, employeeId } });
        return { message: 'Funcionário e custos removidos da ação' };
    }
}
