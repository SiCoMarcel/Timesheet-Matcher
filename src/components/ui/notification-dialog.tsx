"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

interface NotificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: string;
    variant?: "success" | "error" | "warning" | "info";
}

export function NotificationDialog({
    open,
    onOpenChange,
    title,
    message,
    variant = "info",
}: NotificationDialogProps) {
    if (!open) return null;

    const variantStyles = {
        success: {
            icon: CheckCircle2,
            iconColor: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-50 dark:bg-green-950/30",
            borderColor: "border-green-200 dark:border-green-800",
        },
        error: {
            icon: XCircle,
            iconColor: "text-red-600 dark:text-red-400",
            bgColor: "bg-red-50 dark:bg-red-950/30",
            borderColor: "border-red-200 dark:border-red-800",
        },
        warning: {
            icon: AlertTriangle,
            iconColor: "text-yellow-600 dark:text-yellow-400",
            bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
            borderColor: "border-yellow-200 dark:border-yellow-800",
        },
        info: {
            icon: Info,
            iconColor: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-950/30",
            borderColor: "border-blue-200 dark:border-blue-800",
        },
    };

    const style = variantStyles[variant];
    const Icon = style.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="relative z-50 w-full max-w-md mx-4 bg-white dark:bg-accent-900 rounded-lg shadow-xl border border-accent-200 dark:border-accent-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                {/* Header with icon */}
                <div className={cn("p-6 pb-4 flex items-start gap-4", style.bgColor, style.borderColor, "border-b")}>
                    <div className={cn("p-2 rounded-full", style.bgColor)}>
                        <Icon className={cn("h-6 w-6", style.iconColor)} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold">{title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-4">
                    <p className="text-sm text-muted-foreground">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="min-w-[100px]"
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}
