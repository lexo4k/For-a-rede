# Integrações comerciais e financeiras WYNCORE

Este documento define o que falta para uma integração real. Ele não afirma que qualquer parceiro, conta, contrato ou API já esteja conectado.

## 1. Rede de campanhas / anunciantes

A integração só deve ser ativada com uma rede que:
- aceite formalmente tráfego incentivado e recompensas em dinheiro para o tipo de tarefa proposto;
- forneça API ou offerwall para publishers e identificação estável do participante (sub-ID);
- envie postbacks de conversão assinados, com ID único, valor, moeda e estado;
- documente reversões, chargebacks, fraude, limites, países permitidos e prazo de liquidação;
- pague a conta empresarial da WYNCORE por um meio contratado e verificável.

Fluxo exigido:
1. Importar campanha e regras oficiais.
2. Registrar participante e identificador de atribuição sem expor dados pessoais desnecessários.
3. Receber postback HTTPS e validar assinatura, timestamp e ID único.
4. Deduplicar conversões e suportar reversões.
5. Conciliar receita liquidada do publisher antes de calcular qualquer repasse.
6. Nunca remunerar clique artificial, visualização não autorizada ou conversão não validada.

Uma chave de webhook isolada apenas autentica a origem de uma chamada; não prova que houve receita, nem substitui o contrato e a conciliação financeira.

## 2. Webhook de conversões do parceiro

O endpoint server-to-server `POST /api/integrations/conversions` recebe eventos JSON assinados com HMAC-SHA256 no cabeçalho `X-Wyncore-Signature: sha256=<hex>`. A assinatura é calculada sobre o corpo JSON bruto usando `WYNCORE_CONVERSION_SECRET`, configurado somente no ambiente do servidor.

Exemplo de evento:
```json
{
  "eventId": "identificador-unico-do-evento",
  "transactionId": "identificador-unico-da-conversao",
  "participantId": "id-interno-do-participante",
  "programId": "id-interno-da-campanha",
  "status": "settled",
  "revenue": 10.00,
  "currency": "BRL"
}
```

Estados aceitos: `approved` (em análise, sem saldo disponível), `settled` (receita liquidada ao publisher, credita a participação) e `reversed` (estorna uma conversão anteriormente liquidada). Eventos repetidos são idempotentes por `eventId`; a mesma transação não pode mudar de participante ou campanha. O percentual de repasse usa `WYNCORE_REWARD_SHARE_PERCENT` (padrão 60%, limitado de 1% a 90%). O percentual precisa ser definido no contrato e nos termos publicados antes de operar. Este endpoint genérico ainda exige homologação e mapeamento específico do parceiro; não significa que uma rede esteja conectada.

## 2. Provedor Pix Asaas

O adaptador Asaas está implementado em `asaas.js`. Ele utiliza os endpoints oficiais para cadastrar pagador, criar cobrança Pix, obter QR Code e transferir para chave Pix.

Variáveis secretas do servidor:
- `ASAAS_ENV=sandbox` durante homologação;
- `ASAAS_API_KEY` da mesma conta/ambiente;
- `ASAAS_WEBHOOK_TOKEN` próprio, aleatório, com pelo menos 32 caracteres;
- `ASAAS_BASE_URL` é opcional. Por padrão, Sandbox usa `https://api-sandbox.asaas.com/v3` e Produção usa `https://api.asaas.com/v3`.

Configure o webhook `POST https://SEU-DOMINIO/api/webhooks/asaas`, com header `asaas-access-token` igual a `ASAAS_WEBHOOK_TOKEN`. Eventos mínimos: `PAYMENT_RECEIVED`, `TRANSFER_DONE`, `TRANSFER_FAILED`, `TRANSFER_CANCELLED`.

Fluxo de recebimento:
1. O sistema cadastra o pagador no Asaas com nome, CPF/CNPJ, e-mail e telefone.
2. Cria cobrança `PIX` com referência externa `wyncore-campaign:<id>`.
3. Exibe QR Code dinâmico e Pix copia-e-cola.
4. Só libera a campanha quando recebe `PAYMENT_RECEIVED`, autentica o webhook, confere o ID da cobrança e confirma que o valor recebido cobre o contrato.

Fluxo de repasse:
1. A chave Pix do participante é armazenada criptografada com AES-256-GCM.
2. Ao aprovar avaliação de campanha financiada, WYNCORE solicita transferência Pix com referência `wyncore-earning:<id>`.
3. O lançamento fica em `payout_pending` enquanto o Asaas processa.
4. Somente `TRANSFER_DONE` altera o estado para `paid`. Falha/cancelamento retorna a recompensa para `approved_unpaid`.

O mesmo evento de webhook não é processado duas vezes. A chave da API nunca é enviada ao navegador. A conta Asaas precisa estar aprovada e ter saldo disponível; o envio de uma transferência não equivale a confirmação de pagamento.

## 3. Segredos e operação

- Credenciais devem ficar somente em variáveis secretas do ambiente de servidor.
- Nunca colocar tokens, senhas, chaves privadas ou chaves Pix em Git, frontend, logs ou conversas.
- Preview e Production precisam de configuração separada.
- A conta, o contrato e a autorização financeira devem pertencer à empresa e ao responsável legal autorizado, respeitando a elegibilidade do provedor.
- Testar primeiro em homologação com valores simulados; depois fazer revisão de segurança e conciliação antes de qualquer ativação real.

## 4. Estado atual verificado no código

- Rede de anunciantes: não conectada.
- Validação de conversões: não ativa.
- Webhook de campanhas: depende de `WYNCORE_PARTNER_WEBHOOK_SECRET`; mesmo configurado, não comprova receita.
- Provedor Pix: não conectado.
- Transferências automáticas e validação bancária: desativadas.
- Endpoint de pagamento: responde HTTP 503 até existir integração real.
