import React from "react";

// Simple avatar component: shows image when src present, otherwise shows initials (1-2 letters)
export default function Avatar({ src, name = "", className = "w-8 h-8 rounded-full", alt = "avatar", style }) {
  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("") || "U";

  if (src) {
    return <img src={src} alt={alt} className={className + " object-cover"} style={style} />;
  }

  return (
    <div
      aria-hidden
      className={
        `${className} flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold`
      }
      style={style}
    >
      {initials}
    </div>
  );
}
