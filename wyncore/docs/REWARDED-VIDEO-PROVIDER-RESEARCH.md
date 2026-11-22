# Diligência do provedor de anúncios recompensados: Offerwall.me

Verificação documental: 2026-11-22. Esta análise não é aprovação comercial, auditoria independente nem garantia de pagamento.

## Compatibilidade técnica

A documentação oficial da Offerwall.me descreve uma API PTC com campanhas de iframe/vídeo (tipo 0) e campanhas abertas em nova janela (tipo 1). O feed usa API Key, Bearer Token, ID do usuário, IP, país e assinatura de identidade HMAC-SHA256. A documentação informa que IDs assinados passaram a ser obrigatórios em 1º de outubro de 2026. O postback de recompensas inclui `subId`, `transId`, `reward`, `reward_name`, `payout`, `status` e assinatura MD5 `md5(subId + transId + reward + secretKey)`.

Fontes oficiais:
- API publisher e tipos de campanha: https://offerwall.me/documentation/api
- Postbacks e assinatura: https://offerwall.me/documentation/postback
- Início e credenciais de placement: https://promo.offerwall.me/documentation
- Privacidade: https://offerwall.me/privacy

## Sinais públicos de reputação

- O domínio aparece registrado desde março de 2024 e o perfil Trustpilot consultado exibia 27 avaliações e nota 4,0/5; existem relatos positivos de pagamentos e também críticas sobre recompensas, atrasos e tráfego. Essas avaliações não comprovam a solvência nem o pagamento futuro da WYNCORE.
- Um serviço automatizado de reputação classificou o domínio como suspeito/baixo score, apesar de registrar histórico de domínio e ausência de alertas externos na própria análise. Esse tipo de score não é prova conclusiva de fraude, mas exige cautela adicional.
- A documentação pública não foi suficiente para confirmar método, mínimo, prazo e disponibilidade de saque do publisher para uma empresa brasileira em BRL.

Fontes independentes:
- Trustpilot: https://www.trustpilot.com/review/offerwall.me
- Gridinsoft: https://gridinsoft.com/online-virus-scanner/url/offerwall-me
- SiteConfiavel: https://www.siteconfiavel.com.br/site/offerwall-me

## Condições antes de ativar

1. Criar placement de publisher e verificar domínio.
2. Confirmar por escrito que a placement aceita tráfego brasileiro e recompensas monetárias por PTC/vídeo.
3. Confirmar moeda BRL, taxa de conversão, participação do publisher, retenções, taxas, prazo, mínimo e método de saque.
4. Testar IDs assinados, feed Brasil, postbacks válidos, duplicados, assinatura inválida e chargebacks.
5. Obter pelo menos um pagamento real para a conta empresarial antes de prometer repasses aos participantes.
6. Conectar separadamente um provedor Pix de saída, com homologação e confirmação de transferência.

## Estado no WYNCORE

O adaptador técnico e os testes estão no código, mas nenhuma credencial Offerwall.me está configurada e nenhum anúncio real foi carregado. O provedor permanece **não homologado**. Não usar dados de participantes nem ativar campanhas até concluir a diligência acima.
