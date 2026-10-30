/* Stigram sharing routes: WhatsApp packs are prepared on the website and handed to the Android helper app.
   Instagram sticker publishing is handled by the animated GIPHY workflow, not by sharing a still image. */
(() => {
  "use strict";
  const toolbar = document.querySelector("#page-create .toolbar");
  if (toolbar && !document.getElementById("whatsappPackShortcut")) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "whatsappPackShortcut";
    button.className = "btn small";
    button.textContent = "📦 حزمة WhatsApp";
    button.title = "اختر 3 إلى 30 ملصقاً من ملفك ثم أرسلها إلى تطبيق Stigram Stickers";
    button.addEventListener("click", () => {
      document.querySelector('[data-page="profile"]')?.click();
      setTimeout(() => {
        const panel = document.getElementById("androidPackPanel");
        panel?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (!panel) window.toast?.("افتح ملفك الشخصي بعد تسجيل الدخول لتجهيز حزمة WhatsApp");
      }, 180);
    });
    toolbar.appendChild(button);
  }
})();