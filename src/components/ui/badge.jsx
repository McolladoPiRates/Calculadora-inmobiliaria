export function Badge({ className="", variant="default", children }) {
  const base = "inline-flex items-center px-2 py-0.5 text-xs rounded-full border";
  const styles = variant==="outline" ? "border-neutral-300 text-neutral-700 bg-white" :
                 variant==="secondary" ? "border-neutral-200 bg-neutral-100 text-neutral-700" :
                 "border-neutral-800 bg-neutral-900 text-white";
  return <span className={`${base} ${styles} ${className}`}>{children}</span>;
}
