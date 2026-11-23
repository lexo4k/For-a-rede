# WYNCORE

Plataforma integrada de campanhas patrocinadas, vídeos, atividades remuneradas, progressão TD Mais, níveis SL1–SL9, equipe, indicações, carteira e relatórios.

## Módulos

- Cadastro de participantes com aprovação administrativa, sessão segura e perfis de acesso.
- Painel principal com TD Mais, níveis SL1–SL9, atividades, tarefas, equipe, indicações, carteira e relatórios.
- Campanhas de vídeo com player, tempo de exibição, avaliações e revisão administrativa.
- Programas/atividades com orçamento, solicitação, atribuição, comprovação, revisão e repasse.
- Painel de anunciantes, campanhas e contatos comerciais.
- Carteira unificada: recompensas em análise, aprovadas, transferidas e recebidas são estados separados.
- Stripe Checkout para financiar campanhas e Stripe Connect para repasses aos participantes.
- Persistência compartilhada por Supabase RPC ou PostgreSQL transacional.

O antigo agregador de vagas externas foi removido. A plataforma não cria saldo ao abrir um vídeo, clicar, convidar alguém ou iniciar uma tarefa.

## Executar e testar

Requer Node.js 22 ou superior.

```bash
cd wyncore
cp .env.example .env
npm install
npm test
npm start
```

Abra `http://localhost:3000`. A conta administrativa usa a credencial de ambiente. Participantes solicitam acesso e aguardam aprovação.

## Persistência de produção

O WYNCORE usa Supabase RPC quando `WYNCORE_SUPABASE_URL`, `WYNCORE_SUPABASE_ANON_KEY` e `WYNCORE_SUPABASE_RPC_SECRET` estão configurados. O segredo RPC permanece exclusivamente no servidor. PostgreSQL transacional direto também é suportado por `DATABASE_URL`.

O estado existente deve ser preservado durante a implantação. Não reinicialize a tabela de estado nem substitua o banco ativo por dados de demonstração.

## Stripe

Variáveis server-side:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_ENABLED=true` somente após a Stripe habilitar a WYNCORE como plataforma Connect.
- `WYNCORE_PUBLIC_URL`

Webhook principal:
`https://wyncore.vercel.app/api/webhooks/stripe`

Eventos esperados:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `account.updated`
- `transfer.created`
- `transfer.reversed`
- `payout.paid`
- `payout.failed`

A confirmação de financiamento depende de webhook Stripe assinado e conciliado com campanha/atividade, valor e moeda BRL. Repasses dependem de Stripe Connect, conta conectada validada e armazenamento transacional. Uma transferência para a conta Stripe do participante não é apresentada como pagamento bancário recebido; o estado final depende de confirmação de payout.

## Bloqueios de ativação

O código do adaptador Stripe está implementado e falha de forma segura quando não há credenciais ou autorização. A conta Stripe precisa estar habilitada para cobranças; para repasses a participantes, a plataforma precisa ter Stripe Connect aprovado. Não marque campanhas como financiadas nem recompensas como pagas manualmente.

A rede Adscend é opcional e só deve ser habilitada após aprovação de publisher e revisão de seus termos. Campanhas internas continuam dependendo de anunciantes reais, orçamento efetivamente recebido e critérios de participação.

## Regras financeiras e antifraude

- Não há compra de níveis, depósito obrigatório, rendimento fixo ou promessa de salário.
- Recompensas dependem de campanhas financiadas, atividade válida e aprovação.
- Créditos duplicados, assinaturas inválidas e estornos são rejeitados ou conciliados.
- Bots, auto-click, visualizações simuladas, contas duplicadas e manipulação de player são proibidos.
- Convites não geram comissão automaticamente; qualquer incentivo futuro deve estar vinculado a receita legítima e regras publicadas.

## Privacidade

A WYNCORE usa Vercel e Supabase para hospedagem/persistência e Stripe para pagamentos e onboarding financeiro. A rede de anúncios opcional pode receber identificador pseudônimo, IP e país para disponibilizar campanhas e prevenir fraude. Consulte `privacidade.html` e `termos.html`.

## Radar autônomo de oportunidades

O radar consulta fontes públicas a cada seis horas pela Cron Job do Vercel e também pode ser executado pela administração. Configure `CRON_SECRET` como variável sensível em Production e Preview. A rota `/api/cron/work-scan` valida o cabeçalho `Authorization: Bearer` antes de executar. O estado e o histórico ficam no armazenamento WYNCORE.

Fontes automáticas: Remotive, Arbeitnow e Remote OK. A lista de portais de projetos é mantida separada e abre os domínios oficiais. Não há scraping autenticado, uso de credenciais de terceiros ou candidatura automática. A compatibilidade é uma triagem por palavras-chave, não garantia de elegibilidade nem estimativa de renda.
