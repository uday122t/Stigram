(() => {
 "use strict";
 const root=document.documentElement, key="stigram_preferences_v1";
 const defaults={theme:"dark",palette:"sky",firstCreated:false};
 let prefs={...defaults};
 try{prefs={...defaults,...JSON.parse(localStorage.getItem(key)||"{}")}}catch(_){}
 prefs.theme="dark";prefs.palette="sky";
 try{if(JSON.parse(localStorage.getItem("stigram_items")||"[]").length)prefs.firstCreated=true}catch(_){}
 function apply(){root.dataset.theme=prefs.theme;root.dataset.palette=prefs.palette;localStorage.setItem(key,JSON.stringify(prefs))}
 function addThemeUI(){document.getElementById("themeTrigger")?.remove();document.getElementById("themeMenu")?.remove();}
 function refresh(){document.querySelectorAll("[data-theme-choice]").forEach(x=>x.classList.toggle("active",x.dataset.themeChoice===prefs.theme));document.querySelectorAll("[data-palette-choice]").forEach(x=>x.classList.toggle("active",x.dataset.paletteChoice===prefs.palette))}
 function addCreateGuide(){document.getElementById("firstCreateGuide")?.remove();return;

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
  window.addStickerToWhatsApp=function(id){
   const card=document.querySelector('[data-sticker-id="'+CSS.escape(String(id))+'"]');
   const image=card?.querySelector(".sticker-image img");
   const title=card?.querySelector(".sticker-info strong")?.textContent||"Stigram Sticker";
   const url=image?.src;
   if(!url){window.toast?.("هذا الملصق غير متاح للتصدير");return}
   if(window.StigramNative?.requestStickerImport){window.StigramNative.requestStickerImport(url,title);return}
   const appLink="intent://import?url="+encodeURIComponent(url)+"&title="+encodeURIComponent(title)+"#Intent;scheme=stigram;package=com.stigram.stickers;S.browser_fallback_url="+encodeURIComponent("https://github.com/uday122t/Stigram/actions/runs/41150277319")+";end";
   location.href=appLink;
  };
  window.addStickerToTelegram=function(id){
   const card=document.querySelector('[data-sticker-id="'+CSS.escape(String(id))+'"]');
   const image=card?.querySelector(".sticker-image img");
   const title=card?.querySelector(".sticker-info strong")?.textContent||"Stigram Sticker";
   const url=image?.src;
   if(!url){window.toast?.("هذا الملصق غير متاح للتصدير");return}
   if(window.StigramNative?.requestTelegramImport){window.StigramNative.requestTelegramImport(JSON.stringify([url]),title);return}
   window.toast?.("استيراد الملصقات كحزمة Telegram يحتاج تطبيق Stigram للأندرويد");
  };
 }
 apply();
 const boot=()=>{addThemeUI();addCreateGuide();refresh();wrapPublish();installAction()};
 boot();document.addEventListener("click",()=>{setTimeout(boot,120)});
 window.addEventListener("load",boot);
})();
