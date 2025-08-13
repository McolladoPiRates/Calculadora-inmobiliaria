import { Badge } from "./badge";

export function PillBadge({ className = "", variant = "secondary", ...props }) {
  return <Badge variant={variant} className={`rounded-full ${className}`} {...props} />;
}
