/* Stigram: publish the selected animated GIF to GIPHY through the authenticated Edge Function. */
(() => {
  "use strict";
  const input = document.getElementById("imageFile");
  if (!input) return;

  const panel = document.createElement("section");
  panel.style.cssText = "margin:18px 0;padding:18px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(120deg,#171e2d,#20213a)";
  panel.innerHTML = `
    <h3 style="margin:0 0 6px">📲 انشر GIF على إنستغرام عبر GIPHY</h3>
    <p style="margin:0 0 13px;color:var(--muted);font-size:12px;line-height:1.8">
      ارفع ملف GIF متحرك إلى مكتبة GIPHY، وبعد معالجته يمكن أن يصبح قابلاً للبحث في ملصقات Instagram.
      يلزم حساب GIPHY وتطبيق معتمد لربط اسم قناة مستقل.
    </p>
    <button type="button" class="btn primary" id="giphyPublishBtn" style="width:100%">🚀 نشر GIF على GIPHY</button>
    <div id="giphyPublishStatus" style="font-size:12px;color:#9ddff0;margin-top:10px;min-height:18px">اختار ملف GIF متحرك من الأعلى أو أنشئ GIF أولاً ثم اضغط «استخدامه للنشر».</div>
    <div id="giphyPublishResult" style="margin-top:8px"></div>
    <p style="margin:10px 0 0;color:var(--muted);font-size:11px">مفتاح Beta الحالي يسمح بحد أقصى 10 عمليات رفع يومياً ولا يسمح بتعيين اسم قناة GIPHY خاص بكل حساب.</p>
  `;
  const maker = document.querySelector("#page-create .gif-maker");
  const toolbar = document.querySelector("#page-create .toolbar");
  if (maker) maker.insertAdjacentElement("afterend", panel);
  else if (toolbar) toolbar.insertAdjacentElement("afterend", panel);
  else return;

  const button = panel.querySelector("#giphyPublishBtn");
  const status = panel.querySelector("#giphyPublishStatus");
  const resultBox = panel.querySelector("#giphyPublishResult");
  const safeFileName = name => String(name || "stigram.gif").replace(/[^a-z0-9._-]/gi, "-").slice(0, 70);

  async function validateStickerGif(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 20) throw new Error("ملف GIF غير صالح أو فارغ.");
    let offset = 13;
    const screenPacked = bytes[10];
    if (screenPacked & 0x80) offset += 3 * (1 << ((screenPacked & 7) + 1));
    let frames = 0;
    let firstFrameTransparentFlag = false;
    let transparencyFlag = false;
    const skipBlocks = start => {
      let pos = start;
      while (pos < bytes.length) {
        const size = bytes[pos++];
        if (size === 0) return pos;
        pos += size;
        if (pos > bytes.length) throw new Error("ملف GIF تالف.");
      }
      throw new Error("ملف GIF غير مكتمل.");
    };
    while (offset < bytes.length) {
      const marker = bytes[offset++];
      if (marker === 0x3b) break;
      if (marker === 0x21) {
        const label = bytes[offset++];
        if (label === 0xf9) {
          const blockSize = bytes[offset++];
          if (blockSize !== 4 || offset + 5 > bytes.length) throw new Error("ملف GIF تالف.");
          transparencyFlag = (bytes[offset] & 1) === 1;
          offset += blockSize;
          if (bytes[offset] === 0) offset++;
        } else {
          offset = skipBlocks(offset);
        }
        continue;
      }
      if (marker === 0x2c) {
        if (frames === 0) firstFrameTransparentFlag = transparencyFlag;
        frames++;
        if (offset + 9 > bytes.length) throw new Error("ملف GIF تالف.");
        const imagePacked = bytes[offset + 8];
        offset += 9;
        if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 7) + 1));
        offset++;
        offset = skipBlocks(offset);
        transparencyFlag = false;
        continue;
      }
      throw new Error("ملف GIF غير مدعوم أو تالف.");
    }
    if (frames < 2) throw new Error("هذا GIF ثابت؛ ملصقات GIPHY لازم تحتوي على إطارين متحركين على الأقل.");
    if (!firstFrameTransparentFlag) throw new Error("الـGIF لا يحتوي على شفافية في الإطار الأول. لازم تكون الخلفية شفافة حتى يُصنّف كملصق.");
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const scale = Math.min(256 / bitmap.width, 256 / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(bitmap, (256 - width) / 2, (256 - height) / 2, width, height);
      const pixels = ctx.getImageData(0, 0, 256, 256).data;
      let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 250) transparent++;
      const percent = transparent / (256 * 256) * 100;
      if (percent < 20) throw new Error("الشفافية أقل من 20% في أول إطار. أزل الخلفية قبل النشر على Instagram.");
    } finally {
      bitmap.close?.();
    }
  }

  button.addEventListener("click", async () => {
    if (typeof sb === "undefined" || !sb || typeof user === "undefined" || !user) {
      status.textContent = "سجّل الدخول إلى Stigram أولاً حتى نقدر ننشر باسم حسابك.";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      status.textContent = "اختار GIF من خانة اختيار الصورة، أو أنشئ GIF واضغط «استخدامه للنشر».";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      status.textContent = "حجم الملف أكبر من 50MB. قلّل حجمه ثم أعد المحاولة.";
      return;
    }
    const signature = await file.slice(0, 6).text();
    if (!/^GIF8[79]a$/.test(signature)) {
      status.textContent = "الملف المختار ليس GIF متحركاً بصيغته الأصلية. ارفع ملف .gif.";
      return;
    }

    button.disabled = true;
    resultBox.replaceChildren();
    status.textContent = "جارٍ فحص الحركة والشفافية المطلوبة لملصقات GIPHY...";
    let storagePath = "";
    try {
      await validateStickerGif(file);
      status.textContent = "تم التحقق من الحركة والشفافية. جارٍ رفع GIF إلى تخزين Stigram...";
      const filename = safeFileName(file.name || "stigram.gif");
      storagePath = user.id + "/giphy-uploads/" + Date.now() + "-" + filename;
      const upload = await sb.storage.from("stigrams").upload(storagePath, file, {
        contentType: "image/gif",
        cacheControl: "3600",
        upsert: false
      });
      if (upload.error) throw new Error("تعذر رفع الملف إلى Stigram: " + upload.error.message);

      const publicUrl = sb.storage.from("stigrams").getPublicUrl(storagePath).data.publicUrl;
      const enteredTags = (document.getElementById("stickerTags")?.value || "")
        .split(",").map(tag => tag.trim()).filter(Boolean);
      const accountTag = user.user_metadata?.username;
      if (accountTag) enteredTags.unshift(accountTag);

      status.textContent = "وصل الملف. جارٍ إرساله إلى GIPHY...";
      const response = await sb.functions.invoke("giphy-upload", {
        body: { source_image_url: publicUrl, tags: enteredTags }
      });
      if (response.error) {
        let detail = response.error.message || "تعذر إكمال النشر";
        try {
          const context = response.error.context;
          if (context?.json) {
            const body = await context.json();
            if (body?.error) detail = body.error + (body.detail ? ": " + body.detail : "");
          }
        } catch {}
        throw new Error(detail);
      }
      const data = response.data || {};
      if (!data.success) throw new Error(data.error || "GIPHY لم يؤكد استلام الملف");
      status.textContent = data.message || "تم إرسال GIF إلى GIPHY بنجاح.";
      if (data.giphy_url) {
        const link = document.createElement("a");
        link.href = data.giphy_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "فتح GIF على GIPHY";
        link.style.cssText = "color:#9ddff0;font-weight:700";
        resultBox.append(link);
      }
      if (typeof toast === "function") toast("تم إرسال GIF إلى GIPHY");
    } catch (error) {
      status.textContent = error.message || "حدث خطأ أثناء رفع GIF.";
      if (typeof toast === "function") toast(status.textContent);
    } finally {
      button.disabled = false;
    }
  });
})();
