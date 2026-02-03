"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MappingDialogProps {
    isOpen: boolean;
    fileName: string;
    onClose: () => void;
    onConfirm: (mapping: Record<string, string>) => void;
    detectedHeaders: string[];
    targetFields: { key: string; label: string; required?: boolean }[];
}

export function MappingDialog({
    isOpen,
    fileName,
    onClose,
    onConfirm,
    detectedHeaders,
    targetFields,
}: MappingDialogProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        // Simple auto-mapping logic
        const initialMapping: Record<string, string> = {};
        targetFields.forEach((field) => {
            const match = detectedHeaders.find((header) => {
                const h = header.toLowerCase();
                const l = field.label.toLowerCase();
                const k = field.key.toLowerCase();
                return h.includes(l) || h.includes(k) || l.includes(h);
            });
            if (match) {
                initialMapping[field.key] = match;
            }
        });
        setMapping(initialMapping);
    }, [detectedHeaders, targetFields]);

    if (!isOpen) return null;

    const isComplete = targetFields
        .filter((f) => f.required)
        .every((f) => mapping[f.key]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                        <CardTitle>Spaltenmapping verifizieren</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Datei: <span className="font-semibold text-foreground">{fileName}</span>
                            <br />
                            Bitte bestätigen Sie, welche Spalten unseren Feldern entsprechen.
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid gap-4">
                        {targetFields.map((field) => (
                            <div key={field.key} className="flex items-center gap-4">
                                <div className="w-1/3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        {field.label}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <select
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={mapping[field.key] || ""}
                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                    >
                                        <option value="">-- Spalte auswählen --</option>
                                        {detectedHeaders.map((header) => (
                                            <option key={header} value={header}>
                                                {header}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-8">
                                    {mapping[field.key] ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        field.required && <AlertCircle className="h-5 w-5 text-amber-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => onConfirm(mapping)}
                            disabled={!isComplete}
                            className="px-8"
                        >
                            Mapping bestätigen
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
