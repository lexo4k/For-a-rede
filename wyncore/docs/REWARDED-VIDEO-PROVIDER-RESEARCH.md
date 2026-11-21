# Provedor candidato para vídeos remunerados: OfferwallAPI

Verificação documental: 2026-11-21. Esta análise não representa aprovação comercial, teste de pagamento ou garantia de legitimidade/receita.

## Correspondência com o requisito

OfferwallAPI publica uma Video API específica. A documentação diz que o publisher pode buscar campanhas de vídeo e renderizar os itens na própria interface. O feed usa API Key, USER_ID, IP do usuário e Bearer Token. A página de vídeo hospedada executa captcha (quando habilitado), temporizador e reivindicação de recompensa; a plataforma afirma creditar a conta publisher e disparar postback server-to-server ao concluir. O postback inclui identificador do usuário, ID único de transação, recompensa e status de crédito/chargeback.

Documentação oficial: https://www.offerwallapi.com/documentations (seções Video API, S2S Postback, Required Credentials e FaucetPay API).

## Limitações e validações antes de ativar

- A documentação exige cadastro do WYNCORE como app/site, emissão de API Key, Secret Key e Bearer Token e revisão/aprovação da aplicação. Não há credenciais no repositório; logo, nenhuma chamada real pode ser feita agora.
- A documentação apresenta pagamentos via FaucetPay para criptomoedas. Não foi encontrada confirmação de saque Pix/BRL. Portanto, não anunciar Pix automático como disponível.
- A documentação pública consultada não confirma explicitamente cobertura/volume de campanhas no Brasil nem taxa por vídeo garantida. A disponibilidade depende do feed aprovado e do país/IP.
- O material técnico descreve autenticação do feed e assinatura de postbacks, mas não substitui diligência comercial. Antes de usar, validar entidade legal, termos, privacidade/LGPD, regras antifraude, saldo mínimo, taxas, prazos, chargebacks, suporte e prova de saque real.
- Não confundir receita do publisher com o valor integral creditado ao usuário. Definir share/margem somente com base nos valores e termos contratuais reais.

## Regras de integração propostas

1. Guardar API Key, Secret Key e Bearer Token apenas em variáveis secretas no servidor.
2. Consultar a Video API no backend, nunca expor Bearer Token no navegador.
3. Enviar o identificador interno estável do participante e o IP real conforme os termos e a política de privacidade.
4. Abrir a URL de vídeo fornecida pelo parceiro sem alterar parâmetros de tracking.
5. Creditar somente após postback autêntico; validar HMAC-SHA256 quando disponível, ou o mecanismo de assinatura oficial, comparar o subId exato, deduplicar transId e processar chargebacks.
6. Separar pendente, confirmado e estornado; nunca creditar apenas porque o vídeo abriu ou o temporizador da interface terminou.
7. Manter saque bloqueado até confirmar método, país, mínimo, liquidação e provedor de payout compatível com Brasil.

## Alternativas e políticas

- Google AdMob proíbe recompensas monetárias diretas (dinheiro, cripto ou gift cards) em rewarded ads. Não usar AdMob para pagar dinheiro por vídeo: https://support.google.com/admob/answer/7313578?hl=pt
- AppLixir oferece rewarded video para publishers, mas sua documentação descreve recompensas in-app/in-game e exige 5.000 DAU; não é evidência de cash-out aos usuários: https://www.applixir.com/faq/
- AdGem e Lootably oferecem offerwalls/API e postbacks para conversões/atividades; não devem ser tratados automaticamente como pagamento por simples visualização de vídeo: https://docs.adgem.com/docs/integrate/reward-mechanism e https://documentation.lootably.com/docs/offers-api-guide

## Estado da implementação

Nenhuma rede está conectada. Nenhum anúncio real foi carregado e nenhum pagamento foi efetuado. OfferwallAPI é um candidato técnico mais próximo do fluxo desejado, sujeito à aprovação e diligência. O WYNCORE só deve habilitar o botão de vídeo e recompensas depois de credenciais válidas, campanhas reais disponíveis no Brasil e postback testado em homologação.