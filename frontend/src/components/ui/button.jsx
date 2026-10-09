import React from "react";
import { cn } from "../../lib/utils";
import "./UiControls.css";

const buttonVariants = {
  default: "bd-button bd-button--default",
  ghost: "bd-button bd-button--ghost",
};

export const Button = React.forwardRef(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants[variant] || buttonVariants.default, className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
