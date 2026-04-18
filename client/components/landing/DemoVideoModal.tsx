// ============================================================================
// Demo Video Modal Component
// ============================================================================

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-6xl mx-4 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
          aria-label="Close demo"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Video Container */}
        <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <iframe
            src="/demo-video.html"
            title="Clippy Demo Video"
            className="w-full h-[80vh] min-h-[600px]"
            style={{ border: "none" }}
            allow="fullscreen"
          />
        </div>

        {/* Caption */}
        <p className="text-center text-white/40 mt-4 text-sm">
          🎬 Clippy Platform Demo - 5 minutes • Press ESC to close
        </p>
      </div>
    </div>
  );
}
