# WYNCORE Work

Central pessoal para organizar oportunidades de avaliação, pesquisa e treinamento de dados.

## O que esta versão faz
- Apresenta links para os portais oficiais OneForma, Welo Data, RWS TrainAI e Prolific.
- Permite registrar tarefas encontradas nesses portais.
- Organiza tarefas salvas, em andamento, enviadas para revisão e concluídas.
- Guarda o acompanhamento localmente no navegador/dispositivo, sem enviar senhas ou documentos a um intermediário.
- Mantém o módulo separado do painel comercial WYNCORE Ads.

## O que ainda não faz
- Não importa automaticamente vagas ou tarefas das contas externas.
- Não autentica contas de terceiros.
- Não envia avaliações em nome do trabalhador.
- Não confirma remuneração nem recebe, guarda ou transfere pagamentos.
- Não promete disponibilidade, aprovação ou renda.

Cada plataforma controla sua seleção, elegibilidade, volume de tarefas, critérios de qualidade e pagamentos. Só devem ser adicionadas integrações depois de existir uma API oficial que autorize expressamente o acesso às oportunidades de participantes. APIs destinadas a anunciantes, pesquisadores ou fornecedores empresariais não equivalem a uma API de tarefas para trabalhadores individuais.

## Segurança e privacidade
- O painel não pede senhas, documentos, códigos de verificação nem dados bancários.
- Os links abrem os domínios oficiais em nova aba.
- Os registros ficam no armazenamento local do navegador. Limpar os dados do navegador pode apagá-los.
- O usuário deve revisar as regras e os requisitos de cada plataforma antes de se candidatar.

## Testes
`node --check wyncore/work.js` valida a sintaxe do módulo. O workflow WYNCORE checks também verifica os três arquivos do painel. Os testes existentes do backend continuam cobrindo módulos separados e podem apontar falhas preexistentes que não pertencem a este painel.
