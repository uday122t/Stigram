(() => {
 "use strict";
 const root=document.documentElement, key="stigram_preferences_v1";
 const defaults={theme:"light",palette:"sky",firstCreated:false};
 let prefs={...defaults};
 try{prefs={...defaults,...JSON.parse(localStorage.getItem(key)||"{}")}}catch(_){}
 function apply(){root.dataset.theme=prefs.theme;root.dataset.palette=prefs.palette;localStorage.setItem(key,JSON.stringify(prefs))}
 function addThemeUI(){
  if(document.getElementById("themeMenu"))return;
  const top=document.querySelector(".topbar");if(!top)return;
  const trigger=document.createElement("button");trigger.className="btn";trigger.id="themeTrigger";trigger.type="button";trigger.textContent="◐ المظهر";
  top.insertBefore(trigger,top.lastElementChild);
  const menu=document.createElement("section");menu.id="themeMenu";menu.innerHTML='<strong>تخصيص Stigram</strong><p style="font-size:12px;color:var(--muted);margin:5px 0">اختار الثيم واللون المناسب إلك</p><div class="theme-row"><button class="theme-choice" data-theme-choice="light">☀️ فاتح</button><button class="theme-choice" data-theme-choice="dark">🌙 داكن</button></div><div class="theme-row"><button class="theme-choice" data-palette-choice="sky"><i class="theme-dot" style="background:#35b8ed"></i>سماوي</button><button class="theme-choice" data-palette-choice="mint"><i class="theme-dot" style="background:#36c6c0"></i>نعناعي</button><button class="theme-choice" data-palette-choice="violet"><i class="theme-dot" style="background:#8b91ff"></i>ليلكي</button></div>';
  document.body.append(menu);
  trigger.onclick=()=>menu.classList.toggle("open");
  menu.onclick=e=>{const t=e.target.closest("[data-theme-choice]"),p=e.target.closest("[data-palette-choice]");if(t)prefs.theme=t.dataset.themeChoice;if(p)prefs.palette=p.dataset.paletteChoice;apply();refresh()};
  document.addEventListener("click",e=>{if(!menu.contains(e.target)&&e.target!==trigger)menu.classList.remove("open")});
 }
 function refresh(){document.querySelectorAll("[data-theme-choice]").forEach(x=>x.classList.toggle("active",x.dataset.themeChoice===prefs.theme));document.querySelectorAll("[data-palette-choice]").forEach(x=>x.classList.toggle("active",x.dataset.paletteChoice===prefs.palette))}
 function addCreateGuide(){
  const page=document.getElementById("page-create");if(!page||document.getElementById("firstCreateGuide"))return;
  const guide=document.createElement("div");guide.id="firstCreateGuide";guide.innerHTML='<h3>✨ أول ستيكر إلك يبدأ من هان</h3><p>ارفع صورة، قصّها وعدّلها، وبعدها احفظها في مجموعتك وشاركها مع العالم.</p><button class="btn primary" id="guideStart">ابدأ الآن</button>';
  page.insertBefore(guide,page.children[1]||null);
  guide.querySelector("#guideStart").onclick=()=>document.getElementById("imageFile")?.click();
  if(prefs.firstCreated)guide.remove();
 }
 function wrapPublish(){
  const original=window.publish;
  if(typeof original!=="function"||original.__stigWrapped)return;
  const wrapped=async function(...args){const before=localStorage.getItem("stigram_items")||"[]";const result=await original.apply(this,args);try{const after=JSON.parse(localStorage.getItem("stigram_items")||"[]");if(after.length>JSON.parse(before).length){prefs.firstCreated=true;apply();document.getElementById("firstCreateGuide")?.remove()}}catch(_){}return result};
  wrapped.__stigWrapped=true;window.publish=wrapped;
 }
 function installAction(){
  if(typeof window.card==="function"&&!window.card.__stigWrapped){
   const original=window.card;
   const wrapped=function(item){let html=original(item);const id=String(item.id).replace(/'/g,"\\'");const url=String(item.url||"").replace(/'/g,"%27");const title=String(item.title||"ملصق").replace(/'/g,"%27");return html.replace('</div></div></article>','<button class="icon-btn whatsapp-action" type="button" onclick="addStickerToWhatsApp(\''+id+'\')">☘ WhatsApp</button></div></div></article>')};
   wrapped.__stigWrapped=true;window.card=wrapped;
  }
  if(!window.addStickerToWhatsApp)window.addStickerToWhatsApp=function(id){
   const item=(window.allItems?.()||[]).find(x=>String(x.id)===String(id));if(!item?.url){window.toast?.("هذا الملصق غير متاح للتصدير");return}
   const payload={url:item.url,title:item.title||"Stigram Sticker"};
   if(window.StigramNative?.requestStickerImport){window.StigramNative.requestStickerImport(payload.url,payload.title);return}
   const appLink="intent://import?url="+encodeURIComponent(payload.url)+"&title="+encodeURIComponent(payload.title)+"#Intent;scheme=stigram;package=com.stigram.stickers;S.browser_fallback_url="+encodeURIComponent("https://github.com/uday122t/Stigram/releases")+";end";
   const fallback=confirm("لإضافة الملصق إلى WhatsApp، ثبّت تطبيق Stigram أولاً. سيتم فتح صفحة التطبيق.");
   if(fallback)location.href=appLink;
  };
 }
 apply();
 const boot=()=>{addThemeUI();addCreateGuide();refresh();wrapPublish();installAction()};
 boot();document.addEventListener("click",()=>{setTimeout(boot,120)});
 window.addEventListener("load",boot);
})();
