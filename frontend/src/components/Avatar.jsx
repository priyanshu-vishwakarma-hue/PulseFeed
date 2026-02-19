import { useMemo, useState } from "react";

export default function Avatar({
  src,
  name = "",
  className = "w-8 h-8 rounded-full",
  alt = "avatar",
  style,
}) {
  const [hasImageError, setHasImageError] = useState(false);

  const normalizedSrc =
    typeof src === "string" ? src.trim() : "";

  const shouldShowImage =
    Boolean(normalizedSrc) &&
    normalizedSrc !== "null" &&
    normalizedSrc !== "undefined" &&
    !hasImageError;

  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : (words[0]?.[0] || "U").toUpperCase();

  const widthMatch = className.match(/\bw-(\d+)\b/);
  const avatarPx = widthMatch ? Number(widthMatch[1]) * 4 : 32;
  const fallbackFontSize = Math.max(12, Math.round(avatarPx * 0.38));

  const fallbackClass = useMemo(() => {
    const palette = [
      "from-rose-500 to-orange-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-indigo-500 to-sky-500",
      "from-amber-500 to-red-500",
      "from-fuchsia-500 to-purple-500",
    ];

    const key = (name || "u").toLowerCase();
    const hash = key.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }, [name]);

  if (shouldShowImage) {
    return (
      <img
        src={normalizedSrc}
        alt={alt}
        className={`${className} object-cover`}
        style={style}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div
      aria-label={alt}
      className={`${className} flex items-center justify-center bg-gradient-to-br ${fallbackClass} text-white font-semibold uppercase shadow-sm`}
      style={style}
    >
      <span style={{ fontSize: `${fallbackFontSize}px`, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}
