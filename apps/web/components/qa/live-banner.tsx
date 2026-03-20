"use client";

interface LiveBannerProps {
  visible: boolean;
}

export function LiveBanner({ visible }: LiveBannerProps) {
  return (
    <div
      className={`h-10 bg-[hsl(var(--color-live))] text-white transition-transform duration-300 ${
        visible
          ? "translate-y-0 ease-out"
          : "-translate-y-full ease-in"
      }`}
      style={{ display: visible ? undefined : "none" }}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center px-4 gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <span className="text-sm font-semibold">LIVE</span>
        <span className="text-sm">
          Your questions are being reviewed by the presenter
        </span>
      </div>
    </div>
  );
}
