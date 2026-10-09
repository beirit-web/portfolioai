import React from "react";
import { cn } from "../../lib/utils";
import "./UiControls.css";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("bd-textarea", className)} {...props} />
));

Textarea.displayName = "Textarea";
