import { Card } from "./card";

export function RoundedCard({ className = "", shadow = true, ...props }) {
  return (
    <Card
      className={`rounded-2xl ${shadow ? "shadow-sm" : ""} ${className}`}
      {...props}
    />
  );
}
