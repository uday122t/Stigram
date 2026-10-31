(()=>{"use strict";
const input=document.getElementById("searchInput"),panel=document.getElementById("searchResults");
if(!input||!panel)return;
let timer=null,seq=0;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function show(rows){panel.innerHTML=rows.length?rows.map(p=>'<div class="search-result" data-user-id="'+esc(p.id)+'" data-user-name="'+esc(p.display_name||p.username||"عضو")+'"><div class="result-avatar">'+esc((p.display_name||p.username||"S").slice(0,1).toUpperCase())+'</div><div><strong>'+esc(p.display_name||p.username||"عضو")+'</strong><small>@'+esc(p.username||"user")+' · حساب</small></div></div>').join(""):'<div class="search-result"><div>ما لقينا حسابات مطابقة</div></div>';panel.hidden=false}
input.addEventListener("input",()=>{
 clearTimeout(timer);const term=input.value.trim(),id=++seq;
 if(!term){panel.hidden=true;return}
 timer=setTimeout(async()=>{
  const local=[].filter(x=>(x.username+" "+x.display_name).toLowerCase().includes(term.toLowerCase()));
  try{
   const client=(typeof sb!=="undefined"?sb:null);
   if(!client){panel.hidden=true;return}
   const safe=term.replace(/[,%()]/g," ").trim();
   if(!safe){panel.hidden=true;return}
   const q=await client.from("profiles").select("id,username,display_name").or("username.ilike.%"+safe+"%,display_name.ilike.%"+safe+"%").limit(6);
   if(id!==seq)return;
   const rows=q.error?local:q.data||[];
   show(rows);
  }catch(_){if(id===seq)show(local)}
 },260);
});
panel.addEventListener("click",async e=>{
 const row=e.target.closest("[data-user-id]");if(!row)return;
 const uid=row.dataset.userId,name=row.dataset.userName;
 panel.hidden=true;input.value=name;
 const client=window.sb||null;if(!client)return;
 try{
  const q=await client.from("stickers").select("*").eq("user_id",uid).eq("is_public",true).order("created_at",{ascending:false}).limit(50);
  if(q.error)throw q.error;
  const mapped=(q.data||[]).map(x=>({id:x.id,title:x.title,category:x.tags?.[0]||"ستيكر",owner:name,url:x.media_url,cloud:true,visibility:"public"}));
  items=[...mapped,...items.filter(x=>x.owner!==name)];
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  document.getElementById("page-explore")?.classList.add("active");
  document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page==="explore"));
  const grid=document.getElementById("exploreGrid");
  if(grid)grid.innerHTML=mapped.length?mapped.map(x=>card(x)).join(""):'<div class="empty">هذا الحساب ما عنده ملصقات عامة لسه</div>';
 }catch(err){toast("تعذر تحميل الحساب: "+(err.message||"خطأ"))}
});
document.addEventListener("click",e=>{if(!panel.contains(e.target)&&!e.target.closest(".search"))panel.hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape")panel.hidden=true});
document.getElementById("firstCreateGuide")?.remove();
})();