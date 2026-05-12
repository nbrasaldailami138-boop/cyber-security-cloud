"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import MatrixRain from "@/components/effects/MatrixRain";
import NeonParticles from "@/components/effects/NeonParticles";
import ScanLine from "@/components/effects/ScanLine";
import PageTransition from "@/components/layout/PageTransition";

const OnboardingScene = dynamic(
  () => import("@/components/effects/OnboardingScene"),
  { ssr: false },
);

const slides = [
  {
    id: 1,
    title: "الفضاء السيبراني",
    subtitle: "سحابة الأمن السيبراني",
    description:
      "مرحباً بك في بيئة تعليمية متكاملة تجمع بين الطلاب والمعلمين والإدارة في منصة واحدة مؤمنة بأعلى معايير الحماية.",
    icon: "🌍",
    side: "right",
  },
  {
    id: 2,
    title: "دور الطالب",
    subtitle: "قائد رحلته التعليمية",
    description:
      "ارفع تكاليفك الجامعية إلى معلمي المواد.\nراسل معلميك وإدارتك مباشرة.\nتصفح المكتبة العلمية وحمّل المحتوى.\nتابع درجاتك وملاحظات المعلمين فور صدورها.",
    icon: "🎓",
    side: "left",
  },
  {
    id: 3,
    title: "دور المعلم",
    subtitle: "صانع المعرفة",
    description:
      "استقبل تكاليف طلابك وقم بتقييمها.\nانشر الملازم والمحاضرات في المكتبة العلمية.\nنشر التعميمات على طلاب مستواك.\nصدّر ووزع درجات الطلاب آلياً.",
    icon: "👨‍🏫",
    side: "right",
  },
  {
    id: 4,
    title: "تفعيل الحساب",
    subtitle: "أمان تام وحماية متقدمة",
    description:
      "بعد استلام كود التفعيل:\nأدخل بريدك الإلكتروني وكلمة المرور.\nأدخل كود التفعيل المرسل إلى بريدك.\nتمتع بكامل صلاحيات حسابك فوراً.",
    icon: "🔐",
    side: "left",
  },
  {
    id: 5,
    title: "المكتبة العلمية",
    subtitle: "مصدرك للمعرفة",
    description:
      "كورسات يوتيوب تعليمية.\nملازم ومحاضرات قابلة للتحميل.\nملفات PDF وصور تعليمية.\nمحتوى منظم حسب مستواك الدراسي.",
    icon: "📚",
    side: "right",
  },
  {
    id: 6,
    title: "جاهز للانطلاق",
    subtitle: "رحلتك تبدأ الآن",
    description:
      "النظام محمي بتشفير متقدم.\nمصادقة ثنائية للحماية القصوى.\nجميع معايير OWASP Top 10 مطبقة.\nبياناتك في أمان تام.",
    icon: "🚀",
    side: "center",
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [finished, setFinished] = useState(false);
  const router = useRouter();

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      // انتقال تلقائي بعد آخر سلايد مع تأثير
      localStorage.setItem("onboardingSeen", "true");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    }
  }, [currentSlide, router]);

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide((prev) => prev - 1);
  };

  const handleSkip = () => {
    localStorage.setItem("onboardingSeen", "true");
    router.push("/login");
  };

  // التنقل بلوحة المفاتيح
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentSlide, nextSlide]);

  // ==================== نافذة تسجيل الدخول النهائية ====================
  if (finished) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-space">
        <div className="absolute inset-0 quantum-grid z-0" />
        <MatrixRain />
        <NeonParticles />
        <ScanLine />

        {/* كرة أرضية في الخلفية */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: -100, opacity: 0.6 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute z-10 hidden lg:block"
          style={{ left: "5%" }}
        >
          <OnboardingScene showCard={false} />
        </motion.div>

        {/* اسم الموقع */}
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="absolute top-10 z-20 text-center w-full font-bold font-arabic px-4"
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2.8rem)",
            color: "#00e5ff",
            textShadow:
              "0 0 10px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.5)",
            letterSpacing: "1px",
          }}
        >
          سحابة الأمن السيبراني
        </motion.h1>

        {/* بطاقة تسجيل الدخول - محسنة للجوال */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
          className="relative z-30 w-[90%] max-w-[420px] px-4"
        >
          <div className="glass-card p-6 sm:p-8 md:p-10 text-center neon-border rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            {/* أيقونة القفل */}
            <motion.div
              className="text-6xl mb-5"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🔒
            </motion.div>

            <h2
              className="text-2xl sm:text-3xl font-bold mb-2 font-arabic"
              style={{
                background: "linear-gradient(to bottom, #fff, #a5b4fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              تسجيل الدخول
            </h2>
            <p className="text-gray-400 mb-8 font-arabic text-sm sm:text-base">
              مرحباً بعودتك إلى منصتك التعليمية
            </p>

            <button
              onClick={() => {
                localStorage.setItem("onboardingSeen", "true");
                router.push("/login");
              }}
              className="w-full mb-4 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-indigo-500/40 active:scale-95"
            >
              🚀 تسجيل الدخول
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  // ==================== عرض الشرائح ====================
  const current = slides[currentSlide];
  const isRight = current.side === "right";
  const isCenter = current.side === "center";

  return (
    <PageTransition>
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bg-space">
      {/* خلفيات */}
      <div className="absolute inset-0 quantum-grid z-0" />
      <MatrixRain />
      <NeonParticles />
      <ScanLine />

      {/* الكرة الأرضية */}
      <div className="absolute inset-0 z-10 opacity-40 md:opacity-100">
        <OnboardingScene showCard={false} />
      </div>

      {/* زر تخطي - محسن للجوال */}
      <motion.button
        onClick={handleSkip}
        className="absolute top-6 right-4 sm:right-6 z-50 px-4 py-2 text-sm font-arabic rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors"
        whileTap={{ scale: 0.95 }}
      >
        تخطي ←
      </motion.button>

      {/* شريط التقدم العلوي (بديل النقاط) */}
      <div className="absolute top-6 left-4 sm:left-6 right-20 sm:right-24 z-50 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentSlide + 1) / slides.length) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* ========================================= */}
      {/* عرض سطح المكتب (Hidden on Mobile) */}
      {/* ========================================= */}
      <AnimatePresence mode="wait">
        {!isCenter ? (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: isRight ? 100 : -100, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: isRight ? -100 : 100, scale: 0.85 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
            className={`absolute top-1/2 -translate-y-1/2 z-40 hidden md:block ${
              isRight ? "right-8 lg:right-20" : "left-8 lg:left-20"
            }`}
          >
            <div className="glass-card p-8 w-[360px] lg:w-[400px] text-center neon-border rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl">
              {/* أيقونة */}
              <motion.div
                className="text-7xl mb-6"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {current.icon}
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2 font-arabic drop-shadow-lg">
                {current.title}
              </h2>
              <p className="text-indigo-300 text-sm mb-4 font-mono uppercase tracking-widest">
                {current.subtitle}
              </p>
              <div className="w-20 h-px bg-indigo-500/50 mx-auto mb-5" />
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line font-arabic">
                {current.description}
              </p>
            </div>
          </motion.div>
        ) : (
          // عرض مركزي لسلايد النهاية (Desktop)
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 hidden md:block"
          >
            <div className="glass-card p-10 w-[400px] text-center neon-border rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl">
              <motion.div
                className="text-8xl mb-6"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {current.icon}
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2 font-arabic">
                {current.title}
              </h2>
              <p className="text-indigo-300 text-sm mb-4 font-mono">
                {current.subtitle}
              </p>
              <div className="w-20 h-px bg-indigo-500/50 mx-auto mb-5" />
              <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line font-arabic">
                {current.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* عرض الجوال (Mobile First - Priority) */}
      {/* ========================================= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`mobile-${currentSlide}`}
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 z-40 md:hidden pt-4 pb-6 px-4"
        >
          <div className="relative w-full bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-10 pb-4">
            {/* البطاقة الزجاجية للجوال */}
            <div className="glass-card w-full p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl relative overflow-hidden">
              {/* زخرفة داخلية */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 blur-2xl rounded-full" />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* الأيقونة */}
                <motion.div
                  className="text-6xl mb-4 drop-shadow-lg"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  {current.icon}
                </motion.div>

                {/* العنوان */}
                <h2 className="text-2xl font-bold text-white mb-1 font-arabic tracking-wide">
                  {current.title}
                </h2>

                {/* العنوان الفرعي */}
                <p className="text-indigo-300 text-xs mb-4 font-mono tracking-wider uppercase">
                  {current.subtitle}
                </p>

                {/* فاصل */}
                <div className="w-16 h-px bg-indigo-400/30 mb-4" />

                {/* الوصف */}
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line font-arabic mb-4">
                  {current.description}
                </p>

                {/* رقم الصفحة */}
                <div className="absolute bottom-2 left-4 text-[10px] text-gray-500 font-mono">
                  {currentSlide + 1} / {slides.length}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* أزرار التنقل - محسنة للجوال والديسكتوب */}
      <div className="absolute bottom-4 left-0 right-0 z-50 flex justify-center items-center gap-3 px-4 pb-2 md:pb-0 md:bottom-10">
        <motion.button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          whileTap={{ scale: 0.95 }}
          className={`px-5 py-3 rounded-xl font-arabic text-sm border border-white/10 backdrop-blur-md transition-colors ${
            currentSlide === 0
              ? "opacity-30 cursor-not-allowed bg-white/5"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          ← السابق
        </motion.button>

        <motion.button
          onClick={nextSlide}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 md:flex-none px-8 py-3.5 text-base font-bold font-arabic rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all"
        >
          {currentSlide === slides.length - 1 ? "✨" : "التالي →"}
        </motion.button>
      </div>
    </main>
    </PageTransition>
  );
}
