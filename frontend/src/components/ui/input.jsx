import React from "react";
import { cn } from "../../lib/utils";
import "./UiControls.css";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("bd-input", className)} {...props} />
));

Input.displayName = "Input";
