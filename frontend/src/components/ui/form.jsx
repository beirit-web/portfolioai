import React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "../../lib/utils";
import { Label } from "./label";
import "./UiControls.css";

const Form = FormProvider;

function FormField({ control, name, rules, render }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => render({ field, fieldState })}
    />
  );
}

const FormItem = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bd-form-item", className)} {...props} />
));
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <Label ref={ref} className={cn("bd-form-label", className)} {...props}>
    {children}
    {required ? <span aria-hidden="true"> *</span> : null}
  </Label>
));
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bd-form-control", className)} {...props} />
));
FormControl.displayName = "FormControl";

function FormMessage({ name, className }) {
  const {
    formState: { errors },
  } = useFormContext();
  const message = name ? errors[name]?.message : "";

  if (!message) return null;

  return (
    <p className={cn("bd-form-message", className)} role="alert">
      {message}
    </p>
  );
}

export { Form, FormControl, FormField, FormItem, FormLabel, FormMessage };
