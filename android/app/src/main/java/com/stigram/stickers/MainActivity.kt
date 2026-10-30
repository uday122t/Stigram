package com.stigram.stickers

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

data class Pack(val id:String,val name:String,val publisher:String,val tray:String,val version:String,val files:List<String>)
class PackStore(private val context: Context) {
    private val prefs=context.getSharedPreferences("packs",0)
    fun all():List<Pack> = prefs.getStringSet("ids", emptySet())!!.mapNotNull { id ->
        val raw=prefs.getString(id,null) ?: return@mapNotNull null
        val bits=raw.split("|")
        if(bits.size<5) null else Pack(id,bits[0],bits[1],bits[2],bits[3],bits.drop(4))
    }
    fun save(pack:Pack) {
        val bits=listOf(pack.name,pack.publisher,pack.tray,pack.version)+pack.files
        prefs.edit().putString(pack.id,bits.joinToString("|")).putStringSet("ids",(prefs.getStringSet("ids",emptySet())?:emptySet())+pack.id).apply()
    }
}
class MainActivity : Activity() {
    private lateinit var root: LinearLayout
    private lateinit var store: PackStore
    override fun onCreate(savedInstanceState:Bundle?) { super.onCreate(savedInstanceState); store=PackStore(this); render(); handleIncoming(intent) }
    override fun onNewIntent(intent:Intent) { super.onNewIntent(intent); setIntent(intent); handleIncoming(intent) }
    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt()
    private fun render() {
        root=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(dp(20),dp(28),dp(20),dp(20)); setBackgroundColor(0xFFF5F7FB.toInt()) }
        setContentView(root)
        root.addView(TextView(this).apply { text="Stigram Stickers"; textSize=28f; setTextColor(0xFF182238.toInt()); gravity=Gravity.CENTER; setPadding(0,0,0,dp(8)) })
        root.addView(TextView(this).apply { text="حوّل ملصقاتك إلى حزم واتساب"; textSize=15f; gravity=Gravity.CENTER; setTextColor(0xFF596579.toInt()); setPadding(0,0,0,dp(20)) })
        root.addView(Button(this).apply { text="＋ استيراد صور الملصقات"; setOnClickListener { pick() } })
        root.addView(TextView(this).apply { text="حزمك"; textSize=20f; setTextColor(0xFF182238.toInt()); setPadding(0,dp(22),0,dp(8)) })
        store.all().forEach { pack ->
            val card=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(dp(14),dp(12),dp(14),dp(12)); setBackgroundColor(0xFFFFFFFF.toInt()) }
            card.addView(TextView(this).apply { text=pack.name+" · "+pack.files.size+" ملصق"; textSize=17f; setTextColor(0xFF182238.toInt()) })
            card.addView(Button(this).apply { text="إضافة إلى WhatsApp"; setOnClickListener { addPack(pack) } })
            root.addView(card,LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin=dp(10) })
        }
        root.addView(TextView(this).apply { text="كل حزمة تحتاج 3 إلى 30 ملصقاً ثابتاً. الصور تتحول إلى WebP بمقاس 512×512."; textSize=12f; setTextColor(0xFF667085.toInt()); setPadding(0,dp(12),0,0) })
    }
    private fun pick() {
        val i=Intent(Intent.ACTION_OPEN_DOCUMENT).apply { type="image/*"; putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true); addCategory(Intent.CATEGORY_OPENABLE) }
        startActivityForResult(i,44)
    }
    @Deprecated("Legacy activity result for broad Android compatibility")
    override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?) { super.onActivityResult(requestCode,resultCode,data); if(requestCode==44&&resultCode==RESULT_OK&&data!=null) importUris(data) }
    private fun handleIncoming(i:Intent?) {
        if(i==null)return
        val uris=when(i.action) { Intent.ACTION_SEND -> listOfNotNull(i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)); Intent.ACTION_SEND_MULTIPLE -> i.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) ?: emptyList(); else -> emptyList() }
        if(uris.isNotEmpty()) importList(uris)
    }
    private fun importUris(i:Intent) {
        val uris=mutableListOf<Uri>(); i.data?.let{uris.add(it)}; i.clipData?.let{clip->for(n in 0 until clip.itemCount)clip.getItemAt(n).uri?.let{uris.add(it)}}
        importList(uris.distinct())
    }
    private fun importList(uris:List<Uri>) {
        if(uris.isEmpty())return
        if(uris.size !in 3..30) { Toast.makeText(this,"اختار من 3 إلى 30 صورة للحزمة الواحدة",Toast.LENGTH_LONG).show(); return }
        val name=EditText(this).apply { hint="اسم الحزمة"; setText("Stigram Pack") }
        val box=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(dp(24),dp(8),dp(24),dp(8)); addView(name) }
        android.app.AlertDialog.Builder(this).setTitle("اسم حزمة الملصقات").setView(box).setNegativeButton("إلغاء",null).setPositiveButton("إنشاء") { _,_ -> savePack(uris,name.text.toString().ifBlank{"Stigram Pack"}) }.show()
    }
    private fun savePack(uris:List<Uri>,name:String) {
        try {
            val id="stigram_"+UUID.randomUUID().toString().replace("-","").take(12)
            val dir=File(filesDir,"sticker_packs/$id").apply { mkdirs() }
            val names=mutableListOf<String>()
            uris.forEachIndexed { index,uri ->
                val bitmap=contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) } ?: return@forEachIndexed
                val square=Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888)
                val c=android.graphics.Canvas(square); val scale=maxOf(512f/bitmap.width,512f/bitmap.height)
                val w=bitmap.width*scale; val h=bitmap.height*scale
                val src=android.graphics.Rect(0,0,bitmap.width,bitmap.height); val dst=android.graphics.RectF((512-w)/2,(512-h)/2,(512+w)/2,(512+h)/2)
                c.drawBitmap(bitmap,src,dst,android.graphics.Paint(3))
                val filename="sticker_$index.webp"; val file=File(dir,filename)
                var quality=90
                do { FileOutputStream(file).use { square.compress(Bitmap.CompressFormat.WEBP_LOSSY,quality,it) }; quality-=10 } while(file.length()>100*1024&&quality>=40)
                if(file.length()>100*1024) { file.delete(); throw IllegalArgumentException("حجم أحد الملصقات أكبر من 100KB بعد الضغط") }
                names.add(filename); bitmap.recycle(); square.recycle()
            }
            if(names.size<3) throw IllegalArgumentException("تعذر قراءة 3 صور صالحة على الأقل")
            val tray=File(dir,"tray.webp"); val first=BitmapFactory.decodeFile(File(dir,names.first()).absolutePath)
            FileOutputStream(tray).use { first.compress(Bitmap.CompressFormat.WEBP_LOSSY,85,it) }; first.recycle()
            if(tray.length()>50*1024) throw IllegalArgumentException("أيقونة الحزمة تجاوزت 50KB")
            store.save(Pack(id,name.take(128),"Stigram", "tray.webp",System.currentTimeMillis().toString(),names))
            Toast.makeText(this,"تم إنشاء الحزمة بنجاح",Toast.LENGTH_LONG).show(); render()
        } catch(e:Exception) { Toast.makeText(this,e.message ?: "تعذر إنشاء الحزمة",Toast.LENGTH_LONG).show() }
    }
    private fun addPack(pack:Pack) {
        val i=Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK").apply {
            putExtra("sticker_pack_id",pack.id); putExtra("sticker_pack_authority","com.stigram.stickers.provider"); putExtra("sticker_pack_name",pack.name)
        }
        try { startActivityForResult(i,200) } catch(_:Exception) { Toast.makeText(this,"ثبت WhatsApp أولاً ثم أعد المحاولة",Toast.LENGTH_LONG).show() }
    }
}
