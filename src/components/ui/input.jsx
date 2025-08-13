import { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full h-10 px-3 rounded-md border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
      {...props}
    />
  );
});
