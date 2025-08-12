// Minimal no-op tooltip layer
export function TooltipProvider({ children }) { return children; }
export function Tooltip({ children }) { return children; }
export function TooltipTrigger({ asChild=false, children, ...props }) {
  if (asChild) return children;
  return <span {...props}>{children}</span>;
}
export function TooltipContent({ children }) { return null; }
