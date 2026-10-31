package com.stigram.stickers

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import org.json.JSONArray
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.UUID

data class Pack(val id:String,val name:String,val publisher:String,val tray:String,val version:String,val files:List<String>)
class PackStore(private val context:android.content.Context) {
 private val prefs=context.getSharedPreferences("packs",0)
 fun all(): List<Pack> =(prefs.getStringSet("ids",emptySet())?:emptySet()).mapNotNull { id ->
  val raw=prefs.getString(id,null)?:return@mapNotNull null
  val bits=raw.split("|");if(bits.size<5)null else Pack(id,bits[0],bits[1],bits[2],bits[3],bits.drop(4))
 }
 fun save(p:Pack){val bits=listOf(p.name,p.publisher,p.tray,p.version)+p.files;prefs.edit().putString(p.id,bits.joinToString("|")).putStringSet("ids",(prefs.getStringSet("ids",emptySet())?:emptySet())+p.id).apply()}
}
class MainActivity:Activity(){
 private lateinit var root:LinearLayout
 private lateinit var web:WebView
 private lateinit var store:PackStore
 private var filePathCallback:ValueCallback<Array<Uri>>?=null
 private val imagePickerRequest=501
 private var dark=true
 private val site="https://uday122t.github.io/Stigram/"
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);store=PackStore(this);dark=getPreferences(0).getBoolean("dark",false);buildShell();handleIncoming(intent)}
 override fun onNewIntent(i:Intent){super.onNewIntent(i);setIntent(i);handleIncoming(i)}
 private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt()
 private fun buildShell(){
  window.statusBarColor=0xFF070D18.toInt()
  window.navigationBarColor=0xFF070D18.toInt()
  if(android.os.Build.VERSION.SDK_INT>=29)window.isNavigationBarContrastEnforced=false
  root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setBackgroundColor(0xFF070D18.toInt())}
  web=WebView(this).apply{
   settings.javaScriptEnabled=true
   settings.domStorageEnabled=true
   settings.allowFileAccess=false
   settings.allowContentAccess=true
   settings.loadsImagesAutomatically=true
   webViewClient=WebViewClient()
   webChromeClient=object:WebChromeClient(){
    override fun onShowFileChooser(view:WebView?,callback:ValueCallback<Array<Uri>>?,params:FileChooserParams?):Boolean{
     filePathCallback?.onReceiveValue(null)
     filePathCallback=callback
     val pick=Intent(Intent.ACTION_GET_CONTENT).apply{addCategory(Intent.CATEGORY_OPENABLE);type="image/*";putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params?.mode==FileChooserParams.MODE_OPEN_MULTIPLE)}
     startActivityForResult(Intent.createChooser(pick,"اختار صورة من الاستوديو"),imagePickerRequest)
     return true
    }
   }
   addJavascriptInterface(StigramNative(),"StigramNative")
   setBackgroundColor(0xFF070D18.toInt())
   loadUrl(site)
  }
  root.addView(web,LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT))
  setContentView(root)
 }
 inner class StigramNative{
  @JavascriptInterface fun requestStickerImport(url:String,title:String){runOnUiThread{downloadAndStage(url,title)}}
  @JavascriptInterface fun requestWhatsAppPack(urlsJson:String,title:String){runOnUiThread{downloadWhatsAppPack(urlsJson,title)}}
  @JavascriptInterface fun requestTelegramImport(urlsJson:String,title:String){runOnUiThread{importTelegramUrls(urlsJson,title)}}
 }


 private fun downloadWhatsAppPack(urlsJson:String,title:String){
  val urls=try{val a=JSONArray(urlsJson);(0 until a.length()).map{a.getString(it)}.filter{it.startsWith("https://")||it.startsWith("http://")}.take(30)}catch(e:Exception){emptyList()}
  if(urls.size !in 3..30){Toast.makeText(this,"حزمة WhatsApp تحتاج من 3 إلى 30 ملصقاً",Toast.LENGTH_LONG).show();return}
  Toast.makeText(this,"جارٍ تنزيل وتجهيز حزمة WhatsApp...",Toast.LENGTH_SHORT).show()
  Thread{
   try{
    val dir=File(filesDir,"pending_whatsapp").apply{mkdirs()}
    val files=urls.mapIndexed{index,url->
     val connection=URL(url).openConnection().apply{connectTimeout=15000;readTimeout=20000}
     val file=File(dir,"sticker_"+System.currentTimeMillis()+"_"+index+".img")
     connection.getInputStream().use{input->file.outputStream().use{input.copyTo(it)}}
     if(file.length()==0L)throw IllegalArgumentException("ملف ملصق فارغ")
     file
    }
    runOnUiThread{savePack(files.map{Uri.fromFile(it)},title.ifBlank{"Stigram Stickers"})}
   }catch(e:Exception){runOnUiThread{Toast.makeText(this,"تعذر تجهيز WhatsApp: "+(e.message?:"خطأ"),Toast.LENGTH_LONG).show()}}
  }.start()
 }
 override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){
  super.onActivityResult(requestCode,resultCode,data)
  if(requestCode==imagePickerRequest){
   val callback=filePathCallback?:return
   filePathCallback=null
   val selected=mutableListOf<Uri>()
   if(resultCode==Activity.RESULT_OK&&data!=null){
    data.clipData?.let{clip->for(i in 0 until clip.itemCount)selected.add(clip.getItemAt(i).uri)}
    if(selected.isEmpty())data.data?.let{selected.add(it)}
   }
   callback.onReceiveValue(selected.takeIf{it.isNotEmpty()}?.toTypedArray())
  }
 }

 private fun importTelegramUrls(urlsJson:String,title:String){
  val urls=try{val array=JSONArray(urlsJson);(0 until array.length()).map{array.getString(it)}.filter{it.startsWith("https://")||it.startsWith("http://")}.take(50)}catch(e:Exception){emptyList()}
  if(urls.isEmpty()){Toast.makeText(this,"ما في ملصقات صالحة للإرسال",Toast.LENGTH_LONG).show();return}
  Toast.makeText(this,"جارٍ تجهيز ملصقات Telegram...",Toast.LENGTH_SHORT).show()
  Thread{
   try{
    val id="telegram_"+UUID.randomUUID().toString().replace("-","").take(12)
    val dir=File(filesDir,"sticker_packs/"+id).apply{mkdirs()}
    val names=mutableListOf<String>()
    urls.forEachIndexed{index,url->
     val connection=URL(url).openConnection().apply{connectTimeout=15000;readTimeout=20000}
     val bitmap=connection.getInputStream().use{BitmapFactory.decodeStream(it)}?:throw IllegalArgumentException("تعذر قراءة الملصق "+(index+1))
     val output=Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888)
     val canvas=android.graphics.Canvas(output)
     val scale=minOf(512f/bitmap.width,512f/bitmap.height)
     val width=bitmap.width*scale;val height=bitmap.height*scale
     canvas.drawBitmap(bitmap,null,android.graphics.RectF((512-width)/2,(512-height)/2,(512+width)/2,(512+height)/2),android.graphics.Paint(3))
     val filename="telegram_"+index+".webp";val file=File(dir,filename)
     FileOutputStream(file).use{output.compress(Bitmap.CompressFormat.WEBP_LOSSY,90,it)}
     if(file.length()>512*1024)throw IllegalArgumentException("حجم أحد الملصقات أكبر من 512KB")
     names.add(filename);bitmap.recycle();output.recycle()
    }
    val tray=File(dir,"tray.webp")
    val first=BitmapFactory.decodeFile(File(dir,names.first()).absolutePath)?:throw IllegalArgumentException("تعذر تجهيز صورة الحزمة")
    val trayBitmap=Bitmap.createScaledBitmap(first,96,96,true)
    FileOutputStream(tray).use{trayBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY,85,it)}
    trayBitmap.recycle();first.recycle()
    store.save(Pack(id,title.ifBlank{"Stigram Stickers"},"Stigram","tray.webp",System.currentTimeMillis().toString(),names))
    val uris=ArrayList<Uri>()
    names.forEach{uris.add(Uri.parse("content://com.stigram.stickers.provider/stickers_asset/"+id+"/"+it))}
    val emojis=ArrayList<String>();repeat(names.size){emojis.add("✨")}
    val intent=Intent("org.telegram.messenger.CREATE_STICKER_PACK").apply{
     type="image/*"
     putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris)
     putStringArrayListExtra("STICKER_EMOJIS",emojis)
     putExtra("IMPORTER",packageName)
     addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runOnUiThread{
     try{startActivity(intent);Toast.makeText(this,"تم تجهيز الملصقات — أكمل إنشاء الحزمة داخل Telegram",Toast.LENGTH_LONG).show()}
     catch(e:Exception){Toast.makeText(this,"ثبت Telegram أو حدّثه حتى يظهر خيار استيراد الملصقات",Toast.LENGTH_LONG).show()}
    }
   }catch(e:Exception){runOnUiThread{Toast.makeText(this,e.message?:"تعذر تجهيز ملصقات Telegram",Toast.LENGTH_LONG).show()}}
  }.start()
 }

 private fun handleIncoming(i:Intent?){
  if(i==null)return
  if(i.action==Intent.ACTION_VIEW&&i.data?.scheme=="stigram"&&i.data?.host=="import"){
   val url=i.data?.getQueryParameter("url");val title=i.data?.getQueryParameter("title")?:"Stigram Sticker"
   if(!url.isNullOrBlank())downloadAndStage(url,title);return
  }
  val uris=mutableListOf<Uri>()
  if(i.action==Intent.ACTION_SEND)i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)?.let{uris.add(it)}
  if(i.action==Intent.ACTION_SEND_MULTIPLE)uris.addAll(i.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?:emptyList())
  i.clipData?.let{clip->for(n in 0 until clip.itemCount)clip.getItemAt(n).uri?.let{uris.add(it)}}
  if(uris.isNotEmpty())importList(uris.distinct())
 }
 private fun downloadAndStage(url:String,title:String){
  Toast.makeText(this,"جارٍ استيراد الملصق...",Toast.LENGTH_SHORT).show()
  Thread{
   try{
    val con=URL(url).openConnection();con.connectTimeout=15000;con.readTimeout=20000
    val dir=File(filesDir,"pending_stickers").apply{mkdirs()}
    val file=File(dir,System.currentTimeMillis().toString()+".img")
    con.getInputStream().use{input->file.outputStream().use{input.copyTo(it)}}
    val prefs=getSharedPreferences("pending",0);val paths=(prefs.getStringSet("paths",emptySet())?:emptySet()).toMutableSet();paths.add(file.absolutePath);prefs.edit().putStringSet("paths",paths).apply()
    runOnUiThread{if(paths.size>=3)importList(paths.take(30).map{Uri.fromFile(File(it))})else Toast.makeText(this,"وصل ملصقك («"+title+"»). حزمة واتساب تحتاج "+(3-paths.size)+" ملصقين إضافيين.",Toast.LENGTH_LONG).show()}
   }catch(e:Exception){runOnUiThread{Toast.makeText(this,"تعذر الاستيراد: "+(e.message?:"خطأ"),Toast.LENGTH_LONG).show()}}
  }.start()
 }
 private fun importList(uris:List<Uri>){if(uris.size !in 3..30){Toast.makeText(this,"حزمة واتساب تحتاج من 3 إلى 30 ملصقاً",Toast.LENGTH_LONG).show();return};savePack(uris,"Stigram Stickers")}
 private fun savePack(uris:List<Uri>,name:String){
  try{
   val id="stigram_"+UUID.randomUUID().toString().replace("-","").take(12);val dir=File(filesDir,"sticker_packs/"+id).apply{mkdirs()};val names=mutableListOf<String>()
   uris.forEachIndexed{index,uri->
    val bitmap=contentResolver.openInputStream(uri)?.use{BitmapFactory.decodeStream(it)}?:throw IllegalArgumentException("تعذر قراءة أحد الملصقات")
    val square=Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888);val canvas=android.graphics.Canvas(square);val scale=minOf(512f/bitmap.width,512f/bitmap.height);val w=bitmap.width*scale;val h=bitmap.height*scale
    canvas.drawBitmap(bitmap,null,android.graphics.RectF((512-w)/2,(512-h)/2,(512+w)/2,(512+h)/2),android.graphics.Paint(3))
    val filename="sticker_"+index+".webp";val file=File(dir,filename);var quality=90
    do{FileOutputStream(file).use{square.compress(Bitmap.CompressFormat.WEBP_LOSSY,quality,it)};quality-=10}while(file.length()>100*1024&&quality>=40)
    if(file.length()>100*1024)throw IllegalArgumentException("حجم الملصق تجاوز 100KB")
    names.add(filename);bitmap.recycle();square.recycle()
   }
   val tray=File(dir,"tray.webp");val first=BitmapFactory.decodeFile(File(dir,names.first()).absolutePath)?:throw IllegalArgumentException("تعذر تجهيز الأيقونة")
   val trayBitmap=Bitmap.createScaledBitmap(first,96,96,true);FileOutputStream(tray).use{trayBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY,85,it)};trayBitmap.recycle();first.recycle()
   if(tray.length()>50*1024)throw IllegalArgumentException("أيقونة الحزمة تجاوزت 50KB")
   store.save(Pack(id,name,"Stigram","tray.webp",System.currentTimeMillis().toString(),names));getSharedPreferences("pending",0).edit().remove("paths").apply()
   Toast.makeText(this,"تم تجهيز الحزمة، افتحها لإضافتها إلى WhatsApp",Toast.LENGTH_LONG).show();showPacks()
  }catch(e:Exception){Toast.makeText(this,e.message?:"تعذر إنشاء الحزمة",Toast.LENGTH_LONG).show()}
 }
 private fun showPacks(){
  val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(12),dp(24),dp(8))}
  store.all().forEach{p->box.addView(TextView(this).apply{text=p.name+" · "+p.files.size+" ملصق";textSize=16f});box.addView(Button(this).apply{text="إضافة إلى WhatsApp";setOnClickListener{addPack(p)}})}
  android.app.AlertDialog.Builder(this).setTitle("حزم Stigram").setView(box).setNegativeButton("إغلاق",null).show()
 }
 private fun addPack(p:Pack){
  val i=Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK").apply{putExtra("sticker_pack_id",p.id);putExtra("sticker_pack_authority","com.stigram.stickers.provider");putExtra("sticker_pack_name",p.name)}
  try{startActivityForResult(i,200)}catch(e:Exception){Toast.makeText(this,"ثبت WhatsApp أولاً",Toast.LENGTH_LONG).show()}
 }
 @Deprecated("Back navigation")
 override fun onBackPressed(){if(::web.isInitialized&&web.canGoBack())web.goBack()else super.onBackPressed()}
}