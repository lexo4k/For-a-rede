package com.wyncore.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    private var browser: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(11, 16, 32)
        window.navigationBarColor = android.graphics.Color.rgb(11, 16, 32)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val view = browser
                if (view?.canGoBack() == true) view.goBack() else finish()
            }
        })

        setContent {
            WyncoreTheme {
                WyncoreScreen(
                    onBrowserReady = { browser = it },
                    onBrowserDestroyed = { if (browser === it) browser = null }
                )
            }
        }
    }
}

@Composable
private fun WyncoreTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF48E0B5),
            secondary = Color(0xFF91A6FF),
            background = Color(0xFF0B1020),
            surface = Color(0xFF121A2D),
            onPrimary = Color(0xFF07130F),
            onBackground = Color(0xFFF2F5FA),
            onSurface = Color(0xFFF2F5FA)
        ),
        content = content
    )
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun WyncoreScreen(
    onBrowserReady: (WebView) -> Unit,
    onBrowserDestroyed: (WebView) -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var failed by remember { mutableStateOf(false) }
    var browser by remember { mutableStateOf<WebView?>(null) }

    Column(Modifier.fillMaxSize()) {
        Surface(color = Color(0xFF0B1020), shadowElevation = 4.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("WYNCORE", color = Color(0xFF48E0B5), style = MaterialTheme.typography.titleLarge)
                    Text("CENTRAL DE OPERAÇÕES", color = Color(0xFF9BA8BD), style = MaterialTheme.typography.labelSmall)
                }
                Button(onClick = { browser?.reload(); failed = false; loading = true }) {
                    Text("ATUALIZAR")
                }
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        Box(Modifier.fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        browser = this
                        onBrowserReady(this)
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.cacheMode = WebSettings.LOAD_DEFAULT
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        settings.allowFileAccess = false
                        settings.allowContentAccess = false
                        settings.javaScriptCanOpenWindowsAutomatically = false
                        settings.setSupportMultipleWindows(false)
                        if (android.os.Build.VERSION.SDK_INT >= 26) settings.safeBrowsingEnabled = true
                        CookieManager.getInstance().setAcceptCookie(true)
                        CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
                        webChromeClient = object : WebChromeClient() {
                            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                loading = newProgress < 100
                            }
                        }
                        webViewClient = object : WebViewClient() {
                            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                loading = true
                                failed = false
                            }
                            override fun onPageFinished(view: WebView?, url: String?) {
                                loading = false
                            }
                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    loading = false
                                    failed = true
                                }
                            }
                            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                val uri = request?.url ?: return false
                                val ownHost = Uri.parse(BuildConfig.START_URL).host
                                if (uri.scheme == "https" && uri.host == ownHost) return false
                                if (uri.scheme == "https" || uri.scheme == "mailto:" || uri.scheme == "tel:") {
                                    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                                    return true
                                }
                                return true
                            }
                        }
                        loadUrl(BuildConfig.START_URL)
                    }
                },
                update = { browser = it }
            )
            if (failed) {
                Card(Modifier.align(Alignment.Center).padding(24.dp)) {
                    Column(
                        Modifier.padding(22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("Sem conexão com o WYNCORE", style = MaterialTheme.typography.titleMedium)
                        Text("Verifique a internet e tente novamente. Seus dados ficam no servidor, não apenas neste aparelho.")
                        Button(onClick = { browser?.reload(); failed = false; loading = true }) {
                            Text("TENTAR NOVAMENTE")
                        }
                    }
                }
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            browser?.let {
                onBrowserDestroyed(it)
                it.stopLoading()
                it.destroy()
            }
            browser = null
        }
    }
}
