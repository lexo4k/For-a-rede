# ForçaRede ⚡

Aplicativo Android nativo para acompanhar um endereço público Bitcoin e servir de base para integrações verificáveis com redes de computação distribuída.

## O que já funciona no APK

- Interface Android nativa, adaptada para celular.
- Consulta de saldo Bitcoin confirmado por endereço usando a API pública do mempool.space.
- Exibe saldo confirmado e contagem de transações confirmadas retornadas pela API.
- Salva o endereço público somente no armazenamento local do aparelho.
- Tratamento de erro de rede e formato de endereço.
- Compilação automática do APK com GitHub Actions.

## O que ainda não está conectado

- Não minera Bitcoin ou outras moedas.
- Não aluga nem inicia processamento em provedores externos.
- Não envia transações e não recebe pagamentos por conta própria.
- Não consulta saldo de outras moedas além de BTC.
- Não há uma integração ativa de computação remunerada.

Para receber pagamentos, use um endereço compatível com a rede/moeda do pagamento. O saldo consultado é o saldo confirmado daquele endereço, não um rendimento gerado pelo app.

## Baixar o APK

A compilação mais recente bem-sucedida fica nos artefatos da execução do workflow **Build ForçaRede APK** na aba Actions do repositório. O artefato tem o nome `ForcaRede-debug-apk` e contém `app-debug.apk`. Artefatos de workflow expiram após 30 dias.

## Compilar

O workflow `.github/workflows/android-apk.yml` instala Java 17, Android SDK e Gradle, executa `assembleDebug` e publica o APK como artefato.

## Segurança

- Nunca informe frase-semente, chave privada, senha de carteira ou token secreto.
- A consulta de saldo usa somente o endereço público.
- Os valores exibidos vêm da resposta da API; se a API falhar, o app mostra erro e não inventa saldo.
