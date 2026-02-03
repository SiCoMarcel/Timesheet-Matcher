import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function formatMonth(month: number, year: number): string {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
    });
}
