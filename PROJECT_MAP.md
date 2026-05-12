# PROJECT MAP - سحابة الأمن السيبراني

> **تاريخ التحديث:** مايو 2026  
> **النسخة:** 0.1.0  
> **الحالة:** قيد التطوير

---

## TECH_STACK

| الطبقة | التقنية | الإصدار |
|--------|----------|---------|
| **Framework** | Next.js (App Router) | 14.2.35 |
| **Language** | TypeScript | ^5 |
| **Database** | PostgreSQL + Prisma ORM | 5.22.0 |
| **Authentication** | JWT (jose) + WebAuthn + Argon2 + bcryptjs | - |
| **Real-time** | Pusher (Chat) | 5.3.3 / 8.5.0 |
| **File Storage** | ImageKit | 7.5.0 / 6.0.0 |
| **Cache/Rate Limit** | Upstash Redis | 1.38.0 / 2.0.8 |
| **Styling** | Tailwind CSS | ^3.4.1 |
| **Animation** | Framer Motion + Three.js + React Three Fiber | latest |
| **Error Tracking** | Sentry | 10.52.0 |
| **Logging** | Winston + Logtail | 0.5.8 / 3.19.0 |
| **Email** | Nodemailer | ^8.0.7 |
| **PWA** | next-pwa + Workbox | 5.6.0 |
| **Validation** | Zod | 4.4.3 |
| **State** | Zustand (مثبت لكن غير مستخدم) | في package.json |
| **Queue** | BullMQ | 5.76.7 |

---

## SYSTEM_FLOW

### 1. تدفق المصادقة
```
[زيارة المستخدم]
       │
       ▼
[Public Routes: /, /login, /onboarding, /api/auth/*]
       │
       ├── [تسجيل دخول]
       │    ├── كلمة مرور → POST /api/auth/login → JWT (access 15m + refresh 7d)
       │    └── WebAuthn → /api/auth/webauthn/login/* → passkey
       │
       ├── [تفعيل حساب]
       │    └── رمز تفعيل → POST /api/auth/activate
       │
       └── [استعادة كلمة المرور]
            └── email → code → POST /api/auth/reset-password
       │
       ▼
[Middleware]
  ├── يتحقق من accessToken (JWT)
  ├── إذا منتهي → يحاول refresh عبر /api/auth/refresh
  ├── إذا فشل → redirect إلى /login
  └── يتحقق من الصلاحية (ADMIN / MANAGEMENT / TEACHER / STUDENT)
       │
       ▼
[Dashboard Redirect: /dashboard → حسب الدور]
  ├── ADMIN → /admin
  ├── MANAGEMENT → /management
  ├── TEACHER → /teacher
  └── STUDENT → /student
```

### 2. تدفق الأدوار والصلاحيات
```
ADMIN (صلاحية كاملة)
  ├── /admin/* (جميع صفحات الإدارة)
  ├── إدارة المستخدمين والترقيات
  ├── توليد رموز التفعيل
  ├── سجل العمليات (audit log)
  ├── رادار الأمان
  ├── تبديل الفصل الدراسي
  └── الموافقة على طلبات الترقية

MANAGEMENT (مقيد بالمستوى)
  ├── /management/*
  ├── توليد رموز (مقيد)
  ├── ترقية المستخدمين
  └── إحصائيات الخادم

TEACHER
  ├── /teacher/* + /teacher/grades + /teacher/audit-log
  ├── استلام التكاليف وتقييمها
  ├── رفع توزيع الدرجات
  └── سجل العمليات

STUDENT
  ├── /student
  ├── رفع التكاليف
  ├── عرض التكاليف والدرجات
  └── عرض المواد والمحتوى

Shared (جميع الأدوار)
  ├── /chat (مراسلات فورية)
  ├── /library (مكتبة تعليمية)
  ├── /notifications (إشعارات)
  └── /settings (الإعدادات الشخصية)
```

### 3. تدفق قاعدة البيانات
```
[14 Models]
  User ──→ Session (جلسات)
    ├──→ Message (مرسل/مستقبل)
    ├──→ Notification
    ├──→ AuditLog
    ├──→ Content (منشور)
    ├──→ Announcement (منشور)
    ├──→ GradeDistribution
    ├──→ UploadPermission
    ├──→ Assignment (مرسل/مقيم)
    └──→ Subject (مدرس)

  Subject ──→ Assignment
    ├──→ Content
    └──→ GradeDistribution

  ActivationCode (رموز التفعيل)
  PromotionRequest (طلبات الترقية)
  SystemConfig (إعدادات النظام)
```

### 4. تدفق الصفحات والمكونات
```
RootLayout
  ├── Effects (خلفيات ثابتة):
  │   ├── NeonParticles (جزيئات نيون)
  │   ├── MatrixRain (مطر الماتريكس)
  │   ├── ScanLine (خط المسح)
  │   └── OnboardingScene / CyberGlobe (كرة أرضية ثلاثية الأبعاد)
  │
  ├── ToastProvider (إشعارات منبثقة)
  │
  └── [الصفحات المحمية] ← Header + Sidebar + Main
       ├── Header (ساعة + اسم الموقع + الجامعة)
       ├── Sidebar (قائمة جانبية حسب الدور)
       └── Main (المحتوى الرئيسي)
```

### 5. تدفق API
```
/api/auth/*           ──→ المصادقة (login, logout, activate, refresh, passkey, reset)
/api/admin/*          ──→ إدارة (generate-codes, users, upgrade, audit-log)
/api/chat/*           ──→ مراسلات (send, users, messages)
/api/announcements/*  ──→ تعميمات (create)
/api/settings/*       ──→ إعدادات (profile, change-password, change-name, change-email)
/api/notifications/*  ──→ إشعارات (list, mark-read)
/api/assignments/*    ──→ تكاليف (list, pending, upload, evaluate, history)
/api/grades/*         ──→ درجات (list, upload, distribute)
/api/library/*        ──→ محتوى (content, upload)
/api/server/*         ───→ إحصائيات (stats)
/api/subjects/*       ──→ مواد (active)
/api/semester/*       ───→ فصل (switch)
/api/promotion/*      ──→ ترقية (list, request, approve)
```

---

## CURRENT STATE & GAPS

### ✅ مكتمل
- جميع الصفحات (27 صفحة) real implementations — لا يوجد placeholders
- 42 API route كاملة
- جميع التأثيرات البصرية الحالية (MatrixRain, NeonParticles, CyberGlobe, ScanLine, OnboardingScene)
- Prisma schema مع 14 model و 8 enums
- Middleware مع JWT + role-based access + security headers
- دعم عربي كامل + RTL
- PWA + Sentry + Rate Limiting

### ❌ قيد التطوير (Phased)

**Phase 1 — التأثيرات البصرية والرسوم المتحركة ✅**
- [x] إضافة Framer Motion transitions لجميع الصفحات (page transitions)
- [x] إضافة hover/active effects للبطاقات والأزرار
- [x] إضافة تأثيرات دخول للعناصر (stagger, fade-in, slide-up) — كلاسات CSS متاحة
- [x] إضافة loading skeletons أو spinners مخصصة — `LoadingSkeleton` component
- [x] تحسين ScanLine (ألوان متعددة + سرعة متغيرة)

**Phase 2 — تحسين الكرة الأرضية (CyberGlobe)**
- [ ] إضافة خطوط ربط بين النقاط (connecting lines)
- [ ] دوران تفاعلي مع الماوس (Drag to rotate)
- [ ] نقاط مضيئة متحركة (pulsing nodes)
- [ ] إضاءة ديناميكية متعددة الألوان
- [ ] جزيئات عائمة حول الكرة (floating particles field)
- [ ] Zoom بطيء تلقائي

**Phase 3 — CAPTCHA Protection**
- [ ] إضافة Google reCAPTCHA v3 أو hCaptcha
- [ ] ربط CAPTCHA مع صفحات: login, activate, forgot-password, register
- [ ] التحقق من token في الـ API routes (auth endpoints)

**Phase 4 — CSRF Token Protection**
- [ ] إضافة CSRF token generation في middleware
- [ ] تضمين CSRF token في جميع الطلبات (meta tag + header)
- [ ] التحقق من CSRF token في API routes

**Phase 5 — ClamAV لفحص الفيروسات**
- [ ] تثبيت وإعداد ClamAV (clamscan npm package)
- [ ] إنشاء service لفحص الملفات بعد الرفع
- [ ] ربط مع API routes الخاصة برفع الملفات (assignments, library, grades)
- [ ] رفض الملفات المصابة + تسجيل في audit log

**Phase 6 — ربط Pusher Real-time بالكامل**
- [ ] تفعيل Pusher channels للإشعارات الفورية
- [ ] ربط الإشعارات الجديدة (new assignment, grade, message) عبر Pusher
- [ ] تحديث واجهات الصفحات مباشرة عند استقبال الحدث
- [ ] إضافة presence channels للمحادثة (online/offline status)

**Phase 7 — Push Notifications (PWA)**
- [ ] إعداد Service Worker لاستقبال push events
- [ ] إضافة واجهة طلب إذن الإشعارات
- [ ] إنشاء API endpoint لإرسال push notifications
- [ ] ربط مع أحداث النظام (new grade, new assignment, etc.)

**Phase 8 — Pagination لجميع القوائم**
- [ ] تحسين واجهة التصفح (Next/Prev + عرض عدد الصفحات)
- [ ] إضافة pagination للمكتبة (library)
- [ ] إضافة pagination للمحادثات (conversations)
- [ ] إضافة pagination للتكاليف (assignments) في صفحتي الطالب والمعلم
- [ ] إضافة pagination للإشعارات والإعلانات

**Phase 9 — إدارة الحالة (State Management)**
- [ ] إنشاء Zustand store للجلسة (auth store)
- [ ] إنشاء Zustand store للإعدادات (ui store: sidebar, theme)
- [ ] إنشاء Zustand store للإشعارات (notification store)
- [ ] ربط الـ stores مع الـ cookies بدلاً من localStorage
- [ ] استبدال جميع استخدامات localStorage المباشرة

**Phase 10 — 2FA + Security Enhancements**
- [ ] تفعيل المصادقة الثنائية (2FA) — واجهة API + UI
- [ ] إكمال WebAuthn registration UI
- [ ] إضافة جلسة الأجهزة الموثوقة (trusted devices)

**Phase 11 — Hooks المخصصة**
- [ ] `useAuth` — جلب بيانات المستخدم والصلاحيات
- [ ] `useApi` — fetch مع معالجة الأخطاء والتحميل
- [ ] `useDebounce` — للحقول والبحث
- [ ] `usePagination` — منطق تصفح متعدد الصفحات
- [ ] `usePusher` — الاشتراك في قنوات Pusher

**Phase 12 — التنسيقات (Refactoring Styles)**
- [ ] نقل الأنماط المكررة إلى `globals.css` كلاسات reusable
- [ ] توحيد `glassCard` و `inputStyle` عبر components
- [ ] إضافة `src/styles/` modules للصفحات الكبيرة

**Phase 13 — CI/CD والاختبارات**
- [ ] إعداد Vitest للـ unit tests
- [ ] إضافة GitHub Actions للـ CI
- [ ] Prisma migrations + seed
- [ ] Dockerfile + docker-compose

---

## ORPHANS & PENDING

### ملفات يتيمة أو غير مستخدمة
- `src/store/` — فاضي (zustand في package.json لكن بدون استخدام)
- `src/hooks/` — فاضي
- `src/styles/` — فاضي  
- `src/components/providers/` — فاضي
- `public/sw.js`, `public/workbox-*.js` — ملفات PWA (قد تحتاج تحديث)

### ميزات في الـ Schema بدون تنفيذ
- `User.twoFactorEnabled` + `twoFactorSecret` — لا API ولا UI
- `User.webAuthnEnabled` + `webAuthnCredential` + `webAuthnDeviceId` — API موجودة لكن UI تسجيل passkey غير مكتمل
- `Content.version` — حقل موجود لكن لا توجد إدارة إصدارات

### مسارات معطلة أو غير موجودة
- `/teacher/assignments` — مذكور في `RBAC.teacherPages` لكن لا يوجد ملف صفحة
