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

 function hexToHsv(hex){
  const n=parseInt(hex.slice(1),16),r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}
  return {h,s:max?d/max*100:0,v:max*100};
 }
 function hsvToHex(h,s,v){
  s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  let a,b,d;if(h<60){a=c;b=x;d=0}else if(h<120){a=x;b=c;d=0}else if(h<180){a=0;b=c;d=x}else if(h<240){a=0;b=x;d=c}else if(h<300){a=x;b=0;d=c}else{a=c;b=0;d=x}
  return "#"+[a,b,d].map(q=>Math.round((q+m)*255).toString(16).padStart(2,"0")).join("");
 }
 function updatePickerFromHex(hex){
  const c=hexToHsv(hex),h=document.getElementById("customHue"),sat=document.getElementById("customSat"),val=document.getElementById("customVal"),code=document.getElementById("customHex");
  if(!h||!sat||!val||!code)return;
  h.value=Math.round(c.h);sat.value=Math.round(c.s);val.value=Math.round(c.v);code.value=hex.toUpperCase();
  sat.style.setProperty("--picker-hue",hsvToHex(c.h,100,100));
  val.style.setProperty("--picker-full",hsvToHex(c.h,c.s,100));
  document.getElementById("customColorPreview").style.background=hex;
 }
 function applyPicker(){
  const h=+document.getElementById("customHue").value,s=+document.getElementById("customSat").value,v=+document.getElementById("customVal").value;
  const chosen=hsvToHex(h,s,v);prefs.accent=chosen;prefs.palette="custom";apply();updatePickerFromHex(chosen);
  menu.querySelectorAll("[data-palette]").forEach(x=>x.classList.remove("active"));
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
   '<div class="custom-picker"><strong>اختيار اللون بدقة</strong><div class="custom-picker-preview"><span id="customColorPreview"></span><input id="customHex" type="text" value="'+(prefs.accent||palettes[prefs.palette][0])+'" maxlength="7" aria-label="رمز اللون HEX"></div>'+
   '<label>درجة اللون <input id="customHue" class="color-range hue-range" type="range" min="0" max="360" value="195"></label>'+
   '<label>التشبع <input id="customSat" class="color-range sat-range" type="range" min="0" max="100" value="65"></label>'+
   '<label>القيمة / السطوع <input id="customVal" class="color-range val-range" type="range" min="0" max="100" value="100"></label></div>'+
   '<div class="theme-footer"><button class="theme-choice" id="resetAppearance">إعادة ضبط</button><button class="btn primary" id="saveAppearance">حفظ وتطبيق ✓</button></div>'+
   '<p class="theme-save-note" id="themeSaveNote">التغييرات معاينة فقط — اضغط حفظ وتطبيق لتثبيتها</p>';
  top.append(button);document.body.append(menu);
  button.addEventListener("click",()=>menu.classList.toggle("open"));
  menu.addEventListener("click",e=>{
   const mode=e.target.closest("[data-mode]");if(mode){prefs.theme=mode.dataset.mode;apply()}
   const palette=e.target.closest("[data-palette]");if(palette){prefs.palette=palette.dataset.palette;prefs.accent="";apply()}
   if(e.target.id==="resetAppearance"){prefs={...defaults};apply()}
   if(e.target.id==="saveAppearance"||e.target.closest("#saveAppearance")){
    try{const snapshot=JSON.stringify(prefs);localStorage.setItem(key,snapshot);const saved=JSON.parse(localStorage.getItem(key)||"{}");if(saved.theme!==prefs.theme||saved.palette!==prefs.palette||saved.accent!==prefs.accent)throw new Error("save verification failed");prefs={...defaults,...saved};apply();const note=document.getElementById("themeSaveNote");if(note)note.textContent="تم حفظ اللون نفسه وتطبيقه بنجاح ✓"}
    catch(_){const note=document.getElementById("themeSaveNote");if(note)note.textContent="تعذر الحفظ — تحقق من مساحة التخزين"}
   }
  });
  ["customHue","customSat","customVal"].forEach(id=>menu.querySelector("#"+id).addEventListener("input",applyPicker));
  menu.querySelector("#customHex").addEventListener("change",e=>{
   const chosen=e.currentTarget.value.trim().toLowerCase();
   if(!validHex(chosen)){e.currentTarget.value=prefs.accent||palettes.midnight[0];return}
   prefs.accent=chosen;prefs.palette="custom";apply();updatePickerFromHex(chosen);
   menu.querySelectorAll("[data-palette]").forEach(x=>x.classList.remove("active"));
  });
  updatePickerFromHex(prefs.accent||palettes[prefs.palette]?.[0]||palettes.midnight[0]);
  document.addEventListener("click",e=>{if(!menu.contains(e.target)&&!button.contains(e.target))menu.classList.remove("open")});
 }
 function refresh(){
  document.querySelectorAll("#themeMenu [data-mode]").forEach(x=>x.classList.toggle("active",x.dataset.mode===prefs.theme));
  document.querySelectorAll("#themeMenu [data-palette]").forEach(x=>x.classList.toggle("active",x.dataset.palette===prefs.palette));
  const color=validHex(prefs.accent)?prefs.accent:(palettes[prefs.palette]||palettes.midnight)[0];updatePickerFromHex(color);
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