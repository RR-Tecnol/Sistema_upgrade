SISTEMA UPGRADE DOCUMENTACAO DE AJUSTES URGENTES


1- AUTENTICACAO E SEGURANCA

01 - Label do código de autenticação está errada Corrigir o texto da label referente ao campo de código de autenticação na interface. (Corrigido)


02 - Verificar código Authenticator — integração com Brevo Auditar e validar o fluxo do Authenticator que depende da API Brevo para envio de mensagens/códigos. (Fica por ultimo)


03 - Colocar troca de senha na área de Configurações Adicionar funcionalidade de troca de senha dentro do menu Configurações para maior segurança.(corrigido)


04 - Erro ao trocar senha — sistema aceita apenas um caractere Corrigir validação do campo de senha que está aceitando somente 1 caractere. Aplicar regra mínima adequada.(corrigido, trocar senha funcional também)


02 - INSCRICOES E CURSOS

01 - Dados não aparecem após inscrição Após a conclusão da inscrição, os dados do aluno não são exibidos. Verificar query/atualização de estado.(Corrigido)


02 - Erro ao salvar inscrição de curso O sistema falha ao persistir a inscrição. Verificar endpoint, validações e retorno do backend.(corrigido)


03 - Ajustar front-end após curso criado A tela de confirmação/visualização pós-criação de curso apresenta inconsistências visuais. Corrigir layout. (corrigido e expandido para todas as telas de criação/cadastro/solicitação)


04 - Adicionar botão para reativar curso Implementar ação de reativação para cursos desativados, com feedback visual de confirmação.(corrigido)


05 - Substituir botão 'Editar' por botão 'Ver' nos cursos listados Na listagem de cursos, trocar o botão de edição por um botão de visualização quando a ação correta for apenas consultar.(corrigido)


06 - Estrutura temporal — cadastrar curso em outros estados via Adm No fluxo de novo curso, permitir que o Adm adicione outros estados. O sistema deve detectar automaticamente o estado e aplicar o cadastro correto.(corrigido/implementado/aprofundado)


07 - Notificação não exibe o nome do usuário O template de notificação não está interpolando a variável de nome do usuário. Corrigir a montagem da mensagem.
(corrigido)

extra 08 - corrigido a lógica de inscrições e minha turma, contabilizava 4 turmas ativas mesmo que uma estava rejeitada e a outra pendente (corrigido/implementado)

extra 09 -  em certificados do aluno para ele acompanhar o progresso dele baseado nos dias que ele esteve presente e as faltas dele, lógica para que caso ele falte e avise a quantidade de faltas que ele pode ter ainda assim que ele entrar em risco o avisar nas notificações e ficar no card de certificados também, caso ele chegue abaixo dos 75% o avisa-lo para entrar em contato com administrador para ele negociar as faltas.(corrigido/implementado)

Extra 10 - Adicção de botão editar dentro de cursos.

Extra 11 - Adiccção de filtros e tutorial colapsavel em cursos.

Extra 12 -  Também fiz uma auditoria nas telas de detalhe do ADM e os principais próximos candidatos de inconsistência (já mapeados) são:

admin/carretas/[id] (falta contexto operacional completo),
admin/turmas/[id] (faltam vínculos amplos como módulos/materiais/certificação em tela única),
admin/alunos/[id] (falta consolidado de frequência/certificados/auditoria em profundidade).(corrigido/implementado)

03 - FRONT-END E INTERFACE

01 - Ajustar front-end da tela de grupos no Adm Layout da tela de grupos apresenta desalinhamentos. Revisar CSS/componentes.(corrigido)


02 - Erro na label de rota na tela de Viagens — exibindo '- - -' O campo de rota exibe '- - -' ao invés do valor real. Verificar binding da variável no componente.(Corrigido)


03 - Centralizar card de 'Gerar Link' na tela de Funcionários O card está posicionado no meio da página (scroll) e não no centro da viewport. Ajustar alinhamento. Corrigir também o erro ao gerar o link de cadastro.(corrigido)


04 - Card de registrar ocorrência fora do centro na tela de Funcionários Ajustar o posicionamento do card para centro da tela.(corrigido)


05 - Ajustar card central na tela de Reembolsos Card principal fora de posição. Corrigir front-end para centralização correta(corrigido)


06 - Adicionar card de 'Rejeitados' na tela de Reembolsos Incluir novo card ou seção que liste reembolsos rejeitados, com visual padronizado.(corrigido)


07 - Chave Pix não exibida na tela de Feedbacks e Avaliações Exibir a Chave Pix corretamente. Padronizar o design dos cards nessas telas.(corrigido/investigar fluxo completo de feedback)


08 - Card de Contas a Pagar fora do centro — ajustar front-end Corrigir posicionamento do card de contas a pagar.(corrigido)


09 - Trocar labels em inglês na tela de Relatórios para português Localizar todos os textos em inglês nos relatórios e substituir pelas traduções corretas em pt-BR.(corrigido)


10 - Ajustar cores do gráfico na tela de Relatórios Revisar paleta do gráfico para melhor legibilidade e consistência visual com o sistema.(investigar)


11 - Ajustar bug de front-end nos modelos de certificado Corrigir inconsistências visuais na tela de modelos de certificado.(corrigido)


12 - Ajustar bug de front-end nos modelos de certificado Corrigir inconsistências visuais na tela de modelos de certificado.(corrigido)


04 - DESPESAS E FINANCEIRO

01 - Consertar front-end da tela de adicionar despesas A tela de cadastro de despesas apresenta erros visuais. Corrigir o layout.(Corrigido)


02 - Botão 'Remover' em despesas do período não funciona O botão de remoção de despesa vinculada a um período de curso não está executando a ação. Verificar evento e chamada à API.(Corrigido)


03 - Variável de penalidade do aluno deve refletir dias do curso, não salário Ajustar a lógica de penalidade: o cômputo deve ser em dias do calendário do curso, pois alunos não possuem remuneração.(corrigido)


05 - FREQUENCIA E PONTO

01 - Tela 'Ver Frequência do Aluno' — tela branca e nome do professor não atualiza Exibir mensagem informativa quando não houver registros. Corrigir atualização do nome do professor nessa tela.(corrigido)


02 - Implementar visualização personalizada de frequência (professor, aluno, motorista) Criar filtro/tela para visualizar a frequência individualmente de qualquer profissional selecionado.(corrigido)


03 - Botão 'Ponto Hoje' não funciona no card de ação rápida do professor O botão não registra o ponto. Verificar endpoint e estado da requisição.(corrigido)


04 - impedir múltiplos registros de ponto para o mesmo funcionário no mesmo dia Adicionar validação backend e frontend para bloquear mais de um registro de ponto por funcionário por dia.(corrigido)


05 - DOCUMENTACAO E ARQUIVOS

01 - Adm visualizar documentação pendente do aluno no Kanban Exibir indicador/card no Kanban mostrando quais documentos do aluno estão pendentes.(corrigido)


02 - Implementar download de documentação do aluno pelo Adm Adicionar botão/ação para que o Adm possa baixar os documentos do aluno diretamente.(corrigido)


03 - Implementar anexo de documentações pendentes na área de Funcionários Permitir que funcionários anexem documentos pendentes diretamente pela interface.(corrigido)


04 - Adm visualizar e baixar documentos de imprevistos dos usuários O Adm deve conseguir ver e fazer download dos documentos de imprevistos enviados pelos usuários (corrigido)


05 -Card de reembolsos deve colapsar e exibir imagens na tela de Funcionários Implementar comportamento de colapso com exibição de imagens para o card de reembolsos.(corrigido)


06 - Card de imprevistos do professor deve colapsar e exibir imagens Implementar colapso do card na tela de imprevistos do professor, mostrando as imagens dos documentos enviados.(corrigido)


06 - CERTIFICADOS E QR CODE

01 - PDF do certificado deve ser gerado em qualidade máxima para impressão Ajustar resolução/configurações de exportação do certificado PDF para qualidade de impressão profissional.(Corrigido)


02 - QR Code e o código do certificado deve ser único por aluno Garantir que o QR Code gerado no certificado seja exclusivo para cada aluno, sem repetições.(Corrigido)


03 - Verificar QR Code de download do certificado no domínio oficial e VPS Testar e confirmar que o QR Code do aluno aponta corretamente para o certificado após deploy em produção(investigar com server rodando)


07 - MAPAS E ROTAS

01 - Mapa de rota não funciona — adicionar botão de pesquisar rota no Adm Corrigir o mapa de rotas na tela do Adm. Adicionar botão de pesquisa de rota. Latitude e longitude devem ser preenchidas automaticamente, igual ao fluxo de criação de turmas.(corrigido parcialmente)


 Erro: nova rota sendo exibida para o motorista com mapa implementado A tela do motorista está exibindo a nova rota indevidamente junto com o mapa. Corrigir lógica de exibição


 Erro: nova rota sendo exibida para o motorista com mapa implementado A tela do motorista está exibindo a nova rota indevidamente junto com o mapa. Corrigir lógica de exibição


 BACKLOG TECNICO MAPAS/CEP — imprecisão de geolocalização no CEP 65600-160 (Caxias/MA) Contexto do erro atual: no fluxo de viagem manual, ao informar CEP 65600-160, em alguns cenários o geocódigo retorna ponto fora de Caxias (ex.: Cuiabá), causando rota falsa para o motorista. Impacto: risco operacional, atraso, custo extra e decisão logística incorreta.

 Diagnóstico consolidado (causa raiz) A falha principal não está no desenho da rota e sim na conversão CEP/endereço para latitude/longitude (geocodificação textual ambígua). Quando o ponto sai errado, a rota também sai errada mesmo com engine de rota válida.

 Opção A (curto prazo, menor custo) — endurecer stack atual ViaCEP + backend + OSM/OSRM Melhorias: validar município/UF por ViaCEP antes de aceitar; priorizar IBGE quando houver no cadastro de cidades; aplicar filtro forte por UF/estado no geocoder; rejeitar salvamento se distância CEP x coordenada exceder limite; exigir recálculo por CEP em origem/destino; adicionar telemetria de divergência por CEP.
Vantagens: sem custo adicional relevante de licença.
Riscos: precisão final ainda depende da qualidade do geocoder aberto e base OSM.

 Opção B (híbrida) — manter mapa/rota atual e trocar só geocodificação para provedor premium Integrar API comercial apenas para CEP/endereço para coordenadas (Google, HERE, Mapbox, Azure, OpenCage), mantendo Leaflet/OSRM para visualização/rota onde fizer sentido.
 Vantagens: aumenta precisão no ponto crítico sem migrar tudo.
 riscos: custo por requisição e gestão de chave/quota.

 Opção C (migração completa para Google Maps Platform) Geocoding + Directions/Routes + Maps JavaScript API em todos os fluxos (turmas, ações, viagens, dashboard motorista/adm).
 Vantagens: maior consistência ponta a ponta.
 Riscos: custo recorrente por uso, billing obrigatório e rollout maior.

 Opção D (base nacional de CEP georreferenciado) Integrar fornecedor focado em Brasil com CEP para coordenadas confiável e fallback para geocoder textual somente quando CEP não resolver.
 Vantagens: robusto para cenário operacional por CEP.
 Riscos: contrato/licenciamento e cobertura por logradouro.

 Critérios de decisão (obrigatório antes de fechar arquitetura) Precisão mínima por CEP (SLA interno), volume mensal de geocodificação/rotas/map loads, custo teto mensal, tempo de implementação e exigência de auditoria operacional.

 Plano de execução recomendado (prioridade) Fase 1: consolidar validação rígida e telemetria de erro por CEP (backlog imediato). Fase 2: piloto A/B com 1 provedor premium para comparar precisão em amostra de CEPs críticos (MA e demais estados ativos). Fase 3: decisão final por custo x precisão e rollout gradual.

 Status deste item: BACKLOG ABERTO (documentado para execução após o ciclo atual de correções).


02 - Erro: nova rota sendo exibida para o motorista com mapa implementado A tela do motorista está exibindo a nova rota indevidamente junto com o mapa. Corrigir lógica de exibição.(não achei)

08 - ODOMETRO E VIAGENS

01 - Verificar sistema de fotos do km do motorista (início e fim da rota) Testar e validar o fluxo de captura e envio de fotos do odômetro antes de iniciar e ao finalizar a rota.(corrigido)


02 - Adicionar cards clicáveis na tabela de viagens do Adm para ver foto do odômetro Na tabela de viagens, permitir que o Adm clique para visualizar a foto do odômetro enviada pelo motorista.(corrigido)


09 - RELATORIOS E CONFIGURACOES

01 - Erro ao gerar PDF e baixar lista de concludentes O sistema falha ao gerar/baixar a lista de concludentes em PDF. Investigar e corrigir o endpoint de exportação.(investigar)


02 - Verificar funcionalidade do filtro de relatórios Testar todos os filtros disponíveis na tela de relatórios e corrigir os que não estão funcionando.(corrigido)


03 - Verificar se todas as funcionalidades de Configurações do Adm estão operacionais Realizar varredura completa nas configurações do Adm para garantir que todas as funções têm implementação real.(investigar)


04 - Corrigir relatórios exportados em planilha — campos importantes ausentes Os relatórios em planilha não estão incluindo campos importantes. Mapear os campos obrigatórios e corrigir a exportação.(investigar)


05 - Adicionar feriados locais automáticos por estado cadastrado Integrar calendário de feriados locais de forma automática conforme o estado cadastrado no sistema(corrigido)


---

## Backlog — PROGRESSO POR TURMA / certificado do aluno

**O que faria sentido em PROGRESSO POR TURMA para o aluno acompanhar o certificado?**

Ideia: um painel por turma com tudo o que influencia a mesma decisão que a emissão usa. Já cobrimos grande parte; conceptualmente o ideal é:

| Bloco | Para quê serve |
|--------|----------------|
| % para certificado (após penalidades) | Número único que deve bater na meta (75%). |
| Comparativo “sem penalidades” | Transparência quando o admin aplicou PENALIZED. |
| Presenças / faltas injustificadas / justificadas | O aluno entende de onde sai a % efectiva. |
| Dias efectivos | Junta presença + justificadas no numerador. |
| Faltas injustificadas “ainda no orçamento” | Quantas faltas brutas ainda cabem sem ficar abaixo da regra. |
| Dias mínimos efectivos necessários | Meta clara tipo “preciso de pelo menos N dias bons”. |
| Dias letivos previstos (calendário) | Contexto de cobertura quando o professor ainda lançou pouco. |
| Estado explícito: elegível / não elegível + motivos | Evita surpresas na hora da emissão. |
| Link para frequência / imprevistos | Ação seguinte sempre visível (já há link para frequência). |

**Opcional futuro** (não obrigatório neste pedido): previsão de “se faltar todos os próximos N dias até ao fim do curso, ainda alcanço 75%?” — só se quiserem gamificar/projetar cenários.
