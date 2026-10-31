(() => {
 "use strict";
 const root=document.documentElement,key="stigram_preferences_v2";
 const defaults={theme:"dark",palette:"midnight",accent:""};
 let prefs={...defaults};
 try{prefs={...defaults,...JSON.parse(localStorage.getItem(key)||"{}")}}catch(_){}
 const palettes={
  midnight:["#55c8ff","#72e0b1"],purple:["#a78bfa","#f0abfc"],cyan:["#22d3ee","#67e8f9"],
  emerald:["#34d399","#a3e635"],rose:["#fb7185","#f9a8d4"],sunset:["#fb923c","#f472b6"],
  arctic:["#60a5fa","#a5f3fc"],graphite:["#a1a1aa","#d4d4d8"],ocean:["#38bdf8","#2dd4bf"],crimson:["#f87171","#fda4af"]
 };
 const names={midnight:"Midnight Blue",purple:"Purple Nebula",cyan:"Cyber Cyan",emerald:"Emerald Glass",rose:"Rose Quartz",sunset:"Sunset",arctic:"Arctic",graphite:"Graphite",ocean:"Ocean",crimson:"Crimson"};
 function effectiveTheme(){return prefs.theme==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):prefs.theme}
 function apply(){
  root.dataset.theme=effectiveTheme();root.dataset.appearance=prefs.theme;root.dataset.palette=prefs.palette;
  const colors=palettes[prefs.palette]||palettes.midnight;
  root.style.setProperty("--accent",prefs.accent||colors[0],"important");root.style.setProperty("--accent2",colors[1],"important");
  try{localStorage.setItem(key,JSON.stringify(prefs))}catch(_){}
  refresh();
 }
 function addThemeUI(){
  const top=document.querySelector(".topbar");if(!top||document.getElementById("appearanceButton"))return;
  const button=document.createElement("button");button.id="appearanceButton";button.className="btn appearance-trigger";button.type="button";button.textContent="◐ المظهر";
  const menu=document.createElement("section");menu.id="themeMenu";menu.innerHTML=
   '<strong>المظهر والتخصيص</strong><div class="theme-row" id="appearanceModes"><button class="theme-choice" data-mode="dark">داكن</button><button class="theme-choice" data-mode="light">فاتح</button><button class="theme-choice" data-mode="system">حسب الجهاز</button></div>'+
   '<strong>الألوان</strong><div class="theme-row" id="paletteChoices">'+Object.entries(names).map(([k,n])=>'<button class="theme-choice" data-palette="'+k+'"><i class="theme-dot" style="background:'+palettes[k][0]+'"></i>'+n+'</button>').join("")+'</div>'+
   '<label class="theme-custom">لون مخصص <input id="customAccent" type="color" value="'+(prefs.accent||palettes[prefs.palette][0])+'"></label><button class="theme-choice" id="resetAppearance">استعادة الافتراضي</button>';
  top.append(button);document.body.append(menu);
  button.addEventListener("click",()=>menu.classList.toggle("open"));
  menu.addEventListener("click",e=>{
   const mode=e.target.closest("[data-mode]");if(mode){prefs.theme=mode.dataset.mode;apply()}
   const palette=e.target.closest("[data-palette]");if(palette){prefs.palette=palette.dataset.palette;prefs.accent="";apply()}
   if(e.target.id==="resetAppearance"){prefs={...defaults};apply()}
  });
  menu.querySelector("#customAccent").addEventListener("input",e=>{prefs.accent=e.target.value;apply()});
  document.addEventListener("click",e=>{if(!menu.contains(e.target)&&!button.contains(e.target))menu.classList.remove("open")});
 }
 function refresh(){
  document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x.dataset.mode===prefs.theme));
  document.querySelectorAll("[data-palette]").forEach(x=>x.classList.toggle("active",x.dataset.palette===prefs.palette));
  const color=document.getElementById("customAccent");if(color&&prefs.accent)color.value=prefs.accent;
 }
 function installActions(){
  function openPackBuilder(id,platform){
   const nav=document.querySelector('[data-page="profile"]');
   if(nav)nav.click();
   setTimeout(()=>{
    const panel=document.getElementById("androidPackPanel");
    if(!panel){window.toast?.("افتح ملفك الشخصي بعد تسجيل الدخول لتجهيز الحزمة");return}
    panel.scrollIntoView({behavior:"smooth",block:"start"});
    const checkbox=panel.querySelector('input[data-sticker-id="'+CSS.escape(String(id))+'"]');
    if(!checkbox){window.toast?.("هذا الملصق غير موجود ضمن ملصقات حسابك");return}
    if(!checkbox.checked){checkbox.checked=true;checkbox.dispatchEvent(new Event("change",{bubbles:true}))}
    if(platform==="telegram"){
     setTimeout(()=>document.getElementById("sendTelegramPack")?.click(),120);
    }else{
     window.toast?.("تم تحديد الملصق — اختار ملصقين إضافيين على الأقل ثم اضغط إضافة إلى WhatsApp");
    }
   },260);
  }
  window.addStickerToWhatsApp=id=>openPackBuilder(id,"whatsapp");
  window.addStickerToTelegram=id=>openPackBuilder(id,"telegram");
 }
 function boot(){addThemeUI();installActions();document.getElementById("firstCreateGuide")?.remove()}
 apply();boot();window.addEventListener("load",boot);
 if(window.matchMedia)matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{if(prefs.theme==="system")apply()});
})();