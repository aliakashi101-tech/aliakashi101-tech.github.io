import React, { useEffect, useState } from "react";

type PreviewImageProps = {
  src: string;
  className?: string;
  /** Small thumbnails show only a warning icon; the reason is in the tooltip. */
  compact?: boolean;
};

/** <img> that shows a visible red flag in the admin panel when the image can't be loaded. */
export function PreviewImage({ src, className = "", compact = false }: PreviewImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!failed) return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;

  const reason = src.startsWith("data:") ? "Image data is invalid or corrupted." : `Image failed to load: ${src}`;
  return (
    <div
      role="alert"
      title={reason}
      className={`${className} flex items-center justify-center gap-2 border border-red-500/60 bg-red-500/10 p-1 text-xs font-medium text-red-300`}
    >
      <span aria-hidden="true">⚠</span>
      {!compact && <span>Image failed to load. Check the URL or upload it again.</span>}
    </div>
  );
}
