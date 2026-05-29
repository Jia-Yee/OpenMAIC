# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView related
-keep class android.webkit.** { *; }
-keep class androidx.webkit.** { *; }
