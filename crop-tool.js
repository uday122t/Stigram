/* Stigram crop tool: drag a rectangle over the preview and apply it. */
(() => {
  "use strict";
  const canvas=document.getElementById("editorCanvas");
  const preview=document.querySelector("#page-create .editor-preview");
  if(!canvas||!preview)return;
  const ctx=canvas.getContext("2d");
  const style=document.createElement("style");
  style.textContent=".crop-tools{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.crop-tools .active{border-color:var(--accent)!important;background:color-mix(in srgb,var(--accent) 19%,transparent)!important}.crop-help{font-size:12px;color:var(--muted);margin:5px 0 10px}";
  document.head.appendChild(style);
  const panel=document.createElement("section");
  panel.innerHTML='<div class="crop-head"><strong>أداة القص</strong><span>حدد الجزء الذي تريد الاحتفاظ به</span></div><div class="crop-tools"><button type="button" class="btn primary" id="cropStart">✂️ ابدأ القص</button><button type="button" class="btn" id="cropApply" disabled>اعتماد</button><button type="button" class="btn" id="cropCancel" disabled>إلغاء</button></div><div class="crop-help" id="cropHelp">اسحب بإصبعك فوق الصورة لتحديد إطار القص مثل أداة قص الشاشة.</div>';
  preview.insertAdjacentElement("afterend",panel);
  const $=id=>document.getElementById(id);
  let active=false,dragging=false,start=null,rect=null;
  const point=e=>{const b=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width,(e.clientX-b.left)*canvas.width/b.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-b.top)*canvas.height/b.height))}};
  function redraw(){if(typeof drawCanvas==="function")drawCanvas();if(rect){ctx.save();const accent=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()||"#55c8df";ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);ctx.fillStyle=accent+"22";ctx.fillRect(rect.x,rect.y,rect.w,rect.h);ctx.restore()}}
  $("cropStart").onclick=()=>{if(!sourceImage){toast("ارفع صورة أولاً");return}if(typeof eraseMode!=="undefined")eraseMode=false;active=true;rect=null;$("cropStart").classList.add("active");$("cropApply").disabled=true;$("cropCancel").disabled=false;$("cropHelp").textContent="اسحب فوق الصورة لتحديد الجزء الذي تريد الاحتفاظ به.";canvas.style.cursor="crosshair"};
  $("cropCancel").onclick=()=>{active=false;dragging=false;rect=null;$("cropStart").classList.remove("active");$("cropApply").disabled=true;$("cropCancel").disabled=true;canvas.style.cursor="";redraw()};
  canvas.addEventListener("pointerdown",e=>{if(!active)return;e.preventDefault();dragging=true;start=point(e);rect={x:start.x,y:start.y,w:0,h:0};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(!active||!dragging)return;const p=point(e);rect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};redraw()});
  canvas.addEventListener("pointerup",()=>{if(!active||!dragging)return;dragging=false;if(rect.w>8&&rect.h>8){$("cropApply").disabled=false;$("cropHelp").textContent="المنطقة محددة. اضغط اعتماد القص لتطبيقها."; }else{rect=null;redraw()}});
  $("cropApply").onclick=()=>{if(!rect||!sourceImage)return;const x=Math.round(rect.x),y=Math.round(rect.y),w=Math.round(rect.w),h=Math.round(rect.h);const out=document.createElement("canvas");out.width=w;out.height=h;out.getContext("2d").drawImage(canvas,x,y,w,h,0,0,w,h);const img=new Image();img.onload=()=>{sourceImage=img;rot=0;active=false;rect=null;$("cropStart").classList.remove("active");$("cropApply").disabled=true;$("cropCancel").disabled=true;canvas.style.cursor="";drawCanvas();toast("تم قص الملصق بنجاح")};img.src=out.toDataURL("image/png")};
})();
