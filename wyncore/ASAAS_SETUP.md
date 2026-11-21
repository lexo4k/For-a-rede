# WYNCORE: Asaas Pix + publicação

## O que foi implementado

- Cobrança Pix de campanha pelo Asaas: cliente, cobrança PIX e QR Code dinâmico.
- Campanha só recebe status de orçamento confirmado após webhook autenticado `PAYMENT_RECEIVED`.
- Webhook idempotente para não processar o mesmo evento duas vezes.
- Chaves Pix dos participantes criptografadas em repouso com AES-256-GCM usando a chave de sessão do servidor.
- Ao aprovar uma avaliação, o servidor tenta iniciar o Pix automaticamente quando a campanha já foi paga, o participante cadastrou uma chave Pix e o webhook está configurado.
- O lançamento só vira `paid` após o webhook `TRANSFER_DONE`. Falha/cancelamento retorna a recompensa para a fila de pagamento.
- Administração também pode reenviar um Pix pendente pela ação de pagamento.

## Configuração obrigatória

1. Crie uma conta Asaas e gere uma chave de API no **Sandbox**.
2. Configure no ambiente do servidor:
   - `ASAAS_ENV=sandbox`
   - `ASAAS_API_KEY` com a chave de Sandbox.
   - `ASAAS_WEBHOOK_TOKEN` com segredo aleatório próprio de pelo menos 32 caracteres, diferente da chave da API.
3. Publique a URL pública do webhook:
   - `https://SEU-DOMINIO/api/webhooks/asaas`
   - Header de autenticação: `asaas-access-token`.
   - Eventos necessários: `PAYMENT_RECEIVED`, `TRANSFER_DONE`, `TRANSFER_FAILED`, `TRANSFER_CANCELLED`.
4. Homologue cobrança, QR Code, webhook e transferência no Sandbox.
5. Só depois de validar os testes, troque para `ASAAS_ENV=production` e use a chave de produção. A conta precisa estar aprovada e ter saldo disponível para transferências.
6. Cadastre CPF/CNPJ e dados de contato do contratante na campanha para gerar a cobrança Pix.
7. Cada participante cadastra sua própria chave Pix na área de recebimento.

## Regras de segurança financeira

- Criar uma cobrança não significa que o cliente pagou.
- O QR Code não libera campanha. Somente o webhook autenticado e conciliado com o ID/valor da cobrança libera.
- Criar uma transferência não significa que o Pix foi concluído. Só `TRANSFER_DONE` marca como pago.
- Nunca coloque `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` ou `WYNCORE_SESSION_SECRET` no navegador, no GitHub ou no APK.
- O Asaas só consegue transferir o saldo disponível na conta.
- Não habilite produção antes de homologar e conferir a conta recebedora, regras de negócio, tributos, termos e política de privacidade.

## Vídeos YouTube e Vimeo

O SDK oficial do Vimeo expõe eventos de reprodução como `timeupdate`, `seeked` e `ended`. O YouTube oferece eventos de estado e posição pelo IFrame Player API. Isso permite monitorar o player e bloquear o formulário em caso de salto/abandono, mas esses SDKs não fornecem uma prova criptográfica independente de que uma pessoa assistiu ao conteúdo. Não credite recompensas automaticamente com base apenas em um evento do navegador.

## Publicação

A branch de trabalho é `wyncore-personal-work-hub`. O fluxo de publicação deve usar o mesmo diretório de aplicação (`wyncore`) e só promover para produção depois de CI verde, variáveis de ambiente configuradas e webhook testado. A integração Git do Vercel precisa estar ligada ao repositório e à branch de produção correta; o deploy de preview não atualiza o domínio de produção.

## Notificação automática de novas propostas

Opcionalmente, configure o Resend para receber um e-mail sempre que uma empresa enviar o formulário comercial:
- `RESEND_API_KEY`: chave privada do Resend;
- `WYNCORE_LEADS_FROM`: remetente em domínio verificado no Resend, por exemplo `WYNCORE <leads@seudominio.com>`;
- `WYNCORE_LEADS_TO`: caixa de entrada comercial que receberá os pedidos.

Sem essas três variáveis, o formulário continua recebendo e armazenando solicitações no painel administrativo, mas não envia e-mail. Configure as variáveis apenas no ambiente do servidor, nunca no navegador ou no repositório.

## Configuração assistida pelo painel

Depois de publicar a aplicação e configurar as variáveis abaixo no ambiente do servidor, entre como administrador e clique em **Configurar webhook Asaas** na área de integrações:
- `ASAAS_ENV=sandbox` inicialmente;
- `ASAAS_API_KEY` da conta Sandbox;
- `ASAAS_WEBHOOK_TOKEN` aleatório, 32 a 255 caracteres, sem espaços e diferente da API key;
- `WYNCORE_PUBLIC_URL` com a origem HTTPS pública da aplicação, sem barra final;
- `WYNCORE_LEADS_TO` com o e-mail de alertas comerciais.

O painel registra o webhook no Asaas com os eventos de recebimento e transferência usados pela WYNCORE. A criação do webhook não substitui a homologação: faça uma cobrança de teste no Sandbox e confirme o evento no painel e nos logs do Asaas antes de ativar produção.
