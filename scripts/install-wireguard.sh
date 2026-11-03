#!/usr/bin/env bash
# ============================================================
#  Saudia VPN — سكربت التثبيت التلقائي
#  يثبّت WireGuard + لوحة التحكم على خادم داخل السعودية
#  Ubuntu 20.04 / 22.04 / 24.04 — Debian 11 / 12
#
#  الاستخدام (من لوحة التحكم):
#    curl -fsSL "http://PANEL/install.sh" | sudo bash
#  أو من GitHub مباشرة:
#    curl -fsSL https://raw.githubusercontent.com/mohammedsabryalfiqi/Saudia-vpn/main/scripts/install-wireguard.sh | sudo bash
#
#  متغيرات اختيارية (قبل الأمر):
#    ADMIN_PASSWORD   كلمة مرور لوحة التحكم (تُولَّد تلقائيًا إن تُركت)
#    INSTALL_PANEL=0  تثبيت WireGuard فقط بدون لوحة
#    PANEL_REPO / PANEL_BRANCH  مصدر اللوحة من GitHub
# ============================================================
set -euo pipefail

WG_PORT="${WG_PORT:-51820}"
PANEL_PORT="${PANEL_PORT:-3000}"
WG_IF="${WG_IF:-wg0}"
WG_NET="${WG_NET:-10.66.66.0/24}"
WG_ADDR="${WG_ADDR:-10.66.66.1}"
CLIENT_DNS="${CLIENT_DNS:-1.1.1.1, 8.8.8.8}"
PANEL_URL="${PANEL_URL:-}"
PANEL_REPO="${PANEL_REPO:-https://github.com/mohammedsabryalfiqi/Saudia-vpn.git}"
PANEL_BRANCH="${PANEL_BRANCH:-main}"
INSTALL_PANEL="${INSTALL_PANEL:-1}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
APP_DIR="${APP_DIR:-/opt/saudia-vpn}"

log() { printf '\033[1;32m[Saudia-VPN]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[خطأ]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || err "شغّل السكربت بصلاحيات root: sudo bash"
command -v apt-get >/dev/null || err "يدعم السكربت أنظمة Ubuntu / Debian فقط حاليًا"

export DEBIAN_FRONTEND=noninteractive
log "تثبيت المتطلبات (WireGuard وأدوات الشبكة)..."
apt-get update -y
apt-get install -y wireguard qrencode curl git iptables ca-certificates openssl tar

log "تفعيل تمرير الحزم (IP Forwarding)..."
cat > /etc/sysctl.d/99-saudia-vpn.conf <<EOF
net.ipv4.ip_forward=1
EOF
sysctl --system > /dev/null

PUB_IF="$(ip -4 route ls default | awk '{print $5; exit}')"
[[ -n "$PUB_IF" ]] || err "تعذر تحديد واجهة الشبكة الرئيسية"
PUBLIC_IP="$(curl -fsS --max-time 10 https://api.ipify.org || curl -fsS --max-time 10 https://ifconfig.me || true)"

mkdir -p /etc/wireguard /etc/saudia-vpn
chmod 700 /etc/wireguard /etc/saudia-vpn

if [[ ! -f /etc/wireguard/server.key ]]; then
  (umask 077; wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.pub)
fi
SERVER_PRIV="$(cat /etc/wireguard/server.key)"
SERVER_PUB="$(cat /etc/wireguard/server.pub)"

log "إعداد واجهة WireGuard ($WG_IF)..."
if [[ ! -f "/etc/wireguard/$WG_IF.conf" ]]; then
  cat > "/etc/wireguard/$WG_IF.conf" <<EOF
[Interface]
Address = $WG_ADDR/24
ListenPort = $WG_PORT
PrivateKey = $SERVER_PRIV
PostUp = iptables -t nat -A POSTROUTING -s $WG_NET -o $PUB_IF -j MASQUERADE; iptables -A FORWARD -i $WG_IF -j ACCEPT; iptables -A FORWARD -o $WG_IF -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -s $WG_NET -o $PUB_IF -j MASQUERADE; iptables -D FORWARD -i $WG_IF -j ACCEPT; iptables -D FORWARD -o $WG_IF -j ACCEPT

# --- Peers are managed by Saudia VPN Panel ---
EOF
  chmod 600 "/etc/wireguard/$WG_IF.conf"
fi

systemctl enable "wg-quick@$WG_IF" >/dev/null 2>&1
systemctl restart "wg-quick@$WG_IF"

log "فتح المنافذ في الجدار الناري المحلي..."
iptables -C INPUT -p udp --dport "$WG_PORT" -j ACCEPT 2>/dev/null || iptables -I INPUT -p udp --dport "$WG_PORT" -j ACCEPT
iptables -C INPUT -p tcp --dport "$PANEL_PORT" -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport "$PANEL_PORT" -j ACCEPT
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$WG_PORT/udp" >/dev/null
  ufw allow "$PANEL_PORT/tcp" >/dev/null
fi

cat > /etc/saudia-vpn/server.json <<EOF
{
  "privateKey": "$SERVER_PRIV",
  "publicKey": "$SERVER_PUB",
  "endpoint": "${PUBLIC_IP:-}",
  "port": $WG_PORT
}
EOF
chmod 600 /etc/saudia-vpn/server.json

if [[ "$INSTALL_PANEL" == "1" ]]; then
  if ! command -v node >/dev/null || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 18 ]]; then
    log "تثبيت Node.js 20 ..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  log "تثبيت لوحة التحكم في $APP_DIR ..."
  mkdir -p "$APP_DIR"
  PANEL_OK=0
  if [[ -n "$PANEL_URL" ]]; then
    if curl -fsSL --max-time 60 "$PANEL_URL/panel.tar.gz" -o /tmp/saudia-panel.tar.gz; then
      tar -xzf /tmp/saudia-panel.tar.gz -C "$APP_DIR" && PANEL_OK=1
      rm -f /tmp/saudia-panel.tar.gz
    fi
  fi
  if [[ "$PANEL_OK" != "1" ]]; then
    log "التنزيل من اللوحة تعذر — المحاولة من GitHub..."
    if [[ -d "$APP_DIR/.git" ]]; then
      git -C "$APP_DIR" fetch origin "$PANEL_BRANCH" && git -C "$APP_DIR" checkout "$PANEL_BRANCH" && git -C "$APP_DIR" reset --hard "origin/$PANEL_BRANCH"
    else
      git clone --branch "$PANEL_BRANCH" "$PANEL_REPO" "$APP_DIR" || err "تعذر تنزيل اللوحة. ارفع ملفات المشروع يدويًا إلى $APP_DIR ثم أعد التشغيل"
    fi
  fi
  (cd "$APP_DIR" && npm install --omit=dev)

  if [[ -z "$ADMIN_PASSWORD" && -f /etc/saudia-vpn/panel.env ]]; then
    ADMIN_PASSWORD="$(grep '^ADMIN_PASSWORD=' /etc/saudia-vpn/panel.env | cut -d= -f2- || true)"
  fi
  [[ -n "$ADMIN_PASSWORD" ]] || ADMIN_PASSWORD="$(openssl rand -hex 6)"

  cat > /etc/saudia-vpn/panel.env <<EOF
SAUDIA_MODE=live
PORT=$PANEL_PORT
HOST=0.0.0.0
WG_INTERFACE=$WG_IF
SERVER_INFO_PATH=/etc/saudia-vpn/server.json
DATA_DIR=$APP_DIR/data
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF
  chmod 600 /etc/saudia-vpn/panel.env

  cat > /etc/systemd/system/saudia-vpn.service <<EOF
[Unit]
Description=Saudia VPN Panel
After=network.target wg-quick@$WG_IF.service
Wants=wg-quick@$WG_IF.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=/etc/saudia-vpn/panel.env
ExecStart=$(command -v node) $APP_DIR/server/index.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable saudia-vpn >/dev/null 2>&1
  systemctl restart saudia-vpn
fi

echo
log "تم التثبيت بنجاح 🎉"
echo "------------------------------------------------------------"
echo "  عنوان خادم الـVPN:   ${PUBLIC_IP:-SERVER_IP}:$WG_PORT (UDP)"
echo "  المفتاح العام:       $SERVER_PUB"
echo "  DNS للعملاء:         $CLIENT_DNS"
if [[ "$INSTALL_PANEL" == "1" ]]; then
  echo "  لوحة التحكم:        http://${PUBLIC_IP:-SERVER_IP}:$PANEL_PORT"
  echo "  كلمة مرور المدير:   $ADMIN_PASSWORD"
fi
echo "------------------------------------------------------------"
echo "  ⚠ مهم جدًا: افتح المنفذ $WG_PORT/UDP والمنفذ $PANEL_PORT/TCP"
echo "    في لوحة مزوّد السحابة (Security List / VCN / Firewall)."
echo "    بدونهما لن يعمل الاتصال من خارج الخادم."
echo "------------------------------------------------------------"
echo "  الخطوة التالية: افتح لوحة التحكم ← أجهزتي ← أضف جهازك"
echo "  ثم امسح رمز QR بتطبيق WireGuard واضغط تشغيل."
echo "------------------------------------------------------------"
