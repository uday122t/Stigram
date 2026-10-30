/* Live GIPHY search and trending for Stigram Explore. */
(() => {
  const $ = id => document.getElementById(id);
  const endpoint = "https://byxweuscwnbucqtfsshv.supabase.co/functions/v1/giphy-public-config";
  const grid = $("giphyGrid"), state = $("giphyState"), input = $("giphySearch");
  if (!grid || !state || !input) return;
  let apiKey = "", timer = null, requestNo = 0;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const showError = message => { state.textContent = "غير متصل"; grid.innerHTML = '<div class="empty">' + esc(message) + '</div>'; };
  async function load(query = "") {
    if (!apiKey) return;
    const thisRequest = ++requestNo;
    state.textContent = query ? "جارٍ البحث..." : "الأكثر تداولاً";
    grid.innerHTML = '<div class="empty">جارٍ تحميل النتائج...</div>';
    const url = new URL(query ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("limit", "12");
    url.searchParams.set("rating", "g");
    if (query) url.searchParams.set("q", query);
    try {
      const response = await fetch(url.toString());
      const payload = await response.json();
      if (thisRequest !== requestNo) return;
      if (!response.ok) throw new Error(payload?.meta?.msg || "GIPHY API error " + response.status);
      const gifs = payload.data || [];
      state.textContent = query ? gifs.length + " نتيجة" : "الأكثر تداولاً";
      grid.innerHTML = gifs.length ? gifs.map(g => {
        const image = g.images?.fixed_width?.url || g.images?.downsized_medium?.url || g.images?.original?.url;
        const original = g.images?.original?.url || image;
        if (!image || !original) return "";
        return '<article class="sticker-card"><div class="sticker-image"><img loading="lazy" src="' + esc(image) + '" alt="' + esc(g.title || "GIPHY GIF") + '"></div><div class="sticker-info"><strong>' + esc(g.title || "GIF") + '</strong><span>GIPHY' + (g.username ? ' · @' + esc(g.username) : "") + '</span><div class="card-actions"><a class="btn" href="' + esc(original) + '" target="_blank" rel="noopener" download style="text-decoration:none">فتح / تنزيل GIF</a></div></div></article>';
      }).join("") : '<div class="empty">ما لقينا نتائج. جرّب كلمة ثانية.</div>';
    } catch (error) {
      if (thisRequest === requestNo) showError("تعذر تحميل GIPHY: " + (error.message || "خطأ اتصال"));
    }
  }
  async function init() {
    try {
      const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
      const data = await response.json();
      if (!response.ok || !data.apiKey) throw new Error(data.error || "مفتاح GIPHY غير مضبوط في Supabase");
      apiKey = data.apiKey;
      await load("");
    } catch (error) {
      showError(error.message || "تعذر الاتصال بخدمة GIPHY");
    }
  }
  function search() {
    const q = input.value.trim();
    if (!q) { load(""); return; }
    load(q);
  }
  $("giphySearchBtn").addEventListener("click", search);
  input.addEventListener("keydown", event => { if (event.key === "Enter") search(); });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { if (input.value.trim().length >= 2) search(); else if (!input.value.trim()) load(""); }, 550); });
  init();
})();