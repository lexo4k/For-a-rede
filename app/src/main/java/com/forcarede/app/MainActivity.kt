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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        buildUi()
        val saved = getSharedPreferences("forcarede", MODE_PRIVATE).getString("btc_address", "") ?: ""
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
            hint = "Endereço BTC (bc1…, 1… ou 3…)"
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
                getSharedPreferences("forcarede", MODE_PRIVATE).edit().remove("btc_address").apply()
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
        metrics.addView(text("SALDO BTC CONFIRMADO", 11f, muted, true))
        metrics.addView(space(7))
        balanceView = text("— BTC", 30f, cyan, true)
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
        provider.addView(text("Importante: um endereço de carteira identifica o destino de pagamento, não o provedor nem o servidor de mineração. Para iniciar trabalho real, o serviço precisa oferecer um endpoint/protocolo ou API e, quando exigido, credenciais autorizadas. Esta versão ainda não inicia mineração nem compra computação.", 12f, muted, false))
        root.addView(provider)
        root.addView(space(12))

        val logs = card()
        logs.addView(text("REGISTRO DE EVENTOS", 13f, white, true))
        logs.addView(space(8))
        logView = text("• Aplicativo iniciado.\n• A identificação consulta apenas dados públicos.\n• Nenhum trabalho remunerado foi iniciado.", 12f, muted, false)
        logs.addView(logView)
        root.addView(logs)
        root.addView(space(18))
        root.addView(text("ForçaRede • consulta pública mempool.space • sem chaves privadas", 10f, muted, false))
    }

    private data class AddressInfo(val network: String, val type: String)

    private fun identifyBitcoinAddress(address: String): AddressInfo? {
        if (address.any { it.isWhitespace() }) return null
        val lower = address.lowercase(Locale.ROOT)
        return when {
            lower.startsWith("bc1p") && address.length in 58..62 ->
                AddressInfo("Bitcoin Mainnet", "SegWit v1 / Taproot (bc1p)")
            lower.startsWith("bc1q") && address.length in 42..62 ->
                AddressInfo("Bitcoin Mainnet", "SegWit v0 (bc1q)")
            address.startsWith("1") && address.length in 26..35 ->
                AddressInfo("Bitcoin Mainnet", "Legacy P2PKH (1…)")
            address.startsWith("3") && address.length in 26..35 ->
                AddressInfo("Bitcoin Mainnet", "Script P2SH (3…)")
            lower.startsWith("tb1") || address.startsWith("m") || address.startsWith("n") || address.startsWith("2") ->
                AddressInfo("Possível Bitcoin Testnet", "Endereço de teste; consulta mainnet desativada")
            else -> null
        }
    }

    private fun connectAddress() {
        val address = addressInput.text.toString().trim()
        if (address.isBlank()) {
            statusView.text = "Estado: cole um endereço público Bitcoin."
            return
        }
        val info = identifyBitcoinAddress(address)
        if (info == null) {
            networkView.text = "Rede: endereço não reconhecido"
            statusView.text = "Não foi possível reconhecer um formato Bitcoin compatível."
            logView.text = "• Nenhuma conexão foi iniciada.\n• Confira se colou um endereço público BTC completo.\n• Endereços de outras moedas ainda não são suportados."
            return
        }
        networkView.text = "Rede: ${info.network}\nTipo: ${info.type}"
        if (info.network != "Bitcoin Mainnet") {
            statusView.text = "Endereço de teste detectado; nenhum saldo mainnet consultado."
            logView.text = "• Formato identificado como rede de teste.\n• Para evitar exibir dados da rede errada, a consulta foi interrompida."
            return
        }
        getSharedPreferences("forcarede", MODE_PRIVATE).edit().putString("btc_address", address).apply()
        connectButton.isEnabled = false
        connectButton.text = "CONECTANDO À API PÚBLICA…"
        statusView.text = "Estado: endereço reconhecido; consultando blockchain pública…"
        logView.text = "• Rede identificada: Bitcoin Mainnet.\n• Consultando mempool.space.\n• Isso não inicia mineração ou pagamento."
        executor.execute {
            var conn: HttpURLConnection? = null
            try {
                conn = (URL("https://mempool.space/api/address/" + address).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"; connectTimeout = 12000; readTimeout = 12000
                    setRequestProperty("Accept", "application/json")
                }
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val body = stream.bufferedReader().use { it.readText() }
                if (code !in 200..299) throw IllegalStateException("API respondeu HTTP $code")
                val json = JSONObject(body)
                val chain = json.getJSONObject("chain_stats")
                val funded = chain.optLong("funded_txo_sum", 0L)
                val spent = chain.optLong("spent_txo_sum", 0L)
                val sats = (funded - spent).coerceAtLeast(0L)
                val txs = chain.optInt("tx_count", 0)
                val btc = sats / 100_000_000.0
                val time = SimpleDateFormat("dd/MM HH:mm:ss", Locale("pt", "BR")).format(Date())
                runOnUiThread {
                    balanceView.text = DecimalFormat("0.00000000").format(btc).replace(',', '.') + " BTC"
                    statusView.text = "Estado: consulta pública concluída"
                    txView.text = "Transações confirmadas: $txs"
                    updatedView.text = "Atualização: $time"
                    logView.text = "• Bitcoin Mainnet reconhecida.\n• Dados recebidos de mempool.space.\n• Saldo confirmado não representa lucro ou rendimento de mineração.\n• Provedor remunerado: não conectado."
                    connectButton.isEnabled = true
                    connectButton.text = "CONECTAR E IDENTIFICAR"
                }
            } catch (e: Exception) {
                runOnUiThread {
                    statusView.text = "Estado: consulta não confirmada • ${e.message ?: "erro de rede"}"
                    logView.text = "• O endereço foi reconhecido pelo formato, mas a API não confirmou a consulta.\n• Verifique a conexão e tente novamente.\n• Nenhum saldo ou rendimento foi inventado."
                    connectButton.isEnabled = true
                    connectButton.text = "TENTAR NOVAMENTE"
                }
            } finally {
                conn?.disconnect()
            }
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