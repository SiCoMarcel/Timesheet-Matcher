"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
}

export function FileUploader({ onFilesSelected, disabled }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files).filter((file) =>
                    isValidFile(file)
                );
                setSelectedFiles((prev) => [...prev, ...files]);
            }
        },
        []
    );

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).filter((file) =>
                isValidFile(file)
            );
            setSelectedFiles((prev) => [...prev, ...files]);
        }
    }, []);

    const isValidFile = (file: File): boolean => {
        const validExtensions = [
            ".pdf",
            ".xlsx",
            ".xls",
            ".csv",
            ".docx",
            ".doc",
            ".xml",
            ".png",
            ".jpg",
            ".jpeg",
        ];
        return validExtensions.some((ext) =>
            file.name.toLowerCase().endsWith(ext)
        );
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = () => {
        if (selectedFiles.length > 0) {
            onFilesSelected(selectedFiles);
            setSelectedFiles([]);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "relative rounded-lg border-2 border-dashed p-8 text-center transition-all",
                    dragActive
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950/20"
                        : "border-accent-300 dark:border-accent-700 hover:border-primary-400",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.xml,.png,.jpg,.jpeg"
                    onChange={handleChange}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Upload className="mx-auto h-12 w-12 text-accent-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                    Dateien hochladen
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
                </p>
                <p className="text-xs text-muted-foreground">
                    Unterstützt: PDF, Excel, CSV, Word, XML, Bilder (PNG/JPG)
                </p>
            </div>

            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                        Ausgewählte Dateien ({selectedFiles.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-white dark:bg-accent-900 rounded-md border"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-primary-600" />
                                    <div className="text-sm">
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    disabled={disabled}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button
                        onClick={handleUpload}
                        disabled={disabled}
                        className="w-full"
                        size="lg"
                    >
                        {selectedFiles.length} Datei(en) hochladen
                    </Button>
                </div>
            )}
        </div>
    );
}
