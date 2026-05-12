import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import MatrixRain from "@/components/effects/MatrixRain";
import NeonParticles from "@/components/effects/NeonParticles";
import dynamic from "next/dynamic";

const OnboardingScene = dynamic(
  () => import("@/components/effects/OnboardingScene"),
  { ssr: false },
);
export const metadata: Metadata = {
  title: "سحابة الأمن السيبراني - جامعة ذمار",
  description:
    "بيئة تعليمية تفاعلية متكاملة لطلاب ومعلمي كلية الأمن السيبراني - جامعة ذمار",
  keywords: "أمن سيبراني, جامعة ذمار, تعليم, تكاليف, مكتبة علمية",
  authors: [{ name: "محمد إبراهيم الديلمي" }, { name: "أحمد الهيدمة" }],
  openGraph: {
    title: "سحابة الأمن السيبراني",
    description: "بيئة تعليمية تفاعلية لطلاب الأمن السيبراني",
    type: "website",
    locale: "ar_YE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&family=Orbitron:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#010204] text-[#e6edf3] antialiased font-[Cairo]">
        {/* خلفيات لجميع الصفحات */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 quantum-grid opacity-50" />
          <div className="absolute inset-0">
            <NeonParticles />
          </div>
          <div className="absolute inset-0">
            <MatrixRain />
          </div>
          <div className="absolute inset-0 hidden lg:block opacity-15">
            <OnboardingScene showCard={false} />
          </div>
        </div>

        <div className="relative z-10">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
