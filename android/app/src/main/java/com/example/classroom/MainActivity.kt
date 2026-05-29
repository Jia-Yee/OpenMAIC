package com.example.classroom

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val TAG = "MainActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupWebView()
        loadHomePage()
    }

    private fun setupWebView() {
        webView = findViewById(R.id.webView)
        
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
            setGeolocationEnabled(true)
        }

        // Enable debugging for development
        WebView.setWebContentsDebuggingEnabled(true)

        // Add JavaScript interface
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Handle custom scheme
                if (url.startsWith("app://classroom")) {
                    handleAppScheme(url)
                    return true
                }
                
                // Handle http/https
                return when {
                    url.startsWith("http://") || url.startsWith("https://") -> {
                        false // Let WebView handle it
                    }
                    else -> {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(intent)
                            true
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to open URL: $url", e)
                            false
                        }
                    }
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d(TAG, "Page loaded: $url")
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                Log.e(TAG, "Error loading page: ${error?.description}")
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

    private fun loadHomePage() {
        val baseUrl = getString(R.string.base_url)
        val url = "$baseUrl/mobile"
        webView.loadUrl(url)
        Log.d(TAG, "Loading URL: $url")
    }

    private fun handleAppScheme(url: String) {
        val uri = Uri.parse(url)
        when (uri.getQueryParameter("action")) {
            "openGradeSelection" -> {
                startActivity(Intent(this, GradeSelectionActivity::class.java))
            }
            "openSubjectSelection" -> {
                startActivity(Intent(this, SubjectSelectionActivity::class.java))
            }
            "openAdventure" -> {
                val subjectId = uri.getQueryParameter("subjectId")
                val subjectName = uri.getQueryParameter("subjectName")
                val gradeId = uri.getQueryParameter("gradeId")
                
                val intent = Intent(this, AdventureActivity::class.java).apply {
                    putExtra("subjectId", subjectId)
                    putExtra("subjectName", subjectName)
                    putExtra("gradeId", gradeId)
                }
                startActivity(intent)
            }
            "openClassroom" -> {
                val classroomId = uri.getQueryParameter("classroomId")
                val baseUrl = getString(R.string.base_url)
                val url = "$baseUrl/classroom/$classroomId"
                webView.loadUrl(url)
            }
            "share" -> {
                val title = uri.getQueryParameter("title") ?: "分享课程"
                val content = uri.getQueryParameter("content") ?: ""
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TITLE, title)
                    putExtra(Intent.EXTRA_TEXT, content)
                }
                startActivity(Intent.createChooser(shareIntent, "分享到"))
            }
            "saveProgress" -> {
                val progress = uri.getQueryParameter("progress")
                Log.d(TAG, "Saving progress: $progress")
                // TODO: Save progress to local storage
            }
            else -> {
                Log.w(TAG, "Unknown action: ${uri.getQueryParameter("action")}")
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    class WebAppInterface(private val activity: MainActivity) {
        
        @JavascriptInterface
        fun showToast(message: String) {
            android.widget.Toast.makeText(activity, message, android.widget.Toast.LENGTH_SHORT).show()
        }

        @JavascriptInterface
        fun openAdventure(subjectId: String, subjectName: String, gradeId: String) {
            val intent = Intent(activity, AdventureActivity::class.java).apply {
                putExtra("subjectId", subjectId)
                putExtra("subjectName", subjectName)
                putExtra("gradeId", gradeId)
            }
            activity.startActivity(intent)
        }

        @JavascriptInterface
        fun getBaseUrl(): String {
            return activity.getString(R.string.base_url)
        }
    }
}
