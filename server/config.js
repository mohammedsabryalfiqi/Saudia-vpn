'use strict';
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const MODE = process.env.SAUDIA_MODE === 'live' ? 'live' : 'demo';

module.exports = {
  ROOT,
  MODE,
  VERSION: '1.0.0',
  APP_NAME: 'سعودية VPN',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number(process.env.PORT || 3000),
  DATA_DIR: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(ROOT, 'data'),
  WG_INTERFACE: process.env.WG_INTERFACE || 'wg0',
  SERVER_INFO_PATH: process.env.SERVER_INFO_PATH || '/etc/saudia-vpn/server.json',
  ADMIN_PASSWORD:
    process.env.ADMIN_PASSWORD ||
    (MODE === 'demo' ? 'saudia2030' : crypto.randomBytes(6).toString('hex')),
  PANEL_REPO: process.env.PANEL_REPO || 'https://github.com/mohammedsabryalfiqi/Saudia-vpn.git',
  PANEL_BRANCH: process.env.PANEL_BRANCH || 'main'
};
