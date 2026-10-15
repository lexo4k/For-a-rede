# ForçaRede ⚡

Aplicativo Android nativo para identificar endereços Bitcoin públicos, consultar dados confirmados da blockchain e servir de base para integrações verificáveis com redes de computação distribuída.

## O que funciona nesta versão

- Interface Android nativa adaptada para celular.
- Botão **Conectar e identificar** para reconhecer formatos comuns de endereços Bitcoin mainnet: Legacy (1…), P2SH (3…), SegWit (bc1q…) e Taproot (bc1p…).
- Recusa consulta mainnet quando reconhece formatos comuns de testnet, evitando misturar redes.
- Consulta saldo confirmado e contagem de transações pela API pública mempool.space.
- Salva o endereço público somente no armazenamento local do aparelho.
- Mensagens de erro de rede; não inventa saldo, hashrate, conexão de mineração nem rendimento.
- Compilação automática do APK com GitHub Actions.

## O que ainda NÃO está implementado

- **Não minera Bitcoin ou outras moedas.**
- **Não conecta a um provedor de computação remunerada nem aluga máquinas.**
- Não envia transações e não faz pagamentos por conta própria.
- Não consulta saldos de outras moedas além de BTC.
- Não há integração autenticada com a API NiceHash ou com um marketplace de hashrate.

Um endereço de carteira informa onde os pagamentos podem ser recebidos; ele não identifica por si só o provedor, o endpoint de mineração, o algoritmo, a conta do serviço nem as credenciais necessárias. Para iniciar processamento remunerado, cada provedor precisa ser integrado por meio da API ou protocolo que oferece. Algumas operações exigem conta, chaves de API ou saldo disponível. O aplicativo não deve iniciar compras ou cobranças sem consentimento explícito.

## Baixar o APK

A compilação mais recente bem-sucedida fica nos artefatos da execução do workflow **Build ForçaRede APK** na aba Actions deste repositório. O artefato tem o nome `ForcaRede-debug-apk` e contém `app-debug.apk`. Artefatos expiram após 30 dias.

## Compilar

O workflow `.github/workflows/android-apk.yml` instala Java 17, Android SDK e Gradle, executa `assembleDebug` e publica o APK como artefato.

## Segurança

- Nunca informe frase-semente, chave privada, senha de carteira ou token secreto.
- A consulta de saldo usa somente o endereço público.
- O saldo consultado é o saldo confirmado daquele endereço, não rendimento gerado pelo aplicativo.
- Não adicione chaves de API diretamente ao código-fonte nem a commits públicos.
