/* Stigram: turn a still image into a real animated GIF in-browser. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const input = $("imageFile");
  const canvas = $("editorCanvas");
  if (!input || !canvas) return;

  const style = document.createElement("style");
  style.textContent = `
    .gif-maker{margin:18px 0;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
    .gif-maker h3{margin:0 0 5px;font-size:17px}.gif-maker p{margin:0 0 14px;color:var(--muted);font-size:12px}
    .gif-maker .gif-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .gif-maker label{display:grid;gap:6px;color:var(--muted);font-size:12px}
    .gif-maker select,.gif-maker input{width:100%;padding:10px;border-radius:11px;background:var(--surface-strong);border:1px solid var(--line);color:var(--text)}
    .gif-maker .gif-preview{display:none;margin-top:14px;padding:10px;border-radius:14px;background:var(--surface-strong);text-align:center}
    .gif-maker .gif-preview img{max-width:100%;max-height:260px;object-fit:contain}
    .gif-maker .gif-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .gif-maker .gif-status{font-size:12px;color:var(--accent);margin-top:10px;min-height:18px}
    @media(max-width:520px){.gif-maker .gif-controls{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "gif-maker";
  panel.innerHTML = `
    <h3>🎞 حوّل صورتك إلى GIF متحرك</h3>
    <p>اختر صورة من الأعلى، وحدد الحركة، ثم صدّر ملف GIF فعلياً جاهزاً للنشر.</p>
    <div class="gif-controls">
      <label>تأثير الحركة
        <select id="gifEffect">
          <option value="float">طفو ناعم</option>
          <option value="bounce">قفزة</option>
          <option value="zoom">تكبير وتصغير</option>
          <option value="rotate">دوران</option>
          <option value="shake">اهتزاز</option>
          <option value="pulse">نبض</option>
        </select>
      </label>
      <label>سرعة الحركة
        <select id="gifSpeed">
          <option value="1.35">بطيئة</option>
          <option value="1" selected>طبيعية</option>
          <option value="0.72">سريعة</option>
        </select>
      </label>
      <label>مدة GIF
        <select id="gifDuration">
          <option value="2">ثانيتان</option>
          <option value="2.5" selected>2.5 ثانية</option>
          <option value="3">3 ثوانٍ</option>
        </select>
      </label>
      <label>جودة التصدير
        <select id="gifQuality">
          <option value="240">خفيف (240px)</option>
          <option value="320" selected>متوازن (320px)</option>
          <option value="400">أعلى (400px)</option>
        </select>
      </label>
    </div>
    <div class="gif-actions">
      <button type="button" class="btn primary" id="gifGenerate">✨ إنشاء GIF</button>
      <button type="button" class="btn" id="gifDownload" disabled>⬇ تنزيل GIF</button>
      <button type="button" class="btn" id="gifUse" disabled>استخدامه للنشر</button>
    </div>
    <div class="gif-status" id="gifStatus">ارفع صورة ثابتة أولاً لتفعيل التحويل.</div>
    <div class="gif-preview" id="gifPreview"><img id="gifPreviewImage" alt="معاينة GIF متحرك"></div>
  `;
  const toolbar = document.querySelector("#page-create .toolbar");
  if (toolbar) toolbar.insertAdjacentElement("afterend", panel);

  let resultBlob = null;
  let resultUrl = null;
  let resultFile = null;
  let busy = false;
  const status = $("gifStatus");
  const generate = $("gifGenerate");
  const download = $("gifDownload");
  const use = $("gifUse");

  function setStatus(message) { status.textContent = message; }

  function makePalette() {
    const palette = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      palette[i * 3] = Math.round(((i >> 5) & 7) * 255 / 7);
      palette[i * 3 + 1] = Math.round(((i >> 2) & 7) * 255 / 7);
      palette[i * 3 + 2] = Math.round((i & 3) * 255 / 3);
    }
    return palette;
  }

  function quantize(imageData) {
    const rgba = imageData.data;
    const indexed = new Uint8Array(imageData.width * imageData.height);
    for (let p = 0, i = 0; p < rgba.length; p += 4, i++) {
      if (rgba[p + 3] < 128) { indexed[i] = 0; continue; }
      let value = ((rgba[p] >> 5) << 5) | ((rgba[p + 1] >> 5) << 2) | (rgba[p + 2] >> 6);
      indexed[i] = value === 0 ? 1 : value;
    }
    return indexed;
  }

  function lzw(indices) {
    const clear = 256, end = 257;
    let codeSize = 9, nextCode = 258, dictionary = new Map();
    let bitBuffer = 0, bitCount = 0;
    const bytes = [];
    const writeCode = code => {
      bitBuffer |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        bytes.push(bitBuffer & 255);
        bitBuffer >>>= 8;
        bitCount -= 8;
      }
    };
    const reset = () => {
      dictionary = new Map();
      codeSize = 9;
      nextCode = 258;
    };
    writeCode(clear);
    if (!indices.length) { writeCode(end); if (bitCount) bytes.push(bitBuffer & 255); return new Uint8Array(bytes); }
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const value = indices[i];
      const key = prefix * 256 + value;
      const found = dictionary.get(key);
      if (found !== undefined) {
        prefix = found;
        continue;
      }
      writeCode(prefix);
      if (nextCode < 4096) {
        dictionary.set(key, nextCode++);
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        writeCode(clear);
        reset();
      }
      prefix = value;
    }
    writeCode(prefix);
    writeCode(end);
    if (bitCount) bytes.push(bitBuffer & 255);
    return new Uint8Array(bytes);
  }

  function makeGif(frames, width, height, delayMs) {
    const out = [];
    const push = (...values) => out.push(...values);
    const word = value => push(value & 255, (value >> 8) & 255);
    const ascii = value => { for (let i = 0; i < value.length; i++) push(value.charCodeAt(i)); };
    ascii("GIF89a");
    word(width); word(height);
    push(0xF7, 0, 0);
    push(...makePalette());
    push(0x21, 0xFF, 0x0B); ascii("NETSCAPE2.0");
    push(3, 1, 0, 0, 0);
    const delay = Math.max(2, Math.round(delayMs / 10));
    for (const frame of frames) {
      push(0x21, 0xF9, 4, 1); word(delay); push(0, 0);
      push(0x2C); word(0); word(0); word(width); word(height); push(0);
      push(8);
      const compressed = lzw(frame);
      for (let offset = 0; offset < compressed.length; offset += 255) {
        const part = compressed.subarray(offset, Math.min(offset + 255, compressed.length));
        push(part.length);
        for (let i = 0; i < part.length; i++) push(part[i]);
      }
      push(0);
    }
    push(0x3B);
    return new Blob([new Uint8Array(out)], { type: "image/gif" });
  }

  function drawFrame(ctx, image, width, height, progress, effect, baseRotation) {
    ctx.clearRect(0, 0, width, height);
    const fit = Math.min((width * 0.78) / image.width, (height * 0.78) / image.height);
    const baseW = image.width * fit, baseH = image.height * fit;
    const wave = Math.sin(progress * Math.PI * 2);
    let x = 0, y = 0, scale = 1, angle = baseRotation * Math.PI / 180;
    if (effect === "float") y = wave * height * 0.045;
    if (effect === "bounce") y = -Math.abs(wave) * height * 0.09;
    if (effect === "zoom") scale = 0.82 + (0.18 * (0.5 + 0.5 * wave));
    if (effect === "pulse") scale = 0.9 + (0.1 * (0.5 + 0.5 * wave));
    if (effect === "rotate") angle += progress * Math.PI * 2;
    if (effect === "shake") x = Math.sin(progress * Math.PI * 12) * width * 0.025;
    ctx.save();
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();
  }

  async function buildGif() {
    if (busy) return;
    if (typeof sourceImage === "undefined" || !sourceImage) {
      setStatus("ارفع صورة ثابتة من خانة اختيار الصورة أولاً.");
      return;
    }
    busy = true;
    generate.disabled = true;
    download.disabled = true;
    use.disabled = true;
    setStatus("جارٍ تجهيز إطارات الحركة...");
    try {
      const size = Number($("gifQuality").value);
      const duration = Number($("gifDuration").value);
      const speed = Number($("gifSpeed").value);
      const effect = $("gifEffect").value;
      const fps = 12;
      const count = Math.max(12, Math.round(duration * fps));
      const delay = 1000 / fps * speed;
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = size;
      frameCanvas.height = size;
      const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
      const frames = [];
      for (let i = 0; i < count; i++) {
        drawFrame(frameCtx, sourceImage, size, size, i / count, effect, typeof rot === "number" ? rot : 0);
        frames.push(quantize(frameCtx.getImageData(0, 0, size, size)));
        if (i % 4 === 0) {
          setStatus("تجهيز الإطارات: " + Math.round((i + 1) / count * 65) + "%");
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      setStatus("جارٍ ترميز ملف GIF...");
      await new Promise(resolve => setTimeout(resolve, 0));
      resultBlob = makeGif(frames, size, size, delay);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(resultBlob);
      resultFile = new File([resultBlob], "stigram-animated.gif", { type: "image/gif" });
      $("gifPreviewImage").src = resultUrl;
      $("gifPreview").style.display = "block";
      download.disabled = false;
      use.disabled = false;
      setStatus("جاهز! ملف GIF متحرك حقيقي · " + (resultBlob.size / 1024).toFixed(0) + " KB");
    } catch (error) {
      console.error("Stigram GIF export:", error);
      setStatus("تعذر إنشاء GIF: " + (error.message || "خطأ غير معروف"));
    } finally {
      busy = false;
      generate.disabled = false;
    }
  }

  generate.addEventListener("click", buildGif);
  download.addEventListener("click", () => {
    if (!resultBlob || !resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "stigram-animated.gif";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  use.addEventListener("click", () => {
    if (!resultFile) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(resultFile);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setStatus("تم تجهيز GIF في خانة النشر. اضغط «نشر الستيكر» لحفظه في حسابك.");
      const publish = $("publishBtn");
      if (publish) publish.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus("نزّل GIF ثم ارفعه من خانة اختيار الصورة.");
    }
  });

  input.addEventListener("change", () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = null; resultBlob = null; resultFile = null;
    $("gifPreview").style.display = "none";
    download.disabled = true; use.disabled = true;
    setStatus("تم تحميل الصورة. اختر تأثير الحركة، ثم اضغط «إنشاء GIF».");
  });
})();
