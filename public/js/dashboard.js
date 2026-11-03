'use strict';
(() => {
  const { $, $$, esc, fmtBytes, timeAgo, fmtUptime, toast, copy, download, token, setToken, api } = window.SV;

  const state = { info: null, status: null, peers: [], tab: 'overview', guide: 'android', method: 'tailscale', providers: null, providerFilter: 'all', polling: null };

  const PLATFORMS = {
    android: { label: 'أندرويد', icon: '🤖' },
    ios: { label: 'آيفون / آيباد', icon: '🍎' },
    windows: { label: 'ويندوز', icon: '🪟' },
    macos: { label: 'ماك', icon: '💻' },
    linux: { label: 'لينكس', icon: '🐧' },
    router: { label: 'راوتر', icon: '📡' },
    other: { label: 'جهاز آخر', icon: '🔌' }
  };

  const TAB_META = {
    overview: ['نظرة عامة', 'حالة شبكتك السعودية الخاصة'],
    devices: ['أجهزتي', 'أضف وأدر أجهزة عائلتك'],
    ready: ['حلول جاهزة', 'خدمات خارجية بسيرفرات سعودية بدون إعداد خادم'],
    server: ['الخادم السعودي', 'حوّل أي خادم سعودي إلى VPN خاص بك'],
    guides: ['أدلة التوصيل', 'خطوات التوصيل لكل نوع جهاز'],
    check: ['فحص الاتصال', 'تأكد أنك تتصفح من السعودية فعلًا'],
    settings: ['الإعدادات', 'إعدادات الشبكة والحساب']
  };

  /* ================= الأدلة ================= */
  const GUIDES = {
    android: {
      icon: '🤖', title: 'التوصيل من أندرويد',
      steps: [
        'ثبّت تطبيق <b>WireGuard</b> الرسمي من Google Play.',
        'من لوحة التحكم افتح <b>أجهزتي ← QR والإعداد</b> لجهازك.',
        'في تطبيق WireGuard اضغط <b>+</b> ثم <b>Scan from QR code</b> وامسح الرمز الظاهر في اللوحة.',
        'سمِّ النفق مثلًا <b>Saudi VPN</b> واحفظه.',
        'فعّل المفتاح بجانب اسم النفق، ووافق على إذن إضافة إعداد VPN.',
        'ارجع لتبويب <b>فحص الاتصال</b> هنا وتأكد أن IP أصبح سعوديًا 🇸🇦'
      ],
      links: [['تحميل WireGuard لأندرويد', 'https://play.google.com/store/apps/details?id=com.wireguard.android']]
    },
    ios: {
      icon: '🍎', title: 'التوصيل من آيفون / آيباد',
      steps: [
        'ثبّت تطبيق <b>WireGuard</b> الرسمي من App Store.',
        'من اللوحة افتح <b>أجهزتي ← QR والإعداد</b> واعرض رمز QR.',
        'في التطبيق اضغط <b>+</b> ثم <b>Create from QR code</b> وامسح الرمز.',
        'سمِّ النفق <b>Saudi VPN</b> واسمح بإضافة إعداد VPN.',
        'فعّل المفتاح الأخضر، ثم تحقق من تبويب <b>فحص الاتصال</b>.'
      ],
      links: [['تحميل WireGuard لآيفون', 'https://apps.apple.com/app/wireguard/id1441195209']]
    },
    windows: {
      icon: '🪟', title: 'التوصيل من ويندوز',
      steps: [
        'حمّل وثبّت برنامج <b>WireGuard</b> من الموقع الرسمي.',
        'من اللوحة اضغط <b>⬇ .conf</b> بجانب جهازك لتحميل ملف الإعداد.',
        'افتح برنامج WireGuard واضغط <b>Import tunnel(s) from file</b> واختر الملف.',
        'اضغط <b>Activate</b> لتشغيل النفق.',
        'تحقق من تبويب <b>فحص الاتصال</b> أن عنوانك أصبح سعوديًا.'
      ],
      links: [['تحميل WireGuard لويندوز', 'https://www.wireguard.com/install/']]
    },
    macos: {
      icon: '💻', title: 'التوصيل من ماك',
      steps: [
        'ثبّت تطبيق <b>WireGuard</b> من Mac App Store.',
        'حمّل ملف <b>.conf</b> الخاص بجهازك من اللوحة.',
        'في التطبيق: <b>File ← Import tunnel(s) from file</b> واختر الملف.',
        'اضغط <b>Activate</b> واسمح بإضافة إعداد VPN.',
        'تحقق من تبويب <b>فحص الاتصال</b>.'
      ],
      links: [['تحميل WireGuard لماك', 'https://apps.apple.com/app/wireguard/id1451685025']]
    },
    linux: {
      icon: '🐧', title: 'التوصيل من لينكس',
      steps: [
        'ثبّت الأدوات: <code class="ltr">sudo apt install wireguard openresolv</code>',
        'حمّل ملف الإعداد من اللوحة وانسخه: <code class="ltr">sudo cp saudia-xxxx.conf /etc/wireguard/wg0.conf</code>',
        'شغّل النفق: <code class="ltr">sudo wg-quick up wg0</code>',
        'للتشغيل التلقائي عند الإقلاع: <code class="ltr">sudo systemctl enable wg-quick@wg0</code>',
        'تحقق: <code class="ltr">curl -s https://api.ipify.org</code> يجب أن يظهر IP الخادم السعودي.'
      ],
      links: [['دليل WireGuard الرسمي', 'https://www.wireguard.com/quickstart/']]
    },
    router: {
      icon: '📡', title: 'التوصيل من الراوتر',
      steps: [
        'تأكد أن راوترك يدعم WireGuard (مثل OpenWrt أو GL.iNet أو MikroTik).',
        'حمّل ملف <b>.conf</b> من اللوحة (أضف جهازًا بنوع «راوتر»).',
        'في GL.iNet: <b>VPN ← WireGuard Client ← Add a New Profile</b> وارفع الملف أو الصق الإعداد.',
        'في OpenWrt: ثبّت <code class="ltr">luci-proto-wireguard</code> وأضف واجهة WireGuard بالقيم من الملف.',
        'فعّل النفق، وستتصفح كل أجهزة المنزل عبر IP السعودي تلقائيًا.'
      ],
      links: [['دليل GL.iNet', 'https://docs.gl-inet.com/en/4/features/vpn/'], ['دليل OpenWrt', 'https://openwrt.org/docs/guide-user/services/vpn/wireguard/client']]
    }
  };

  /* ================= مودال ================= */
  function openModal(html) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-overlay"><div class="modal">${html}</div></div>`;
    const overlay = $('.modal-overlay');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    const close = $('.modal-close');
    if (close) close.addEventListener('click', closeModal);
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }

  /* ================= عرض عام ================= */
  function showLogin() {
    stopPolling();
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    $('#demoHint').classList.toggle('hidden', state.info?.mode !== 'demo');
    setTimeout(() => $('#loginPassword')?.focus(), 100);
  }

  function showApp() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    renderAll();
    startPolling();
    const wanted = new URLSearchParams(location.search).get('tab');
    switchTab(wanted && TAB_META[wanted] ? wanted : 'ready');
  }

  function renderAll() {
    renderMode();
    renderOverview();
    renderDevices();
    fillSettings();
    renderServerCommands();
    renderServerMethod();
    renderGuidePills();
    renderGuide(state.guide);
    renderReady();
  }

  function renderMode() {
    const demo = state.info?.mode === 'demo';
    const badge = $('#modeBadge');
    badge.className = 'badge ' + (demo ? 'badge-amber' : 'badge-green');
    badge.innerHTML = `<span class="dot pulse"></span>${demo ? 'وضع المعاينة' : 'خادم مباشر 🇸🇦'}`;
    $('#demoBanner').classList.toggle('hidden', !demo);
    $('#chartModeBadge').textContent = demo ? 'بيانات تجريبية' : 'بيانات حقيقية';
    $('#aboutVersion').textContent = state.info?.version || '—';
    $('#aboutMode').textContent = demo ? 'معاينة تجريبية' : 'مباشر (Live)';
    $('#dangerCard').classList.toggle('hidden', !demo);

    const pill = $('#serverPill');
    if (demo) {
      pill.className = 'badge badge-amber';
      pill.innerHTML = '<span class="dot"></span>غير مرتبط بخادم حقيقي';
    } else if (state.status?.server?.linked) {
      pill.className = 'badge badge-green';
      pill.innerHTML = '<span class="dot pulse"></span>متصل بـ WireGuard';
    } else {
      pill.className = 'badge badge-red';
      pill.innerHTML = '<span class="dot"></span>WireGuard غير متاح';
    }
  }

  /* ================= نظرة عامة ================= */
  function renderOverview() {
    const s = state.status;
    if (!s) return;
    const cards = [
      { ico: '📱', val: `${s.stats.peersEnabled}/${s.stats.peersTotal}`, lbl: 'أجهزة مفعّلة' },
      { ico: '🟢', val: s.stats.activeNow, lbl: 'متصل الآن' },
      { ico: '📦', val: fmtBytes(s.stats.rx + s.stats.tx), lbl: 'إجمالي البيانات' },
      { ico: '⏱️', val: fmtUptime(s.uptimeSec), lbl: 'مدة تشغيل اللوحة' }
    ];
    $('#statGrid').innerHTML = cards.map((c) => `
      <div class="card stat-card">
        <div class="stat-icon">${c.ico}</div>
        <div><div class="val">${esc(c.val)}</div><div class="lbl">${c.lbl}</div></div>
      </div>`).join('');

    const srv = s.server;
    const key = srv.publicKey || '';
    const rows = [
      ['الموقع', 'السعودية 🇸🇦'],
      ['العنوان', srv.endpoint ? `<span class="ltr">${esc(srv.endpoint)}:${esc(srv.port)}</span>` : '<span class="muted">غير محدد بعد</span>'],
      ['البروتوكول', 'WireGuard (UDP)'],
      ['DNS', `<span class="ltr">${esc(srv.dns)}</span>`],
      ['شبكة النفق', `<span class="ltr">${esc(srv.network)}</span>`],
      ['المفتاح العام', key ? `<span class="mono" style="font-size:11.5px;">${esc(key.slice(0, 14))}…</span><button class="icon-btn" data-copy="${esc(key)}" title="نسخ المفتاح">⧉</button>` : '—'],
      ['الحالة', srv.linked ? '<span class="badge badge-green">مباشر</span>' : '<span class="badge badge-amber">معاينة</span>']
    ];
    $('#serverKv').innerHTML = rows.map(([k, v]) => `<div class="kv-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
    drawChart(s.stats.history || []);
  }

  function drawChart(history) {
    const canvas = $('#trafficChart');
    if (!canvas || !canvas.parentElement) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const pts = [];
    for (let i = 1; i < history.length; i++) {
      pts.push({
        rx: Math.max(0, (history[i].rx || 0) - (history[i - 1].rx || 0)),
        tx: Math.max(0, (history[i].tx || 0) - (history[i - 1].tx || 0))
      });
    }
    if (!pts.length) {
      ctx.fillStyle = '#8fa89b';
      ctx.font = '14px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد بيانات بعد — أضف جهازًا وفعّل النفق', W / 2, H / 2);
      return;
    }
    const max = Math.max(...pts.map((p) => Math.max(p.rx, p.tx)), 1);
    const slot = W / pts.length;
    const bw = Math.max(3, slot / 2 - 3);
    pts.forEach((p, i) => {
      const x = i * slot + 2;
      const rh = Math.max(2, (p.rx / max) * (H - 20));
      const th = Math.max(2, (p.tx / max) * (H - 20));
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x, H - rh - 2, bw, rh);
      ctx.fillStyle = '#d9b45b';
      ctx.fillRect(x + bw + 2, H - th - 2, bw, th);
    });
  }

  /* ================= الأجهزة ================= */
  function peerStatus(p) {
    if (!p.enabled) return { cls: '', txt: 'موقوف', pulse: false };
    const now = Math.floor(Date.now() / 1000);
    if (p.lastHandshake && now - p.lastHandshake < 180) return { cls: 'badge-green', txt: 'نشط', pulse: true };
    return { cls: 'badge-amber', txt: 'غير متصل', pulse: false };
  }

  function renderDevices() {
    const grid = $('#peerGrid');
    const empty = $('#peerEmpty');
    if (!state.peers.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = state.peers.map((p) => {
      const st = peerStatus(p);
      const plat = PLATFORMS[p.platform] || PLATFORMS.other;
      return `
      <div class="card peer-card">
        <div class="peer-head">
          <div class="peer-avatar">${plat.icon}</div>
          <div style="flex:1;min-width:0;">
            <div class="p-name">${esc(p.name)}</div>
            <div class="p-ip">${esc(p.ip)}</div>
          </div>
          <label class="switch" title="تفعيل / إيقاف">
            <input type="checkbox" ${p.enabled ? 'checked' : ''} data-toggle="${p.id}">
            <span class="slider"></span>
          </label>
        </div>
        <div><span class="badge ${st.cls}"><span class="dot ${st.pulse ? 'pulse' : ''}"></span>${st.txt}</span></div>
        <div class="peer-stats">
          <span>⬇ <b>${fmtBytes(p.rx)}</b></span>
          <span>⬆ <b>${fmtBytes(p.tx)}</b></span>
          <span>🕒 ${timeAgo(p.lastHandshake)}</span>
        </div>
        <div class="peer-actions">
          <button class="btn btn-ghost btn-sm" data-qr="${p.id}">📷 QR والإعداد</button>
          <button class="btn btn-ghost btn-sm" data-conf="${p.id}">⬇ .conf</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}" title="حذف">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  function openAddModal() {
    openModal(`
      <div class="modal-head">
        <h3>📱 إضافة جهاز جديد</h3>
        <button class="modal-close" aria-label="إغلاق">✕</button>
      </div>
      <form id="addPeerForm">
        <div class="field">
          <label for="peerName">اسم الجهاز</label>
          <input class="input" id="peerName" placeholder="مثال: آيفون محمد" maxlength="40" required>
        </div>
        <div class="field">
          <label for="peerPlatform">نوع الجهاز</label>
          <select class="select" id="peerPlatform">
            ${Object.entries(PLATFORMS).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="submit">إنشاء الجهاز وتوليد الإعداد</button>
        </div>
      </form>
    `);
    $('#addPeerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target);
      btn.disabled = true;
      try {
        const data = await api('/peers', {
          method: 'POST',
          body: { name: $('#peerName').value, platform: $('#peerPlatform').value }
        });
        toast('تم إنشاء الجهاز ✓', 'ok');
        closeModal();
        await refreshData();
        openQrModalWithData(data);
      } catch (err) {
        toast(err.message, 'err');
        btn.disabled = false;
      }
    });
    setTimeout(() => $('#peerName')?.focus(), 100);
  }

  function openQrModalWithData(data) {
    const p = data.peer;
    const plat = PLATFORMS[p.platform] || PLATFORMS.other;
    openModal(`
      <div class="modal-head">
        <h3>${plat.icon} ${esc(p.name)}</h3>
        <button class="modal-close" aria-label="إغلاق">✕</button>
      </div>
      <p class="muted" style="font-size:13.5px;margin-bottom:14px;">
        امسح الرمز بتطبيق WireGuard على الجهاز، أو حمّل ملف الإعداد و استورده في التطبيق.
      </p>
      <div class="qr-wrap"><img src="${data.qr}" alt="رمز QR لإعداد WireGuard"></div>
      <div class="field">
        <label>ملف الإعداد الكامل</label>
        <textarea class="textarea" readonly rows="10">${esc(data.config)}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="qrCopyBtn">⧉ نسخ الإعداد</button>
        <button class="btn btn-ghost" id="qrDownloadBtn">⬇ تحميل .conf</button>
      </div>
    `);
    $('#qrCopyBtn').addEventListener('click', () => copy(data.config));
    $('#qrDownloadBtn').addEventListener('click', () => download(`saudia-${p.id.slice(0, 8)}.conf`, data.config));
  }

  async function openQrModal(id) {
    try {
      const data = await api('/peers/' + id);
      openQrModalWithData(data);
    } catch (err) { toast(err.message, 'err'); }
  }

  async function downloadConf(id) {
    try {
      const data = await api('/peers/' + id);
      download(`saudia-${id.slice(0, 8)}.conf`, data.config);
      toast('تم تحميل ملف الإعداد ✓', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  }

  function confirmDelete(id) {
    const p = state.peers.find((x) => x.id === id);
    if (!p) return;
    openModal(`
      <div class="modal-head">
        <h3>🗑 حذف الجهاز</h3>
        <button class="modal-close" aria-label="إغلاق">✕</button>
      </div>
      <p style="margin-bottom:6px;">هل أنت متأكد من حذف <b>${esc(p.name)}</b>؟</p>
      <p class="muted" style="font-size:13.5px;margin-bottom:18px;">سيتوقف هذا الجهاز فورًا عن الاتصال ولن يعمل ملف الإعداد الخاص به بعد الآن.</p>
      <div class="modal-actions">
        <button class="btn btn-danger" id="confirmDelBtn">نعم، احذف الجهاز</button>
        <button class="btn btn-ghost" id="cancelDelBtn">إلغاء</button>
      </div>
    `);
    $('#cancelDelBtn').addEventListener('click', closeModal);
    $('#confirmDelBtn').addEventListener('click', async () => {
      try {
        await api('/peers/' + id, { method: 'DELETE' });
        toast('تم حذف الجهاز', 'ok');
        closeModal();
        await refreshData();
      } catch (err) { toast(err.message, 'err'); }
    });
  }

  async function togglePeer(id, enabled) {
    try {
      await api('/peers/' + id, { method: 'PATCH', body: { enabled } });
      toast(enabled ? 'تم تفعيل الجهاز ✓' : 'تم إيقاف الجهاز', 'ok');
      await refreshData();
    } catch (err) {
      toast(err.message, 'err');
      await refreshData();
    }
  }

  /* ================= حلول جاهزة ================= */
  const RECOMMENDATIONS = {
    easy: { title: 'أسهل للمبتدئ', ids: ['surfshark', 'ipvanish'], why: 'تطبيقات جاهزة، اختر السعودية واتصل. مناسب إذا كنت لا تريد أوامر أو إعداد خادم.' },
    privacy: { title: 'خصوصية قوية', ids: ['proton'], why: 'Proton VPN Plus خيار معروف للخصوصية، لكن السعودية تحتاج خطة مدفوعة.' },
    refund: { title: 'تجربة/استرجاع طويل', ids: ['cyberghost', 'surfshark'], why: 'جرّب الخدمة، افحص IP، واطلب الاسترجاع خلال المدة المعلنة إذا لم تناسبك.' },
    streaming: { title: 'مشاهدة فقط', ids: ['unlocator', 'surfshark'], why: 'Smart DNS مناسب للمشاهدة فقط، بينما VPN كامل يغيّر IP لكل التصفح.' },
    static: { title: 'IP ثابت للبنوك/الأعمال', ids: ['netspace'], why: 'بعض الخدمات تحتاج IP ثابتًا. هذا خيار أعمال وقد يتطلب تحقق هوية.' }
  };

  async function ensureProviders() {
    if (state.providers) return state.providers;
    const res = await fetch('/data/providers.json');
    if (!res.ok) throw new Error('تعذر تحميل قائمة الخدمات');
    state.providers = await res.json();
    return state.providers;
  }

  function providerCard(p) {
    const badges = [
      p.trial ? `<span class="badge badge-green">${esc(p.trial)}</span>` : '',
      p.refund ? `<span class="badge badge-blue">${esc(p.refund)}</span>` : '',
      p.devices ? `<span class="badge">${esc(p.devices)}</span>` : ''
    ].filter(Boolean).join('');
    return `
      <div class="card ready-card">
        <div class="ready-head">
          <div class="ready-logo">${p.emoji || '🌐'}</div>
          <div>
            <h3>${esc(p.name)}</h3>
            <div class="muted">${esc(p.saudiLabel || '')}</div>
          </div>
        </div>
        <div class="ready-meta">${badges}</div>
        <p style="font-size:14px;"><b>الأنسب لـ:</b> ${esc(p.bestFor || '')}</p>
        <p class="muted" style="font-size:13px;">${esc(p.caution || '')}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;">
          <button class="btn btn-primary btn-sm" data-provider-steps="${esc(p.id)}">الخطوات</button>
          <a class="btn btn-ghost btn-sm" href="${esc(p.signup || p.url)}" target="_blank" rel="noopener">الموقع الرسمي</a>
          <a class="btn btn-ghost btn-sm" href="${esc(p.download || p.url)}" target="_blank" rel="noopener">التطبيق</a>
          <button class="btn btn-ghost btn-sm" data-goto="check">افحص IP بعد الاتصال</button>
        </div>
      </div>`;
  }

  async function renderReady() {
    const grid = $('#readyGrid');
    if (!grid) return;
    try {
      const data = await ensureProviders();
      const list = (data.providers || []).filter((p) => state.providerFilter === 'all' || p.category === state.providerFilter);
      grid.innerHTML = list.map(providerCard).join('') || '<div class="card empty-state"><h3>لا توجد خدمات في هذا التصنيف</h3></div>';
      const updated = $('#readyUpdated');
      if (updated) updated.textContent = `آخر تحديث للقائمة: ${data.updatedAt || 'غير معروف'} • ${data.disclaimer || ''}`;
    } catch (err) {
      grid.innerHTML = `<div class="card empty-state"><h3>تعذر تحميل الخدمات</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  async function showRecommendation(key) {
    const reco = RECOMMENDATIONS[key];
    const box = $('#recoResult');
    if (!reco || !box) return;
    try {
      await ensureProviders();
      const picks = (state.providers.providers || []).filter((p) => reco.ids.includes(p.id));
      box.classList.remove('hidden');
      box.innerHTML = `
        <div class="banner banner-green" style="margin-bottom:12px;">✅ <span><b>${esc(reco.title)}:</b> ${esc(reco.why)}</span></div>
        <div class="ready-grid">${picks.map(providerCard).join('')}</div>`;
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  function openProviderSteps(id) {
    if (!state.providers) return;
    const p = (state.providers.providers || []).find((x) => x.id === id);
    if (!p) return;
    openModal(`
      <div class="modal-head">
        <h3>${p.emoji || '🌐'} ${esc(p.name)}</h3>
        <button class="modal-close" aria-label="إغلاق">✕</button>
      </div>
      <p class="muted" style="font-size:13.5px;margin-bottom:14px;">${esc(p.saudiLabel || '')} • ${esc(p.priceNote || '')}</p>
      <ol class="guide-steps">
        ${(p.steps || []).map((s) => `<li><div class="g-text">${esc(s)}</div></li>`).join('')}
      </ol>
      <div class="banner" style="margin-top:16px;">⚠️ <span>${esc(p.caution || '')}</span></div>
      <div class="modal-actions">
        <a class="btn btn-primary" href="${esc(p.signup || p.url)}" target="_blank" rel="noopener">افتح الموقع الرسمي</a>
        <a class="btn btn-ghost" href="${esc(p.download || p.url)}" target="_blank" rel="noopener">تحميل التطبيق</a>
      </div>
      ${p.source ? `<p class="muted" style="font-size:12px;margin-top:12px;">المصدر: <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.source)}</a></p>` : ''}
    `);
  }

  /* ================= الخادم ================= */
  function renderServerCommands() {
    const origin = location.origin;
    const wireguard = $('#installCmd');
    const tailscale = $('#tailscaleCmd');
    const gcloud = $('#gcloudCmd');
    if (wireguard) wireguard.textContent = `curl -fsSL "${origin}/install.sh" | sudo bash`;
    if (tailscale) tailscale.textContent = `curl -fsSL "${origin}/tailscale-exit.sh" | sudo bash`;
    if (gcloud) gcloud.textContent = `curl -fsSL "${origin}/google-cloud.sh" | bash`;
  }

  function renderServerMethod() {
    $$('.method-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.method === state.method);
    });
    $$('.server-method').forEach((section) => {
      section.classList.toggle('hidden', section.id !== 'method-' + state.method);
    });
  }

  function setServerMethod(method) {
    if (!['tailscale', 'gcloud', 'wireguard'].includes(method)) return;
    state.method = method;
    renderServerMethod();
  }

  /* ================= الأدلة ================= */
  function renderGuidePills() {
    $('#guidePills').innerHTML = Object.entries(GUIDES).map(([k, g]) =>
      `<button class="pill ${k === state.guide ? 'active' : ''}" data-guide="${k}">${g.icon} ${GUIDES[k].title.replace('التوصيل من ', '')}</button>`
    ).join('');
  }

  function renderGuide(key) {
    const g = GUIDES[key] || GUIDES.android;
    state.guide = key;
    $('#guideIcon').textContent = g.icon;
    $('#guideTitle').textContent = g.title;
    $('#guideSteps').innerHTML = g.steps.map((s) => `<li><div class="g-text">${s}</div></li>`).join('');
    $('#guideLinks').innerHTML = g.links.map(([label, url]) =>
      `<a class="btn btn-ghost btn-sm" href="${url}" target="_blank" rel="noopener">⬇ ${label}</a>`
    ).join('');
    $$('#guidePills .pill').forEach((b) => b.classList.toggle('active', b.dataset.guide === key));
  }

  /* ================= فحص IP ================= */
  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌍';
    return cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  }

  async function checkIp() {
    const btn = $('#checkIpBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ الفحص...';
    $('#checkResult').classList.add('hidden');
    const providers = [
      { url: 'https://ipwho.is/', map: (d) => ({ ip: d.ip, cc: d.country_code, country: d.country, city: d.city, org: d.connection && d.connection.isp }) },
      { url: 'https://ipapi.co/json/', map: (d) => ({ ip: d.ip, cc: d.country_code, country: d.country_name, city: d.city, org: d.org }) },
      { url: 'https://api.ip.sb/geoip', map: (d) => ({ ip: d.ip, cc: d.country_code, country: d.country, city: d.city, org: d.isp }) }
    ];
    let info = null;
    for (const p of providers) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(p.url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d || !d.ip) throw new Error('رد غير صالح');
        info = p.map(d);
        break;
      } catch { /* جرّب المزود التالي */ }
    }
    btn.disabled = false;
    btn.textContent = '🔎 افحص IP الحالي';
    if (!info) {
      toast('تعذر فحص IP — تحقق من اتصال الإنترنت أو جرّب الروابط الخارجية', 'err');
      return;
    }
    $('#checkIp').textContent = info.ip;
    $('#checkLoc').textContent = [info.city, info.country].filter(Boolean).join('، ') || 'موقع غير معروف';
    $('#checkIsp').textContent = info.org || 'مزود غير معروف';
    const v = $('#checkVerdict');
    const flag = flagEmoji(info.cc);
    if (info.cc === 'SA') {
      v.className = 'verdict ok';
      v.innerHTML = `${flag} ممتاز! أنت الآن تتصفح بعنوان IP سعودي — المواقع المتاحة للسعودية فقط يفترض أن تعمل معك الآن.`;
    } else {
      v.className = 'verdict warn';
      v.innerHTML = `${flag} عنوانك الحالي ليس سعوديًا (${esc(info.country || 'غير معروف')}). فعّل نفق WireGuard ثم أعد الفحص.`;
    }
    $('#checkResult').classList.remove('hidden');
  }

  /* ================= الإعدادات ================= */
  function fillSettings() {
    const s = state.status?.settings;
    if (!s) return;
    $('#setEndpoint').value = s.endpointHost || '';
    $('#setPort').value = s.wgPort;
    $('#setDns').value = s.dns;
    $('#setMtu').value = s.mtu || '';
    $('#setAllowedIps').value = s.allowedIps;
  }

  /* ================= بيانات ================= */
  async function refreshData() {
    const [status, peers] = await Promise.all([api('/status'), api('/peers')]);
    state.status = status;
    state.peers = peers.peers;
    state.info.mode = status.mode;
    renderMode();
    renderOverview();
    renderDevices();
  }

  function startPolling() {
    stopPolling();
    state.polling = setInterval(() => {
      if (!token() || $('#appView').classList.contains('hidden')) return;
      refreshData().catch(() => {});
    }, 8000);
  }
  function stopPolling() {
    if (state.polling) clearInterval(state.polling);
    state.polling = null;
  }

  /* ================= أحداث ================= */
  function bindEvents() {
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#loginBtn');
      const errEl = $('#loginError');
      btn.disabled = true;
      errEl.textContent = '';
      try {
        const d = await api('/login', { method: 'POST', body: { password: $('#loginPassword').value } });
        setToken(d.token);
        $('#loginPassword').value = '';
        await refreshData();
        showApp();
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    $('#logoutBtn').addEventListener('click', async () => {
      try { await api('/logout', { method: 'POST' }); } catch { /* ignore */ }
      setToken(null);
      showLogin();
    });

    window.addEventListener('sv:unauthorized', showLogin);

    $$('#sideNav button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('#topAddDevice').addEventListener('click', openAddModal);
    $('#addDeviceBtn').addEventListener('click', openAddModal);
    $('#emptyAddBtn').addEventListener('click', openAddModal);
    $('#checkIpBtn').addEventListener('click', checkIp);
    $('#ghCmdBtn').addEventListener('click', () => $('#ghCmdBox').classList.toggle('hidden'));

    $('#settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const mtu = $('#setMtu').value.trim();
        await api('/settings', {
          method: 'PUT',
          body: {
            endpointHost: $('#setEndpoint').value.trim(),
            wgPort: Number($('#setPort').value),
            dns: $('#setDns').value.trim(),
            mtu: mtu === '' ? '' : Number(mtu),
            allowedIps: $('#setAllowedIps').value.trim()
          }
        });
        toast('تم حفظ الإعدادات ✓', 'ok');
        await refreshData();
        renderServerCommands();
      } catch (err) { toast(err.message, 'err'); }
    });

    $('#passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const d = await api('/password', {
          method: 'POST',
          body: { current: $('#pwCurrent').value, next: $('#pwNext').value }
        });
        setToken(d.token);
        $('#pwCurrent').value = '';
        $('#pwNext').value = '';
        toast('تم تحديث كلمة المرور ✓', 'ok');
      } catch (err) { toast(err.message, 'err'); }
    });

    $('#resetDemoBtn').addEventListener('click', () => {
      openModal(`
        <div class="modal-head">
          <h3>🧹 تصفير البيانات التجريبية</h3>
          <button class="modal-close" aria-label="إغلاق">✕</button>
        </div>
        <p class="muted" style="margin-bottom:18px;">سيتم حذف كل الأجهزة التجريبية وتصفير الإحصائيات. هل أنت متأكد؟</p>
        <div class="modal-actions">
          <button class="btn btn-danger" id="confirmResetBtn">نعم، صفّر الكل</button>
          <button class="btn btn-ghost" id="cancelResetBtn">إلغاء</button>
        </div>
      `);
      $('#cancelResetBtn').addEventListener('click', closeModal);
      $('#confirmResetBtn').addEventListener('click', async () => {
        try {
          await api('/demo/reset', { method: 'POST' });
          toast('تم التصفير ✓', 'ok');
          closeModal();
          await refreshData();
        } catch (err) { toast(err.message, 'err'); }
      });
    });

    /* تفويض النقرات */
    document.addEventListener('click', (e) => {
      const cp = e.target.closest('[data-copy]');
      if (cp) { copy(cp.dataset.copy); return; }
      const ct = e.target.closest('[data-copy-target]');
      if (ct) {
        const t = document.getElementById(ct.dataset.copyTarget);
        if (t) copy(t.textContent);
        return;
      }
      const goto = e.target.closest('[data-goto]');
      if (goto) {
        e.preventDefault();
        switchTab(goto.dataset.goto);
        if (goto.dataset.action === 'add') setTimeout(openAddModal, 150);
        return;
      }
      const method = e.target.closest('[data-method]');
      if (method) { setServerMethod(method.dataset.method); return; }
      const providerFilter = e.target.closest('[data-provider-filter]');
      if (providerFilter) {
        state.providerFilter = providerFilter.dataset.providerFilter;
        $$('#readyFilters .pill').forEach((b) => b.classList.toggle('active', b.dataset.providerFilter === state.providerFilter));
        renderReady();
        return;
      }
      const reco = e.target.closest('[data-reco]');
      if (reco) { showRecommendation(reco.dataset.reco); return; }
      const providerSteps = e.target.closest('[data-provider-steps]');
      if (providerSteps) { openProviderSteps(providerSteps.dataset.providerSteps); return; }
      const guide = e.target.closest('[data-guide]');
      if (guide) { renderGuide(guide.dataset.guide); return; }
      const qr = e.target.closest('[data-qr]');
      if (qr) { openQrModal(qr.dataset.qr); return; }
      const conf = e.target.closest('[data-conf]');
      if (conf) { downloadConf(conf.dataset.conf); return; }
      const del = e.target.closest('[data-del]');
      if (del) { confirmDelete(del.dataset.del); return; }
    });

    document.addEventListener('change', (e) => {
      const t = e.target.closest('[data-toggle]');
      if (t) togglePeer(t.dataset.toggle, t.checked);
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    window.addEventListener('resize', () => {
      if (state.tab === 'overview' && state.status) drawChart(state.status.stats.history || []);
    });
  }

  function switchTab(name) {
    state.tab = name;
    $$('#sideNav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    const [title, sub] = TAB_META[name] || ['', ''];
    $('#pageTitle').textContent = title;
    $('#pageSub').textContent = sub;
    if (name === 'overview' && state.status) drawChart(state.status.stats.history || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= إقلاع ================= */
  async function init() {
    bindEvents();
    try { state.info = await api('/public-info'); }
    catch { state.info = { mode: 'demo', version: '1.0.0' }; }
    if (!token()) return showLogin();
    try {
      await refreshData();
      showApp();
    } catch {
      showLogin();
    }
  }

  init();
})();
