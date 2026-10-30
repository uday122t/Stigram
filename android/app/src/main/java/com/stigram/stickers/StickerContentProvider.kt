package com.stigram.stickers

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File
import java.io.FileNotFoundException

class StickerContentProvider : ContentProvider() {
    private val authority = "com.stigram.stickers.provider"
    private fun root() = File(requireNotNull(context).filesDir, "sticker_packs")
    private fun packs(): List<Pack> = PackStore(requireNotNull(context)).all()
    override fun onCreate() = true
    override fun getType(uri: Uri): String = if (uri.pathSegments.firstOrNull() == "stickers_asset") "image/webp" else "vnd.android.cursor.dir/vnd.stigram.sticker"
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val p = uri.pathSegments
        val packList = packs()
        if (p.firstOrNull() == "metadata" && p.size == 1) {
            val c = MatrixCursor(arrayOf("identifier","name","publisher","tray_image_file","android_play_store_link","ios_app_store_link","publisher_website","privacy_policy_website","license_agreement_website","image_data_version","avoid_cache","animated_sticker_pack"))
            packList.forEach { c.addRow(arrayOf(it.id,it.name,it.publisher,it.tray,"","","","","",it.version,"false","false")) }
            return c
        }
        if (p.firstOrNull() == "metadata" && p.size > 1) {
            val pack = packList.firstOrNull { it.id == p[1] } ?: return MatrixCursor(arrayOf("identifier"))
            val c = MatrixCursor(arrayOf("identifier","name","publisher","tray_image_file","android_play_store_link","ios_app_store_link","publisher_website","privacy_policy_website","license_agreement_website","image_data_version","avoid_cache","animated_sticker_pack"))
            c.addRow(arrayOf(pack.id,pack.name,pack.publisher,pack.tray,"","","","","",pack.version,"false","false"))
            return c
        }
        if (p.firstOrNull() == "stickers" && p.size > 1) {
            val pack = packList.firstOrNull { it.id == p[1] } ?: return MatrixCursor(arrayOf("sticker_file_name","sticker_emoji"))
            val c = MatrixCursor(arrayOf("sticker_file_name","sticker_emoji","accessibility_text"))
            pack.files.forEach { c.addRow(arrayOf(it,"😀","Sticker")) }
            return c
        }
        return MatrixCursor(projection ?: arrayOf(OpenableColumns.DISPLAY_NAME))
    }
    override fun openFile(uri: Uri, mode: String) = openAssetFile(uri, mode)?.fileDescriptor?.let { ParcelFileDescriptor.dup(it) }
    override fun openAssetFile(uri: Uri, mode: String): android.content.res.AssetFileDescriptor? {
        val p = uri.pathSegments
        if (p.size < 3 || p[0] != "stickers_asset") throw FileNotFoundException(uri.toString())
        val pack = packs().firstOrNull { it.id == p[1] } ?: throw FileNotFoundException("Pack missing")
        val file = File(File(root(), pack.id), p[2])
        if (!file.exists() || !file.canonicalPath.startsWith(root().canonicalPath)) throw FileNotFoundException("Sticker missing")
        return android.content.res.AssetFileDescriptor(ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY), 0, file.length())
    }
    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
}
