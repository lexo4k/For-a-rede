# WYNCORE Ads + Work

Plataforma de campanhas patrocinadas e vídeos recompensados, com carteira BRL, histórico financeiro e recebimento Pix.

## Experiência do participante

- Central de campanhas patrocinadas e vídeos recompensados.
- Ofertas externas da Adscend Media, quando a conta publisher estiver aprovada e as credenciais de servidor estiverem configuradas.
- Avaliações de campanhas WYNCORE com revisão administrativa.
- Estimativas do parceiro separadas de recompensas confirmadas.
- Conversão de recompensas USD para BRL pela cotação consultada no momento do postback confirmado.
- Carteira com valores em análise, disponíveis e recebidos.
- Cadastro de chave Pix (CPF, CNPJ, e-mail, celular ou chave aleatória), criptografada no servidor.
- Solicitações de saque vinculadas ao saldo aprovado e à chave Pix cadastrada.

## Operação e pagamentos

- Campanhas só podem ser publicadas após financiamento confirmado por webhook assinado.
- O crédito de vídeos externos depende de postback autenticado e conciliação com uma oferta previamente apresentada ao participante.
- Recompensas em USD só são convertidas quando há cotação USD/BRL válida; caso contrário permanecem sem crédito.
- O saque Pix é reservado somente sobre recompensas aprovadas e campanhas efetivamente financiadas.
- A chave Pix é armazenada criptografada com AES-256-GCM usando a chave de sessão do servidor.
- Solicitações Pix não são marcadas como transferidas/recebidas sem confirmação real do provedor.

## Integrações ainda necessárias para operação financeira real

- Adscend Media: ADSCEND_PUBLISHER_ID, ADSCEND_API_KEY e ADSCEND_POSTBACK_SECRET, após aprovação do publisher e configuração do postback.
- Financiamento de campanhas: STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET, ou um provedor Pix aprovado para cobrança de anunciantes.
- Saques Pix automáticos: integração com um provedor de pagamentos que ofereça transferências Pix, credenciais válidas e webhook de confirmação. O cadastro da chave Pix funciona, mas a transferência automática ainda não está habilitada.
- Persistência transacional: Supabase RPC protegido ou PostgreSQL transacional. A implantação atual usa Supabase RPC.

O ambiente não cria saldo fictício, não simula visualizações e não promete renda fixa. A disponibilidade de campanhas e os pagamentos dependem de parceiros reais, orçamento financiado e validação.

## Executar e testar

Requer Node.js 22 ou superior.

    npm install
    npm test
    npm start

Abra http://localhost:3000. A administração aprova cadastros e gerencia campanhas; participantes acessam a central de anúncios e a carteira.

## Webhooks

- Stripe: /api/webhooks/stripe
- Adscend: /api/webhooks/adscend

Não altere o banco de produção nem substitua o estado persistido por dados de demonstração durante implantações.
