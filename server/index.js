'use strict';
const express = require('express');
const path = require('path');
const config = require('./config');
const { loadStore } = require('./store');
const auth = require('./auth');
const wg = require('./wireguard');
const createApiRouter = require('./routes/api');
const createInstallRouter = require('./routes/install');

const store = loadStore(config.DATA_DIR);

/* تهيئة حساب المدير عند أول تشغيل */
if (!store.data.admin) {
  store.data.admin = auth.hashPassword(config.ADMIN_PASSWORD);
  store.save();
  if (config.MODE === 'live') {
    console.log('==============================================');
    console.log(' كلمة مرور المدير (احفظها الآن): ' + config.ADMIN_PASSWORD);
    console.log('==============================================');
  }
}

/* هوية الخادم */
let liveServer = null;
let liveError = null;
if (config.MODE === 'live') {
  try {
    liveServer = wg.readServerInfo(config.SERVER_INFO_PATH);
    liveServer.linked = true;
  } catch {
    liveError = 'لم يتم العثور على معلومات خادم WireGuard — شغّل سكربت التثبيت على الخادم السعودي أولاً';
  }
}
if (!store.data.server) {
  store.data.server = { ...wg.generateKeyPair(), demo: true };
  store.save();
}

function getServer() {
  if (config.MODE === 'live' && liveServer) return { ...liveServer, linked: true };
  return {
    publicKey: store.data.server.publicKey,
    privateKey: store.data.server.privateKey,
    endpoint: store.data.settings.endpointHost || '',
    linked: false,
    error: liveError
  };
}

/* في وضع live: مزامنة الأجهزة المخزنة مع واجهة WireGuard عند الإقلاع */
if (config.MODE === 'live' && liveServer) {
  for (const peer of store.data.peers) {
    if (peer.enabled) {
      try { wg.applyPeerLive(config.WG_INTERFACE, peer); }
      catch (e) { console.error('تعذر مزامنة جهاز:', peer.name, e.message); }
    }
  }
}

const ctx = { store, config, getServer };
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '200kb' }));
app.use('/api', createApiRouter(ctx));
app.use('/', createInstallRouter(ctx));
app.use(express.static(path.join(config.ROOT, 'public'), { extensions: ['html'] }));
app.use('/api', (req, res) => res.status(404).json({ error: 'غير موجود' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

/* محاكاة حركة بيانات في الوضع التجريبي فقط (معلّمة بوضوح في الواجهة) */
if (config.MODE === 'demo') {
  setInterval(() => {
    const enabled = store.data.peers.filter((p) => p.enabled);
    if (!enabled.length) return;
    let drx = 0, dtx = 0;
    for (const p of enabled) {
      const rx = Math.floor(Math.random() * 900 + 100) * 1024;
      const tx = Math.floor(Math.random() * 180 + 20) * 1024;
      p.rx = (p.rx || 0) + rx;
      p.tx = (p.tx || 0) + tx;
      p.lastHandshake = Math.floor(Date.now() / 1000);
      drx += rx; dtx += tx;
    }
    store.data.stats.rx += drx;
    store.data.stats.tx += dtx;
    store.data.stats.history.push({ t: Date.now(), rx: store.data.stats.rx, tx: store.data.stats.tx });
    if (store.data.stats.history.length > 48) store.data.stats.history.shift();
    store.save();
  }, 5000).unref();
}

app.listen(config.PORT, config.HOST, () => {
  console.log('');
  console.log('🛡  ' + config.APP_NAME + ' — لوحة التحكم');
  console.log('   الوضع: ' + (config.MODE === 'live' ? 'مباشر (WireGuard حقيقي)' : 'معاينة تجريبية'));
  console.log(`   العنوان: http://${config.HOST}:${config.PORT}`);
  if (config.MODE === 'demo') console.log('   كلمة مرور الدخول: ' + config.ADMIN_PASSWORD);
  console.log('');
});
