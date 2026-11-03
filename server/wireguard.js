'use strict';
const crypto = require('crypto');
const fs = require('fs');
const { execFileSync } = require('child_process');

/** توليد زوج مفاتيح X25519 صالح لـ WireGuard (base64 خام 32 بايت) */
function generateKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');
  const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  return { privateKey: priv.toString('base64'), publicKey: pub.toString('base64') };
}

function generatePresharedKey() {
  return crypto.randomBytes(32).toString('base64');
}

function networkPrefix(network) {
  return String(network || '10.66.66.0/24').split('/')[0].split('.').slice(0, 3).join('.');
}

function nextFreeIp(peers, network) {
  const prefix = networkPrefix(network);
  const used = new Set(peers.map((p) => p.ip));
  for (let i = 2; i <= 254; i++) {
    const ip = `${prefix}.${i}`;
    if (!used.has(ip)) return ip;
  }
  throw new Error('لا توجد عناوين IP متاحة داخل الشبكة');
}

/** بناء ملف إعداد العميل (.conf) */
function buildClientConfig(peer, serverPublicKey, settings, endpointHost) {
  const host = endpointHost || settings.endpointHost || 'SAUDI_SERVER_IP';
  const lines = [
    '[Interface]',
    `# Saudia VPN — ${peer.name}`,
    `PrivateKey = ${peer.privateKey}`,
    `Address = ${peer.ip}/32`,
    `DNS = ${settings.dns || '1.1.1.1, 8.8.8.8'}`
  ];
  if (settings.mtu) lines.push(`MTU = ${settings.mtu}`);
  lines.push(
    '',
    '[Peer]',
    '# Saudia VPN Server — Saudi Arabia',
    `PublicKey = ${serverPublicKey}`,
    `PresharedKey = ${peer.presharedKey}`,
    `Endpoint = ${host}:${settings.wgPort}`,
    `AllowedIPs = ${settings.allowedIps || '0.0.0.0/0, ::/0'}`,
    'PersistentKeepalive = 25',
    ''
  );
  return lines.join('\n');
}

/* ---------- وضع live: التعامل مع WireGuard الحقيقي ---------- */

function wg(args) {
  return execFileSync('wg', args, { encoding: 'utf8', timeout: 8000 }).trim();
}

function saveLive(iface) {
  execFileSync('wg-quick', ['save', iface], { timeout: 8000 });
}

function applyPeerLive(iface, peer) {
  const pskFile = `/etc/wireguard/.psk-${peer.id}.tmp`;
  fs.writeFileSync(pskFile, peer.presharedKey, { mode: 0o600 });
  try {
    wg(['set', iface, 'peer', peer.publicKey, 'preshared-key', pskFile, 'allowed-ips', `${peer.ip}/32`]);
    saveLive(iface);
  } finally {
    try { fs.unlinkSync(pskFile); } catch { /* ignore */ }
  }
}

function removePeerLive(iface, publicKey) {
  wg(['set', iface, 'peer', publicKey, 'remove']);
  saveLive(iface);
}

function setPeerEnabledLive(iface, peer, enabled) {
  if (enabled) applyPeerLive(iface, peer);
  else removePeerLive(iface, peer.publicKey);
}

/** إحصائيات حقيقية من `wg show <iface> dump` */
function statsLive(iface) {
  const out = wg(['show', iface, 'dump']);
  const lines = out.split('\n').filter(Boolean).slice(1);
  const map = {};
  let rx = 0, tx = 0;
  for (const line of lines) {
    const f = line.split('\t');
    const entry = {
      endpoint: f[2] === '(none)' ? null : f[2],
      latestHandshake: Number(f[4]) || 0,
      rx: Number(f[5]) || 0,
      tx: Number(f[6]) || 0
    };
    map[f[0]] = entry;
    rx += entry.rx;
    tx += entry.tx;
  }
  return { map, rx, tx };
}

function readServerInfo(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

module.exports = {
  generateKeyPair,
  generatePresharedKey,
  nextFreeIp,
  buildClientConfig,
  applyPeerLive,
  removePeerLive,
  setPeerEnabledLive,
  statsLive,
  readServerInfo,
  networkPrefix
};
