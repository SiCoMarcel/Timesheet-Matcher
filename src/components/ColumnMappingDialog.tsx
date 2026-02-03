"use client";

import { useState, useEffect } from "react";
import { X, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FileColumns, MappingTemplate } from "@/lib/api";

interface ColumnMappingDialogProps {
    fileColumns: FileColumns;
    templates: MappingTemplate[];
    onConfirm: (mapping: Record<string, string>) => void;
    onSaveTemplate: (name: string, mapping: Record<string, string>) => void;
    onCancel: () => void;
}

const FIELD_OPTIONS = [
    { value: "consultant", label: "Berater" },
    { value: "company", label: "Firma" },
    { value: "process", label: "Prozess" },
    { value: "date", label: "Datum" },
    { value: "hours", label: "Stunden" },
    { value: "description", label: "Beschreibung" },
    { value: "", label: "Ignorieren" },
];

export function ColumnMappingDialog({
    fileColumns,
    templates,
    onConfirm,
    onSaveTemplate,
    onCancel,
}: ColumnMappingDialogProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [templateName, setTemplateName] = useState("");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    const handleMappingChange = (column: string, field: string) => {
        setMapping((prev) => {
            const newMapping = { ...prev };
            if (field === "") {
                // Remove mapping if "Ignorieren" selected
                delete newMapping[field];
            } else {
                // Remove previous mapping for this field if it exists
                Object.keys(newMapping).forEach((key) => {
                    if (newMapping[key] === column) {
                        delete newMapping[key];
                    }
                });
                // Add new mapping
                newMapping[field] = column;
            }
            return newMapping;
        });
    };

    const handleLoadTemplate = (template: MappingTemplate) => {
        setMapping(template.mapping);
    };

    const handleSaveTemplate = () => {
        if (templateName.trim()) {
            onSaveTemplate(templateName.trim(), mapping);
            setTemplateName("");
            setShowSaveTemplate(false);
        }
    };

    const handleConfirm = () => {
        onConfirm(mapping);
    };

    // Get the current mapping for a column
    const getFieldForColumn = (column: string): string => {
        for (const [field, col] of Object.entries(mapping)) {
            if (col === column) {
                return field;
            }
        }
        return "";
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Spalten zuordnen
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {fileColumns.filename}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Template Selection */}
                    {templates.length > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Template laden
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={(e) => {
                                    const template = templates.find(
                                        (t) => t.id === e.target.value
                                    );
                                    if (template) {
                                        handleLoadTemplate(template);
                                    }
                                }}
                                value=""
                            >
                                <option value="">Template auswählen...</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Column Mappings */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Spalten-Zuordnung
                        </label>
                        {fileColumns.columns.map((column) => (
                            <div
                                key={column}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-md"
                            >
                                <div className="flex-1 font-medium text-gray-900">
                                    {column}
                                </div>
                                <div className="w-48">
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={getFieldForColumn(column)}
                                        onChange={(e) =>
                                            handleMappingChange(column, e.target.value)
                                        }
                                    >
                                        {FIELD_OPTIONS.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Save Template Section */}
                    {showSaveTemplate && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-md">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Template-Name
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="z.B. SiCo Standard Format"
                                    className="flex-1"
                                />
                                <Button onClick={handleSaveTemplate} variant="default">
                                    <Save className="w-4 h-4 mr-2" />
                                    Speichern
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowSaveTemplate(false);
                                        setTemplateName("");
                                    }}
                                    variant="outline"
                                >
                                    Abbrechen
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <Button
                        onClick={() => setShowSaveTemplate(true)}
                        variant="outline"
                        disabled={showSaveTemplate || Object.keys(mapping).length === 0}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Als Template speichern
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={onCancel} variant="outline">
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            variant="default"
                            disabled={Object.keys(mapping).length === 0}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Hochladen
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
