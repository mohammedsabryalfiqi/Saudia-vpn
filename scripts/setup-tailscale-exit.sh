#!/usr/bin/env bash
# ============================================================
#  Saudia VPN — Tailscale Exit Node
#  حوّل جهاز Linux موجود داخل السعودية إلى مخرج VPN مجاني.
#  Ubuntu / Debian / Raspberry Pi OS
#
#  الاستخدام:
#    curl -fsSL "http://PANEL/tailscale-exit.sh" | sudo bash
#  أو:
#    sudo bash setup-tailscale-exit.sh
#
#  متغيرات اختيارية:
#    TS_HOSTNAME   اسم الجهاز في Tailscale (الافتراضي: saudia-exit)
#
#  ملاحظات:
#   - يجب أن يكون الجهاز فعليًا داخل السعودية وبإذن مالكه.
#   - لا يحتاج فتح منافذ في الراوتر غالبًا.
#   - بعد التشغيل فعّل Exit Node من لوحة Tailscale.
# ============================================================
set -euo pipefail

TS_HOSTNAME="${TS_HOSTNAME:-saudia-exit}"

log() { printf '\033[1;32m[Saudia-VPN]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[خطأ]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || err "شغّل السكربت بصلاحيات root: sudo bash"
command -v apt-get >/dev/null || err "هذا السكربت مبدئيًا لأنظمة Ubuntu / Debian / Raspberry Pi OS"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates iptables

if ! command -v tailscale >/dev/null; then
  log "تثبيت Tailscale من المصدر الرسمي..."
  curl -fsSL https://tailscale.com/install.sh -o /tmp/tailscale-install.sh
  bash /tmp/tailscale-install.sh
  rm -f /tmp/tailscale-install.sh
fi

systemctl enable --now tailscaled

log "تفعيل تمرير الحزم (IP Forwarding)..."
cat > /etc/sysctl.d/99-saudia-tailscale.conf <<'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF
sysctl --system > /dev/null

log "تسجيل الجهاز وإعلانه كـ Exit Node..."
tailscale up --advertise-exit-node --hostname="$TS_HOSTNAME"

echo
log "تم تجهيز الجهاز 🎉"
echo "------------------------------------------------------------"
echo "  الاسم المقترح: $TS_HOSTNAME"
echo "  الخطوة التالية في لوحة Tailscale:"
echo "  Machines ← هذا الجهاز ← Edit route settings ← Use as exit node"
echo
echo "  على جوالك/لابتوبك: افتح Tailscale ← Exit Node ← اختر هذا الجهاز."
echo "  بعدها افحص IP من تبويب فحص الاتصال في الموقع."
echo "------------------------------------------------------------"
echo "  تذكير: استخدم جهازًا تملكه أو لديك إذن صريح باستخدامه."
echo "  الخطة المجانية للاستخدام الشخصي غير التجاري."
echo "------------------------------------------------------------"
