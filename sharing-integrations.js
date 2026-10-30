/* Stigram sharing helpers for Instagram and WhatsApp. */
(() => {
  "use strict";
  const toast = message => {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 3200);
  };
  const safeName = value => String(value || "stigram-sticker").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 48) || "stigram-sticker";

  async function fetchMedia(url) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("تعذر تحميل الملف");
    return response.blob();
  }

  async function makeWhatsAppWebP(url, title) {
    const blob = await fetchMedia(url);
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      const webp = await new Promise((resolve, reject) => canvas.toBlob(file => file ? resolve(file) : reject(new Error("المتصفح لم يدعم WebP")), "image/webp", 0.9));
      return new File([webp], safeName(title) + ".webp", { type: "image/webp" });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function shareFile(file, title, text) {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return true;
    }
    return false;
  }

  async function instagram(url, title) {
    try {
      const blob = await fetchMedia(url);
      const type = blob.type || (url.toLowerCase().includes(".gif") ? "image/gif" : "image/png");
      const ext = type.includes("gif") ? "gif" : type.includes("webp") ? "webp" : "png";
      const file = new File([blob], safeName(title) + "." + ext, { type });
      if (await shareFile(file, title, "ملصق من Stigram")) {
        toast("اختار Instagram من قائمة المشاركة لإرسال الملف");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      window.open("https://www.instagram.com/", "_blank", "noopener");
      toast("نزّلنا الملف وفتحنا Instagram؛ أضفه من داخل التطبيق");
    } catch (error) {
      window.open("https://www.instagram.com/", "_blank", "noopener");
      toast("فتحنا Instagram. تعذر تجهيز الملف تلقائياً من مصدره.");
    }
  }

  async function whatsapp(url, title) {
    try {
      const file = await makeWhatsAppWebP(url, title);
      if (await shareFile(file, title, "ملصق جاهز للتحويل إلى حزمة WhatsApp من Stigram")) {
        toast("تم فتح المشاركة. ملاحظة: الملف WebP؛ إضافته كملصق ضمن حزمة يتطلب تطبيق حزم ملصقات");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
      toast("تم تنزيل WebP بمقاس 512×512. أضفه إلى حزمة ملصقات واتساب عبر تطبيق حزم ملصقات");
    } catch (error) {
      toast("تعذر تجهيز WebP. قد يكون مصدر الصورة يمنع التنزيل المباشر.");
    }
  }

  function addButtons(card) {
    if (card.dataset.stigramShareReady === "1") return;
    const actions = card.querySelector(".card-actions");
    const image = card.querySelector(".sticker-image img");
    if (!actions || !image || !image.src) return;
    card.dataset.stigramShareReady = "1";
    const title = card.querySelector(".sticker-info strong")?.textContent?.trim() || "Stigram sticker";
    const ig = document.createElement("button");
    ig.type = "button";
    ig.className = "icon-btn";
    ig.textContent = "Instagram";
    ig.title = "مشاركة الملف إلى Instagram";
    ig.addEventListener("click", () => instagram(image.currentSrc || image.src, title));
    const wa = document.createElement("button");
    wa.type = "button";
    wa.className = "icon-btn";
    wa.textContent = "WhatsApp";
    wa.title = "تجهيز WebP لملصقات WhatsApp";
    wa.addEventListener("click", () => whatsapp(image.currentSrc || image.src, title));
    actions.append(ig, wa);
  }

  function scan(root) {
    if (root.matches?.(".sticker-card")) addButtons(root);
    root.querySelectorAll?.(".sticker-card").forEach(addButtons);
  }
  scan(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) scan(node);
  }))).observe(document.body, { childList: true, subtree: true });
})();