"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    cancelText?: string;
    confirmText?: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
}

export function AlertDialog({
    open,
    onOpenChange,
    title,
    description,
    cancelText = "Abbrechen",
    confirmText = "Bestätigen",
    onConfirm,
    variant = "default",
}: AlertDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="relative z-50 w-full max-w-md mx-4 bg-white dark:bg-accent-900 rounded-lg shadow-xl border border-accent-200 dark:border-accent-700 p-6 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
