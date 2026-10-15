package com.forcarede.app

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.content.Context
import android.text.InputType
import android.widget.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.Socket
import javax.net.ssl.SSLSocketFactory
import java.text.DecimalFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val bg = Color.rgb(7, 17, 31)
    private val panel = Color.rgb(13, 27, 43)
    private val cyan = Color.rgb(88, 230, 224)
    private val white = Color.rgb(239, 247, 255)
    private val muted = Color.rgb(145, 167, 189)
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var addressInput: EditText
    private lateinit var balanceView: TextView
    private lateinit var statusView: TextView
    private lateinit var networkView: TextView
    private lateinit var txView: TextView
    private lateinit var updatedView: TextView
    private lateinit var connectButton: Button
    private lateinit var logView: TextView
    private lateinit var providerView: TextView
    private lateinit var marketView: TextView
    private lateinit var scanButton: Button
    private lateinit var stratumHostInput: EditText
    private lateinit var stratumPortInput: EditText
    private lateinit var stratumUserInput: EditText
    private lateinit var stratumPasswordInput: EditText
    private lateinit var stratumTlsCheck: CheckBox
    private lateinit var stratumButton: Button
    private lateinit var stratumStatusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        buildUi()
        val saved = getSharedPreferences("forcarede", MODE_PRIVATE).getString("public_address", "") ?: ""
        addressInput.setText(saved)
        if (saved.isNotBlank()) connectAddress()
    }

    private fun buildUi() {
        val scroll = ScrollView(this).apply { setBackgroundColor(bg) }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(20), dp(18), dp(30))
        }
        scroll.addView(root)
        setContentView(scroll)

        val brandRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val logo = TextView(this).apply {
            text = "ϟ"; textSize = 28f; setTextColor(bg); gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD; background = rounded(cyan, 16)
        }
        brandRow.addView(logo, LinearLayout.LayoutParams(dp(48), dp(48)))
        val brandText = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0) }
        brandText.addView(text("ForçaRede", 23f, white, true))
        brandText.addView(text("IDENTIFICADOR DE REDE • COMPUTAÇÃO", 10f, muted, true))
        brandRow.addView(brandText)
        root.addView(brandRow)
        root.addView(space(20))

        val hero = card()
        hero.addView(text("CENTRO DE OPERAÇÕES", 11f, cyan, true))
        hero.addView(space(8))
        hero.addView(text("Cole o endereço.\nDescubra a rede.", 28f, white, true))
        hero.addView(space(8))
        hero.addView(text("O app identifica o formato compatível, consulta dados públicos da rede e informa claramente o que está conectado. Não inventa mineração, hashrate ou ganhos.", 14f, muted, false))
        root.addView(hero)
        root.addView(space(12))

        val addressCard = card()
        addressCard.addView(text("ENDEREÇO PÚBLICO", 13f, white, true))
        addressCard.addView(space(5))
        addressCard.addView(text("Cole um endereço público de recebimento. Nunca cole frase-semente, chave privada ou senha.", 12f, muted, false))
        addressCard.addView(space(12))
        addressInput = EditText(this).apply {
            hint = "BTC, ETH/EVM (0x…), Solana, LTC…"
            setHintTextColor(Color.rgb(91, 111, 130)); setTextColor(white); textSize = 13f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            maxLines = 3; setPadding(dp(12), dp(12), dp(12), dp(12))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        addressCard.addView(addressInput, LinearLayout.LayoutParams(-1, dp(58)))
        addressCard.addView(space(10))
        connectButton = Button(this).apply {
            text = "CONECTAR E IDENTIFICAR"
            isAllCaps = false; textSize = 14f; setTextColor(bg); typeface = Typeface.DEFAULT_BOLD
            background = rounded(cyan, 12)
            setOnClickListener { hideKeyboard(); connectAddress() }
        }
        addressCard.addView(connectButton, LinearLayout.LayoutParams(-1, dp(50)))
        addressCard.addView(space(7))
        val remove = Button(this).apply {
            text = "Apagar endereço salvo"; isAllCaps = false; textSize = 12f; setTextColor(white)
            background = rounded(Color.rgb(23, 44, 64), 12, Color.rgb(43, 69, 91))
            setOnClickListener {
                getSharedPreferences("forcarede", MODE_PRIVATE).edit().remove("public_address").remove("btc_address").apply()
                addressInput.setText("")
                balanceView.text = "— BTC"
                statusView.text = "Nenhum endereço consultado"
                networkView.text = "Rede: —"
                txView.text = "Transações confirmadas: —"
                updatedView.text = "Atualização: —"
                logView.text = "• Endereço local removido. Nenhuma transação foi enviada."
            }
        }
        addressCard.addView(remove, LinearLayout.LayoutParams(-1, dp(42)))
        root.addView(addressCard)
        root.addView(space(12))

        val network = card()
        network.addView(text("IDENTIFICAÇÃO AUTOMÁTICA", 13f, white, true))
        network.addView(space(8))
        networkView = text("Rede: aguardando endereço", 16f, cyan, true)
        network.addView(networkView)
        network.addView(space(6))
        statusView = text("Estado: ainda não conectado", 12f, muted, false)
        network.addView(statusView)
        root.addView(network)
        root.addView(space(12))

        val metrics = card()
        metrics.addView(text("SALDO PÚBLICO DA REDE", 11f, muted, true))
        metrics.addView(space(7))
        balanceView = text("—", 30f, cyan, true)
        metrics.addView(balanceView)
        metrics.addView(space(4))
        txView = text("Transações confirmadas: —", 12f, white, false)
        metrics.addView(txView)
        updatedView = text("Atualização: —", 11f, muted, false)
        metrics.addView(updatedView)
        root.addView(metrics)
        root.addView(space(12))

        val provider = card()
        provider.addView(text("PROVEDORES DE COMPUTAÇÃO REMUNERADA", 13f, white, true))
        provider.addView(space(8))
        providerView = text("Estado: nenhum provedor conectado.", 15f, Color.rgb(255, 210, 122), true)
        provider.addView(providerView)
        provider.addView(space(6))
        provider.addView(text("O endereço é apenas o destino de pagamento. Esta tela consulta dados públicos da NiceHash, sem login e sem comprar potência. A consulta não inicia mineração.", 12f, muted, false))
        provider.addView(space(10))
        scanButton = Button(this).apply {
            text = "ANALISAR SERVIÇOS REAIS"
            isAllCaps = false; textSize = 14f; setTextColor(bg); typeface = Typeface.DEFAULT_BOLD
            background = rounded(cyan, 12)
            setOnClickListener { scanPublicProviders() }
        }
        provider.addView(scanButton, LinearLayout.LayoutParams(-1, dp(48)))
        provider.addView(space(9))
        marketView = text("Mercado: ainda não consultado.\nCredenciais privadas: não configuradas.\nMineração ativa: não confirmada.", 13f, white, false)
        provider.addView(marketView)
        root.addView(provider)
        root.addView(space(12))

        val logs = card()
        logs.addView(text("REGISTRO DE EVENTOS", 13f, white, true))
        logs.addView(space(8))
        logView = text("• Aplicativo iniciado.\n• A identificação consulta apenas dados públicos.\n• Nenhum trabalho remunerado foi iniciado.", 12f, muted, false)
        logs.addView(logView)
        root.addView(logs)
        root.addView(space(12))

        val direct = card()
        direct.addView(text("LIGAÇÃO DIRETA • STRATUM V1", 13f, white, true))
        direct.addView(space(6))
        direct.addView(text("Este modo tenta falar diretamente com um servidor de mineração por TCP/TLS, sem consultar API HTTP. Informe um servidor e credenciais aceitos por ele. Nesta etapa, o teste confirma apenas o protocolo e a autorização, não inicia hashing nem gera ganhos.", 12f, muted, false))
        direct.addView(space(10))
        stratumHostInput = EditText(this).apply {
            hint = "Servidor (ex.: stratum.exemplo.net)"
            setHintTextColor(Color.rgb(91, 111, 130)); setTextColor(white); textSize = 13f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            setSingleLine(true); setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        direct.addView(stratumHostInput, LinearLayout.LayoutParams(-1, dp(48)))
        direct.addView(space(7))
        stratumPortInput = EditText(this).apply {
            hint = "Porta (ex.: 3333 ou 443)"
            setHintTextColor(Color.rgb(91, 111, 130)); setTextColor(white); textSize = 13f
            inputType = InputType.TYPE_CLASS_NUMBER; setSingleLine(true)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        direct.addView(stratumPortInput, LinearLayout.LayoutParams(-1, dp(48)))
        direct.addView(space(7))
        stratumUserInput = EditText(this).apply {
            hint = "Usuário/worker autorizado (às vezes endereço.moeda.worker)"
            setHintTextColor(Color.rgb(91, 111, 130)); setTextColor(white); textSize = 13f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            setSingleLine(true); setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        direct.addView(stratumUserInput, LinearLayout.LayoutParams(-1, dp(48)))
        direct.addView(space(7))
        stratumPasswordInput = EditText(this).apply {
            hint = "Senha do worker (se exigida pelo pool)"
            setHintTextColor(Color.rgb(91, 111, 130)); setTextColor(white); textSize = 13f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setSingleLine(true); setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        direct.addView(stratumPasswordInput, LinearLayout.LayoutParams(-1, dp(48)))
        stratumTlsCheck = CheckBox(this).apply {
            text = "Usar TLS/SSL (somente se a porta oferecer TLS)"
            setTextColor(white); textSize = 12f; isChecked = true
        }
        direct.addView(stratumTlsCheck)
        stratumButton = Button(this).apply {
            text = "TESTAR LIGAÇÃO DIRETA"
            isAllCaps = false; textSize = 14f; setTextColor(bg); typeface = Typeface.DEFAULT_BOLD
            background = rounded(cyan, 12)
            setOnClickListener { testDirectStratum() }
        }
        direct.addView(stratumButton, LinearLayout.LayoutParams(-1, dp(48)))
        direct.addView(space(8))
        stratumStatusView = text("Estado: nenhum servidor testado. Senha não será salva.", 12f, muted, false)
        direct.addView(stratumStatusView)
        root.addView(direct)
        root.addView(space(18))
        root.addView(text("ForçaRede • leitura pública multirrede • sem chaves privadas", 10f, muted, false))
    }

    private fun scanPublicProviders() {
        scanButton.isEnabled = false
        scanButton.text = "CONSULTANDO DADOS PÚBLICOS…"
        providerView.text = "Consulta pública em andamento"
        marketView.text = "Consultando catálogo de algoritmos e mercados da NiceHash…"
        logView.text = "• Iniciada consulta somente de leitura à API pública NiceHash.\n• Nenhuma ordem foi criada e nenhum saldo foi movimentado."
        executor.execute {
            try {
                val algorithms = fetchPublicJson("https://api2.nicehash.com/main/api/v2/mining/algorithms/")
                val markets = fetchPublicJson("https://api2.nicehash.com/main/api/v2/mining/markets/")
                val global = fetchPublicJson("https://api2.nicehash.com/main/api/v2/public/stats/global/current/")
                val algoSummary = summarizePublicJson(algorithms)
                val marketSummary = summarizePublicJson(markets)
                val globalSummary = summarizePublicJson(global)
                runOnUiThread {
                    providerView.text = "NiceHash: API pública respondeu"
                    marketView.text = "ALGORITMOS DISPONÍVEIS\n$algoSummary\n\nMERCADOS PUBLICADOS\n$marketSummary\n\nESTATÍSTICAS PÚBLICAS\n$globalSummary\n\nConta autenticada: não conectada\nMineração ativa: não confirmada"
                    logView.text = "• Consulta real concluída na API pública NiceHash.\n• Dados de catálogo/mercado não significam lucro garantido.\n• Nenhuma máquina foi iniciada e nenhuma compra foi feita.\n• Para ler saldo e rigs da conta, é necessário backend seguro com credenciais autorizadas."
                    scanButton.isEnabled = true
                    scanButton.text = "ATUALIZAR ANÁLISE"
                }
            } catch (e: Exception) {
                runOnUiThread {
                    providerView.text = "NiceHash: consulta não confirmada"
                    marketView.text = "Não foi possível concluir a consulta pública.\n${e.message ?: "Erro de rede"}\n\nNenhuma mineração foi iniciada."
                    logView.text = "• A API pública não confirmou a consulta.\n• Confira a internet e tente novamente.\n• Nenhum dado foi simulado."
                    scanButton.isEnabled = true
                    scanButton.text = "TENTAR CONSULTAR NOVAMENTE"
                }
            }
        }
    }

    private fun testDirectStratum() {
        val host = stratumHostInput.text.toString().trim()
        val port = stratumPortInput.text.toString().trim().toIntOrNull()
        val worker = stratumUserInput.text.toString().trim()
        val password = stratumPasswordInput.text.toString()
        if (host.isBlank() || port == null || port !in 1..65535 || worker.isBlank()) {
            stratumStatusView.text = "Informe servidor, porta válida e usuário/worker."
            return
        }
        stratumButton.isEnabled = false
        stratumButton.text = "TESTANDO PROTOCOLO…"
        stratumStatusView.text = "Abrindo conexão direta. Nenhum trabalho de hashing será iniciado."
        executor.execute {
            var socket: Socket? = null
            try {
                socket = if (stratumTlsCheck.isChecked) {
                    SSLSocketFactory.getDefault().createSocket(host, port)
                } else {
                    Socket(host, port)
                }
                socket.soTimeout = 7000
                val reader = socket.getInputStream().bufferedReader(Charsets.UTF_8)
                val writer = socket.getOutputStream().bufferedWriter(Charsets.UTF_8)
                writer.write(JSONObject().put("id", 1).put("method", "mining.subscribe")
                    .put("params", org.json.JSONArray().put("ForcaRede/1.2")).toString())
                writer.write("\\n")
                writer.flush()

                var subscribed = false
                var linesRead = 0
                while (linesRead < 8) {
                    val line = reader.readLine() ?: break
                    linesRead++
                    val response = try { JSONObject(line) } catch (_: Exception) { continue }
                    if (response.optInt("id", -1) == 1) {
                        subscribed = response.opt("result") != null && response.opt("error") == org.json.JSONObject.NULL
                        break
                    }
                }
                if (!subscribed) throw IllegalStateException("Servidor não confirmou mining.subscribe. Confira host, porta, TLS e compatibilidade Stratum V1.")
                writer.write(JSONObject().put("id", 2).put("method", "mining.authorize")
                    .put("params", org.json.JSONArray().put(worker).put(password)).toString())
                writer.write("\\n")
                writer.flush()
                var authorized: Boolean? = null
                linesRead = 0
                while (linesRead < 8) {
                    val line = reader.readLine() ?: break
                    linesRead++
                    val response = try { JSONObject(line) } catch (_: Exception) { continue }
                    if (response.optInt("id", -1) == 2) {
                        authorized = response.optBoolean("result", false) && response.opt("error") == org.json.JSONObject.NULL
                        break
                    }
                }
                if (authorized == true) {
                    runOnUiThread {
                        stratumStatusView.text = "Conexão direta e autorização Stratum confirmadas. ATENÇÃO: hashing ainda não está implementado nesta etapa."
                    }
                } else {
                    throw IllegalStateException("TCP/TLS e subscribe responderam, mas autorização não foi confirmada. Confira usuário, senha e formato exigido pelo pool.")
                }
            } catch (e: Exception) {
                runOnUiThread {
                    stratumStatusView.text = "Ligação não confirmada: ${e.message ?: "erro de conexão"}. Nenhuma mineração foi iniciada."
                }
            } finally {
                try { socket?.close() } catch (_: Exception) {}
                runOnUiThread {
                    stratumButton.isEnabled = true
                    stratumButton.text = "TESTAR LIGAÇÃO DIRETA"
                }
            }
        }
    }

    private fun fetchPublicJson(endpoint: String): JSONObject {
        var conn: HttpURLConnection? = null
        try {
            conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10000
                readTimeout = 10000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "ForcaRede-Android/1.1")
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream.bufferedReader().use { it.readText() }
            if (code !in 200..299) throw IllegalStateException("HTTP $code em ${URL(endpoint).path}")
            return JSONObject(body)
        } finally {
            conn?.disconnect()
        }
    }

    private fun summarizePublicJson(json: JSONObject): String {
        val names = ArrayList<String>()
        val details = ArrayList<String>()
        var itemCount = 0
        val usefulFields = setOf(
            "algorithm", "market", "name", "symbol", "paying", "profitability",
            "price", "speed", "hashrate", "marketFactor", "minSpeedLimit",
            "maxSpeedLimit", "a", "p", "s"
        )
        fun walk(value: Any?) {
            when (value) {
                is JSONObject -> {
                    val label = value.optString("name").ifBlank {
                        value.optString("algorithm").ifBlank {
                            value.optString("market").ifBlank { value.optString("symbol") }
                        }
                    }
                    if (label.isNotBlank() && label != "null" && names.size < 6 && !names.contains(label)) names.add(label)
                    if (details.size < 5) {
                        val fields = ArrayList<String>()
                        val keys = value.keys()
                        while (keys.hasNext()) {
                            val key = keys.next()
                            if (key in usefulFields) {
                                val raw = value.opt(key)
                                if (raw is String || raw is Number || raw is Boolean) {
                                    fields.add("$key=$raw")
                                }
                            }
                        }
                        if (fields.isNotEmpty()) details.add(fields.take(5).joinToString(", "))
                    }
                    val keys = value.keys()
                    while (keys.hasNext()) walk(value.opt(keys.next()))
                }
                is org.json.JSONArray -> {
                    itemCount = maxOf(itemCount, value.length())
                    for (i in 0 until minOf(value.length(), 30)) walk(value.opt(i))
                }
            }
        }
        walk(json)
        val count = if (itemCount > 0) "$itemCount itens encontrados" else "resposta JSON recebida"
        val sample = if (names.isNotEmpty()) "\nExemplos: " + names.take(6).joinToString(", ") else ""
        val metrics = if (details.isNotEmpty()) "\nDados da API: " + details.joinToString(" | ") else ""
        return count + sample + metrics
    }

    private data class AddressInfo(val network: String, val type: String, val kind: String)

    // Detecta formatos comuns. Endereços EVM (0x...) são compartilhados por várias redes,
    // por isso consultamos várias redes EVM em vez de adivinhar uma só.
    private fun identifyAddress(address: String): AddressInfo? {
        if (address.isBlank() || address.any { it.isWhitespace() }) return null
        val lower = address.lowercase(Locale.ROOT)
        return when {
            lower.startsWith("bc1p") && address.length in 58..62 ->
                AddressInfo("Bitcoin", "SegWit v1 / Taproot", "btc")
            lower.startsWith("bc1q") && address.length in 42..62 ->
                AddressInfo("Bitcoin", "SegWit v0", "btc")
            (address.startsWith("1") || address.startsWith("3")) && address.length in 26..35 ->
                AddressInfo("Bitcoin", "Legacy / P2SH", "btc")
            address.matches(Regex("^0x[0-9a-fA-F]{40}$")) ->
                AddressInfo("Redes EVM compatíveis", "Endereço hexadecimal 0x; rede não é dedutível só pelo endereço", "evm")
            lower.startsWith("ltc1") || (address.startsWith("L") && address.length in 26..35) ||
                (address.startsWith("M") && address.length in 26..35) ->
                AddressInfo("Litecoin", "Formato provável Litecoin", "unsupported")
            address.startsWith("D") && address.length in 26..35 ->
                AddressInfo("Dogecoin", "Formato provável Dogecoin", "unsupported")
            address.startsWith("T") && address.length == 34 ->
                AddressInfo("TRON", "Formato provável TRON", "unsupported")
            address.startsWith("r") && address.length in 25..35 ->
                AddressInfo("XRP Ledger", "Formato provável XRP", "unsupported")
            address.matches(Regex("^[1-9A-HJ-NP-Za-km-z]{32,44}$")) ->
                AddressInfo("Solana ou outra rede Base58", "Formato Base58; Solana será testada", "sol")
            lower.startsWith("tb1") || address.startsWith("m") || address.startsWith("n") || address.startsWith("2") ->
                AddressInfo("Bitcoin Testnet", "Endereço de teste", "testnet")
            else -> null
        }
    }

    private fun connectAddress() {
        val address = addressInput.text.toString().trim()
        if (address.isBlank()) {
            statusView.text = "Estado: cole um endereço público de uma rede compatível."
            return
        }
        val info = identifyAddress(address)
        if (info == null) {
            networkView.text = "Rede: formato ainda não reconhecido"
            statusView.text = "Não reconheci esse formato entre as redes implementadas."
            logView.text = "• Nenhuma conexão foi iniciada.\n• Confira o endereço público e a rede de origem.\n• Não cole seed phrase, chave privada ou senha."
            return
        }
        networkView.text = "Rede: ${info.network}\nTipo: ${info.type}"
        getSharedPreferences("forcarede", MODE_PRIVATE).edit().putString("public_address", address).apply()
        connectButton.isEnabled = false
        connectButton.text = "CONSULTANDO REDES PÚBLICAS…"
        statusView.text = "Estado: formato reconhecido; consultando APIs públicas…"
        balanceView.text = "Consultando…"
        txView.text = "Transações: consultando…"
        logView.text = "• Consulta somente de leitura iniciada.\n• O endereço público não dá acesso à carteira.\n• Nenhuma mineração, compra ou transferência foi iniciada."
        executor.execute {
            try {
                val result = when (info.kind) {
                    "btc" -> queryBitcoinAddress(address)
                    "evm" -> queryEvmAddress(address)
                    "sol" -> querySolanaAddress(address)
                    "testnet" -> "Rede de teste detectada. Saldo mainnet não consultado."
                    else -> "Formato reconhecido como provável ${info.network}, mas a consulta de saldo dessa rede ainda não foi implementada. Nenhum saldo foi inventado."
                }
                val time = SimpleDateFormat("dd/MM HH:mm:ss", Locale("pt", "BR")).format(Date())
                runOnUiThread {
                    balanceView.text = if (result.startsWith("Consulta falhou")) "Não confirmado" else "Veja abaixo"
                    txView.text = result
                    statusView.text = if (result.startsWith("Consulta falhou")) "Estado: API não confirmou" else "Estado: análise concluída"
                    updatedView.text = "Atualização: $time"
                    logView.text = "• Formato analisado: ${info.network}.\n• Dados são de APIs públicas, quando disponíveis.\n• EVM: mesmo endereço pode existir em várias redes.\n• Consulta de saldo não significa renda ou mineração."
                    connectButton.isEnabled = true
                    connectButton.text = "CONSULTAR OUTRO ENDEREÇO"
                }
            } catch (e: Exception) {
                runOnUiThread {
                    balanceView.text = "Não confirmado"
                    statusView.text = "Estado: consulta não confirmada"
                    txView.text = e.message ?: "Falha de rede"
                    updatedView.text = "Atualização: —"
                    logView.text = "• A API não confirmou os dados.\n• Nenhum saldo foi simulado.\n• Tente novamente mais tarde."
                    connectButton.isEnabled = true
                    connectButton.text = "TENTAR NOVAMENTE"
                }
            }
        }
    }

    private fun queryBitcoinAddress(address: String): String {
        val json = fetchPublicJson("https://mempool.space/api/address/" + address)
        val chain = json.getJSONObject("chain_stats")
        val sats = (chain.optLong("funded_txo_sum", 0L) - chain.optLong("spent_txo_sum", 0L)).coerceAtLeast(0L)
        val txs = chain.optInt("tx_count", 0)
        return "Bitcoin confirmado: " + DecimalFormat("0.00000000").format(sats / 100_000_000.0).replace(',', '.') +
            " BTC\nTransações confirmadas: $txs"
    }

    private fun queryEvmAddress(address: String): String {
        val networks = listOf(
            "Ethereum" to "https://cloudflare-eth.com",
            "Base" to "https://mainnet.base.org",
            "Polygon" to "https://polygon-rpc.com",
            "BNB Chain" to "https://bsc-dataseed.binance.org",
            "Arbitrum One" to "https://arb1.arbitrum.io/rpc",
            "Optimism" to "https://mainnet.optimism.io"
        )
        val lines = ArrayList<String>()
        for ((name, endpoint) in networks) {
            try {
                val request = JSONObject().put("jsonrpc", "2.0").put("method", "eth_getBalance")
                    .put("params", org.json.JSONArray().put(address).put("latest")).put("id", 1)
                val response = postJson(endpoint, request)
                val hex = response.optString("result")
                if (hex.startsWith("0x")) {
                    val wei = java.math.BigInteger(hex.substring(2).ifBlank { "0" }, 16)
                    val eth = java.math.BigDecimal(wei).divide(java.math.BigDecimal("1000000000000000000"), 8, java.math.RoundingMode.DOWN)
                    lines.add("$name: $eth moeda nativa")
                } else lines.add("$name: resposta sem saldo")
            } catch (_: Exception) {
                lines.add("$name: API indisponível")
            }
        }
        return lines.joinToString("\n") + "\nObservação: tokens ERC-20 e histórico detalhado não estão incluídos nesta leitura."
    }

    private fun querySolanaAddress(address: String): String {
        val request = JSONObject().put("jsonrpc", "2.0").put("id", 1)
            .put("method", "getBalance").put("params", org.json.JSONArray().put(address))
        val response = postJson("https://api.mainnet-beta.solana.com", request)
        val lamports = response.optJSONObject("result")?.optLong("value", -1L) ?: -1L
        if (lamports < 0L) return "Consulta falhou: a API Solana não devolveu saldo."
        val sol = java.math.BigDecimal(lamports).divide(java.math.BigDecimal("1000000000"), 9, java.math.RoundingMode.DOWN)
        return "Solana: $sol SOL\nConsulta de saldo nativo; tokens SPL não incluídos."
    }

    private fun postJson(endpoint: String, payload: JSONObject): JSONObject {
        var conn: HttpURLConnection? = null
        try {
            conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 10000
                readTimeout = 12000
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream.bufferedReader().use { it.readText() }
            if (code !in 200..299) throw IllegalStateException("API respondeu HTTP $code")
            return JSONObject(body)
        } finally {
            conn?.disconnect()
        }
    }

    private fun hideKeyboard() {
        (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
            .hideSoftInputFromWindow(addressInput.windowToken, 0)
        addressInput.clearFocus()
    }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(16), dp(16), dp(16))
        background = rounded(panel, 18, Color.rgb(32, 55, 77))
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value; textSize = size; setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.START; setLineSpacing(dp(2).toFloat(), 1f)
        }

    private fun space(height: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(height))
    }

    private fun rounded(color: Int, radius: Int, stroke: Int? = null): GradientDrawable =
        GradientDrawable().apply {
            setColor(color); cornerRadius = dp(radius).toFloat()
            if (stroke != null) setStroke(dp(1), stroke)
        }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}