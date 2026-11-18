# WYNCORE Android

Aplicativo Android nativo com identidade visual própria e WebView restrita ao domínio HTTPS do WYNCORE. A autenticação e os dados continuam no servidor; nenhuma senha administrativa ou chave privada é embutida no APK.

## Build local

Requer JDK 17, Android SDK (API 36) e Gradle 8.13.

```bash
gradle -p android assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Para apontar a build para outro ambiente:

```bash
gradle -p android assembleDebug -PWYNCORE_BASE_URL=https://seu-dominio/
```

O APK de debug é para testes. Uma distribuição pública exige assinatura de release protegida fora do repositório.
