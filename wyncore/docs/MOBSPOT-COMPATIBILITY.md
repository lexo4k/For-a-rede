# Compatibilidade do MobSPOT com o modelo de recompensa do WYNCORE

Data da verificação: 2026-11-21

## Resultado

**MobSPOT (mobspot.it) não é, conforme a documentação pública consultada, uma rede de anúncios para publishers que remunera usuários por assistir a vídeos.** O produto é uma plataforma de SMS Advertising: empresas compram campanhas para enviar mensagens promocionais a destinatários que consentiram em recebê-las. A página institucional descreve criação e gestão de campanhas SMS para encontrar clientes; a FAQ descreve o banco de contatos e as regras de envio. A página “Collabora con Noi” menciona oportunidade para agências revenderem serviços de publicidade, não pagamento por visualização de anúncios.

Fontes oficiais consultadas em 2026-11-21:
- https://www.mobspot.it/pages/mobspot
- https://www.mobspot.it/pages/faq
- https://www.mobspot.it/pages/contatti
- https://www.mobspot.it/pages/download

## Consequência para o WYNCORE

Não implementar MobSPOT como fonte de receita por vídeo assistido nem creditar recompensas por anúncios MobSPOT. Isso atribuiria ao serviço uma função que sua documentação pública não confirma. Também não usar campanhas SMS como se fossem anúncios de vídeo recompensados.

## O que é necessário para o modelo pretendido

A fonte correta precisa aceitar explicitamente WYNCORE como publisher e permitir tráfego incentivado com recompensa em dinheiro ao usuário. Antes de integrar, é necessário obter:
1. Contrato/termos que autorizem rewarded video com recompensa monetária e tráfego incentivado.
2. Conta de publisher aprovada e identificador de app/site/placement.
3. SDK, offerwall ou API oficial para entregar inventário real.
4. Postback server-to-server assinado com identificador único, valor, moeda, estado de liquidação e reversões.
5. Relatórios de receita e documentação de payout ao publisher.
6. Compatibilidade territorial para Brasil e regras de fraude/limites.

O endpoint genérico POST /api/integrations/conversions existente no WYNCORE pode receber eventos HMAC-SHA256, mas isso não conecta um parceiro por si só. A integração específica exige mapeamento de campos, segredo emitido pelo parceiro, testes de homologação e conciliação com receita efetivamente liquidada.

## Estado

Nenhuma conta MobSPOT foi conectada ao WYNCORE. Nenhuma campanha de vídeo ou remuneração por visualização está ativa. Não alterar o saldo ou o ledger com base em visualização de teste, anúncio demonstrativo ou evento fabricado.