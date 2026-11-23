# WYNCORE — Work & Ads

Plataforma web responsiva para organizar projetos de trabalho, campanhas patrocinadas, avaliações e carteira financeira.

## Módulos
- **Work:** catálogo de plataformas externas e acompanhamento de candidaturas/projetos.
- **Ads:** campanhas patrocinadas, vídeos, briefings e avaliações; recompensas somente após confirmação do parceiro.
- **Carteira:** saldo confirmado, lançamentos e extrato.
- **Pix:** cadastro de chave, depósitos e solicitações de saque.
- **Empresas:** propostas comerciais para campanhas.
- **Relatórios:** acompanhamento de atividade e movimentações.
- **Configurações:** estado das integrações e transparência operacional.

## Regras financeiras
- Nenhum saldo é criado por estimativa, clique, cadastro ou visualização sem confirmação do provedor.
- Não há promessa de renda ou pagamento automático sem contrato e liquidação real.
- Mercado Pago não faz parte da arquitetura.
- Stripe está conectado à sessão do ChatGPT, mas a conta consultada ainda informa `charges_enabled=false`, `payouts_enabled=false` e `details_submitted=false`.
- Adscend Media exige credenciais e aprovação de publisher antes de oferecer campanhas remuneradas.
- Pix depende de um provedor de cobrança/transferência habilitado e webhooks verificados.

## Estado desta branch
A interface WYNCORE foi reconstruída e publicada em Preview na Vercel. Os formulários que dependem de APIs estão explicitamente identificados como não conectados; não simulam salvamento, cobrança, recompensa ou transferência. Esta branch ainda não deve ser promovida a produção até concluir e testar backend, autenticação, persistência, pagamentos e webhooks.

## Segurança
Nunca colocar chaves privadas, tokens secretos ou credenciais de provedor no frontend. Usar variáveis de ambiente server-side e validar webhooks antes de alterar a carteira.
