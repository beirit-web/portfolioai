import React from "react";
import { cn } from "../../lib/utils";

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("bd-label", className)} {...props} />
));

Label.displayName = "Label";
