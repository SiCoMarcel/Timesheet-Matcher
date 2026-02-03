"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
    closestCenter
} from "@dnd-kit/core";
import { AlertCircle, Check, FileText, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileColumns } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DragDropMappingProps {
    fileColumns: FileColumns[];
    targetFields: { key: string; label: string; required?: boolean }[];
    onConfirm: (mappings: Record<string, Record<string, string>>) => void; // filename -> { targetKey -> sourceHeader }
    onCancel: () => void;
    onAddFiles: (files: File[]) => void;
    onRemoveFile: (filename: string) => void;
}

// Draggable Source Column Component
function DraggableSourceColumn({ header, isMapped }: { header: string, isMapped: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `source-${header}`,
        data: { type: "source", header }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "p-3 rounded-md border text-sm font-medium cursor-grab active:cursor-grabbing transition-colors",
                isDragging ? "opacity-50 border-primary-500 bg-primary-50" : "bg-white hover:border-primary-300",
                isMapped ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200"
            )}
        >
            {header}
            {isMapped && <Check className="w-3 h-3 ml-2 inline-block" />}
        </div>
    );
}

// Droppable Target Field Component
function DroppableTargetField({
    fieldKey,
    label,
    required,
    mappedHeader,
    onRemoveMapping,
    manualInput
}: {
    fieldKey: string,
    label: string,
    required?: boolean,
    mappedHeader?: string,
    onRemoveMapping: () => void,
    manualInput?: React.ReactNode
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `target-${fieldKey}`,
        data: { type: "target", fieldKey }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "p-4 rounded-lg border-2 transition-colors min-h-[80px] flex flex-col justify-center",
                isOver ? "border-primary-500 bg-primary-50" : "border-dashed border-gray-200 hover:border-gray-300",
                mappedHeader ? "border-solid border-green-500 bg-green-50/30" : ""
            )}
        >
            <div className="flex items-center justify-between mb-1">
                <span className={cn("text-sm font-medium", required && "text-gray-900")}>
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {mappedHeader && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemoveMapping(); }}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <AlertCircle className="w-3 h-3" />
                    </button>
                )}
            </div>

            {mappedHeader ? (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium border border-green-200 inline-block self-start">
                    {mappedHeader}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-xs text-muted-foreground italic">
                        Hierher ziehen
                    </div>
                    {manualInput}
                </div>
            )}
        </div>
    );
}

export function DragDropMapping({ fileColumns, targetFields, onConfirm, onCancel, onAddFiles, onRemoveFile }: DragDropMappingProps) {
    // No more filePreviews state, just use props
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [allMappings, setAllMappings] = useState<Record<string, Record<string, string>>>({}); // filename -> { fieldKey -> header }
    const [manualValues, setManualValues] = useState<Record<string, Record<string, string>>>({}); // filename -> { fieldKey -> value }
    const [activeDragItem, setActiveDragItem] = useState<string | null>(null);

    // Initial load - Auto Map
    useEffect(() => {
        // Initialize empty mappings
        const initialMappings: Record<string, Record<string, string>> = {};

        fileColumns.forEach(p => {
            initialMappings[p.filename] = {};

            // USE BACKEND SUGGESTIONS IF AVAILABLE
            if (p.suggested_mapping && Object.keys(p.suggested_mapping).length > 0) {
                // Ensure suggested keys match our target fields
                Object.entries(p.suggested_mapping).forEach(([key, value]) => {
                    // Check if key exists in target fields
                    if (targetFields.some(tf => tf.key === key)) {
                        initialMappings[p.filename][key] = value;
                    }
                });
            } else {
                // Fallback: Auto-map based on name match (fuzzy)
                targetFields.forEach(field => {
                    const match = p.columns.find(h =>
                        h.toLowerCase().includes(field.label.toLowerCase()) ||
                        field.label.toLowerCase().includes(h.toLowerCase())
                    );
                    if (match) {
                        initialMappings[p.filename][field.key] = match;
                    }
                });
            }
        });
        setAllMappings(initialMappings);
    }, [fileColumns, targetFields]); // Depend on fileColumns prop

    const activePreview = fileColumns[activeFileIndex];
    const currentMapping = activePreview ? (allMappings[activePreview.filename] || {}) : {};
    const currentManualValues = activePreview ? (manualValues[activePreview.filename] || {}) : {};

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragItem(active.data.current?.header as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over || !activePreview) return;

        const header = active.data.current?.header as string;
        const fieldKey = over.data.current?.fieldKey as string;

        if (header && fieldKey) {
            setAllMappings(prev => ({
                ...prev,
                [activePreview.filename]: {
                    ...prev[activePreview.filename],
                    [fieldKey]: header
                }
            }));
        }
    };

    const removeMapping = (fieldKey: string) => {
        if (!activePreview) return;
        setAllMappings(prev => {
            const newFileMapping = { ...prev[activePreview.filename] };
            delete newFileMapping[fieldKey];
            return {
                ...prev,
                [activePreview.filename]: newFileMapping
            };
        });
    };

    const handleManualValueChange = (fieldKey: string, value: string) => {
        if (!activePreview) return;
        setManualValues(prev => ({
            ...prev,
            [activePreview.filename]: {
                ...prev[activePreview.filename],
                [fieldKey]: value
            }
        }));
    };

    const allFilesValid = () => {
        return fileColumns.every(p => {
            // If no columns (unstructured like PDF/Image), we assume valid for auto-extraction
            if (!p.columns || p.columns.length === 0) return true;

            const map = allMappings[p.filename] || {};
            const manuals = manualValues[p.filename] || {};
            return targetFields.filter(f => f.required).every(f => !!map[f.key] || !!manuals[f.key]);
        });
    };

    const usedHeaders = Object.values(currentMapping);

    return (
        <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                {/* Header */}
                <div className="border-b px-6 py-4 flex items-center justify-between bg-white shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Daten-Mapping</h2>
                        <p className="text-sm text-gray-500">
                            Ziehen Sie die Spalten aus Ihrer Datei auf die entsprechenden Zielfelder.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
                        <Button
                            onClick={() => {
                                // Merge mappings: if no column mapped but manual value exists, use "MANUAL_VALUE:value"
                                const finalMappings = { ...allMappings };
                                fileColumns.forEach(file => {
                                    const fileManuals = manualValues[file.filename] || {};
                                    if (!finalMappings[file.filename]) finalMappings[file.filename] = {};

                                    Object.entries(fileManuals).forEach(([key, value]) => {
                                        if (!finalMappings[file.filename][key] && value) {
                                            finalMappings[file.filename][key] = `MANUAL_VALUE:${value}`;
                                        }
                                    });
                                });
                                onConfirm(finalMappings);
                            }}
                            disabled={!allFilesValid()}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Import Starten
                        </Button>
                    </div>
                </div>

                {/* Main Content - 3 Column Layout */}
                <div className="flex-1 flex overflow-hidden bg-gray-50">

                    {/* Column 1: Files List */}
                    <div className="w-64 border-r bg-white flex flex-col">
                        <div className="p-4 border-b font-medium text-gray-700 bg-gray-50 flex justify-between items-center">
                            <span>Dateien</span>
                            <label className="cursor-pointer bg-white border hover:bg-gray-50 rounded-full p-1 transition-colors" title="Dateien hinzufügen">
                                <Plus className="w-4 h-4 text-primary-600" />
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            const files = Array.from(e.target.files);
                                            onAddFiles(files);
                                            // Reset input
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {fileColumns.map((file, idx) => {
                                const isValid = targetFields.filter(f => f.required).every(f => !!allMappings[file.filename]?.[f.key]);
                                return (
                                    <div
                                        key={file.filename}
                                        onClick={() => setActiveFileIndex(idx)}
                                        className={cn(
                                            "w-full text-left px-3 py-3 rounded-md text-sm cursor-pointer border transition-all hover:bg-gray-50 group relative",
                                            activeFileIndex === idx ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-transparent"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                <span className="font-medium truncate block">{file.filename}</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveFile(file.filename);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-all"
                                                title="Datei entfernen"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {isValid ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Bereit
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Mapping fehlt
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Drop Zone for adding files */}
                            <div
                                className="border-2 border-dashed border-gray-200 rounded-md p-4 text-center hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        onAddFiles(Array.from(e.dataTransfer.files));
                                    }
                                }}
                            >
                                <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
                                    <Plus className="w-5 h-5 mb-1 opacity-50" />
                                    <span>Dateien hier ablegen</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Source Preview & Draggables */}
                    <div className="flex-1 p-6 overflow-y-auto border-r bg-white/50">
                        <Card className="h-full flex flex-col shadow-none border-gray-200">
                            <CardHeader className="py-4 border-b bg-white">
                                <CardTitle className="text-base flex items-center gap-2">
                                    Quelldaten: <span className="text-primary-600">{activePreview?.filename}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                                {/* Draggable Headers Area */}
                                <div className="p-4 bg-gray-50 border-b">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Verfügbare Spalten (Drag me)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {activePreview?.columns && activePreview.columns.length > 0 ? (
                                            activePreview.columns.map((header) => (
                                                <DraggableSourceColumn
                                                    key={header}
                                                    header={header}
                                                    isMapped={usedHeaders.includes(header)}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground w-full p-2 border border-dashed rounded bg-gray-50/50">
                                                Keine Spalten verfügbar. Automatische Extraktion aktiv. <br />
                                                Sie können "Firma" manuell setzen.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Data Preview Table */}
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                            <tr>
                                                {activePreview?.columns.map(h => (
                                                    <th key={h} className="px-4 py-3 border-b border-gray-200 font-medium whitespace-nowrap">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {/* Use rows from backend */}
                                            {activePreview?.rows && activePreview.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    {activePreview.columns.map(h => (
                                                        <td key={`${i}-${h}`} className="px-4 py-2 text-gray-600 whitespace-nowrap">
                                                            {String(row[h] || "")}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 3: Target Fields (Droppable) */}
                    <div className="w-96 p-6 overflow-y-auto bg-white">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-gray-400" />
                            Ziel-Felder
                        </h3>
                        <div className="space-y-4">
                            {targetFields.map((field) => (
                                <DroppableTargetField
                                    key={field.key}
                                    fieldKey={field.key}
                                    label={field.label}
                                    required={field.required}
                                    mappedHeader={currentMapping?.[field.key]}
                                    onRemoveMapping={() => removeMapping(field.key)}
                                    manualInput={
                                        field.key === "company" ? (
                                            <Input
                                                placeholder="Firmenname manuell eingeben..."
                                                value={currentManualValues[field.key] || ""}
                                                onChange={(e) => handleManualValueChange(field.key, e.target.value)}
                                                className="h-8 text-xs mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : field.key === "process" ? (
                                            <Input
                                                placeholder="Projekt/Prozess manuell eingeben..."
                                                value={currentManualValues[field.key] || ""}
                                                onChange={(e) => handleManualValueChange(field.key, e.target.value)}
                                                className="h-8 text-xs mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : undefined
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeDragItem ? (
                    <div className="p-3 rounded-md border border-primary-500 bg-primary-50 text-sm font-medium shadow-xl cursor-grabbing scale-105">
                        {activeDragItem}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
