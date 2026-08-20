import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        outline: "border border-border bg-transparent hover:bg-muted",
        ghost: "hover:bg-muted",
        danger: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading = false,
      loadingText,
      type = "button",
      variant,
      size,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <LoaderCircle
            className="h-4 w-4 motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : null}
        {isLoading && loadingText ? loadingText : children}
      </button>
    );
  },
);
Button.displayName = "Button";

export interface IconButtonProps extends Omit<ButtonProps, "aria-label"> {
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "icon", ...props }, ref) => (
    <Button ref={ref} size={size} {...props} />
  ),
);
IconButton.displayName = "IconButton";
