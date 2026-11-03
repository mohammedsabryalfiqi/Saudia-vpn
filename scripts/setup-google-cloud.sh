#!/usr/bin/env bash
# ============================================================
#  Saudia VPN — Google Cloud helper
#  ينشئ VM في الدمام me-central2 + قواعد جدار ناري.
#  شغّله من Google Cloud Shell أو جهاز عليه gcloud ومسجّل الدخول.
#
#  الاستخدام:
#    bash setup-google-cloud.sh
#
#  متغيرات اختيارية:
#    PROJECT_ID   مشروع Google Cloud (الافتراضي: المشروع الحالي)
#    REGION       me-central2
#    ZONE         me-central2-a
#    INSTANCE     saudia-vpn
#
#  تحذير:
#   - التجربة المجانية 90 يومًا / 300$ وتتطلب بطاقة تحقق.
#   - ليست مجانية دائمة. احذف الخادم بعد التجربة لتجنب الرسوم.
# ============================================================
set -euo pipefail

log() { printf '\033[1;32m[Saudia-VPN]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[خطأ]\033[0m %s\n' "$*" >&2; exit 1; }

command -v gcloud >/dev/null || err "ثبّت Google Cloud SDK أو استخدم Cloud Shell: https://cloud.google.com/sdk"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-me-central2}"
ZONE="${ZONE:-me-central2-a}"
INSTANCE="${INSTANCE:-saudia-vpn}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-small}"

[[ -n "$PROJECT_ID" && "$PROJECT_ID" != "(unset)" ]] || err "حدّد المشروع: PROJECT_ID=my-project bash setup-google-cloud.sh"

log "المشروع: $PROJECT_ID | المنطقة: $REGION ($ZONE)"
gcloud services enable compute.googleapis.com --project="$PROJECT_ID"

if ! gcloud compute firewall-rules describe saudia-vpn-wireguard --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create saudia-vpn-wireguard \
    --project="$PROJECT_ID" \
    --allow=udp:51820 \
    --target-tags=saudia-vpn \
    --description="Saudia VPN WireGuard"
fi

if ! gcloud compute firewall-rules describe saudia-vpn-panel --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create saudia-vpn-panel \
    --project="$PROJECT_ID" \
    --allow=tcp:3000 \
    --target-tags=saudia-vpn \
    --description="Saudia VPN Panel"
fi

if ! gcloud compute instances describe "$INSTANCE" --zone="$ZONE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute instances create "$INSTANCE" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family=ubuntu-2404-lts-amd64 \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --tags=saudia-vpn
else
  log "الخادم موجود مسبقًا: $INSTANCE"
fi

PUBLIC_IP="$(gcloud compute instances describe "$INSTANCE" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"

echo
log "تم تجهيز الخادم السعودي على Google Cloud 🎉"
echo "------------------------------------------------------------"
echo "  IP العام: $PUBLIC_IP"
echo "  SSH:"
echo "  gcloud compute ssh $INSTANCE --zone=$ZONE --project=$PROJECT_ID"
echo
echo "  بعد الدخول، شغّل:"
echo "  curl -fsSL https://raw.githubusercontent.com/mohammedsabryalfiqi/Saudia-vpn/main/scripts/install-wireguard.sh | sudo bash"
echo
echo "  اللوحة بعد التثبيت: http://$PUBLIC_IP:3000"
echo "------------------------------------------------------------"
echo "  لتجنب الرسوم بعد التجربة، احذف الموارد:"
echo "  gcloud compute instances delete $INSTANCE --zone=$ZONE --project=$PROJECT_ID"
echo "  gcloud compute firewall-rules delete saudia-vpn-wireguard saudia-vpn-panel --project=$PROJECT_ID"
echo "------------------------------------------------------------"
