"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TimesheetEntry } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface TimesheetTableProps {
    entries: TimesheetEntry[];
    onEntriesChange: (entries: TimesheetEntry[]) => void;
    editable?: boolean;
}

export function TimesheetTable({
    entries,
    onEntriesChange,
    editable = true,
}: TimesheetTableProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedEntry, setEditedEntry] = useState<TimesheetEntry | null>(null);

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setEditedEntry({ ...entries[index] });
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditedEntry(null);
    };

    const saveEdit = () => {
        if (editedEntry && editingIndex !== null) {
            const newEntries = [...entries];
            newEntries[editingIndex] = editedEntry;
            onEntriesChange(newEntries);
            cancelEdit();
        }
    };

    const deleteEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        onEntriesChange(newEntries);
    };

    const updateField = (field: keyof TimesheetEntry, value: string | number) => {
        if (editedEntry) {
            setEditedEntry({ ...editedEntry, [field]: value });
        }
    };

    // Group by Project
    const groupedEntries = entries.reduce((acc, entry, index) => {
        // Use project_name, fallback to "Kein Projekt"
        const project = entry.project_name || "Ohne Projektzuordnung";

        if (!acc[project]) {
            acc[project] = [];
        }
        acc[project].push({ entry, index });
        return acc;
    }, {} as Record<string, Array<{ entry: TimesheetEntry; index: number }>>);

    const sortedProjects = Object.keys(groupedEntries).sort();

    if (entries.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Keine Einträge vorhanden</p>
                <p className="text-sm mt-2">Laden Sie Dateien hoch, um zu beginnen</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {sortedProjects.map((project) => (
                <div key={project} className="space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-2 p-2 border-b-2 border-primary-100 dark:border-primary-900 text-primary-700 dark:text-primary-300">
                        <span className="bg-primary-100 dark:bg-primary-900/50 p-1.5 rounded-md text-primary-600 dark:text-primary-400">
                            {/* Icon placeholder if needed */}
                            #
                        </span>
                        {project}
                    </h3>

                    <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-gray-500">Datum</th>
                                        <th className="text-left p-3 font-medium text-gray-500">Beratername</th>
                                        <th className="text-left p-3 font-medium text-gray-500">Firma</th>
                                        <th className="text-left p-3 font-medium text-gray-500">Prozessstream</th>
                                        <th className="text-left p-3 font-medium text-gray-500">Stunden</th>
                                        <th className="text-left p-3 font-medium text-gray-500">Leistungsnachweis</th>
                                        {editable && <th className="text-left p-3 font-medium text-gray-500">Aktionen</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {groupedEntries[project]
                                        // Sort by date within project
                                        .sort((a, b) => new Date(a.entry.service_date).getTime() - new Date(b.entry.service_date).getTime())
                                        .map(({ entry, index }) => (
                                            <tr
                                                key={index}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                            >
                                                {editingIndex === index ? (
                                                    <>
                                                        <td className="p-3">
                                                            {/* Read-only date in edit mode for now, or editable? Let's keep it simple */}
                                                            {formatDate(entry.service_date)}
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                value={editedEntry?.consultant_name || ""}
                                                                onChange={(e) =>
                                                                    updateField("consultant_name", e.target.value)
                                                                }
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                value={editedEntry?.company || ""}
                                                                onChange={(e) =>
                                                                    updateField("company", e.target.value)
                                                                }
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                value={editedEntry?.process_stream || ""}
                                                                onChange={(e) =>
                                                                    updateField("process_stream", e.target.value)
                                                                }
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                type="number"
                                                                step="0.5"
                                                                value={editedEntry?.hours || 0}
                                                                onChange={(e) =>
                                                                    updateField("hours", parseFloat(e.target.value))
                                                                }
                                                                className="h-8 w-20"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                value={editedEntry?.description || ""}
                                                                onChange={(e) =>
                                                                    updateField("description", e.target.value)
                                                                }
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={saveEdit}
                                                                >
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={cancelEdit}
                                                                >
                                                                    <X className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 text-gray-500 font-mono text-xs">
                                                            {formatDate(entry.service_date)}
                                                        </td>
                                                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                                                            {entry.consultant_name}
                                                        </td>
                                                        <td className="p-3 text-gray-600">{entry.company}</td>
                                                        <td className="p-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                                {entry.process_stream}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-semibold">{entry.hours} h</td>
                                                        <td className="p-3 max-w-xs truncate text-gray-500 text-xs" title={entry.description}>
                                                            {entry.description}
                                                        </td>
                                                        {editable && (
                                                            <td className="p-3">
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={() => startEdit(index)}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={() => deleteEntry(index)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
