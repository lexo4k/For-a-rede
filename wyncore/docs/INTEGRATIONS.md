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
