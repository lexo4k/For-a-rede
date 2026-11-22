# WYNCORE — anúncios em vídeo recompensados

## Integração OfferwallAPI

A tela de anúncios consulta a Video API no servidor. O participante recebe um link individual do parceiro; o parceiro controla captcha e tempo real de reprodução. O crédito só entra na carteira após postback assinado.

### Configuração do publisher

1. Criar e cadastrar o aplicativo WYNCORE no painel publisher OfferwallAPI.
2. Definir a moeda do app como **BRL** e configurar o câmbio/recompensa no próprio painel do parceiro.
3. Configurar o postback para `https://wyncore.vercel.app/api/ads/offerwallapi/postback`.
4. Adicionar no Vercel, em Preview e Production, as variáveis:
   - `OFFERWALLAPI_API_KEY`
   - `OFFERWALLAPI_BEARER_TOKEN`
   - `OFFERWALLAPI_SECRET`
5. Testar primeiro com o modo de integração do parceiro (`debug=1`); eventos de teste são aceitos sem criar saldo.

A chave privada e o Bearer Token ficam exclusivamente no servidor. O postback valida HMAC-SHA256 (ou MD5 legado), deduplica por `transId` e processa estornos `status=2`.

## Limite de pagamentos

Esta integração credita a carteira quando o parceiro confirma a recompensa. Ela **não transfere Pix** para o participante. A integração de saque exige um provedor de pagamentos separado, credenciais próprias e homologação antes de ativar qualquer transferência.
