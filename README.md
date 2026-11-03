<div dir="rtl">

# 🛡️ سعودية VPN — Saudia VPN

**منصة عربية متكاملة لإنشاء وإدارة شبكة VPN خاصة بك على خادم داخل السعودية 🇸🇦**

حوّل أي خادم سعودي (VPS) إلى VPN شخصي كامل خلال دقائق: لوحة تحكم عربية، توليد إعدادات WireGuard ورموز QR لأجهزتك، وسكربت تثبيت واحد يجهّز كل شيء تلقائيًا.

> ⚠️ **مهم:** للحصول على IP سعودي حقيقي تحتاج خادمًا أو جهازًا موجودًا فعليًا داخل السعودية.
> لا يوجد خادم سعودي مجاني دائم بدون شروط. أضفنا بدائل أسهل من Oracle:
> **Tailscale** إذا كان لديك جهاز داخل السعودية، أو **تجربة Google Cloud** مؤقتًا، أو أي **VPS سعودي**.

---

## ✨ المميزات

- 🇸 **IP سعودي حقيقي** — خادمك داخل المملكة (جدة / الرياض / الدمام)
- ⚡ **WireGuard** — أسرع وأحدث بروتوكول VPN بتشفير قوي
- 📱 **كل الأجهزة** — أندرويد، آيفون، ويندوز، ماك، لينكس، راوتر (حتى 250 جهازًا)
- 🎛️ **لوحة تحكم عربية RTL** — إضافة/إيقاف/حذف الأجهزة، إحصائيات، QR، تحميل ملفات `.conf`
- 🌍 **فحص IP مدمج** — تأكد من متصفحك أن عنوانك أصبح سعوديًا
- 📜 **سكربت تثبيت بأمر واحد** — يثبّت WireGuard + اللوحة + systemd + الجدار الناري
- 🔐 **خصوصية** — لا سجلات تصفح، الخادم ملكك، كلمات المرور مخزنة بتشفير scrypt
- 🧪 **وضع معاينة تجريبي** — جرّب اللوحة كاملة قبل امتلاك خادم

## 🚀 البداية السريعة — اختر طريقة

| الطريقة | متى تناسبك؟ | التكلفة/الشروط |
|---|---|---|
| ⭐ **Tailscale Exit Node** | عندك جهاز داخل السعودية (كمبيوتر/Raspberry Pi) | مجاني شخصيًا، بدون بطاقة، يحتاج جهازًا سعوديًا |
| **Google Cloud** | تريد خادمًا سحابيًا مؤقتًا في الدمام | تجربة 90 يومًا / 300$، بطاقة تحقق، ليست دائمة |
| **أي VPS سعودي** | تريد تحكم كاملًا عبر WireGuard | حسب المزود (Oracle/محلي/غيره) |

### الطريقة 1: Tailscale — الأسهل والمجاني شخصيًا

1. أنشئ حسابًا في [Tailscale](https://login.tailscale.com/start) واختر الخطة الشخصية المجانية.
2. على جهاز Linux داخل السعودية، شغّل:

```bash
curl -fsSL "http://YOUR_PANEL:3000/tailscale-exit.sh" | sudo bash
```

أو من المستودع:

```bash
sudo bash scripts/setup-tailscale-exit.sh
```

3. من لوحة Tailscale: **Machines ← الجهاز ← Edit route settings ← Use as exit node**.
4. على جوالك/لابتوبك ثبّت Tailscale، سجل بنفس الحساب، ثم اختر الجهاز السعودي من **Exit Node**.
5. استخدم **فحص الاتصال** للتأكد أن IP سعودي.

> لا يحتاج فتح منافذ في الراوتر غالبًا. استخدم جهازًا تملكه أو لديك إذن صريح باستخدامه.

### الطريقة 2: Google Cloud — تجربة مؤقتة في الدمام

1. فعّل [Google Cloud Free Trial](https://cloud.google.com/free) (يتطلب بطاقة تحقق).
2. افتح **Cloud Shell** وشغّل:

```bash
curl -fsSL "http://YOUR_PANEL:3000/google-cloud.sh" | bash
```

أو من المستودع:

```bash
bash scripts/setup-google-cloud.sh
```

3. سينشئ السكربت VM في `me-central2` ويفتح UDP 51820 وTCP 3000.
4. ادخل SSH كما يطبع السكربت، ثم ثبّت WireGuard:

```bash
curl -fsSL https://raw.githubusercontent.com/mohammedsabryalfiqi/Saudia-vpn/main/scripts/install-wireguard.sh | sudo bash
```

5. افتح اللوحة على `http://SERVER_IP:3000` وأضف أجهزتك.

> ⚠️ احذف الـ VM وقواعد الجدار الناري بعد التجربة لتجنب الرسوم. الأوامر يطبعها السكربت في النهاية.

### الطريقة 3: أي VPS سعودي — WireGuard + لوحتنا

1. أنشئ خادم **Ubuntu 22.04 / 24.04** أو Debian 11/12 في منطقة سعودية.
2. افتح **UDP 51820** و**TCP 3000** في الجدار الناري السحابي.
3. شغّل أمر التثبيت:

```bash
curl -fsSL "http://YOUR_PANEL:3000/install.sh" | sudo bash
```

أو من GitHub مباشرة:

```bash
curl -fsSL https://raw.githubusercontent.com/mohammedsabryalfiqi/Saudia-vpn/main/scripts/install-wireguard.sh | sudo bash
```

4. افتح `http://SERVER_IP:3000`، سجّل الدخول، أضف جهازًا، امسح QR بتطبيق WireGuard، ثم فعّل النفق.

---

## 🖥️ التشغيل المحلي / المعاينة

```bash
npm install
npm start
# http://localhost:3000 — كلمة المرور التجريبية: saudia2030
```

وضع المعاينة (`demo`) يعرض اللوحة كاملة ببيانات تجريبية **بدون اتصال سعودي حقيقي** — لتجربة الواجهة قبل التثبيت الفعلي.

## ⚙️ متغيرات البيئة

| المتغير | الافتراضي | الوصف |
|---|---|---|
| `SAUDIA_MODE` | `demo` | `demo` للمعاينة أو `live` لخادم WireGuard حقيقي |
| `PORT` | `3000` | منفذ لوحة التحكم |
| `ADMIN_PASSWORD` | تلقائي | كلمة مرور المدير (تُولّد في live وتُطبع مرة واحدة) |
| `WG_INTERFACE` | `wg0` | اسم واجهة WireGuard |
| `SERVER_INFO_PATH` | `/etc/saudia-vpn/server.json` | ملف معلومات الخادم في وضع live |
| `DATA_DIR` | `./data` | مجلد البيانات (تجاهله Git) |

## 🗂️ بنية المشروع

```
Saudia-vpn/
├── server/              # خادم Express (API + مصادقة + WireGuard)
│   ├── index.js         # نقطة الدخول
│   ├── config.js        # الإعدادات
│   ├── store.js         # تخزين JSON آمن
│   ├── auth.js          # جلسات + scrypt + حد محاولات الدخول
│   ├── wireguard.js     # توليد مفاتيح X25519 + إدارة peers
│   └── routes/
│       ├── api.js       # REST API
│       └── install.js   # توليد سكربت التثبيت + حزمة اللوحة
├── public/              # الواجهة (عربي RTL)
│   ├── index.html       # الصفحة الرئيسية
│   ├── dashboard.html   # لوحة التحكم
│   ├── css/style.css    # نظام التصميم
│   ├── js/              # JavaScript
│   └── assets/          # الشعار والصورة
├── scripts/
│   ├── install-wireguard.sh     # تثبيت WireGuard + اللوحة على VPS
│   ├── setup-tailscale-exit.sh  # تحويل جهاز سعودي إلى Tailscale Exit Node
│   └── setup-google-cloud.sh    # إنشاء VM في الدمام + جدار ناري
├── package.json
└── README.md
```

## 🔌 واجهة API (مختصر)

| Method | المسار | الوصف |
|---|---|---|
| GET | `/api/public-info` | معلومات عامة (الوضع، الإصدار) |
| POST | `/api/login` | تسجيل الدخول → token |
| GET | `/api/status` | حالة الخادم والإحصائيات |
| GET/POST | `/api/peers` | قائمة/إضافة الأجهزة |
| GET | `/api/peers/:id` | تفاصيل + إعداد + QR |
| GET | `/api/peers/:id/config` | تحميل ملف `.conf` |
| PATCH/DELETE | `/api/peers/:id` | تعديل/حذف جهاز |
| PUT | `/api/settings` | إعدادات الشبكة |
| POST | `/api/password` | تغيير كلمة المرور |
| GET | `/install.sh` | سكربت تثبيت WireGuard مخصص |
| GET | `/tailscale-exit.sh` | سكربت Tailscale Exit Node |
| GET | `/google-cloud.sh` | سكربت مساعد Google Cloud |
| GET | `/panel.tar.gz` | حزمة اللوحة بدون بيانات/أسرار |

## 🔒 ملاحظات أمنية

- غيّر كلمة المرور فور التثبيت، وقيّد وصول لوحة التحكم إن استطعت (HTTPS / قائمة IPs مسموحة).
- ملفات المفاتيح والبيانات تُحفظ بصلاحيات `600`، وكلمات المرور بـ scrypt.
- حزمة `/panel.tar.gz` تستثني دائمًا: `data/`، `.env`، `.git/`، `node_modules/`.
- في وضع `live` تعمل اللوحة كـ root لإدارة WireGuard — احمِ منفذ اللوحة جيدًا.
- راجع السكربت قبل تشغيله (مفتوح المصدر بالكامل)، ولا تستخدم المنصة إلا وفق قوانين بلدك وشروط الخدمات.

## ❓ استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| لا يوجد اتصال رغم تفعيل النفق | افتح **UDP 51820** في الجدار الناري السحابي (Security List) |
| اللوحة لا تفتح من الخارج | افتح **TCP 3000** في الجدار الناري السحابي |
| Tailscale لا يظهر كخيار Exit Node | فعّل **Use as exit node** من لوحة Tailscale، وتأكد أن الجهاز داخل السعودية |
| Google Cloud يطلب رسومًا بعد التجربة | احذف الـ VM وقواعد الجدار الناري كما يطبع السكربت |
| الموقع المحجوب لا يزال يرفضك | قد يحظر عناوين مراكز البيانات — جرّب منطقة/مزودًا آخر أو IP سكني |
| تسريب DNS | تأكد أن `AllowedIPs = 0.0.0.0/0, ::/0` وأن DNS داخل النفق |
| نسيت كلمة المرور | عدّل `ADMIN_PASSWORD` في `/etc/saudia-vpn/panel.env` ثم `sudo systemctl restart saudia-vpn` |

## 📄 الرخصة

MIT — استخدمه، عدّله، وشاركه بحرية.

</div>
