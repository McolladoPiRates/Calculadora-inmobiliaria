import { useId } from "react";
export function Tabs({ value, onValueChange, className="", children }) {
  return <div className={className} data-value={value}>{children}</div>;
}
export function TabsList({ className="", children }) {
  return <div className={`inline-grid bg-neutral-100 p-1 rounded-lg ${className}`}>{children}</div>;
}
export function TabsTrigger({ value, children }) {
  // Parent will control state in the page where it's used
  return <button type="button" data-value={value} className="px-3 py-1 rounded-md hover:bg-white">{children}</button>;
}
export function TabsContent({ value, className="", children }) {
  // In our usage, content is always visible; the component controls visibility via props
  return <div className={className}>{children}</div>;
}
