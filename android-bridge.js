/* Website -> Android Stigram Stickers bridge.
   The website remains the editor; Android only receives a selected pack and installs it in WhatsApp. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let ownStickers = [];
  const selected = new Set();

  function addPanel() {
    const profile = $("page-profile");
    if (!profile || $("androidPackPanel")) return;
    const panel = document.createElement("section");
    panel.id = "androidPackPanel";
    panel.style.cssText = "margin-top:18px;padding:18px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(120deg,#171e2d,#132b38)";
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div><h3 style="margin:0">📲 حزمة WhatsApp من الموقع</h3>
        <p style="margin:5px 0 0;color:var(--muted);font-size:12px">اختار من 3 إلى 30 ملصقاً من منشوراتك، ثم أرسلها لتطبيق Stigram Stickers لإضافتها كحزمة واتساب.</p></div>
        <button class="btn" id="refreshAndroidPack" type="button">تحديث</button>
      </div>
      <div id="androidPackList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:9px;margin:14px 0">
        <div class="empty">سجّل الدخول لعرض ملصقاتك</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <small id="androidPackCount" style="color:var(--muted)">0 من 30 محدد</small>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="sendAndroidPack" type="button" disabled>إضافة إلى WhatsApp</button><button class="btn" id="sendTelegramPack" type="button" disabled>إضافة إلى Telegram</button></div>
      </div>
      <p style="margin:10px 0 0;color:var(--muted);font-size:11px">هذه النسخة ترسل الملصقات الثابتة فقط. ملفات GIF المتحركة تحتاج دعم الحزم المتحركة بشكل منفصل.</p>`;
    const gif = $("gifIdentity");
    if (gif?.parentNode) gif.insertAdjacentElement("afterend", panel); else profile.prepend(panel);
    $("refreshAndroidPack").addEventListener("click", loadOwnStickers);
    $("sendAndroidPack").addEventListener("click", sendPack);
    $("sendTelegramPack").addEventListener("click", sendTelegramPack);
    $("androidPackList").addEventListener("change", event => {
      const input = event.target.closest("input[data-sticker-id]");
      if (!input) return;
      if (input.checked) {
        if (selected.size >= 30) { input.checked = false; window.toast?.("الحد الأعلى للحزمة 30 ملصقاً"); return; }
        selected.add(input.dataset.stickerId);
      } else selected.delete(input.dataset.stickerId);
      updateCount();
    });
    loadOwnStickers();
  }

  function updateCount() {
    const count = $("androidPackCount");
    const button = $("sendAndroidPack");
    if (count) count.textContent = selected.size + " من 30 محدد (الحد الأدنى 3)";
    if (button) button.disabled = selected.size < 3 || selected.size > 30;
    const telegramButton = $("sendTelegramPack");
    if (telegramButton) telegramButton.disabled = selected.size < 1 || selected.size > 50;
  }

  async function loadOwnStickers() {
    const list = $("androidPackList");
    if (!list) return;
    if (typeof user === "undefined" || !user || typeof sb === "undefined" || !sb) {
      list.innerHTML = '<div class="empty">سجّل الدخول أولاً لعرض ملصقات حسابك</div>';
      updateCount();
      return;
    }
    list.innerHTML = '<div class="empty">جارٍ تحميل ملصقاتك...</div>';
    const result = await sb.from("stickers")
      .select("id,title,media_url,media_type")
      .eq("user_id", user.id)
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .limit(100);
    if (result.error) {
      list.innerHTML = '<div class="empty">تعذر تحميل الملصقات: ' + esc(result.error.message) + '</div>';
      return;
    }
    ownStickers = result.data || [];
    const valid = new Set(ownStickers.map(item => item.id));
    [...selected].forEach(id => { if (!valid.has(id)) selected.delete(id); });
    list.innerHTML = ownStickers.length ? ownStickers.map(item => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--line);border-radius:13px;background:#0e1420;min-width:0;cursor:pointer">
        <input type="checkbox" data-sticker-id="${esc(item.id)}" ${selected.has(item.id) ? "checked" : ""} style="accent-color:#8b7cff">
        <img src="${esc(item.media_url)}" alt="" loading="lazy" style="width:48px;height:48px;object-fit:contain;background:#20283a;border-radius:9px">
        <span style="font-size:11px;overflow-wrap:anywhere">${esc(item.title || "ملصق")}</span>
      </label>`).join("") : '<div class="empty">ما عندك ملصقات ثابتة منشورة بعد</div>';
    updateCount();
  }

  async function toWebp(item, index) {
    const response = await fetch(item.media_url, { mode: "cors" });
    if (!response.ok) throw new Error("تعذر تحميل الملصق: " + (item.title || index + 1));
    const blob = await response.blob();
    const source = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d", { alpha: true });
      const scale = Math.min(512 / image.naturalWidth, 512 / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
      const webp = await new Promise((resolve, reject) => canvas.toBlob(file => file ? resolve(file) : reject(new Error("فشل تحويل WebP")), "image/webp", 0.88));
      const safe = String(item.title || "sticker").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 36) || "sticker";
      return new File([webp], safe + "-" + (index + 1) + ".webp", { type: "image/webp" });
    } finally { URL.revokeObjectURL(source); }
  }


  async function sendTelegramPack() {
    const button = $("sendTelegramPack");
    const pack = ownStickers.filter(item => selected.has(item.id));
    if (!pack.length || pack.length > 50) return;
    if (!window.StigramNative?.requestTelegramImport) {
      window.toast?.("استيراد الملصقات كحزمة Telegram يحتاج تطبيق Stigram للأندرويد");
      return;
    }
    button.disabled = true;
    button.textContent = "جارٍ تجهيز Telegram...";
    try {
      const title = "Stigram " + (user?.user_metadata?.username || user?.email?.split("@")[0] || "Stickers");
      window.StigramNative.requestTelegramImport(JSON.stringify(pack.map(item => item.media_url)), title);
    } catch (error) {
      window.toast?.(error.message || "تعذر تجهيز حزمة Telegram");
    } finally {
      button.textContent = "إضافة إلى Telegram";
      updateCount();
    }
  }

  async function sendPack() {
    const button = $("sendAndroidPack");
    if (selected.size < 3 || selected.size > 30) return;
    const pack = ownStickers.filter(item => selected.has(item.id));
    if (pack.length !== selected.size) { window.toast?.("حدّث القائمة ثم أعد تحديد الملصقات"); return; }
    button.disabled = true;
    button.textContent = "جارٍ تجهيز الحزمة...";
    try {
      const files = [];
      for (let i = 0; i < pack.length; i++) files.push(await toWebp(pack[i], i));
      if (!navigator.share || !navigator.canShare || !navigator.canShare({ files })) {
        files.forEach(file => {
          const url = URL.createObjectURL(file), a = document.createElement("a");
          a.href = url; a.download = file.name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        });
        window.toast?.("المتصفح لا يدعم إرسال مجموعة ملفات للتطبيق؛ تم تنزيل الملصقات بصيغة WebP");
        return;
      }
      await navigator.share({ files, title: "Stigram WhatsApp sticker pack", text: "ملصقات من موقع Stigram" });
      window.toast?.("اختار Stigram Stickers من قائمة المشاركة؛ التطبيق سيحوّلها إلى حزمة واتساب");
    } catch (error) {
      if (error?.name !== "AbortError") window.toast?.(error.message || "تعذر إرسال الحزمة");
    } finally {
      button.textContent = "إرسال الحزمة إلى التطبيق ←";
      updateCount();
    }
  }

  const start = () => {
    addPanel();
    if (typeof user !== "undefined" && user && typeof sb !== "undefined" && sb) loadOwnStickers();
  };
  start();
  document.querySelectorAll('[data-page="profile"]').forEach(button => button.addEventListener("click", () => setTimeout(start, 80)));
  const previousProfile = window.profile;
  if (typeof previousProfile === "function") {
    window.profile = function(...args) { const result = previousProfile.apply(this, args); setTimeout(start, 80); return result; };
  }
  if (typeof sb !== "undefined" && sb?.auth) sb.auth.onAuthStateChange(() => setTimeout(start, 150));
})();