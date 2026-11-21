# WYNCORE Work

Central pessoal para organizar oportunidades de avaliação, pesquisa e treinamento de dados.

## Recursos desta versão
- Conta pessoal com cadastro por nome, e-mail e senha, login e logout.
- Senhas armazenadas como hash com scrypt; sessões assinadas e cookie HttpOnly.
- Dados de conta, tarefas e registros financeiros isolados por usuário.
- Sete portais oficiais: OneForma, Welo Data, RWS TrainAI, Prolific, CrowdGen by Appen, TELUS Digital AI Community e Outlier.
- Acompanhamento de tarefas salvas, em andamento, enviadas e concluídas.
- Histórico manual de pagamentos informados pelo próprio usuário, com separação entre valor informado e marcado como recebido.
- Persistência pelo armazenamento privado do projeto quando o token de Blob está configurado.

## Limites importantes
- Não importa automaticamente vagas ou tarefas das contas externas.
- Não autentica contas de terceiros nem envia avaliações em nome do trabalhador.
- Não confirma pagamentos com bancos ou carteiras, não recebe, guarda ou transfere dinheiro.
- O status "recebido" no histórico é uma anotação manual do usuário, não uma conciliação bancária.
- Não promete disponibilidade, aprovação ou renda.

Cada plataforma controla seleção, elegibilidade, volume de tarefas, critérios de qualidade e pagamentos. Só devem ser adicionadas integrações depois de existir uma API oficial que autorize expressamente o acesso às oportunidades de participantes. APIs destinadas a anunciantes, pesquisadores ou fornecedores empresariais não equivalem a uma API de tarefas para trabalhadores individuais.

## Segurança e privacidade
- O painel não pede senhas de plataformas externas, documentos, códigos de verificação nem dados bancários.
- Use uma senha exclusiva para a conta WYNCORE Work.
- Os links abrem os domínios oficiais em nova aba.
- Os dados do painel são privados por conta; sessões expiram após oito horas.
- Revise as regras e os requisitos de cada plataforma antes de se candidatar.

## Testes
O workflow WYNCORE checks valida a sintaxe do servidor e dos arquivos do painel e executa os testes de integração de cadastro, login, tarefas e histórico.
