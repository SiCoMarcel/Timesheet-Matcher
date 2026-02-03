import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Timesheet Konsolidierung | Silicium Consulting",
    description: "Automatische Konsolidierung von Timesheets aus verschiedenen Dateiformaten",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de" className={inter.className} suppressHydrationWarning>
            <body className="antialiased min-h-screen bg-gradient-to-br from-accent-50 via-white to-primary-50 dark:from-accent-950 dark:via-accent-900 dark:to-primary-950" suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
