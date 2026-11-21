# WYNCORE — auditoria operacional de integrações

Data da auditoria: 2026-11-21
Branch examinada: `wyncore-personal-work-hub`

## Resultado objetivo

Os adaptadores de Adscend Media, Asaas e PayPal existem no código. Isso comprova implementação de chamadas e regras locais, mas não comprova conta de publisher aprovada, credenciais válidas, campanhas elegíveis no Brasil, receita liquidada ou pagamentos efetuados.

## Inventário de configuração observado no Vercel

A listagem de variáveis do projeto contém configurações de sessão/administração, armazenamento e Supabase. Não aparecem variáveis de ambiente para:

- `ADSCEND_PUBLISHER_ID`
- `ADSCEND_API_KEY`
- `ADSCEND_POSTBACK_SECRET`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

Também foi observado que `WYNCORE_SUPABASE_ANON_KEY` está sem valor na configuração de Preview da branch. A documentação já informa que o RPC Supabase permanece desativado até a correção da configuração de segurança/RLS. Não declarar o armazenamento Supabase como operacional até o health check confirmar `supabaseConfigured: true` e os testes de leitura/escrita concorrente passarem.

## Regras de ativação

1. Adscend: só importar ofertas para o Brasil quando a API autenticada retornar campanhas do produto de vídeo com tráfego incentivado/dinheiro explicitamente permitido. Oferta vazia ou país não elegível significa zero anúncios disponíveis, nunca inventar inventário.
2. Postback: validar assinatura, identificador único, moeda, valor, estado e reversões. Só receita liquidada pelo parceiro pode virar saldo sacável.
3. Asaas: manter sandbox durante homologação. Produção exige conta aprovada, API key de produção, token de webhook, webhook cadastrado e saldo empresarial suficiente. O evento `TRANSFER_DONE` é a confirmação do Pix.
4. PayPal: manter sandbox até aprovação do produto Payouts e validação de destinatários/países. Não misturar sandbox com produção.
5. Carteira: saldo estimado, pendente, aprovado não liquidado e disponível para saque devem permanecer separados. Nunca creditar estimativas como dinheiro disponível.
6. Segurança: todos os segredos ficam exclusivamente em variáveis sensíveis do servidor. Não colocar chaves no Git, navegador, logs ou conversa.

## Bloqueios concretos identificados

- As variáveis do provedor Adscend não estão cadastradas no projeto Vercel examinado.
- As variáveis do Asaas não estão cadastradas no projeto Vercel examinado.
- As variáveis do PayPal não estão cadastradas no projeto Vercel examinado.
- O Supabase RPC não está operacional na configuração observada; a chave anon de Preview está vazia e a documentação registra bloqueio de segurança.
- Não há evidência, nesta auditoria, de campanhas Rewarded Video elegíveis no Brasil, postback de conversão real ou pagamento liquidado.

## Próxima sequência técnica

1. Corrigir e verificar armazenamento transacional e autenticação em Preview.
2. Inserir credenciais reais diretamente no gerenciador de segredos do Vercel, sem transmiti-las pelo chat.
3. Executar health checks e testes de integração em sandbox.
4. Homologar campanha de vídeo incentivado no Brasil e receber postback assinado de teste do próprio parceiro.
5. Só então habilitar produção e realizar uma transação pequena, conciliada no painel do parceiro e no Asaas.

**Estado final desta auditoria:** módulos de integração presentes; integrações externas não comprovadas como conectadas; receita e saques reais não comprovados.