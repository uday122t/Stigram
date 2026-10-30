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
    status.textContent = "جارٍ رفع GIF إلى تخزين Stigram الآمن...";
    let storagePath = "";
    try {
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
