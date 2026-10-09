import React from "react";
import { cn } from "../../lib/utils";
import "./UiControls.css";

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <span className="bd-select-wrap">
    <select ref={ref} className={cn("bd-select", className)} {...props}>
      {children}
    </select>
    <span className="bd-select-chevron" aria-hidden="true" />
  </span>
));

Select.displayName = "Select";
