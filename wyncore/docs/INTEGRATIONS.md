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

## 2. Provedor Pix / pagamentos

O código atual não contém um adaptador de provedor Pix conectado. A rota de pagamento permanece bloqueada para impedir registros falsos.

Para implementar um adaptador real, o provedor empresarial precisa oferecer e documentar:
- API oficial para transferência Pix de saída para destinatário autorizado;
- autenticação server-to-server e ambiente de homologação;
- consulta de status da transferência;
- identificador de idempotência para impedir pagamento duplicado;
- webhook assinado para confirmação, falha, devolução e atualização de status;
- limites, tarifas, políticas de prevenção a fraude e suporte a conta empresarial;
- documentação dos campos do destinatário e regras de validação da chave Pix.

O adaptador deve seguir este ciclo:
1. Confirmar receita disponível e liquidada.
2. Calcular valor devido segundo regras publicadas.
3. Criar solicitação única e idempotente.
4. Enviar a ordem ao provedor sem expor credenciais ao navegador.
5. Aguardar confirmação verificável do provedor.
6. Atualizar livro-caixa somente após confirmação.
7. Tratar falhas, devoluções, reprocessamento e conciliação sem duplicar transferências.

Não se deve inventar URL, endpoint, formato de autenticação ou payload. Cada um depende da documentação oficial do provedor escolhido.

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
