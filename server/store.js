'use strict';
const fs = require('fs');
const path = require('path');

function defaultSettings() {
  return {
    endpointHost: '',
    wgPort: 51820,
    dns: '1.1.1.1, 8.8.8.8',
    mtu: '',
    allowedIps: '0.0.0.0/0, ::/0',
    network: '10.66.66.0/24',
    serverAddress: '10.66.66.1'
  };
}

function loadStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'db.json');
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = null;
  }
  if (!data || typeof data !== 'object') {
    data = {
      admin: null,
      settings: defaultSettings(),
      peers: [],
      server: null,
      stats: { rx: 0, tx: 0, history: [] },
      createdAt: new Date().toISOString()
    };
  }
  data.settings = { ...defaultSettings(), ...(data.settings || {}) };
  data.peers = Array.isArray(data.peers) ? data.peers : [];
  data.stats = data.stats && typeof data.stats === 'object'
    ? { rx: 0, tx: 0, history: [], ...data.stats }
    : { rx: 0, tx: 0, history: [] };

  function save() {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }

  return { data, save, file };
}

module.exports = { loadStore, defaultSettings };
