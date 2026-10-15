import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:bg-rose-700",
        secondary:
          "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300",
        outline:
          "border border-rose-200 bg-white text-zinc-800 hover:bg-rose-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200",
        ghost:
          "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-zinc-900 dark:hover:text-rose-400",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
