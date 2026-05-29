package com.example.classroom

import android.os.Bundle
import android.util.Log
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class AdventureActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val TAG = "AdventureActivity"

    private var subjectId: String? = null
    private var subjectName: String? = null
    private var gradeId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_adventure)

        subjectId = intent.getStringExtra("subjectId")
        subjectName = intent.getStringExtra("subjectName")
        gradeId = intent.getStringExtra("gradeId")

        setupWebView()
        loadAdventurePage()
    }

    private fun setupWebView() {
        webView = findViewById(R.id.adventureWebView)
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            allowFileAccess = true
            allowContentAccess = true
            setSupportMultipleWindows(true)
        }

        WebView.setWebContentsDebuggingEnabled(true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                
                return if (url.startsWith("http://") || url.startsWith("https://")) {
                    false
                } else {
                    true
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d(TAG, "Adventure page loaded: $url")
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                Log.e(TAG, "Error loading adventure page: ${error?.description}")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(
                consoleMessage: android.webkit.ConsoleMessage?
            ): Boolean {
                Log.d(TAG, "WebView Console: ${consoleMessage?.message()}")
                return true
            }
        }
    }

    private fun loadAdventurePage() {
        val baseUrl = getString(R.string.base_url)
        val url = StringBuilder("$baseUrl/mobile/adventure").apply {
            append("?subjectId=${subjectId ?: ""}")
            if (subjectName != null) {
                append("&subjectName=${java.net.URLEncoder.encode(subjectName, "UTF-8")}")
            }
            if (gradeId != null) {
                append("&gradeId=$gradeId")
            }
        }.toString()

        Log.d(TAG, "Loading adventure URL: $url")
        webView.loadUrl(url)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
