import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-primary-600 text-white hover:bg-primary-700 shadow-md":
                            variant === "default",
                        "border border-input bg-white dark:bg-accent-900 hover:bg-accent-100 dark:hover:bg-accent-800":
                            variant === "outline",
                        "hover:bg-accent-100 dark:hover:bg-accent-800": variant === "ghost",
                        "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
                    },
                    {
                        "h-10 px-4 py-2": size === "default",
                        "h-9 px-3": size === "sm",
                        "h-11 px-8": size === "lg",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
