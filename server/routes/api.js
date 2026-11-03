'use strict';
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const auth = require('../auth');
const wg = require('../wireguard');

const PLATFORMS = ['android', 'ios', 'windows', 'macos', 'linux', 'router', 'other'];

function publicPeer(p) {
  return {
    id: p.id, name: p.name, platform: p.platform, ip: p.ip,
    enabled: p.enabled, createdAt: p.createdAt, publicKey: p.publicKey,
    rx: p.rx || 0, tx: p.tx || 0, lastHandshake: p.lastHandshake || 0
  };
}

module.exports = function createApiRouter(ctx) {
  const { store, config } = ctx;
  const router = express.Router();
  const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const settings = () => store.data.settings;

  function liveStats() {
    try { return wg.statsLive(config.WG_INTERFACE); } catch { return null; }
  }

  function decoratePeers() {
    const stats = config.MODE === 'live' ? liveStats() : null;
    return store.data.peers.map((p) => {
      const out = publicPeer(p);
      if (stats && stats.map[p.publicKey]) {
        const s = stats.map[p.publicKey];
        out.rx = s.rx; out.tx = s.tx; out.lastHandshake = s.latestHandshake;
      }
      return out;
    });
  }

  function peerConfig(peer) {
    const srv = ctx.getServer();
    const host = settings().endpointHost || srv.endpoint || '';
    return wg.buildClientConfig(peer, srv.publicKey, settings(), host);
  }

  function peerQR(peer) {
    return QRCode.toDataURL(peerConfig(peer), {
      width: 340, margin: 1,
      color: { dark: '#0b1210ff', light: '#ffffffff' }
    });
  }

  /* ---------- عام ---------- */
  router.get('/public-info', (req, res) => {
    res.json({ mode: config.MODE, version: config.VERSION, appName: config.APP_NAME });
  });

  router.post('/login', (req, res) => {
    if (!auth.allowAttempt(req.ip)) {
      return res.status(429).json({ error: 'محاولات كثيرة — انتظر 15 دقيقة ثم أعد المحاولة' });
    }
    const { password } = req.body || {};
    if (!auth.verifyPassword(password || '', store.data.admin)) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    res.json({ token: auth.createSession(), mode: config.MODE });
  });

  router.post('/logout', auth.requireAuth, (req, res) => {
    const token = (req.headers.authorization || '').slice(7);
    auth.destroySession(token);
    res.json({ ok: true });
  });

  /* ---------- الحالة ---------- */
  router.get('/status', auth.requireAuth, (req, res) => {
    const srv = ctx.getServer();
    const peers = decoratePeers();
    const stats = config.MODE === 'live' ? liveStats() : null;
    const now = Math.floor(Date.now() / 1000);

    let rx = store.data.stats.rx, tx = store.data.stats.tx;
    if (stats) {
      rx = stats.rx; tx = stats.tx;
      store.data.stats.history.push({ t: Date.now(), rx, tx });
      if (store.data.stats.history.length > 60) store.data.stats.history.shift();
      store.save();
    }

    res.json({
      mode: config.MODE,
      version: config.VERSION,
      uptimeSec: Math.floor(process.uptime()),
      server: {
        publicKey: srv.publicKey,
        endpoint: settings().endpointHost || srv.endpoint || null,
        port: settings().wgPort,
        dns: settings().dns,
        network: settings().network,
        country: 'SA',
        countryName: 'السعودية',
        linked: config.MODE === 'live' && !!srv.linked,
        interface: config.WG_INTERFACE,
        error: srv.error || null
      },
      stats: {
        peersTotal: peers.length,
        peersEnabled: peers.filter((p) => p.enabled).length,
        activeNow: peers.filter((p) => p.enabled && p.lastHandshake && now - p.lastHandshake < 180).length,
        rx, tx,
        history: store.data.stats.history
      },
      settings: settings()
    });
  });

  /* ---------- الأجهزة ---------- */
  router.get('/peers', auth.requireAuth, (req, res) => {
    res.json({ peers: decoratePeers() });
  });

  router.post('/peers', auth.requireAuth, ah(async (req, res) => {
    const name = String((req.body && req.body.name) || '').trim().replace(/[\u0000-\u001f]/g, '').slice(0, 40);
    const platform = PLATFORMS.includes(req.body && req.body.platform) ? req.body.platform : 'other';
    if (!name) return res.status(400).json({ error: 'أدخل اسمًا للجهاز' });
    if (store.data.peers.length >= 250) return res.status(400).json({ error: 'وصلت للحد الأقصى (250 جهازًا)' });

    const kp = wg.generateKeyPair();
    const peer = {
      id: crypto.randomUUID(),
      name, platform,
      ip: wg.nextFreeIp(store.data.peers, settings().network),
      enabled: true,
      createdAt: new Date().toISOString(),
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      presharedKey: wg.generatePresharedKey(),
      rx: 0, tx: 0, lastHandshake: 0
    };

    if (config.MODE === 'live') {
      try { wg.applyPeerLive(config.WG_INTERFACE, peer); }
      catch (e) { return res.status(500).json({ error: 'تعذر إضافة الجهاز إلى WireGuard: ' + e.message }); }
    }
    store.data.peers.push(peer);
    store.save();
    res.status(201).json({ peer: publicPeer(peer), config: peerConfig(peer), qr: await peerQR(peer) });
  }));

  router.get('/peers/:id', auth.requireAuth, ah(async (req, res) => {
    const peer = store.data.peers.find((p) => p.id === req.params.id);
    if (!peer) return res.status(404).json({ error: 'الجهاز غير موجود' });
    res.json({ peer: publicPeer(peer), config: peerConfig(peer), qr: await peerQR(peer) });
  }));

  router.get('/peers/:id/config', auth.requireAuth, (req, res) => {
    const peer = store.data.peers.find((p) => p.id === req.params.id);
    if (!peer) return res.status(404).json({ error: 'الجهاز غير موجود' });
    res.type('text/plain; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="saudia-${peer.id.slice(0, 8)}.conf"`)
      .send(peerConfig(peer));
  });

  router.patch('/peers/:id', auth.requireAuth, (req, res) => {
    const peer = store.data.peers.find((p) => p.id === req.params.id);
    if (!peer) return res.status(404).json({ error: 'الجهاز غير موجود' });
    const body = req.body || {};
    if (typeof body.name === 'string') {
      const name = body.name.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 40);
      if (!name) return res.status(400).json({ error: 'الاسم لا يمكن أن يكون فارغًا' });
      peer.name = name;
    }
    if (typeof body.enabled === 'boolean' && body.enabled !== peer.enabled) {
      if (config.MODE === 'live') {
        try { wg.setPeerEnabledLive(config.WG_INTERFACE, peer, body.enabled); }
        catch (e) { return res.status(500).json({ error: 'تعذر تحديث WireGuard: ' + e.message }); }
      }
      peer.enabled = body.enabled;
    }
    store.save();
    res.json({ peer: publicPeer(peer) });
  });

  router.delete('/peers/:id', auth.requireAuth, (req, res) => {
    const idx = store.data.peers.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'الجهاز غير موجود' });
    const peer = store.data.peers[idx];
    if (config.MODE === 'live' && peer.enabled) {
      try { wg.removePeerLive(config.WG_INTERFACE, peer.publicKey); }
      catch { /* قد يكون غير موجود أصلاً */ }
    }
    store.data.peers.splice(idx, 1);
    store.save();
    res.json({ ok: true });
  });

  /* ---------- الإعدادات ---------- */
  router.put('/settings', auth.requireAuth, (req, res) => {
    const b = req.body || {};
    const s = settings();
    if (typeof b.endpointHost === 'string') {
      const v = b.endpointHost.trim();
      if (v && !/^[a-zA-Z0-9.-]{1,253}$/.test(v)) return res.status(400).json({ error: 'عنوان الخادم غير صالح (IP أو نطاق فقط)' });
      s.endpointHost = v;
    }
    if (b.wgPort !== undefined) {
      const p = Number(b.wgPort);
      if (!Number.isInteger(p) || p < 1 || p > 65535) return res.status(400).json({ error: 'منفذ غير صالح' });
      s.wgPort = p;
    }
    if (typeof b.dns === 'string') {
      const v = b.dns.trim();
      if (!v || v.length > 120 || !/^[0-9a-fA-F:.,\s]+$/.test(v)) return res.status(400).json({ error: 'خوادم DNS غير صالحة' });
      s.dns = v;
    }
    if (b.mtu !== undefined) {
      if (b.mtu === '' || b.mtu === null) s.mtu = '';
      else {
        const m = Number(b.mtu);
        if (!Number.isInteger(m) || m < 576 || m > 1500) return res.status(400).json({ error: 'MTU يجب أن يكون بين 576 و1500' });
        s.mtu = m;
      }
    }
    if (typeof b.allowedIps === 'string') {
      const v = b.allowedIps.trim();
      if (!v || v.length > 200 || !/^[0-9a-fA-F:.,/\s]+$/.test(v)) return res.status(400).json({ error: 'AllowedIPs غير صالحة' });
      s.allowedIps = v;
    }
    store.save();
    res.json({ settings: s });
  });

  router.post('/password', auth.requireAuth, (req, res) => {
    const { current, next } = req.body || {};
    if (!auth.verifyPassword(current || '', store.data.admin)) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    if (typeof next !== 'string' || next.length < 8 || next.length > 128) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف' });
    }
    store.data.admin = auth.hashPassword(next);
    store.save();
    auth.destroyAllSessions();
    res.json({ token: auth.createSession() });
  });

  router.post('/demo/reset', auth.requireAuth, (req, res) => {
    if (config.MODE !== 'demo') return res.status(400).json({ error: 'متاح في الوضع التجريبي فقط' });
    store.data.peers = [];
    store.data.stats = { rx: 0, tx: 0, history: [] };
    store.save();
    res.json({ ok: true });
  });

  return router;
};
