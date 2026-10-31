(() => {
  "use strict";

  const ROOT = document.documentElement;
  const STORAGE_KEY = "stigram_appearance_clean_v1";

  const DEFAULTS = Object.freeze({
    theme: "dark",
    palette: "midnight",
    accent: ""
  });

  const PALETTES = Object.freeze({
    midnight: ["#55C8FF", "#72E0B1"],
    purple: ["#A78BFA", "#F0ABFC"],
    cyan: ["#22D3EE", "#67E8F9"],
    emerald: ["#34D399", "#A3E635"],
    rose: ["#FB7185", "#F9A8D4"],
    sunset: ["#FB923C", "#F472B6"],
    arctic: ["#60A5FA", "#A5F3FC"],
    graphite: ["#A1A1AA", "#D4D4D8"],
    ocean: ["#38BDF8", "#2DD4BF"],
    crimson: ["#F87171", "#FDA4AF"]
  });

  const PALETTE_NAMES = Object.freeze({
    midnight: "Midnight Blue",
    purple: "Purple Nebula",
    cyan: "Cyber Cyan",
    emerald: "Emerald Glass",
    rose: "Rose Quartz",
    sunset: "Sunset",
    arctic: "Arctic",
    graphite: "Graphite",
    ocean: "Ocean",
    crimson: "Crimson"
  });

  const isHex = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  let settings = readSettings();

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return { ...DEFAULTS };
      return {
        theme: ["dark", "light", "system"].includes(saved.theme) ? saved.theme : DEFAULTS.theme,
        palette: (saved.palette === "custom" || PALETTES[saved.palette]) ? saved.palette : DEFAULTS.palette,
        accent: isHex(saved.accent) ? saved.accent.toUpperCase() : ""
      };
    } catch (error) {
      console.warn("Stigram appearance settings could not be read:", error);
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    try {
      const value = JSON.stringify(settings);
      localStorage.setItem(STORAGE_KEY, value);
      return localStorage.getItem(STORAGE_KEY) === value;
    } catch (error) {
      console.error("Stigram appearance settings could not be saved:", error);
      return false;
    }
  }

  function resolvedTheme() {
    if (settings.theme !== "system") return settings.theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function lighten(hex, amount = 0.42) {
    const number = parseInt(hex.slice(1), 16);
    const channels = [number >> 16, (number >> 8) & 255, number & 255];
    return "#" + channels.map(channel =>
      Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, "0")
    ).join("").toUpperCase();
  }

  function hexToHsv(hex) {
    const number = parseInt(hex.slice(1), 16);
    const r = ((number >> 16) & 255) / 255;
    const g = ((number >> 8) & 255) / 255;
    const b = (number & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;

    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
  }

  function hsvToHex(h, s, v) {
    h = Math.max(0, Math.min(360, Number(h))) % 360;
    s = Math.max(0, Math.min(100, Number(s))) / 100;
    v = Math.max(0, Math.min(100, Number(v))) / 100;

    const chroma = v * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - chroma;
    let rgb;

    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];

    return "#" + rgb.map(channel =>
      Math.round((channel + m) * 255).toString(16).padStart(2, "0")
    ).join("").toUpperCase();
  }

  function selectedColor() {
    if (settings.palette === "custom" && isHex(settings.accent)) return settings.accent;
    return (PALETTES[settings.palette] || PALETTES.midnight)[0];
  }

  function updatePicker(hex) {
    const hue = document.getElementById("customHue");
    const saturation = document.getElementById("customSat");
    const value = document.getElementById("customVal");
    const code = document.getElementById("customHex");
    const preview = document.getElementById("customColorPreview");
    if (!hue || !saturation || !value || !code || !preview || !isHex(hex)) return;

    const hsv = hexToHsv(hex);
    hue.value = Math.round(hsv.h);
    saturation.value = Math.round(hsv.s);
    value.value = Math.round(hsv.v);
    code.value = hex.toUpperCase();
    saturation.style.setProperty("--picker-hue", hsvToHex(hsv.h, 100, 100));
    value.style.setProperty("--picker-full", hsvToHex(hsv.h, hsv.s, 100));
    preview.style.backgroundColor = hex;
  }

  function updateAppearance(shouldSave = true, syncPicker = true) {
    if (!PALETTES[settings.palette] && settings.palette !== "custom") {
      settings.palette = DEFAULTS.palette;
    }
    if (!["dark", "light", "system"].includes(settings.theme)) {
      settings.theme = DEFAULTS.theme;
    }
    if (settings.palette === "custom" && !isHex(settings.accent)) {
      settings.palette = DEFAULTS.palette;
      settings.accent = "";
    }

    const palette = PALETTES[settings.palette] || PALETTES.midnight;
    const primary = settings.palette === "custom" ? settings.accent : (settings.accent || palette[0]);
    const secondary = settings.palette === "custom" ? lighten(primary) : palette[1];

    ROOT.dataset.theme = resolvedTheme();
    ROOT.dataset.appearance = settings.theme;
    ROOT.dataset.palette = settings.palette;
    ROOT.style.setProperty("--accent", primary, "important");
    ROOT.style.setProperty("--accent2", secondary, "important");

    if (shouldSave) saveSettings();
    refreshAppearanceControls(syncPicker);
  }

  function refreshAppearanceControls(syncPicker = true) {
    document.querySelectorAll("#themeMenu [data-mode]").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === settings.theme);
    });
    document.querySelectorAll("#themeMenu [data-palette]").forEach(button => {
      button.classList.toggle("active", button.dataset.palette === settings.palette);
    });
    if (syncPicker) updatePicker(selectedColor());
  }

  function setCustomColor(hex, syncPicker = true) {
    if (!isHex(hex)) return false;
    settings.palette = "custom";
    settings.accent = hex.toUpperCase();
    updateAppearance(true, syncPicker);
    return true;
  }

  function updateColorFromSliders() {
    const hue = document.getElementById("customHue");
    const saturation = document.getElementById("customSat");
    const value = document.getElementById("customVal");
    if (!hue || !saturation || !value) return;
    const hex = hsvToHex(hue.value, saturation.value, value.value);
    setCustomColor(hex, false);
    const code = document.getElementById("customHex");
    const preview = document.getElementById("customColorPreview");
    if (code) code.value = hex;
    if (preview) preview.style.backgroundColor = hex;
  }


  function applyThemeMenuLanguage() {
    const english = localStorage.getItem("stigram_language_v1") === "en";
    const words = english ? {
      trigger: "◐ Appearance", head: "Appearance & customization",
      sub: "Choose your Stigram look", live: "● Live",
      mode: "Interface mode", dark: "Dark", light: "Light", system: "System",
      palettes: "Color palettes", custom: "Custom color",
      hue: "Hue", sat: "Saturation", val: "Value / brightness",
      reset: "Reset", done: "✓ Done", note: "Your choices are saved automatically"
    } : {
      trigger: "◐ المظهر", head: "المظهر والتخصيص",
      sub: "اختار شكل Stigram واحفظه", live: "● مباشر",
      mode: "نمط الواجهة", dark: "داكن", light: "فاتح", system: "حسب الجهاز",
      palettes: "لوحات الألوان", custom: "اختيار اللون بدقة",
      hue: "درجة اللون", sat: "التشبع", val: "القيمة / السطوع",
      reset: "إعادة ضبط", done: "✓ تم", note: "اختياراتك محفوظة تلقائياً"
    };
    const trigger = document.getElementById("appearanceButton");
    if (trigger) trigger.textContent = words.trigger;
    const menu = document.getElementById("themeMenu");
    if (!menu) return;
    const head = menu.querySelector(".theme-menu-head strong");
    const sub = menu.querySelector(".theme-menu-head small");
    const live = menu.querySelector(".theme-live-dot");
    const strongs = menu.querySelectorAll(":scope > strong");
    if (head) head.textContent = words.head;
    if (sub) sub.textContent = words.sub;
    if (live) live.textContent = words.live;
    if (strongs[0]) strongs[0].textContent = words.mode;
    if (strongs[1]) strongs[1].textContent = words.palettes;
    const modes = menu.querySelectorAll("[data-mode]");
    if (modes[0]) modes[0].textContent = words.dark;
    if (modes[1]) modes[1].textContent = words.light;
    if (modes[2]) modes[2].textContent = words.system;
    const custom = menu.querySelector(".custom-picker > strong");
    if (custom) custom.textContent = words.custom;
    const labels = menu.querySelectorAll(".custom-picker label");
    if (labels[0]) labels[0].childNodes[0].textContent = words.hue + " ";
    if (labels[1]) labels[1].childNodes[0].textContent = words.sat + " ";
    if (labels[2]) labels[2].childNodes[0].textContent = words.val + " ";
    const reset = menu.querySelector("#resetAppearance");
    const done = menu.querySelector("#finishThemeCustomization");
    const note = menu.querySelector("#themeSaveNote");
    if (reset) reset.textContent = words.reset;
    if (done) done.textContent = words.done;
    if (note) note.textContent = words.note;
    menu.querySelectorAll("[data-palette]").forEach(button => {
      const key = button.dataset.palette;
      const englishNames = PALETTE_NAMES;
      const arabicNames = {
        midnight: "أزرق منتصف الليل", purple: "سديم بنفسجي", cyan: "سماوي سيبراني",
        emerald: "زجاج زمردي", rose: "كوارتز وردي", sunset: "غروب",
        arctic: "قطبي", graphite: "غرافيت", ocean: "محيط", crimson: "قرمزي"
      };
      button.lastChild.textContent = english ? englishNames[key] : arabicNames[key];
    });
  }

  function buildAppearanceMenu() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || document.getElementById("appearanceButton")) return;

    const trigger = document.createElement("button");
    trigger.id = "appearanceButton";
    trigger.type = "button";
    trigger.className = "btn appearance-trigger";
    trigger.textContent = "◐ المظهر";

    const menu = document.createElement("section");
    menu.id = "themeMenu";
    menu.innerHTML =
      '<div class="theme-menu-head"><div><strong>المظهر والتخصيص</strong><small>اختار شكل Stigram واحفظه</small></div><span class="theme-live-dot">● مباشر</span></div>' +
      '<strong>نمط الواجهة</strong><div class="theme-row" id="appearanceModes">' +
        '<button type="button" class="theme-choice" data-mode="dark">داكن</button>' +
        '<button type="button" class="theme-choice" data-mode="light">فاتح</button>' +
        '<button type="button" class="theme-choice" data-mode="system">حسب الجهاز</button></div>' +
      '<strong>لوحات الألوان</strong><div class="theme-row" id="paletteChoices">' +
        Object.entries(PALETTE_NAMES).map(([key, name]) =>
          '<button type="button" class="theme-choice" data-palette="' + key + '">' +
          '<i class="theme-dot" style="background:' + PALETTES[key][0] + '"></i>' + name + '</button>'
        ).join("") +
      '</div>' +
      '<div class="custom-picker"><strong>اختيار اللون بدقة</strong>' +
        '<div class="custom-picker-preview"><span id="customColorPreview"></span>' +
        '<input id="customHex" type="text" maxlength="7" value="' + selectedColor() + '" aria-label="رمز اللون HEX"></div>' +
        '<label>درجة اللون <input id="customHue" class="color-range hue-range" type="range" min="0" max="360" value="195"></label>' +
        '<label>التشبع <input id="customSat" class="color-range sat-range" type="range" min="0" max="100" value="65"></label>' +
        '<label>القيمة / السطوع <input id="customVal" class="color-range val-range" type="range" min="0" max="100" value="100"></label>' +
      '</div>' +
      '<div class="theme-footer"><button type="button" class="theme-choice" id="resetAppearance">إعادة ضبط</button>' +
      '<button type="button" class="btn primary" id="finishThemeCustomization"><span aria-hidden="true">✓</span> تم</button></div>' +
      '<p class="theme-save-note" id="themeSaveNote">اختياراتك محفوظة تلقائياً</p>';

    topbar.appendChild(trigger);
    document.body.appendChild(menu);

    const finishButton = menu.querySelector("#finishThemeCustomization");
    finishButton.addEventListener("click", () => {
      try {
        const snapshot = JSON.stringify({
          theme: settings.theme,
          palette: settings.palette,
          accent: settings.accent
        });
        localStorage.setItem(STORAGE_KEY, snapshot);
        if (localStorage.getItem(STORAGE_KEY) !== snapshot) {
          throw new Error("Appearance settings verification failed");
        }
        updateAppearance(false);
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
        window.location.reload();
      } catch (error) {
        console.error("Could not finish appearance customization:", error);
        const note = menu.querySelector("#themeSaveNote");
        if (note) note.textContent = "تعذر تثبيت المظهر — حاول مرة ثانية";
      }
    });

    trigger.setAttribute("aria-controls", "themeMenu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    menu.addEventListener("click", event => {
      const modeButton = event.target.closest("[data-mode]");
      const paletteButton = event.target.closest("[data-palette]");

      if (modeButton) {
        settings.theme = modeButton.dataset.mode;
        updateAppearance(true);
        return;
      }

      if (paletteButton) {
        settings.palette = paletteButton.dataset.palette;
        settings.accent = "";
        updateAppearance(true);
        return;
      }

      if (event.target.closest("#resetAppearance")) {
        settings = { ...DEFAULTS };
        updateAppearance(true);
        const note = document.getElementById("themeSaveNote");
        if (note) note.textContent = "تمت إعادة الإعدادات الافتراضية وحفظها";
        return;
      }

    });

    ["customHue", "customSat", "customVal"].forEach(id => {
      const slider = menu.querySelector("#" + id);
      slider.addEventListener("input", updateColorFromSliders);
    });

    menu.querySelector("#customHex").addEventListener("change", event => {
      const value = event.currentTarget.value.trim();
      if (!setCustomColor(value)) {
        event.currentTarget.value = selectedColor();
        const note = document.getElementById("themeSaveNote");
        if (note) note.textContent = "اكتب لون HEX صحيح مثل #55C8FF";
      }
    });

    updatePicker(selectedColor());
    applyThemeMenuLanguage();
    window.addEventListener("stigram:language", applyThemeMenuLanguage);

    document.addEventListener("click", event => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) {
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function installStickerActions() {
    function openPackBuilder(stickerId, platform) {
      const profileTab = document.querySelector('[data-page="profile"]');
      if (profileTab) profileTab.click();

      window.setTimeout(() => {
        const panel = document.getElementById("androidPackPanel");
        if (!panel) {
          window.toast?.("افتح ملفك الشخصي بعد تسجيل الدخول لتجهيز الحزمة");
          return;
        }

        panel.scrollIntoView({ behavior: "smooth", block: "start" });
        const selector = 'input[data-sticker-id="' + CSS.escape(String(stickerId)) + '"]';
        const checkbox = panel.querySelector(selector);

        if (!checkbox) {
          window.toast?.("هذا الملصق غير موجود ضمن ملصقات حسابك");
          return;
        }

        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }

        if (platform === "telegram") {
          window.setTimeout(() => document.getElementById("sendTelegramPack")?.click(), 120);
        } else {
          window.toast?.("تم تحديد الملصق — اختار ملصقين إضافيين على الأقل ثم اضغط إضافة إلى WhatsApp");
        }
      }, 260);
    }

    window.addStickerToWhatsApp = id => openPackBuilder(id, "whatsapp");
    window.addStickerToTelegram = id => openPackBuilder(id, "telegram");
  }

  function start() {
    buildAppearanceMenu();
    installStickerActions();
    document.getElementById("firstCreateGuide")?.remove();
  }

  updateAppearance(false);
  start();
  window.addEventListener("load", start);

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
      if (settings.theme === "system") updateAppearance(false);
    });
  }
})();