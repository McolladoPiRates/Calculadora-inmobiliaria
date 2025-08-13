import { forwardRef } from "react";
import { Input } from "./input";

export const RoundedInput = forwardRef(function RoundedInput(
  { className = "", ...props },
  ref
) {
  return <Input ref={ref} className={`rounded-xl ${className}`} {...props} />;
});
