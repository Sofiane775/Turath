'use strict';

/* =========================================================
   Turath — تراث
   Carnet personnel : Coran, hadiths, savants, livres, éditions.
   Toutes les données restent sur l'appareil (localStorage).
   ========================================================= */

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => isoOf(new Date());
const daysSince = (iso) => iso ? Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000) : Infinity;
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '');
const linkify = (text) => esc(text)
  .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  .replace(/\n/g, '<br>');
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
function ago(iso) {
  if (!iso) return 'jamais révisé';
  const d = daysSince(iso);
  if (d <= 0) return "révisé aujourd'hui";
  if (d === 1) return 'révisé hier';
  return `révisé il y a ${d} j`;
}

/* ---------- Données ---------- */
const STORE_KEY = 'turath-data-v1';
const OLD_KEYS = ['talib-data-v1'];
const TOTAL_AYAHS = SURAHS.reduce((s, x) => s + x[2], 0);
const DEFAULT_THEMES = ['Tawḥīd', 'ʿAqīda', 'Repentir (tawba)', 'Prière', 'Manhaj', 'Tafsīr', 'Ḥadīth', 'Fiqh', 'Sīra', 'Comportement', "Purification de l'âme", 'Intention', 'Fitan'];

function defaultData() {
  return {
    version: 2,
    quran: { surahs: {}, bookmark: null, log: [] },
    hadiths: [{
      id: uid(), addedAt: todayISO(), status: 'none', lastRevision: null,
      ar: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
      fr: "Les actes ne valent que par les intentions, et chacun n'aura que ce qu'il a eu l'intention de faire.",
      narrator: 'ʿUmar ibn al-Khaṭṭāb', source: 'Al-Bukhārī (1) et Muslim (1907)', grade: 'sahih',
      gradedBy: 'Muttafaq ʿalayh (rapporté par les deux)', theme: 'Intention', notes: ''
    }],
    scholars: [{ id: uid(), name: 'Shaykh Muḥammad Saʿīd Raslān', nameAr: 'الشيخ محمد سعيد رسلان', bio: '', videos: [] }],
    books: [],
    publishers: [],
    settings: { revisionDays: 7, theme: 'auto', sortReverse: false, lastExport: null }
  };
}
function normalize(d) {
  const def = defaultData();
  return {
    ...def, ...d, version: 2,
    quran: { ...def.quran, ...(d.quran || {}) },
    settings: { ...def.settings, ...(d.settings || {}) },
    hadiths: Array.isArray(d.hadiths) ? d.hadiths : def.hadiths,
    scholars: Array.isArray(d.scholars) ? d.scholars.map(s => ({ videos: [], ...s })) : def.scholars,
    books: Array.isArray(d.books) ? d.books : [],
    publishers: Array.isArray(d.publishers) ? d.publishers : []
  };
}
function load() {
  try {
    for (const key of [STORE_KEY, ...OLD_KEYS]) {
      const raw = localStorage.getItem(key);
      if (raw) return normalize(JSON.parse(raw));
    }
  } catch (e) { /* stockage indisponible */ }
  return defaultData();
}
let data = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) { toast("Impossible d'enregistrer sur cet appareil"); }
}

const ui = {
  surahFilter: 'all', surahQuery: '', hadithFilter: 'all', hadithQuery: '',
  scholarTab: 'savants', theme: null, scholarTheme: 'all', lastScholar: null,
  libTab: 'livres', bookFilter: 'all', bookQuery: '', pubFilter: 'all'
};

/* ---------- Coran ---------- */
const S = (n) => ({ fr: SURAHS[n - 1][0], ar: SURAHS[n - 1][1], ayahs: SURAHS[n - 1][2] });
const sState = (n) => ({ status: 'none', ayah: 0, lastRevision: null, notes: '', ...(data.quran.surahs[n] || {}) });
function setS(n, patch) { data.quran.surahs[n] = { ...sState(n), ...patch }; save(); }
const isDue = (o) => o.status === 'memorized' && daysSince(o.lastRevision) >= data.settings.revisionDays;
const needsRevision = (n) => isDue(sState(n));
function memoAyahs(n) {
  const s = sState(n);
  if (s.status === 'memorized') return S(n).ayahs;
  if (s.status === 'learning') return Math.min(s.ayah, S(n).ayahs);
  return 0;
}
function quranStats() {
  let mem = 0, learning = 0, ayahs = 0, toRev = 0;
  for (let n = 1; n <= 114; n++) {
    const s = sState(n);
    if (s.status === 'memorized') mem++;
    if (s.status === 'learning') learning++;
    ayahs += memoAyahs(n);
    if (needsRevision(n)) toRev++;
  }
  return { mem, learning, ayahs, toRev, pct: ayahs / TOTAL_AYAHS * 100 };
}
function addLog(n, type) {
  data.quran.log.push({ date: todayISO(), n, type });
  if (data.quran.log.length > 3000) data.quran.log = data.quran.log.slice(-3000);
}
function streak() {
  const days = new Set(data.quran.log.map(l => l.date));
  const d = new Date();
  if (!days.has(isoOf(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(isoOf(d))) { count++; d.setDate(d.getDate() - 1); }
  return count;
}
const markClass = (o) => isDue(o) ? 'due' : o.status === 'memorized' ? 'full' : o.status === 'learning' ? 'half' : 'empty';
const MARK_LABEL = { full: 'Mémorisé', half: 'En cours', due: 'À réviser', empty: 'Pas commencé' };
const mark = (o) => { const c = markClass(o); return `<span class="mk mk-${c}" title="${MARK_LABEL[c]}" aria-label="${MARK_LABEL[c]}"></span>`; };
const legend = () => `<div class="legend"><span><i class="mk mk-full"></i>Mémorisé</span><span><i class="mk mk-half"></i>En cours</span><span><i class="mk mk-due"></i>À réviser</span><span><i class="mk"></i>Pas commencé</span></div>`;

/* ---------- Hadiths ---------- */
const GRADES = { sahih: 'Ṣaḥīḥ', hasan: 'Ḥasan', daif: 'Ḍaʿīf', mawdu: 'Mawḍūʿ', unknown: 'À vérifier' };
const gradeClass = (g) => (g === 'sahih' || g === 'hasan') ? 'solid' : (g === 'daif' || g === 'mawdu') ? 'red' : 'outline';
const gradeBadge = (g) => `<span class="gr gr-${gradeClass(g || 'unknown')}">${GRADES[g] || GRADES.unknown}</span>`;
const hadithById = (id) => data.hadiths.find(h => h.id === id);

/* ---------- Savants & vidéos ---------- */
function parseVideo(url) {
  url = String(url || '').trim();
  let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { platform: 'youtube', vid: m[1], vertical: /\/shorts\//i.test(url) };
  m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i);
  if (m) return { platform: 'instagram', vid: m[2], kind: /^(p|tv)$/i.test(m[1]) ? 'p' : 'reel' };
  return { platform: 'link' };
}
const themeKey = (t) => String(t || '').trim().toLowerCase();
function themesOf(videos) {
  const map = new Map();
  videos.forEach(v => {
    const k = themeKey(v.theme); if (!k) return;
    if (!map.has(k)) map.set(k, { key: k, label: v.theme.trim(), count: 0 });
    map.get(k).count++;
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
const allVideos = () => data.scholars.flatMap(sc => sc.videos.map(v => ({ v, sc })));
const allThemes = () => themesOf(allVideos().map(x => x.v));
function themeSuggestions(extra = []) {
  const set = new Map();
  [...extra, ...allThemes().map(t => t.label), ...DEFAULT_THEMES].forEach(t => { if (t && !set.has(themeKey(t))) set.set(themeKey(t), t); });
  return [...set.values()];
}
function seal(sc) {
  if (sc.nameAr) {
    const words = sc.nameAr.trim().split(/\s+/).filter(w => !/^(الشيخ|العلامة|الإمام|ابن|أبو|بن)$/.test(w));
    const last = words[words.length - 1] || sc.nameAr;
    return `<span lang="ar">${esc(last.replace(/^ال/, '').charAt(0))}</span>`;
  }
  const words = String(sc.name || '?').split(/\s+/).filter(w => !/^(shaykh|cheikh|sheikh|al|el|ibn|abu|abū)$/i.test(w));
  return esc((words[words.length - 1] || '?').charAt(0).toUpperCase());
}

/* ---------- Livres & éditions ---------- */
const BOOK_STATUS = { toread: 'À lire', reading: 'En cours', read: 'Lu' };
const VERDICTS = { ok: 'Fiable', warn: 'Avec prudence', bad: 'À éviter' };
const findPublisher = (name) => { const k = norm(name); return k ? data.publishers.find(p => norm(p.name) === k) : null; };
function publisherLabel(name) {
  if (!name) return '';
  const p = findPublisher(name);
  return p ? `${esc(p.name)} <span class="vd vd-${p.verdict}">${VERDICTS[p.verdict]}</span>` : esc(name);
}

/* =========================================================
   Petits gabarits
   ========================================================= */
const pageHead = (fr, ar) => `<header class="ph"><h1>${fr}</h1><span class="ph-ar" lang="ar">${ar}</span></header>`;
function tabsHTML(items, current, action) {
  return `<div class="tabs" role="tablist">${items.map(([k, label, count]) =>
    `<button class="tab ${current === k ? 'on' : ''}" role="tab" aria-selected="${current === k}" data-action="${action}" data-key="${esc(k)}">${esc(label)}${count !== undefined ? `<span class="count">${count}</span>` : ''}</button>`).join('')}</div>`;
}
const empty = (text, action, label) => `<div class="empty"><p>${text}</p>${action ? `<button class="btn" data-action="${action}">${label}</button>` : ''}</div>`;

/* =========================================================
   Accueil
   ========================================================= */
function renderHome() {
  const st = quranStats();
  const bm = data.quran.bookmark;
  const str = streak();
  const dueSurahs = [];
  for (let n = 1; n <= 114; n++) if (needsRevision(n)) dueSurahs.push(n);
  const dueHadiths = data.hadiths.filter(isDue);
  const age = (o) => { const d = daysSince(o.lastRevision); return d === Infinity ? 1e9 : d; };
  const due = [
    ...dueSurahs.map(n => ({ kind: 's', n, o: sState(n) })),
    ...dueHadiths.map(h => ({ kind: 'h', h, o: h }))
  ].sort((a, b) => age(b.o) - age(a.o));

  const reading = data.books.filter(b => b.status === 'reading');
  const nbVideos = allVideos().length;
  const nbRead = data.books.filter(b => b.status === 'read').length;
  const nbHadiths = data.hadiths.filter(h => h.status === 'memorized').length;
  const hasData = Object.keys(data.quran.surahs).length || data.books.length || nbVideos || data.publishers.length || data.hadiths.length > 1;
  const backupWarn = hasData && daysSince(data.settings.lastExport) > 30;

  const greg = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let hijri = '';
  try { hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { /* calendrier indisponible */ }

  const cells = Array.from({ length: 114 }, (_, i) => {
    const n = i + 1;
    return `<button class="cell c-${markClass(sState(n))}" data-action="open-surah" data-n="${n}" title="${n}. ${S(n).fr}" aria-label="${n}. ${S(n).fr} — ${MARK_LABEL[markClass(sState(n))]}"></button>`;
  }).join('');

  return `
  <section class="home-top">
    <p class="dates"><span>${esc(greg)}</span>${hijri ? `<span class="hijri" lang="ar" dir="rtl">${esc(hijri)}</span>` : ''}</p>
    <h1 class="greet">As-salāmu ʿalaykum</h1>
    <p class="greet-ar" lang="ar">السلام عليكم ورحمة الله وبركاته</p>
  </section>
  ${backupWarn ? `<a class="notice" href="#/reglages">Pense à sauvegarder tes données : Réglages, puis Exporter.</a>` : ''}

  <div class="home-grid">
    <div>
      <section class="section">
        <div class="rubric">Point d'arrêt ${bm ? `<a href="https://quran.com/${bm.surah}/${bm.ayah}" target="_blank" rel="noopener">Reprendre ↗</a>` : ''}</div>
        ${bm ? `
        <div class="bookmark">
          <span class="bm-ar" lang="ar">${S(bm.surah).ar}</span>
          <div class="bm-txt"><strong>${bm.surah}. ${S(bm.surah).fr}</strong>
            <div class="m">Verset ${bm.ayah} sur ${S(bm.surah).ayahs} · ${fmtDate(bm.date)}</div>
            <button class="link small" data-action="edit-bookmark">Modifier</button></div>
        </div>` : `<p class="muted">Aucun point d'arrêt pour l'instant.</p><button class="btn" data-action="edit-bookmark">Définir mon point d'arrêt</button>`}
      </section>

      <section class="section">
        <div class="rubric">Carte du Coran <a href="#/coran">Liste des sourates →</a></div>
        <div class="map-head">
          <div class="big">${st.pct < 10 ? st.pct.toFixed(1) : Math.round(st.pct)}<small>%</small></div>
          <div class="m">${st.ayahs} versets sur ${TOTAL_AYAHS}<br>${plural(st.mem, 'sourate')} · ${st.learning} en cours</div>
        </div>
        <div class="map" role="group" aria-label="Les 114 sourates">${cells}</div>
        ${legend()}
      </section>
    </div>

    <div>
      <section class="section figures">
        <a class="fig" href="#/coran"><strong>${st.mem}</strong><span>sourates</span></a>
        <a class="fig" href="#/hadiths"><strong>${nbHadiths}</strong><span>hadiths appris</span></a>
        <a class="fig" href="#/bibliotheque"><strong>${nbRead}</strong><span>${nbRead > 1 ? 'livres lus' : 'livre lu'}</span></a>
        <a class="fig" href="#/accueil"><strong>${str}</strong><span>${str > 1 ? "jours d'affilée" : "jour d'affilée"}</span></a>
      </section>

      <section class="section">
        <div class="rubric">À réviser <span class="m">tous les ${data.settings.revisionDays} jours</span></div>
        ${due.length ? `<div>${due.slice(0, 7).map(x => x.kind === 's' ? `
          <div class="rev"><span class="grow"><button class="link" data-action="open-surah" data-n="${x.n}">${x.n}. ${S(x.n).fr}</button><span class="m">Sourate · ${ago(x.o.lastRevision)}</span></span>
            <button class="btn small" data-action="revise" data-n="${x.n}">Révisée</button></div>` : `
          <div class="rev"><span class="grow"><button class="link" data-action="open-hadith" data-id="${x.h.id}">${esc((x.h.fr || x.h.ar || 'Hadith').slice(0, 60))}${(x.h.fr || x.h.ar || '').length > 60 ? '…' : ''}</button><span class="m">Hadith · ${ago(x.o.lastRevision)}</span></span>
            <button class="btn small" data-action="revise-hadith" data-id="${x.h.id}">Révisé</button></div>`).join('')}</div>
          ${due.length > 7 ? `<p class="m">et ${due.length - 7} autre(s)…</p>` : ''}`
      : `<p class="muted">${st.mem || nbHadiths ? 'Tout est à jour. Bārak Allāhu fīk.' : 'Indique ce que tu as mémorisé dans Coran et Hadiths : les révisions apparaîtront ici.'}</p>`}
      </section>

      ${reading.length ? `
      <section class="section">
        <div class="rubric">Lectures en cours</div>
        <ul class="index">${reading.map(b => `<li><button class="row-btn" data-action="open-book" data-id="${b.id}"><span class="grow"><span class="t">${esc(b.title)}</span>${b.author ? `<span class="m">${esc(b.author)}</span>` : ''}</span></button></li>`).join('')}</ul>
      </section>` : ''}
    </div>
  </div>

  <section class="verse">
    <p class="verse-ar" lang="ar" dir="rtl">قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا</p>
    <p class="verse-fr">Sens : « Dis : Ô Mes serviteurs qui avez commis des excès à votre propre détriment, ne désespérez pas de la miséricorde d'Allah. Allah pardonne tous les péchés. »</p>
    <p class="verse-ref">Az-Zumar, 39:53</p>
  </section>`;
}

/* =========================================================
   Coran
   ========================================================= */
function renderQuran() {
  const st = quranStats();
  const counts = { all: 114, memorized: 0, learning: 0, revision: st.toRev, none: 0 };
  for (let n = 1; n <= 114; n++) counts[sState(n).status]++;
  return `
  ${pageHead('Coran', 'القرآن')}
  <p class="m" style="margin-top:12px">${plural(st.mem, 'sourate')} mémorisée${st.mem > 1 ? 's' : ''} · ${st.ayahs} versets sur ${TOTAL_AYAHS} (${st.pct.toFixed(1)} %)</p>
  <div class="ph-actions">
    <button class="btn" data-action="edit-bookmark">Point d'arrêt</button>
    <button class="btn quiet" data-action="toggle-sort" title="Ordre d'affichage">${data.settings.sortReverse ? 'Ordre : 114 → 1' : 'Ordre : 1 → 114'}</button>
  </div>
  ${tabsHTML([['all', 'Toutes', counts.all], ['memorized', 'Mémorisées', counts.memorized], ['learning', 'En cours', counts.learning], ['revision', 'À réviser', counts.revision], ['none', 'Pas commencées', counts.none]], ui.surahFilter, 'surah-filter')}
  <div class="toolbar"><input type="search" placeholder="Nom ou numéro de sourate" data-input="surah-query" value="${esc(ui.surahQuery)}" aria-label="Rechercher une sourate"></div>
  ${legend()}
  <ul class="index cols" id="surah-list" style="margin-top:14px">${surahListHTML()}</ul>`;
}
function surahListHTML() {
  const q = norm(ui.surahQuery), raw = ui.surahQuery.trim();
  let ns = Array.from({ length: 114 }, (_, i) => i + 1);
  if (data.settings.sortReverse) ns.reverse();
  ns = ns.filter(n => {
    const s = sState(n), f = ui.surahFilter;
    const statusOk = f === 'all' || (f === 'revision' ? needsRevision(n) : s.status === f);
    const queryOk = !raw || norm(S(n).fr).includes(q) || S(n).ar.includes(raw) || String(n) === raw;
    return statusOk && queryOk;
  });
  if (!ns.length) return `<li class="empty"><p>Aucune sourate ici.</p></li>`;
  return ns.map(n => {
    const s = sState(n), info = S(n);
    let meta = `${info.ayahs} versets`;
    if (s.status === 'learning') meta += ` · jusqu'au verset ${s.ayah}`;
    if (s.status === 'memorized') meta += ` · ${ago(s.lastRevision)}`;
    return `<li><button class="row-btn" data-action="open-surah" data-n="${n}">
      <span class="idx">${n}</span>
      <span class="grow"><span class="t">${info.fr}</span><span class="m">${meta}</span>
        ${s.status === 'learning' ? `<span class="mini"><span style="width:${Math.round(s.ayah / info.ayahs * 100)}%"></span></span>` : ''}</span>
      <span class="ar-name" lang="ar">${info.ar}</span>
      ${mark(s)}
    </button></li>`;
  }).join('');
}
function openSurah(n) {
  const s = sState(n), info = S(n);
  const opts = [['none', 'Pas commencée'], ['learning', 'En cours de mémorisation'], ['memorized', 'Mémorisée']]
    .map(([k, l]) => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${l}</option>`).join('');
  openModal(`${n}. ${info.fr}`, `
    <p class="sheet-ar" lang="ar">سورة ${info.ar}</p>
    <p class="m center">${info.ayahs} versets · ${s.lastRevision ? `dernière révision le ${fmtDate(s.lastRevision)}` : 'jamais révisée'}</p>
    <div class="two">
      <label class="field">Statut <select name="status">${opts}</select></label>
      <label class="field">Jusqu'au verset <input type="number" name="ayah" min="0" max="${info.ayahs}" inputmode="numeric" value="${s.status === 'memorized' ? info.ayahs : s.ayah}"></label>
    </div>
    <label class="field">Notes : passages difficiles, confusions <textarea name="notes" rows="3">${esc(s.notes)}</textarea></label>
    <div class="actions">
      ${s.status !== 'none' ? `<button type="button" class="btn" data-action="revise" data-n="${n}" data-close="1">Révisée aujourd'hui</button>` : ''}
      <button type="button" class="btn quiet" data-action="bookmark-here" data-n="${n}">Point d'arrêt ici</button>
      <a class="btn quiet" href="https://quran.com/${n}" target="_blank" rel="noopener">Lire / écouter ↗</a>
    </div>`,
    (fd) => {
      let status = fd.get('status');
      let ayah = clamp(parseInt(fd.get('ayah'), 10) || 0, 0, info.ayahs);
      if (status === 'none' && ayah > 0) status = 'learning';
      if (status === 'learning' && ayah >= info.ayahs) status = 'memorized';
      if (status === 'memorized') ayah = info.ayahs;
      if (status === 'none') ayah = 0;
      const patch = { status, ayah, notes: fd.get('notes').trim() };
      if (status === 'memorized' && s.status !== 'memorized') {
        addLog(n, 'memo');
        if (!s.lastRevision) patch.lastRevision = todayISO();
        toast(`Bārak Allāhu fīk ! ${info.fr} mémorisée`);
      } else if (status === 'learning' && ayah > s.ayah) addLog(n, 'memo');
      setS(n, patch);
    });
}
function openBookmark() {
  const bm = data.quran.bookmark || { surah: 1, ayah: 1 };
  const opts = SURAHS.map((x, i) => `<option value="${i + 1}" ${bm.surah === i + 1 ? 'selected' : ''}>${i + 1}. ${x[0]} — ${x[1]}</option>`).join('');
  openModal("Point d'arrêt", `
    <p class="m">Là où tu t'es arrêté, en lecture ou en mémorisation.</p>
    <label class="field">Sourate <select name="surah" data-input="bm-surah">${opts}</select></label>
    <label class="field">Verset <input type="number" name="ayah" min="1" max="${S(bm.surah).ayahs}" value="${bm.ayah}" inputmode="numeric"></label>`,
    (fd) => {
      const surah = clamp(parseInt(fd.get('surah'), 10) || 1, 1, 114);
      const ayah = clamp(parseInt(fd.get('ayah'), 10) || 1, 1, S(surah).ayahs);
      data.quran.bookmark = { surah, ayah, date: todayISO() };
      save(); toast("Point d'arrêt enregistré");
    });
}
function revise(n) {
  setS(n, { lastRevision: todayISO() });
  addLog(n, 'revision'); save();
  toast(`${S(n).fr} révisée`);
}

/* =========================================================
   Hadiths
   ========================================================= */
function renderHadiths() {
  const c = { all: data.hadiths.length, memorized: 0, learning: 0, revision: data.hadiths.filter(isDue).length, none: 0 };
  data.hadiths.forEach(h => c[h.status || 'none']++);
  return `
  ${pageHead('Hadiths', 'الحديث')}
  <div class="ph-actions"><button class="btn primary" data-action="add-hadith">Ajouter un hadith</button></div>
  ${tabsHTML([['all', 'Tous', c.all], ['memorized', 'Appris', c.memorized], ['learning', 'En cours', c.learning], ['revision', 'À réviser', c.revision], ['none', 'À apprendre', c.none]], ui.hadithFilter, 'hadith-filter')}
  <div class="toolbar"><input type="search" data-input="hadith-query" placeholder="Texte, rapporteur, source, thème" value="${esc(ui.hadithQuery)}" aria-label="Rechercher un hadith"></div>
  <ul class="index" id="hadith-list" style="margin-top:14px">${hadithListHTML()}</ul>`;
}
function hadithListHTML() {
  if (!data.hadiths.length) return `<li>${empty('Ajoute les hadiths que tu veux apprendre ou retenir, avec leur source et leur authenticité.', 'add-hadith', 'Ajouter un hadith')}</li>`;
  const q = norm(ui.hadithQuery);
  const list = data.hadiths.filter(h => {
    const f = ui.hadithFilter;
    const ok = f === 'all' || (f === 'revision' ? isDue(h) : (h.status || 'none') === f);
    return ok && (!q || norm(`${h.ar} ${h.fr} ${h.narrator} ${h.source} ${h.theme}`).includes(q));
  });
  if (!list.length) return `<li class="empty"><p>Aucun hadith ici.</p></li>`;
  return list.map(h => `<li><button class="row-btn hadith" data-action="open-hadith" data-id="${h.id}">
    <span class="grow">
      ${h.ar ? `<span class="h-ar" lang="ar">${esc(h.ar)}</span>` : ''}
      ${h.fr ? `<span class="h-fr">${esc(h.fr)}</span>` : ''}
      <span class="h-meta">${gradeBadge(h.grade)}${h.source ? `<span class="m">${esc(h.source)}</span>` : ''}${h.theme ? `<span class="tag">${esc(h.theme)}</span>` : ''}</span>
    </span>
    ${mark(h)}
  </button></li>`).join('');
}
function openHadith(id) {
  const h = hadithById(id); if (!h) return;
  openModal('Hadith', `
    ${h.narrator ? `<p class="m" style="margin-top:12px">D'après ${esc(h.narrator)}</p>` : ''}
    ${h.ar ? `<p class="matn" lang="ar">${esc(h.ar)}</p>` : ''}
    ${h.fr ? `<p class="tarjama">${linkify(h.fr)}</p>` : ''}
    <h3>Source et authenticité</h3>
    <p>${gradeBadge(h.grade)} ${h.source ? esc(h.source) : '<span class="muted">Source non renseignée</span>'}</p>
    ${h.gradedBy ? `<p class="m">${linkify(h.gradedBy)}</p>` : ''}
    ${h.theme ? `<p class="tag">${esc(h.theme)}</p>` : ''}
    ${h.notes ? `<h3>Explication et bénéfices</h3><p>${linkify(h.notes)}</p>` : ''}
    <p class="m" style="margin-top:16px">${MARK_LABEL[markClass(h)]} · ${h.lastRevision ? `dernière révision le ${fmtDate(h.lastRevision)}` : 'jamais révisé'}</p>
    <div class="actions">
      ${h.status !== 'memorized' ? `<button type="button" class="btn primary" data-action="learn-hadith" data-id="${h.id}">Je l'ai appris</button>` : `<button type="button" class="btn" data-action="revise-hadith" data-id="${h.id}" data-close="1">Révisé aujourd'hui</button>`}
      <button type="button" class="btn quiet" data-action="edit-hadith" data-id="${h.id}">Modifier</button>
    </div>`);
}
function hadithForm(id) {
  const h = id ? hadithById(id) : { ar: '', fr: '', narrator: '', source: '', grade: 'unknown', gradedBy: '', theme: '', notes: '', status: 'none' };
  const gOpts = Object.entries(GRADES).map(([k, l]) => `<option value="${k}" ${h.grade === k ? 'selected' : ''}>${l}</option>`).join('');
  const sOpts = [['none', 'À apprendre'], ['learning', 'En cours'], ['memorized', 'Appris']].map(([k, l]) => `<option value="${k}" ${(h.status || 'none') === k ? 'selected' : ''}>${l}</option>`).join('');
  const themes = themeSuggestions(data.hadiths.map(x => x.theme));
  openModal(id ? 'Modifier le hadith' : 'Nouveau hadith', `
    <label class="field">Texte arabe <textarea name="ar" rows="3" lang="ar" dir="rtl">${esc(h.ar)}</textarea></label>
    <label class="field">Traduction du sens <textarea name="fr" rows="3">${esc(h.fr)}</textarea></label>
    <label class="field">Rapporteur (compagnon) <input name="narrator" value="${esc(h.narrator)}" placeholder="Ex. Abū Hurayra"></label>
    <label class="field">Source : recueil et numéro <input name="source" value="${esc(h.source)}" placeholder="Ex. Al-Bukhārī (6502)"></label>
    <div class="two">
      <label class="field">Authenticité <select name="grade">${gOpts}</select></label>
      <label class="field">Statut <select name="status">${sOpts}</select></label>
    </div>
    <label class="field">Authentifié par <input name="gradedBy" value="${esc(h.gradedBy)}" placeholder="Ex. authentifié par Al-Albānī, Ṣaḥīḥ al-Jāmiʿ (…)"></label>
    <label class="field">Thème <input name="theme" list="h-themes" value="${esc(h.theme)}">
      <datalist id="h-themes">${themes.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
    <label class="field">Explication et bénéfices <textarea name="notes" rows="4">${esc(h.notes)}</textarea></label>`,
    (fd) => {
      const obj = Object.fromEntries(['ar', 'fr', 'narrator', 'source', 'grade', 'gradedBy', 'theme', 'notes', 'status'].map(k => [k, String(fd.get(k) || '').trim()]));
      if (!obj.ar && !obj.fr) { toast('Écris au moins le texte arabe ou la traduction'); return false; }
      if (obj.status === 'memorized' && (!id || h.status !== 'memorized')) { obj.lastRevision = todayISO(); addLog(0, 'hadith'); }
      if (id) Object.assign(h, obj); else data.hadiths.unshift({ id: uid(), addedAt: todayISO(), lastRevision: obj.lastRevision || null, ...obj });
      save();
    }, { focus: !id, danger: id ? `<button type="button" class="btn red" data-action="del-hadith" data-id="${id}">Supprimer</button>` : '' });
}

/* =========================================================
   Savants
   ========================================================= */
function renderScholars() {
  return `
  ${pageHead('Savants', 'العلماء')}
  <div class="ph-actions"><button class="btn primary" data-action="add-scholar">Ajouter un savant</button></div>
  ${tabsHTML([['savants', 'Par savant', data.scholars.length], ['themes', 'Par thème', allThemes().length]], ui.scholarTab, 'scholar-tab')}
  <div style="margin-top:14px">${ui.scholarTab === 'savants' ? scholarsList() : themesView()}</div>`;
}
function scholarsList() {
  if (!data.scholars.length) return empty('Ajoute les savants dont tu suis les cours.', 'add-scholar', 'Ajouter un savant');
  return `<ul class="scholars">${data.scholars.map(sc => `<li><a class="row-btn" href="#/savants/${sc.id}">
      <span class="seal">${seal(sc)}</span>
      <span class="grow"><span class="t">${esc(sc.name)}</span>
        ${sc.nameAr ? `<span class="sc-ar" lang="ar">${esc(sc.nameAr)}</span>` : ''}
        <span class="m">${plural(sc.videos.length, 'vidéo')} · ${plural(themesOf(sc.videos).length, 'thème')}</span></span>
      <span class="m">→</span>
    </a></li>`).join('')}</ul>`;
}
function themesView() {
  const themes = allThemes();
  if (!themes.length) return empty('Les thèmes apparaissent ici dès que tu ajoutes des vidéos avec un thème.');
  if (!ui.theme || !themes.find(t => t.key === ui.theme)) ui.theme = themes[0].key;
  const vids = allVideos().filter(x => themeKey(x.v.theme) === ui.theme);
  return `${tabsHTML(themes.map(t => [t.key, t.label, t.count]), ui.theme, 'pick-theme')}
  <div class="videos">${vids.map(x => videoCard(x.v, x.sc, true)).join('')}</div>`;
}
function renderScholar(id) {
  const sc = data.scholars.find(s => s.id === id);
  if (!sc) return `<a class="back" href="#/savants">← Savants</a>${empty('Savant introuvable.')}`;
  if (ui.lastScholar !== id) { ui.lastScholar = id; ui.scholarTheme = 'all'; }
  const themes = themesOf(sc.videos);
  if (ui.scholarTheme !== 'all' && !themes.find(t => t.key === ui.scholarTheme)) ui.scholarTheme = 'all';
  const vids = sc.videos.filter(v => ui.scholarTheme === 'all' || themeKey(v.theme) === ui.scholarTheme);
  return `
  <a class="back" href="#/savants">← Savants</a>
  <section class="profile">
    <span class="seal big">${seal(sc)}</span>
    <div class="grow">
      <h1>${esc(sc.name)}</h1>
      ${sc.nameAr ? `<p class="sc-ar" lang="ar" dir="rtl">${esc(sc.nameAr)}</p>` : ''}
    </div>
  </section>
  ${sc.bio ? `<p class="m" style="margin-top:12px">${linkify(sc.bio)}</p>` : ''}
  <div class="ph-actions">
    <button class="btn primary" data-action="add-video" data-id="${sc.id}">Ajouter une vidéo</button>
    <button class="btn quiet" data-action="edit-scholar" data-id="${sc.id}">Modifier</button>
  </div>
  ${themes.length ? tabsHTML([['all', 'Tout', sc.videos.length], ...themes.map(t => [t.key, t.label, t.count])], ui.scholarTheme, 'scholar-theme') : ''}
  ${vids.length ? `<div class="videos">${vids.map(v => videoCard(v, sc)).join('')}</div>`
      : `<div style="margin-top:20px">${empty('Aucune vidéo pour l\'instant. Colle un lien YouTube ou Instagram.')}</div>`}`;
}
function videoCard(v, sc, showScholar) {
  const p = parseVideo(v.url);
  let media;
  if (p.platform === 'youtube') {
    const src = `https://www.youtube-nocookie.com/embed/${p.vid}?autoplay=1&rel=0`;
    media = `<button class="media${p.vertical ? ' vertical' : ''}" data-action="play" data-src="${esc(src)}" aria-label="Lire la vidéo">
      <img loading="lazy" src="https://i.ytimg.com/vi/${p.vid}/hqdefault.jpg" alt="" onerror="this.remove()"><span class="play">▶</span><span class="platform">YouTube</span></button>`;
  } else if (p.platform === 'instagram') {
    const src = `https://www.instagram.com/${p.kind}/${p.vid}/embed/`;
    media = `<button class="media vertical ig" data-action="play" data-src="${esc(src)}" aria-label="Charger la vidéo Instagram">
      <span class="play">▶</span><span class="ig-label">Charger la vidéo</span><span class="platform">Instagram</span></button>`;
  } else {
    media = `<a class="media link-media" href="${esc(v.url)}" target="_blank" rel="noopener"><span>Ouvrir le lien ↗</span></a>`;
  }
  return `<article class="video">${media}
    <div class="v-title">${esc(v.title || 'Sans titre')}</div>
    <div class="v-meta">${v.theme ? `<span class="tag">${esc(v.theme)}</span>` : ''}${showScholar ? `<a href="#/savants/${sc.id}">${esc(sc.name)}</a>` : ''}</div>
    ${v.notes ? `<p class="m">${linkify(v.notes)}</p>` : ''}
    <div class="v-actions"><a href="${esc(v.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>
      <button class="link" data-action="edit-video" data-sid="${sc.id}" data-vid="${v.id}">Modifier</button></div>
  </article>`;
}
function scholarForm(id) {
  const sc = id ? data.scholars.find(s => s.id === id) : { name: '', nameAr: '', bio: '' };
  openModal(id ? 'Modifier le savant' : 'Nouveau savant', `
    <label class="field">Nom <input name="name" required value="${esc(sc.name)}" placeholder="Ex. Shaykh Ibn ʿUthaymīn"></label>
    <label class="field">Nom en arabe <input name="nameAr" dir="rtl" lang="ar" value="${esc(sc.nameAr)}"></label>
    <label class="field">Présentation et liens (chaîne, compte…) <textarea name="bio" rows="3">${esc(sc.bio)}</textarea></label>`,
    (fd) => {
      const obj = { name: fd.get('name').trim(), nameAr: fd.get('nameAr').trim(), bio: fd.get('bio').trim() };
      if (!obj.name) return false;
      if (id) Object.assign(sc, obj); else data.scholars.push({ id: uid(), videos: [], ...obj });
      save();
    }, { focus: true, danger: id ? `<button type="button" class="btn red" data-action="del-scholar" data-id="${id}">Supprimer</button>` : '' });
}
function videoForm(sid, vidId) {
  const sc = data.scholars.find(s => s.id === sid); if (!sc) return;
  const v = vidId ? sc.videos.find(x => x.id === vidId) : { url: '', title: '', theme: '', notes: '' };
  openModal(vidId ? 'Modifier la vidéo' : 'Nouvelle vidéo', `
    <p class="m" style="margin-top:12px">${esc(sc.name)}</p>
    <label class="field">Lien YouTube ou Instagram <input name="url" type="url" required value="${esc(v.url)}" placeholder="https://youtu.be/… ou https://www.instagram.com/reel/…"></label>
    <label class="field">Titre <input name="title" value="${esc(v.title)}" placeholder="Ex. Les conditions du repentir"></label>
    <label class="field">Thème <input name="theme" list="themes-list" value="${esc(v.theme)}" placeholder="Ex. Tawḥīd, Prière…">
      <datalist id="themes-list">${themeSuggestions().map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
    <label class="field">Notes et bénéfices <textarea name="notes" rows="3">${esc(v.notes || '')}</textarea></label>`,
    (fd) => {
      const obj = { url: fd.get('url').trim(), title: fd.get('title').trim(), theme: fd.get('theme').trim(), notes: fd.get('notes').trim() };
      if (!obj.url) return false;
      if (vidId) Object.assign(v, obj); else sc.videos.unshift({ id: uid(), addedAt: todayISO(), ...obj });
      if (parseVideo(obj.url).platform === 'link') toast("Lien enregistré (l'aperçu marche pour YouTube et Instagram)");
      save();
    }, { focus: !vidId, danger: vidId ? `<button type="button" class="btn red" data-action="del-video" data-sid="${sid}" data-vid="${vidId}">Supprimer</button>` : '' });
}

/* =========================================================
   Bibliothèque : livres + maisons d'édition
   ========================================================= */
function renderLibrary() {
  return `
  ${pageHead('Bibliothèque', 'المكتبة')}
  ${tabsHTML([['livres', 'Livres', data.books.length], ['editions', "Maisons d'édition", data.publishers.length]], ui.libTab, 'lib-tab')}
  ${ui.libTab === 'livres' ? booksView() : publishersView()}`;
}
function booksView() {
  const c = { all: data.books.length, toread: 0, reading: 0, read: 0 };
  data.books.forEach(b => c[b.status]++);
  return `
  <div class="ph-actions"><button class="btn primary" data-action="add-book">Ajouter un livre</button></div>
  ${data.books.length ? `
    <div class="toolbar"><input type="search" data-input="book-query" placeholder="Titre, auteur, édition" value="${esc(ui.bookQuery)}" aria-label="Rechercher un livre"></div>
    ${tabsHTML([['all', 'Tous', c.all], ['read', 'Lus', c.read], ['reading', 'En cours', c.reading], ['toread', 'À lire', c.toread]], ui.bookFilter, 'book-filter')}` : ''}
  <ul class="index" id="book-list" style="margin-top:14px">${bookListHTML()}</ul>`;
}
function bookListHTML() {
  if (!data.books.length) return `<li>${empty('Ajoute les livres que tu as lus, que tu lis ou que tu veux lire, avec un résumé.', 'add-book', 'Ajouter un livre')}</li>`;
  const q = norm(ui.bookQuery);
  const order = { reading: 0, toread: 1, read: 2 };
  const list = data.books
    .filter(b => (ui.bookFilter === 'all' || b.status === ui.bookFilter) && (!q || norm(`${b.title} ${b.author} ${b.publisher}`).includes(q)))
    .sort((a, b) => order[a.status] - order[b.status] || a.title.localeCompare(b.title, 'fr'));
  if (!list.length) return `<li class="empty"><p>Aucun livre ne correspond.</p></li>`;
  return list.map(b => `<li><button class="row-btn" data-action="open-book" data-id="${b.id}">
    <span class="grow">
      <span class="t">${esc(b.title)}</span>
      <span class="m">${[b.author && esc(b.author), b.publisher && publisherLabel(b.publisher)].filter(Boolean).join(' · ')}</span>
      ${b.summary ? `<span class="ex">${esc(b.summary)}</span>` : ''}
    </span>
    <span class="st st-${b.status}">${BOOK_STATUS[b.status]}</span>
  </button></li>`).join('');
}
function openBook(id) {
  const b = data.books.find(x => x.id === id); if (!b) return;
  openModal(b.title, `
    <p style="margin-top:12px"><span class="st st-${b.status}">${BOOK_STATUS[b.status]}</span>${b.finishedAt && b.status === 'read' ? ` <span class="m">terminé le ${fmtDate(b.finishedAt)}</span>` : ''}</p>
    ${b.author ? `<p><span class="m">Auteur :</span> ${esc(b.author)}</p>` : ''}
    ${b.publisher ? `<p><span class="m">Édition :</span> ${publisherLabel(b.publisher)}</p>` : ''}
    ${b.recommendedBy ? `<p><span class="m">Recommandé par :</span> ${esc(b.recommendedBy)}</p>` : ''}
    <h3>Résumé</h3><p>${b.summary ? linkify(b.summary) : '<span class="muted">Pas encore de résumé.</span>'}</p>
    ${b.benefits ? `<h3>Bénéfices (fawāʾid)</h3><p>${linkify(b.benefits)}</p>` : ''}
    <div class="actions"><button type="button" class="btn" data-action="edit-book" data-id="${b.id}">Modifier</button></div>`);
}
function bookForm(id) {
  const b = id ? data.books.find(x => x.id === id) : { title: '', author: '', publisher: '', status: 'toread', summary: '', benefits: '', recommendedBy: '' };
  const statusOpts = Object.entries(BOOK_STATUS).map(([k, l]) => `<option value="${k}" ${b.status === k ? 'selected' : ''}>${l}</option>`).join('');
  openModal(id ? 'Modifier le livre' : 'Nouveau livre', `
    <label class="field">Titre <input name="title" required value="${esc(b.title)}"></label>
    <label class="field">Auteur <input name="author" value="${esc(b.author)}"></label>
    <div class="two">
      <label class="field">Maison d'édition <input name="publisher" list="pub-list" value="${esc(b.publisher)}">
        <datalist id="pub-list">${data.publishers.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist></label>
      <label class="field">Statut <select name="status">${statusOpts}</select></label>
    </div>
    <label class="field">Recommandé par <input name="recommendedBy" value="${esc(b.recommendedBy || '')}" placeholder="Ex. un savant, un cours"></label>
    <label class="field">Résumé : de quoi parle le livre <textarea name="summary" rows="5">${esc(b.summary)}</textarea></label>
    <label class="field">Bénéfices retenus (fawāʾid) <textarea name="benefits" rows="4">${esc(b.benefits || '')}</textarea></label>`,
    (fd) => {
      const obj = Object.fromEntries(['title', 'author', 'publisher', 'status', 'summary', 'benefits', 'recommendedBy'].map(k => [k, String(fd.get(k) || '').trim()]));
      if (!obj.title) return false;
      if (obj.status === 'read' && (!id || b.status !== 'read')) obj.finishedAt = todayISO();
      if (id) Object.assign(b, obj); else data.books.push({ id: uid(), addedAt: todayISO(), ...obj });
      save();
    }, { focus: !id, danger: id ? `<button type="button" class="btn red" data-action="del-book" data-id="${id}">Supprimer</button>` : '' });
}
function publishersView() {
  const c = { all: data.publishers.length, ok: 0, warn: 0, bad: 0 };
  data.publishers.forEach(p => c[p.verdict]++);
  const order = { ok: 0, warn: 1, bad: 2 };
  const list = data.publishers.filter(p => ui.pubFilter === 'all' || p.verdict === ui.pubFilter)
    .sort((a, b) => order[a.verdict] - order[b.verdict] || a.name.localeCompare(b.name, 'fr'));
  return `
  <p class="intro">Pour chaque maison d'édition, note ton avis avec ses preuves : propos de savants, erreurs relevées (livre, page, édition), liens. Vérifie et cite toujours tes sources.</p>
  <div class="ph-actions"><button class="btn primary" data-action="add-pub">Ajouter une maison d'édition</button></div>
  ${data.publishers.length ? tabsHTML([['all', 'Toutes', c.all], ['ok', 'Fiables', c.ok], ['warn', 'Prudence', c.warn], ['bad', 'À éviter', c.bad]], ui.pubFilter, 'pub-filter') : ''}
  <ul class="index" style="margin-top:14px">${!data.publishers.length ? `<li>${empty("Aucune maison d'édition enregistrée.")}</li>`
      : list.map(p => {
        const nSrc = (p.sources || '').split('\n').filter(l => l.trim()).length;
        const nBooks = data.books.filter(b => findPublisher(b.publisher) === p).length;
        return `<li><button class="row-btn" data-action="open-pub" data-id="${p.id}">
          <span class="grow"><span class="t">${esc(p.name)}</span>
            <span class="m">${[p.country && esc(p.country), plural(nSrc, 'source'), nBooks && plural(nBooks, 'livre')].filter(Boolean).join(' · ')}</span>
            ${p.reason ? `<span class="ex">${esc(p.reason)}</span>` : ''}</span>
          <span class="vd vd-${p.verdict}">${VERDICTS[p.verdict]}</span>
        </button></li>`;
      }).join('')}</ul>`;
}
function openPub(id) {
  const p = data.publishers.find(x => x.id === id); if (!p) return;
  const sources = (p.sources || '').split('\n').map(l => l.trim()).filter(Boolean);
  const books = data.books.filter(b => findPublisher(b.publisher) === p);
  openModal(p.name, `
    <p style="margin-top:12px"><span class="vd vd-${p.verdict}">${VERDICTS[p.verdict]}</span>${p.country ? ` <span class="m">${esc(p.country)}</span>` : ''}</p>
    <h3>Explication</h3><p>${p.reason ? linkify(p.reason) : '<span class="muted">—</span>'}</p>
    <h3>Preuves et sources</h3>
    ${sources.length ? `<ol class="sources">${sources.map(s => `<li>${linkify(s)}</li>`).join('')}</ol>` : '<p class="muted">Aucune source renseignée.</p>'}
    ${books.length ? `<h3>Dans ta bibliothèque</h3><ul class="index">${books.map(b => `<li><button type="button" class="row-btn" data-action="open-book" data-id="${b.id}"><span class="t">${esc(b.title)}</span></button></li>`).join('')}</ul>` : ''}
    <div class="actions"><button type="button" class="btn" data-action="edit-pub" data-id="${p.id}">Modifier</button></div>`);
}
function pubForm(id) {
  const p = id ? data.publishers.find(x => x.id === id) : { name: '', country: '', verdict: 'ok', reason: '', sources: '' };
  const vOpts = Object.entries(VERDICTS).map(([k, l]) => `<option value="${k}" ${p.verdict === k ? 'selected' : ''}>${l}</option>`).join('');
  openModal(id ? "Modifier l'édition" : "Nouvelle maison d'édition", `
    <label class="field">Nom <input name="name" required value="${esc(p.name)}"></label>
    <div class="two">
      <label class="field">Pays ou ville <input name="country" value="${esc(p.country)}"></label>
      <label class="field">Avis <select name="verdict">${vOpts}</select></label>
    </div>
    <label class="field">Explication et raisons <textarea name="reason" rows="4">${esc(p.reason)}</textarea></label>
    <label class="field">Preuves et sources, une par ligne
      <textarea name="sources" rows="5" placeholder="Nom du savant, titre du cours, minute — https://…&#10;Erreur dans tel livre, page 45, édition de 2015">${esc(p.sources)}</textarea></label>`,
    (fd) => {
      const obj = Object.fromEntries(['name', 'country', 'verdict', 'reason', 'sources'].map(k => [k, String(fd.get(k) || '').trim()]));
      if (!obj.name) return false;
      if (id) Object.assign(p, obj); else data.publishers.push({ id: uid(), ...obj });
      save();
    }, { focus: !id, danger: id ? `<button type="button" class="btn red" data-action="del-pub" data-id="${id}">Supprimer</button>` : '' });
}

/* =========================================================
   Réglages
   ========================================================= */
function renderSettings() {
  const t = data.settings.theme;
  return `
  ${pageHead('Réglages', 'الإعدادات')}
  <section class="section">
    <div class="rubric">Affichage et révision</div>
    <label class="field">Thème
      <select data-change="theme">
        <option value="auto" ${t === 'auto' ? 'selected' : ''}>Automatique (selon le téléphone)</option>
        <option value="light" ${t === 'light' ? 'selected' : ''}>Clair</option>
        <option value="dark" ${t === 'dark' ? 'selected' : ''}>Sombre</option>
      </select></label>
    <label class="field">Rappeler de réviser une sourate ou un hadith appris tous les… (jours)
      <input type="number" min="1" max="365" inputmode="numeric" value="${data.settings.revisionDays}" data-change="revdays"></label>
  </section>
  <section class="section">
    <div class="rubric">Sauvegarde</div>
    <p class="muted small">Tes données sont enregistrées uniquement sur cet appareil, dans ce navigateur. Exporte-les régulièrement pour ne rien perdre, ou pour les passer sur un autre appareil.</p>
    <p class="small">Dernière sauvegarde : <strong>${data.settings.lastExport ? fmtDate(data.settings.lastExport) : 'jamais'}</strong></p>
    <div class="actions">
      <button class="btn primary" data-action="export">Exporter (.json)</button>
      <label class="btn">Importer<input type="file" accept="application/json,.json" data-change="import" hidden></label>
    </div>
  </section>
  <section class="section">
    <div class="rubric">Zone sensible</div>
    <button class="btn red" data-action="reset">Tout effacer</button>
  </section>
  <p class="m center" style="margin-top:40px"><span lang="ar" style="font-family:var(--kufi);color:var(--red);font-size:20px">تراث</span><br>Turath · version 2.0</p>`;
}
function exportData() {
  data.settings.lastExport = todayISO(); save();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `turath-sauvegarde-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  render();
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || typeof d !== 'object' || !d.quran) throw new Error('format');
      if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
      data = normalize(d); save(); applyTheme(); render(); toast('Données importées');
    } catch (e) { toast("Fichier invalide : ce n'est pas une sauvegarde Turath"); }
  };
  reader.readAsText(file);
}

/* =========================================================
   Modale, toast, routeur, événements
   ========================================================= */
let modalSubmit = null;
function openModal(title, body, onSubmit, opts = {}) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div>
  <form class="sheet" id="modal-form" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
    <div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="x" data-action="close-modal" aria-label="Fermer">✕</button></div>
    <div class="sheet-body">${body}</div>
    ${onSubmit ? `<div class="sheet-foot">${opts.danger || ''}<span class="spacer"></span>
      <button type="button" class="btn quiet" data-action="close-modal">Annuler</button>
      <button type="submit" class="btn primary">Enregistrer</button></div>` : ''}
  </form>`;
  m.hidden = false;
  document.body.classList.add('no-scroll');
  modalSubmit = onSubmit || null;
  if (opts.focus) setTimeout(() => { const f = m.querySelector('.sheet-body input:not([type=hidden]), .sheet-body textarea'); if (f) f.focus(); }, 60);
}
function closeModal() {
  const m = $('#modal');
  m.hidden = true; m.innerHTML = '';
  document.body.classList.remove('no-scroll');
  modalSubmit = null;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function applyTheme() { document.documentElement.dataset.theme = data.settings.theme; }

function render() {
  let [page = 'accueil', param] = location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'livres') { page = 'bibliotheque'; ui.libTab = 'livres'; }
  if (page === 'editions') { page = 'bibliotheque'; ui.libTab = 'editions'; }
  const views = { accueil: renderHome, coran: renderQuran, hadiths: renderHadiths, savants: renderScholars, bibliotheque: renderLibrary, reglages: renderSettings };
  if (!views[page]) page = 'accueil';
  $('#view').innerHTML = page === 'savants' && param ? renderScholar(param) : views[page]();
  document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page));
}

const actions = {
  'close-modal': () => closeModal(),
  'open-surah': (el) => openSurah(+el.dataset.n),
  'revise': (el) => { revise(+el.dataset.n); if (el.dataset.close) closeModal(); render(); },
  'bookmark-here': (el) => {
    const n = +el.dataset.n;
    const input = $('#modal [name=ayah]');
    const ayah = clamp(parseInt(input && input.value, 10) || 1, 1, S(n).ayahs);
    data.quran.bookmark = { surah: n, ayah, date: todayISO() };
    save(); toast(`Point d'arrêt : ${S(n).fr}, verset ${ayah}`);
  },
  'edit-bookmark': () => openBookmark(),
  'toggle-sort': () => { data.settings.sortReverse = !data.settings.sortReverse; save(); render(); },
  'surah-filter': (el) => { ui.surahFilter = el.dataset.key; render(); },

  'hadith-filter': (el) => { ui.hadithFilter = el.dataset.key; render(); },
  'add-hadith': () => hadithForm(),
  'open-hadith': (el) => openHadith(el.dataset.id),
  'edit-hadith': (el) => hadithForm(el.dataset.id),
  'learn-hadith': (el) => {
    const h = hadithById(el.dataset.id); if (!h) return;
    Object.assign(h, { status: 'memorized', lastRevision: todayISO() });
    addLog(0, 'hadith'); save(); closeModal(); render(); toast('Bārak Allāhu fīk ! Hadith appris');
  },
  'revise-hadith': (el) => {
    const h = hadithById(el.dataset.id); if (!h) return;
    h.lastRevision = todayISO(); addLog(0, 'hadith'); save();
    if (el.dataset.close) closeModal();
    render(); toast('Hadith révisé');
  },
  'del-hadith': (el) => {
    if (!confirm('Supprimer ce hadith ?')) return;
    data.hadiths = data.hadiths.filter(h => h.id !== el.dataset.id); save(); closeModal(); render();
  },

  'scholar-tab': (el) => { ui.scholarTab = el.dataset.key; render(); },
  'pick-theme': (el) => { ui.theme = el.dataset.key; render(); },
  'scholar-theme': (el) => { ui.scholarTheme = el.dataset.key; render(); },
  'add-scholar': () => scholarForm(),
  'edit-scholar': (el) => scholarForm(el.dataset.id),
  'del-scholar': (el) => {
    const sc = data.scholars.find(s => s.id === el.dataset.id);
    if (!sc || !confirm(`Supprimer ${sc.name} et ses ${sc.videos.length} vidéo(s) ?`)) return;
    data.scholars = data.scholars.filter(s => s !== sc); save(); closeModal(); location.hash = '#/savants'; render();
  },
  'add-video': (el) => videoForm(el.dataset.id),
  'edit-video': (el) => videoForm(el.dataset.sid, el.dataset.vid),
  'del-video': (el) => {
    const sc = data.scholars.find(s => s.id === el.dataset.sid);
    if (!sc || !confirm('Supprimer cette vidéo ?')) return;
    sc.videos = sc.videos.filter(v => v.id !== el.dataset.vid); save(); closeModal(); render();
  },
  'play': (el) => {
    const div = document.createElement('div');
    div.className = el.className + ' playing';
    div.innerHTML = `<iframe src="${esc(el.dataset.src)}" title="Vidéo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
    el.replaceWith(div);
  },

  'lib-tab': (el) => { ui.libTab = el.dataset.key; render(); },
  'book-filter': (el) => { ui.bookFilter = el.dataset.key; render(); },
  'add-book': () => bookForm(),
  'open-book': (el) => openBook(el.dataset.id),
  'edit-book': (el) => bookForm(el.dataset.id),
  'del-book': (el) => {
    if (!confirm('Supprimer ce livre ?')) return;
    data.books = data.books.filter(b => b.id !== el.dataset.id); save(); closeModal(); render();
  },
  'pub-filter': (el) => { ui.pubFilter = el.dataset.key; render(); },
  'add-pub': () => pubForm(),
  'open-pub': (el) => openPub(el.dataset.id),
  'edit-pub': (el) => pubForm(el.dataset.id),
  'del-pub': (el) => {
    if (!confirm("Supprimer cette maison d'édition ?")) return;
    data.publishers = data.publishers.filter(p => p.id !== el.dataset.id); save(); closeModal(); render();
  },

  'export': () => exportData(),
  'reset': () => {
    if (!confirm('Effacer toutes tes données ? Pense à exporter une sauvegarde avant.')) return;
    if (!confirm('Dernière confirmation : tout effacer définitivement ?')) return;
    data = defaultData(); save(); applyTheme(); render(); toast('Données effacées');
  }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action]) return;
  if (el.tagName === 'BUTTON' || el.classList.contains('modal-backdrop')) e.preventDefault();
  actions[el.dataset.action](el, e);
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset.input;
  if (k === 'surah-query') { ui.surahQuery = e.target.value; $('#surah-list').innerHTML = surahListHTML(); }
  if (k === 'hadith-query') { ui.hadithQuery = e.target.value; $('#hadith-list').innerHTML = hadithListHTML(); }
  if (k === 'book-query') { ui.bookQuery = e.target.value; $('#book-list').innerHTML = bookListHTML(); }
  if (k === 'bm-surah') { const a = $('#modal [name=ayah]'); a.max = S(+e.target.value).ayahs; if (+a.value > +a.max) a.value = a.max; }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.change;
  if (k === 'theme') { data.settings.theme = e.target.value; save(); applyTheme(); }
  if (k === 'revdays') { data.settings.revisionDays = clamp(parseInt(e.target.value, 10) || 7, 1, 365); save(); }
  if (k === 'import' && e.target.files[0]) importData(e.target.files[0]);
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'modal-form') return;
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  if (modalSubmit && modalSubmit(new FormData(e.target)) === false) return;
  closeModal(); render();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });

applyTheme();
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* hors GitHub Pages : pas grave */ });
}
