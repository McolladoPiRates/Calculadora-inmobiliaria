export function Label({ className="", children, ...props }) {
  return <label className={`block mb-1 text-sm text-neutral-700 ${className}`} {...props}>{children}</label>;
}
