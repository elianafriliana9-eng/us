"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share2, X, Smartphone, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [isDismissed, setIsDismissed] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(standalone);

    if (standalone) return;

    // Check if dismissed in this session
    try {
      if (sessionStorage.getItem("us:pwa-dismissed") === "1") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // storage unavailable
    }
    setIsDismissed(false);

    // Detect iOS
    const isAppleDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isAppleDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Browser doesn't support beforeinstallprompt or already prompted
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("us:pwa-dismissed", "1");
    } catch {
      // ignore
    }
  };

  // Adjust bottom position if on tab pages with bottom nav
  const isTabPage = pathname !== "/";
  const bottomClass = isTabPage ? "bottom-22" : "bottom-6";

  return (
    <>
      <aside
        aria-label="Unduh aplikasi PWA"
        className={`fixed ${bottomClass} right-4 z-40 max-w-[calc(100vw-2rem)] w-[320px] transition-all duration-300 pointer-events-auto`}
      >
        <div className="relative rounded-2xl bg-white/95 backdrop-blur-md p-3.5 shadow-[0_12px_30px_-6px_rgba(184,0,53,0.18),0_4px_12px_-2px_rgba(0,0,0,0.06)] border border-[#e5bdbe]">
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup saran unduh aplikasi"
            className="absolute top-2 right-2 p-1 text-[#5c3f40]/60 hover:text-[#b80035] rounded-full hover:bg-rose-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffdada] to-[#faf2ee] text-[#b80035] border border-rose-200">
              <Smartphone className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs font-bold text-[#1e1b19] truncate">
                Pasang Aplikasi Us
              </p>
              <p className="text-[11px] text-[#5c3f40] leading-tight">
                Akses lebih cepat & terasa seperti app native.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 h-8 px-3 rounded-xl bg-[#e11d48] text-white text-xs font-bold shadow-sm shadow-rose-500/25 hover:bg-[#b80035] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{deferredPrompt ? "Download App" : "Cara Install"}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-8 px-3 rounded-xl text-xs font-medium text-[#5c3f40] hover:bg-stone-100 active:scale-95 transition-all"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </aside>

      {/* Guide dialog for iOS / manual install */}
      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-rose-100 text-[#1e1b19] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#b80035]" />
                <h3 className="text-sm font-bold">Pasang ke Layar Utama</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-[#5c3f40] hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-[#5c3f40]">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#b80035]">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <p>
                      1. Ketuk tombol <span className="font-bold text-[#1e1b19]">Bagikan (Share)</span> di bilah bawah Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#b80035]">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                    <p>
                      2. Gulir ke bawah lalu pilih <span className="font-bold text-[#1e1b19]">Tambahkan ke Layar Utama (Add to Home Screen)</span>.
                    </p>
                  </div>
                </>
              ) : (
                <p>
                  Buka menu peramban (<span className="font-bold text-[#1e1b19]">⋮</span> di Chrome atau ikon pasang di bilah alamat) lalu pilih <span className="font-bold text-[#1e1b19]">Install Us</span>.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full h-10 rounded-xl bg-[#e11d48] text-white text-xs font-bold active:scale-95 transition-all"
            >
              Mengerti 💕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
