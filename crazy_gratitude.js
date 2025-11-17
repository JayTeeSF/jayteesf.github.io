// ===== Journal-only logic (nav/theme removed for NBCC embed) =====
    const todayEl = document.getElementById("today");
    const dateEl = document.getElementById("date");
    const emailEl = document.getElementById("email");
    const g1El = document.getElementById("g1");
    const g2El = document.getElementById("g2");
    const g3El = document.getElementById("g3");
    const lookEl = document.getElementById("look");
    const sref = document.getElementById("scripture_ref");

    const saveBtn = document.getElementById("saveBtn");
    const saveNewBtn = document.getElementById("saveNewBtn");
    const clearBtn = document.getElementById("clearBtn");

    const qEl = document.getElementById("q");
    const qEmailEl = document.getElementById("qEmail");
    const qFromEl = document.getElementById("qFrom");
    const qToEl = document.getElementById("qTo");

    const historyEl = document.getElementById("history");
    const emptyHistoryEl = document.getElementById("emptyHistory");

    // Use a distinct storage key so NBCC and JayTeeSF instances don't collide
    const STORAGE_KEY = "nbcc-crazy-gratitude-history";

    // ===== BLB helpers (kept) =====
    function blbSearchUrl(criteria, translation = 'ESV') {
      const base = 'https://www.blueletterbible.org/search/preSearch.cfm';
      const params = new URLSearchParams({ Criteria: criteria || '', t: translation, sort: 'Relevance' });
      return `${base}?${params.toString()}`;
    }
    const BOOK_SLUGS = {
      "Genesis":"gen","Exodus":"exo","Leviticus":"lev","Numbers":"num","Deuteronomy":"deu",
      "Joshua":"jos","Judges":"jdg","Ruth":"rut","1 Samuel":"1sa","2 Samuel":"2sa","1 Kings":"1ki","2 Kings":"2ki",
      "1 Chronicles":"1ch","2 Chronicles":"2ch","Ezra":"ezr","Nehemiah":"neh","Esther":"est","Job":"job",
      "Psalm":"psa","Psalms":"psa","Proverbs":"pro","Ecclesiastes":"ecc","Song of Solomon":"son",
      "Isaiah":"isa","Jeremiah":"jer","Lamentations":"lam","Ezekiel":"eze","Daniel":"dan","Hosea":"hos",
      "Joel":"joe","Amos":"amo","Obadiah":"oba","Jonah":"jon","Micah":"mic","Nahum":"nam","Habakkuk":"hab",
      "Zephaniah":"zep","Haggai":"hag","Zechariah":"zec","Malachi":"mal",
      "Matthew":"mat","Mark":"mrk","Luke":"luk","John":"jhn","Acts":"act","Romans":"rom",
      "1 Corinthians":"1co","2 Corinthians":"2co","Galatians":"gal","Ephesians":"eph","Philippians":"phl","Colossians":"col",
      "1 Thessalonians":"1th","2 Thessalonians":"2th","1 Timothy":"1ti","2 Timothy":"2ti","Titus":"tit","Philemon":"phm",
      "Hebrews":"heb","James":"jas","1 Peter":"1pe","2 Peter":"2pe","1 John":"1jo","2 John":"2jo","3 John":"3jo",
      "Jude":"jud","Revelation":"rev"
    };
    function toBlbVerseUrl(ref, translation = "esv") {
      if (!ref) return null;
      const m = ref.match(/^\s*([1-3]?\s?[A-Za-z. ]+?)\s+(\d+):(\d+)\s*$/);
      if (!m) return null;
      const bookName = m[1].replace(/\.$/, "").replace(/\s+/g, " ").trim();
      const chap = m[2], verse = m[3];
      const slug = BOOK_SLUGS[bookName] || BOOK_SLUGS[(bookName||"").replace(/\.$/,"")];
      if (!slug) return null;
      return `https://www.blueletterbible.org/verse/${translation.toLowerCase()}/${slug}/${chap}/${verse}/`;
    }

    // ===== Date helpers (local-safe) =====
    function localIsoFromDate(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`; // local YYYY-MM-DD
    }
    function localIsoToday() { return localIsoFromDate(new Date()); }
    function parseYmdLocal(s) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
      if (!m) return new Date(s); // fallback
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // local midnight
    }
    function fmtDate(d) {
      const dd = (typeof d === 'string') ? parseYmdLocal(d) : new Date(d);
      return dd.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
    }

    // ===== Data & renderer (kept from original) =====
    const TOPIC_VERSES = {
      gratitude: ['Psalm 107:1','1 Thessalonians 5:18','Colossians 3:15','Psalm 103:1-5','Philippians 4:6','James 1:17','Psalm 118:24','Ephesians 5:20','Psalm 136:1','Hebrews 13:15'],
      hope: ['Jeremiah 29:11','Romans 15:13','Lamentations 3:22-24','Psalm 42:5','Hebrews 6:19'],
      peace: ['John 14:27','Philippians 4:7','Isaiah 26:3','Colossians 3:15','Psalm 29:11']
    };
    function uid() { return `g_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`; }
    const now = new Date();
    todayEl.textContent = now.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" });
    dateEl.valueAsDate = now;

    function loadHistory(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
    function saveHistory(rows){ localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }
    function escapeHtml(str){ return (str || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;","&gt;": "&gt;","\"":"&quot;"}[c])); }

    // ---- One-time migration of existing UTC-saved dates ----
    function migrateHistoryDates(rows) {
      let changed = false;
      for (const r of rows) {
        if (!r || !r.date || !r.createdAt) continue;
        const created = new Date(r.createdAt);
        const utcDay = created.toISOString().slice(0,10);
        const localDay = localIsoFromDate(created);
        if (r.date === utcDay && r.date !== localDay) {
          r.date = localDay;
          changed = true;
        }
      }
      if (changed) saveHistory(rows);
      return rows;
    }

    function createEntryFromForm() {
      return {
        id: uid(),
        email: emailEl.value.trim(),
        date: dateEl.value || localIsoToday(),
        g1: g1El.value.trim(),
        g2: g2El.value.trim(),
        g3: g3El.value.trim(),
        look: lookEl.value.trim(),
        scripture_ref: sref.value.trim(),
        scripture_url: (toBlbVerseUrl(sref.value || "") || undefined),
        createdAt: new Date().toISOString()
      };
    }
    function upsertEntry(entry){ const rows = loadHistory(); const i = rows.findIndex(r => r.id===entry.id); if(i>=0) rows[i]=entry; else rows.push(entry); saveHistory(rows); renderHistory(); }
    function deleteEntry(id){ saveHistory(loadHistory().filter(r=>r.id!==id)); renderHistory(); }

    function applyFilters(rows) {
      const q = (qEl.value||"").toLowerCase();
      const qe = (qEmailEl.value||"").toLowerCase();
      const from = qFromEl.value ? parseYmdLocal(qFromEl.value) : null;
      const to = qToEl.value ? parseYmdLocal(qToEl.value) : null;
      return rows.filter(r => {
        const hay = [r.g1,r.g2,r.g3,r.look,r.scripture_ref].join(" · ").toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (qe && !(r.email||"").toLowerCase().includes(qe)) return false;
        const d = parseYmdLocal(r.date);
        if (from && d < from) return false;
        if (to) { const end = new Date(to); end.setHours(23,59,59,999); if (d > end) return false; }
        return true;
      });
    }
    function historyItemHtml(r) {
      const scriptureHtml = r.scripture_ref ? (() => {
        const direct = r.scripture_url || toBlbVerseUrl(r.scripture_ref);
        const fallback = blbSearchUrl(r.scripture_ref);
        const href = direct || fallback;
        return `<div class="inline-form-help">Scripture: <a href="${href}" target="_blank" rel="noopener">${escapeHtml(r.scripture_ref)}</a></div>`;
      })() : "";
      return `
        <h4>
          <span>${fmtDate(r.date)} ${r.email ? `<span class="pill">${escapeHtml(r.email)}</span>` : ""}</span>
          <span>
            <button class="icon-btn" data-edit="${r.id}" title="Edit">✎</button>
            <button class="icon-btn" data-del="${r.id}" title="Delete">🗑</button>
          </span>
        </h4>
        <ul class="list" style="margin:.5rem 0 .7rem">
          <li><strong>1)</strong> ${escapeHtml(r.g1)}</li>
          <li><strong>2)</strong> ${escapeHtml(r.g2)}</li>
          <li><strong>3)</strong> ${escapeHtml(r.g3)}</li>
          <li><strong>Looking forward:</strong> ${escapeHtml(r.look)}</li>
        </ul>
        ${scriptureHtml}
      `;
    }
    function renderHistory() {
      const all = migrateHistoryDates(loadHistory()).sort((a,b) =>
        parseYmdLocal(b.date) - parseYmdLocal(a.date) ||
        new Date(b.createdAt||0) - new Date(a.createdAt||0)
      );
      const rows = applyFilters(all);
      historyEl.innerHTML = "";
      if (!rows.length) { emptyHistoryEl.hidden = false; return; }
      emptyHistoryEl.hidden = true;
      for (const r of rows) {
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = historyItemHtml(r);
        historyEl.appendChild(div);
      }
      historyEl.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => loadIntoComposer(btn.getAttribute('data-edit'))));
      historyEl.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del');
        if (confirm('Delete this entry?')) deleteEntry(id);
      }));
    }
    function loadIntoComposer(id) {
      const r = loadHistory().find(x => x.id === id);
      if (!r) return;
      emailEl.value = r.email || '';

      const d = parseYmdLocal(r.date || localIsoToday());
      dateEl.value = localIsoFromDate(d);
      dateEl.valueAsDate = d;

      g1El.value = r.g1 || '';
      g2El.value = r.g2 || '';
      g3El.value = r.g3 || '';
      lookEl.value = r.look || '';
      sref.value = r.scripture_ref || '';
      saveBtn.dataset.editing = id;
      saveNewBtn.dataset.editing = id;
      updateOpenVerseLink();
    }
    function clearComposer() {
      g1El.value = g2El.value = g3El.value = lookEl.value = sref.value = '';
      delete saveBtn.dataset.editing;
      delete saveNewBtn.dataset.editing;
      updateOpenVerseLink();
    }

    saveBtn.addEventListener('click', () => {
      const editing = saveBtn.dataset.editing;
      if (editing) {
        const rows = loadHistory();
        const idx = rows.findIndex(r => r.id === editing);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...createEntryFromForm(), id: editing };
          saveHistory(rows);
        }
      } else {
        upsertEntry(createEntryFromForm());
      }
      renderHistory();
    });
    saveNewBtn.addEventListener('click', () => {
      const editing = saveNewBtn.dataset.editing;
      if (editing) {
        const rows = loadHistory();
        const idx = rows.findIndex(r => r.id === editing);
        if (idx >= 0) rows[idx] = { ...rows[idx], ...createEntryFromForm(), id: editing };
        saveHistory(rows);
      } else {
        upsertEntry(createEntryFromForm());
      }
      clearComposer();
      dateEl.valueAsDate = new Date();
      renderHistory();
    });
    clearBtn.addEventListener('click', clearComposer);

    document.getElementById('purgeBtn').addEventListener('click', () => {
      if (confirm('Delete ALL saved entries on your device? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
      }
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '[]'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'crazy-gratitude-history.json'; a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('importInput').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      try {
        const incoming = JSON.parse(text);
        const map = new Map();
        for (const r of loadHistory()) map.set(r.id, r);
        for (const r of Array.isArray(incoming) ? incoming : []) map.set(r.id || uid(), { id: r.id || uid(), ...r });
        const merged = Array.from(map.values());
        migrateHistoryDates(merged);
        saveHistory(merged);
        renderHistory();
      } catch(_) { alert('Invalid JSON file.'); }
      e.target.value = '';
    });

    document.getElementById('filterBtn').addEventListener('click', renderHistory);
    document.getElementById('resetBtn').addEventListener('click', () => {
      qEl.value = qEmailEl.value = qFromEl.value = qToEl.value = '';
      renderHistory();
    });

    // ===== Live topic suggestions + BLB form binding =====
    const topicEl = document.getElementById('topic');
    const suggestionsEl = document.getElementById('suggestions');
    const blbCriteria = document.getElementById('blbCriteria');
    const blbTranslation = document.getElementById('blbTranslation');
    function pickRandom(arr, n=5) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(n, copy.length));
    }
    function renderSuggestions(topic='gratitude') {
      const key = (topic||'').toLowerCase().trim();
      const pool = TOPIC_VERSES[key] || [];
      const picks = pool.length ? pickRandom(pool, 5) : [];
      suggestionsEl.innerHTML = '';
      if (!picks.length) {
        const div = document.createElement('div');
        div.className = 'inline-form-help';
        const href = blbSearchUrl(topic || '');
        div.innerHTML = `No built-in list for that topic. Try <a href="${href}" target="_blank" rel="noopener">BLB topic search</a>.`;
        suggestionsEl.appendChild(div);
        return;
      }
      for (const ref of picks) {
        const row = document.createElement('div');
        row.className = 'suggest-item';
        const verseUrl = toBlbVerseUrl(ref) || blbSearchUrl(ref, blbTranslation.value || 'ESV');
        row.innerHTML = `<a href="${verseUrl}" target="_blank" rel="noopener">${ref}</a>
                         <button class="icon-btn" data-use="${ref}">Use</button>`;
        suggestionsEl.appendChild(row);
      }
      suggestionsEl.querySelectorAll('[data-use]').forEach(btn => btn.addEventListener('click', () => {
        sref.value = btn.getAttribute('data-use');
        updateOpenVerseLink();
      }));
    }
    function updateTopicBindings() {
      const val = topicEl.value || 'gratitude';
      blbCriteria.value = val;
      renderSuggestions(val);
    }
    topicEl.addEventListener('input', updateTopicBindings);

    // This element may not be present; guard safely.
    const openVerseLink = document.getElementById('openVerseLink');
    function updateOpenVerseLink() {
      if (!openVerseLink) return;
      const url = toBlbVerseUrl(sref.value || '');
      openVerseLink.href = url || '#';
      openVerseLink.style.pointerEvents = url ? 'auto' : 'none';
    }
    sref.addEventListener('input', updateOpenVerseLink);

    // initial state
    updateTopicBindings();
    updateOpenVerseLink();
    renderHistory();

    // ===== CSV (kept) =====
    function toCsv(rows) {
      const headers = ['id','email','date','g1','g2','g3','look','scripture_ref','scripture_url','createdAt'];
      const escapeCsv = (v) => {
        const s = (v==null? '' : String(v));
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
      };
      const lines = [headers.join(',')];
      for (const r of rows) lines.push(headers.map(h => escapeCsv(r[h])).join(','));
      return lines.join('\r\n');
    }
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      const csv = toCsv(loadHistory());
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'crazy-gratitude-history.csv'; a.click();
      URL.revokeObjectURL(url);
    });

    (function runTests(){
      try {
        const s1 = blbSearchUrl('gratitude');
        console.assert(s1.includes('preSearch.cfm') && s1.includes('Criteria=gratitude') && s1.includes('sort=Relevance') && s1.includes('t=ESV'), 'blbSearchUrl ok');
        const v1 = toBlbVerseUrl('James 1:17');
        console.assert(v1 && /\/verse\/esv\/jas\/1\/17\//.test(v1), 'verse URL ok');
        console.info('Inline tests passed.');
      } catch (e) { console.error('Inline tests failed:', e); }
    })();
