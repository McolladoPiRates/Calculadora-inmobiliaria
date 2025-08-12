import React from "react";

export function Button({ className = "", variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  let variantStyles = "";
  if (variant === "primary") {
    // Degradado invertido y más ligero
    variantStyles = "bg-gradient-to-r from-indigo-100 via-white to-amber-100 text-neutral-900 border border-white/70 hover:from-indigo-200 hover:to-amber-200 focus:ring-indigo-300";
  } else if (variant === "secondary") {
    variantStyles = "bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-100 focus:ring-neutral-400";
  } else if (variant === "gradient") {
    variantStyles = "bg-gradient-to-r from-amber-200 via-white to-indigo-200 text-neutral-900 border border-white/70 hover:from-amber-300 hover:to-indigo-300";
  } else {
    variantStyles = "";
  }
  return <button className={`${base} ${variantStyles} ${className}`} {...props} />;
}
