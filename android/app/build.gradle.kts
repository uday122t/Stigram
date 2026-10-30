plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.stigram.stickers"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.stigram.stickers"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}
