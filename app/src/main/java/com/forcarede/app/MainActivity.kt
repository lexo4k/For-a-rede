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
    private lateinit var txView: TextView
    private lateinit var updatedView: TextView
    private lateinit var refreshButton: Button
    private lateinit var logView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        buildUi()
        val saved = getSharedPreferences("forcarede", MODE_PRIVATE).getString("btc_address", "") ?: ""
        addressInput.setText(saved)
        if (saved.isNotBlank()) refreshBalance()
    }

    private fun buildUi() {
        val scroll = ScrollView(this)
        scroll.setBackgroundColor(bg)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(20), dp(18), dp(30))
        }
        scroll.addView(root)
        setContentView(scroll)

        val brandRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val logo = TextView(this).apply {
            text = "ϟ"
            textSize = 28f
            setTextColor(bg)
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(cyan, 16)
        }
        brandRow.addView(logo, LinearLayout.LayoutParams(dp(48), dp(48)))
        val brandText = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0) }
        brandText.addView(text("ForçaRede", 23f, white, true))
        brandText.addView(text("PAINEL DE COMPUTAÇÃO DISTRIBUÍDA", 10f, muted, true))
        brandRow.addView(brandText)
        root.addView(brandRow)
        root.addView(space(20))

        val hero = card()
        hero.addView(text("CENTRO DE OPERAÇÕES  •  V1.0", 11f, cyan, true))
        hero.addView(space(8))
        hero.addView(text("Conecte trabalho real.\nConfirme cada resultado.", 27f, white, true))
        hero.addView(space(8))
        hero.addView(text("Acompanhe um endereço Bitcoin real e veja dados públicos consultados na rede. Nenhuma mineração ou recompensa é simulada.", 14f, muted, false))
        root.addView(hero)
        root.addView(space(12))

        val metrics = card()
        metrics.addView(text("SALDO CONFIRMADO DO ENDEREÇO BTC", 11f, muted, true))
        balanceView = text("— BTC", 30f, cyan, true)
        metrics.addView(space(7))
        metrics.addView(balanceView)
        metrics.addView(space(4))
        statusView = text("Ainda não consultado", 12f, muted, false)
        metrics.addView(statusView)
        metrics.addView(space(10))
        txView = text("Transações confirmadas: —", 12f, white, false)
        metrics.addView(txView)
        updatedView = text("Atualização: —", 11f, muted, false)
        metrics.addView(updatedView)
        root.addView(metrics)
        root.addView(space(12))

        val wallet = card()
        wallet.addView(text("ENDEREÇO DE RECEBIMENTO / CONSULTA", 13f, white, true))
        wallet.addView(space(5))
        wallet.addView(text("Cole apenas o endereço público Bitcoin. Ele é salvo localmente neste aparelho e consultado pela API pública mempool.space.", 12f, muted, false))
        wallet.addView(space(12))
        addressInput = EditText(this).apply {
            hint = "bc1… ou endereço Bitcoin compatível"
            setHintTextColor(Color.rgb(91, 111, 130))
            setTextColor(white)
            textSize = 13f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            singleLine = false
            maxLines = 3
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = rounded(Color.rgb(7, 21, 34), 12, Color.rgb(43, 69, 91))
        }
        wallet.addView(addressInput, LinearLayout.LayoutParams(-1, dp(58)))
        wallet.addView(space(10))
        refreshButton = Button(this).apply {
            text = "CONSULTAR SALDO REAL"
            isAllCaps = false
            textSize = 14f
            setTextColor(bg)
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(cyan, 12)
            setOnClickListener { hideKeyboard(); refreshBalance() }
        }
        wallet.addView(refreshButton, LinearLayout.LayoutParams(-1, dp(50)))
        wallet.addView(space(8))
        val clear = Button(this).apply {
            text = "Remover endereço salvo"
            isAllCaps = false
            textSize = 12f
            setTextColor(white)
            background = rounded(Color.rgb(23, 44, 64), 12, Color.rgb(43, 69, 91))
            setOnClickListener {
                getSharedPreferences("forcarede", MODE_PRIVATE).edit().remove("btc_address").apply()
                addressInput.setText("")
                balanceView.text = "— BTC"
                statusView.text = "Endereço removido deste aparelho"
                txView.text = "Transações confirmadas: —"
                updatedView.text = "Atualização: —"
                logView.text = "• Endereço local removido. Nenhuma transação foi enviada."
            }
        }
        wallet.addView(clear, LinearLayout.LayoutParams(-1, dp(44)))
        root.addView(wallet)
        root.addView(space(12))

        val compute = card()
        compute.addView(text("REDE DE COMPUTAÇÃO", 13f, white, true))
        compute.addView(space(8))
        compute.addView(text("Estado: nenhum provedor conectado", 15f, Color.rgb(255, 210, 122), true))
        compute.addView(space(5))
        compute.addView(text("Este APK não inicia mineração nem gera créditos sozinho. Para processamento remunerado, é necessário integrar um provedor real, cumprir os requisitos dele e validar pagamentos pela API oficial.", 12f, muted, false))
        root.addView(compute)
        root.addView(space(12))

        val logs = card()
        logs.addView(text("REGISTRO DE EVENTOS", 13f, white, true))
        logs.addView(space(8))
        logView = text("• Aplicativo iniciado.\n• Consulta de saldo disponível para endereço público Bitcoin.\n• Nenhum provedor de computação conectado.", 12f, muted, false)
        logs.addView(logView)
        root.addView(logs)
        root.addView(space(18))
        root.addView(text("ForçaRede • dados de saldo via mempool.space • sem chaves privadas", 10f, muted, false))
    }

    private fun refreshBalance() {
        val address = addressInput.text.toString().trim()
        if (address.isBlank()) {
            statusView.text = "Cole um endereço Bitcoin público para consultar."
            return
        }
        if (address.length !in 26..90 || address.any { it.isWhitespace() }) {
            statusView.text = "O formato parece inválido. Confira o endereço."
            return
        }
        getSharedPreferences("forcarede", MODE_PRIVATE).edit().putString("btc_address", address).apply()
        refreshButton.isEnabled = false
        refreshButton.text = "CONSULTANDO A REDE…"
        statusView.text = "Consultando API pública…"
        logView.text = "• Consulta solicitada à API pública mempool.space.\n• Nenhum pagamento ou mineração foi iniciado."
        executor.execute {
            var conn: HttpURLConnection? = null
            try {
                conn = (URL("https://mempool.space/api/address/" + address).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 12000
                    readTimeout = 12000
                    setRequestProperty("Accept", "application/json")
                }
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val body = stream.bufferedReader().use { it.readText() }
                if (code !in 200..299) throw IllegalStateException("A API respondeu HTTP $code")
                val json = JSONObject(body)
                val chain = json.getJSONObject("chain_stats")
                val funded = chain.optLong("funded_txo_sum", 0L)
                val spent = chain.optLong("spent_txo_sum", 0L)
                val sats = (funded - spent).coerceAtLeast(0L)
                val txs = chain.optInt("tx_count", 0)
                val btc = sats / 100_000_000.0
                runOnUiThread {
                    balanceView.text = DecimalFormat("0.00000000").format(btc).replace(',', '.') + " BTC"
                    statusView.text = "Consulta concluída • dados públicos da blockchain"
                    txView.text = "Transações confirmadas: $txs"
                    updatedView.text = "Atualização: agora • saldo confirmado"
                    logView.text = "• Consulta pública concluída com sucesso.\n• Saldo confirmado calculado a partir de transações confirmadas.\n• Isso não representa rendimento de mineração."
                    refreshButton.isEnabled = true
                    refreshButton.text = "CONSULTAR SALDO REAL"
                }
            } catch (e: Exception) {
                runOnUiThread {
                    statusView.text = "Falha na consulta: " + (e.message ?: "erro de rede")
                    logView.text = "• A consulta não foi confirmada.\n• Verifique internet e endereço; tente novamente.\n• Nenhum saldo foi inventado."
                    refreshButton.isEnabled = true
                    refreshButton.text = "TENTAR NOVAMENTE"
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
            text = value
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.START
            setLineSpacing(dp(2).toFloat(), 1f)
        }

    private fun space(height: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(height))
    }

    private fun rounded(color: Int, radius: Int, stroke: Int? = null): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
            if (stroke != null) setStroke(dp(1), stroke)
        }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
