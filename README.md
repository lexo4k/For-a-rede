# ForçaRede ⚡

Aplicativo Android nativo para identificar endereços Bitcoin públicos, consultar dados confirmados da blockchain e servir de base para integrações verificáveis com redes de computação distribuída.

## O que funciona nesta versão

- Interface Android nativa adaptada para celular.
- Identificação inicial de formatos comuns de Bitcoin, endereços EVM (0x…), Solana e reconhecimento de formatos prováveis de Litecoin, Dogecoin, TRON e XRP.
- Consulta saldo público nativo de Bitcoin, Solana e redes EVM selecionadas quando as APIs públicas respondem; tokens e históricos completos ainda não estão incluídos.
- Salva o endereço público somente no armazenamento local do aparelho.
- **Teste de ligação direta Stratum V1 por TCP/TLS**, com host, porta e credenciais de worker informados pelo usuário. A senha não é salva.
- Mensagens de erro de rede; não inventa saldo, hashrate, conexão de mineração nem rendimento.
- Compilação automática do APK com GitHub Actions.

## O que ainda NÃO está implementado

- **Ainda não minera Bitcoin ou outras moedas.** O teste Stratum verifica o handshake e a autorização, mas não faz hashing nem envia shares.
- **Ainda não conecta automaticamente a vários provedores nem aluga máquinas.**
- Não envia transações e não faz pagamentos por conta própria.
- O suporte multirrede é parcial e a identificação do formato não garante que o endereço seja válido.
- Não há integração autenticada com a conta NiceHash nem seleção automática de provedores.

Um endereço de carteira informa onde os pagamentos podem ser recebidos; ele não identifica por si só o provedor, o endpoint de mineração, o algoritmo, a conta do serviço nem as credenciais necessárias. Para iniciar processamento remunerado sem API HTTP, um caminho possível é integrar diretamente um protocolo de mineração como Stratum V1, com endpoint, credenciais e um motor de hashing compatível. O teste direto atual só confirma a comunicação e a autorização; não executa o motor de mineração. Cada provedor usa protocolos e regras próprios. Algumas operações exigem conta, chaves de API ou saldo disponível. O aplicativo não deve iniciar compras ou cobranças sem consentimento explícito.

## Baixar o APK

A compilação mais recente bem-sucedida fica nos artefatos da execução do workflow **Build ForçaRede APK** na aba Actions deste repositório. O artefato tem o nome `ForcaRede-debug-apk` e contém `app-debug.apk`. Artefatos expiram após 30 dias.

## Compilar

O workflow `.github/workflows/android-apk.yml` instala Java 17, Android SDK e Gradle, executa `assembleDebug` e publica o APK como artefato.

## Segurança

- Nunca informe frase-semente, chave privada, senha de carteira ou token secreto.
- A consulta de saldo usa somente o endereço público.
- O saldo consultado é o saldo confirmado daquele endereço, não rendimento gerado pelo aplicativo.
- Não adicione chaves de API diretamente ao código-fonte nem a commits públicos.
