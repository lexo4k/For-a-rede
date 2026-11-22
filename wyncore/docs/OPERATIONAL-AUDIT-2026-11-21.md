# WYNCORE — auditoria operacional

Data: 2026-11-22
Branch: `wyncore-sl-complete`

## Código e testes

- Painel integrado com campanhas, vídeos, tarefas internas, TD Mais, níveis SL1–SL9, equipe, indicações, carteira e relatórios.
- Agregador externo de vagas removido.
- Adaptadores legados Asaas/PayPal removidos; endpoints antigos respondem HTTP 410.
- Financiamento via Stripe Checkout e repasses via Stripe Connect, com webhook assinado e conciliação.
- Confirmações manuais de recebimento e pagamento desativadas.
- Cadastro da área de campanhas inclui e-mail para onboarding Stripe Connect.
- Testes executados em sandbox com Node.js 24.22.3:
  - `npm ci`: concluído.
  - `node --check` em server.js, domain.js, app.js, ads.js e stripe.js: concluído.
  - `npm run build`: 32 testes aprovados, 0 falhas.
  - `npm audit --omit=dev`: 0 vulnerabilidades.
- A dependência foi fixada em `package-lock.json`.

## Persistência Supabase verificada

Projeto WYNCORE `pdgmeiyoplrwrnrvoenf`, status `ACTIVE_HEALTHY`.
- `public.wyncore_state`: 1 registro.
- `private.wyncore_rpc_credentials`: 1 registro.
- Funções `wyncore_state_read` e `wyncore_state_write` presentes.
- Ambas validam o segredo RPC contra a tabela privada antes de ler/gravar.
- Escrita usa advisory lock e comparação de `updated_at` para evitar sobrescrita concorrente.
- RLS está habilitado nas tabelas; não há políticas diretas, e a operação é feita pelas funções RPC protegidas.

O segredo RPC e as chaves do projeto não são reproduzidos neste relatório.

## Bloqueios externos

- Não foram encontradas variáveis `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou `STRIPE_CONNECT_ENABLED` na configuração Vercel examinada. Portanto, não há cobrança ou repasse real habilitado.
- Não foram encontradas credenciais Adscend de publisher; não há inventário de ofertas confirmado.
- O limite Vercel gratuito de 100 deployments por dia foi atingido. A criação de um novo preview retornou HTTP 402 e retry de 24 horas.
- O domínio de produção não foi alterado.
- PR #7 permanece em rascunho, sem merge.

## Resultado

O código e os testes estão prontos para revisão. A ativação financeira e a publicação dependem da habilitação da Stripe Connect, credenciais Stripe, aprovação Adscend se desejada e liberação do limite de deploy da Vercel. Não declarar a plataforma como recebendo ou pagando dinheiro até homologação real.
