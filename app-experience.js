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
 const validHex=value=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value);
 function effectiveTheme(){return prefs.theme==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):prefs.theme}
 function lighter(hex,amount=.42){
  const n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;
  const mix=v=>Math.round(v+(255-v)*amount).toString(16).padStart(2,"0");
  return "#"+mix(r)+mix(g)+mix(b);
 }
 function apply(){
  if(!palettes[prefs.palette]&&prefs.palette!=="custom")prefs.palette="midnight";
  if(!["dark","light","system"].includes(prefs.theme))prefs.theme="dark";
  if(!validHex(prefs.accent))prefs.accent="";
  if(prefs.palette==="custom"&&!prefs.accent)prefs.palette="midnight";
  root.dataset.theme=effectiveTheme();root.dataset.appearance=prefs.theme;root.dataset.palette=prefs.palette;
  const colors=prefs.palette==="custom"&&validHex(prefs.accent)?[prefs.accent,lighter(prefs.accent)]:palettes[prefs.palette];
  const primary=prefs.accent||colors[0];
  root.style.setProperty("--accent",primary,"important");
  root.style.setProperty("--accent2",prefs.palette==="custom"?lighter(primary):colors[1],"important");
  refresh();
 }
 function addThemeUI(){
  const top=document.querySelector(".topbar");if(!top||document.getElementById("appearanceButton"))return;
  const button=document.createElement("button");button.id="appearanceButton";button.className="btn appearance-trigger";button.type="button";button.textContent="◐ المظهر";
  const menu=document.createElement("section");menu.id="themeMenu";menu.innerHTML=
   '<div class="theme-menu-head"><div><strong>المظهر والتخصيص</strong><small>اختار شكل Stigram واحفظه</small></div><span class="theme-live-dot">● مباشر</span></div>'+
   '<strong>نمط الواجهة</strong><div class="theme-row" id="appearanceModes"><button class="theme-choice" data-mode="dark">داكن</button><button class="theme-choice" data-mode="light">فاتح</button><button class="theme-choice" data-mode="system">حسب الجهاز</button></div>'+
   '<strong>لوحات الألوان</strong><div class="theme-row" id="paletteChoices">'+Object.entries(names).map(([k,n])=>'<button class="theme-choice" data-palette="'+k+'"><i class="theme-dot" style="background:'+palettes[k][0]+'"></i>'+n+'</button>').join("")+'</div>'+
   '<label class="theme-custom">لونك الخاص <input id="customAccent" type="color" value="'+(prefs.accent||palettes[prefs.palette][0])+'"></label>'+
   '<div class="theme-footer"><button class="theme-choice" id="resetAppearance">إعادة ضبط</button><button class="btn primary" id="saveAppearance">حفظ وتطبيق ✓</button></div>'+
   '<p class="theme-save-note" id="themeSaveNote">التغييرات معاينة فقط — اضغط حفظ وتطبيق لتثبيتها</p>';
  top.append(button);document.body.append(menu);
  button.addEventListener("click",()=>menu.classList.toggle("open"));
  menu.addEventListener("click",e=>{
   const mode=e.target.closest("[data-mode]");if(mode){prefs.theme=mode.dataset.mode;apply()}
   const palette=e.target.closest("[data-palette]");if(palette){prefs.palette=palette.dataset.palette;prefs.accent="";apply()}
   if(e.target.id==="resetAppearance"){prefs={...defaults};apply()}
   if(e.target.id==="saveAppearance"||e.target.closest("#saveAppearance")){
    try{localStorage.setItem(key,JSON.stringify(prefs));apply();const note=document.getElementById("themeSaveNote");if(note)note.textContent="تم حفظ الثيم وتطبيقه بنجاح ✓"}
    catch(_){const note=document.getElementById("themeSaveNote");if(note)note.textContent="تعذر الحفظ — تحقق من مساحة التخزين"}
   }
  });
  const customPicker=menu.querySelector("#customAccent");
  const updateCustomColor=e=>{
   const chosen=e.currentTarget.value.toLowerCase();
   if(!validHex(chosen))return;
   prefs.accent=chosen;
   prefs.palette="custom";
   apply();
   menu.querySelectorAll("[data-palette]").forEach(x=>x.classList.remove("active"));
  };
  customPicker.addEventListener("input",updateCustomColor);
  customPicker.addEventListener("change",updateCustomColor);
  document.addEventListener("click",e=>{if(!menu.contains(e.target)&&!button.contains(e.target))menu.classList.remove("open")});
 }
 function refresh(){
  document.querySelectorAll("#themeMenu [data-mode]").forEach(x=>x.classList.toggle("active",x.dataset.mode===prefs.theme));
  document.querySelectorAll("#themeMenu [data-palette]").forEach(x=>x.classList.toggle("active",x.dataset.palette===prefs.palette));
  const color=document.getElementById("customAccent");if(color)color.value=validHex(prefs.accent)?prefs.accent:(palettes[prefs.palette]||palettes.midnight)[0];
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