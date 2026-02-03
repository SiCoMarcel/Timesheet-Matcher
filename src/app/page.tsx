"use client";

import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/FileUploader";
import { MonthSelector } from "@/components/MonthSelector";
import { TimesheetTable } from "@/components/TimesheetTable";
import { DragDropMapping } from "@/components/DragDropMapping";
import { NotificationDialog } from "@/components/ui/notification-dialog";
import {
    uploadFilesWithMapping,
    saveEntries,
    exportExcel,
    getProjectEntries,
    getMappingTemplates,
    createMappingTemplate,
    previewFileColumns,
    type Project,
    type TimesheetEntry,
    type FileColumns,
} from "@/lib/api";

const TARGET_FIELDS = [
    { key: "consultant", label: "Berater", required: true },
    { key: "company", label: "Firma", required: true },
    { key: "project", label: "Projekt", required: false }, // New project field
    { key: "process", label: "Prozess", required: false },
    { key: "date", label: "Datum", required: false },
    { key: "hours", label: "Stunden", required: true },
    { key: "description", label: "Beschreibung", required: true },
    { key: "project_phase", label: "Projektphase", required: false },
    { key: "non_billable_hours", label: "Nicht verrechenbare Stunden", required: false }
];

export default function Home() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" | "warning" | "info" }>({ open: false, title: "", message: "", variant: "info" });

    // New state for manual mapping
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [fileColumnsData, setFileColumnsData] = useState<FileColumns[]>([]);
    const [showMappingDialog, setShowMappingDialog] = useState(false);

    // Initial mapping state
    useEffect(() => {
        loadMappingTemplates();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadProjectEntries(selectedProject.id);
        }
    }, [selectedProject]);

    const loadMappingTemplates = async () => {
        try {
            const templates = await getMappingTemplates();
            // setMappingTemplates(templates); // Unused for now in new UI, but kept if we add it back
        } catch (error) {
            console.error("Fehler beim Laden der Templates:", error);
        }
    };

    const loadProjectEntries = async (projectId: string) => {
        setLoading(true);
        try {
            const data = await getProjectEntries(projectId);
            setEntries(data);
        } catch (error) {
            console.error("Fehler beim Laden der Einträge:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilesSelected = async (files: File[]) => {
        if (!selectedProject) {
            setNotification({ open: true, title: "Projekt erforderlich", message: "Bitte wählen Sie zuerst ein Projekt aus", variant: "warning" });
            return;
        }

        setUploading(true);
        try {
            // Get preview data from backend
            const columnsData = await previewFileColumns(files, selectedProject.id);
            setFileColumnsData(columnsData);
            setPendingFiles(files);
            setShowMappingDialog(true);
        } catch (error) {
            console.error("Fehler beim Laden der Vorschau:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Lesen der Dateien", variant: "error" });
        } finally {
            setUploading(false);
        }
    };

    const handleAddFiles = async (files: File[]) => {
        if (!selectedProject) return;

        setUploading(true);
        try {
            const columnsData = await previewFileColumns(files, selectedProject.id);
            setFileColumnsData(prev => [...prev, ...columnsData]);
            setPendingFiles(prev => [...prev, ...files]);
        } catch (error) {
            console.error("Fehler beim Hinzufügen der Dateien:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Hinzufügen der Dateien", variant: "error" });
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = (filename: string) => {
        setPendingFiles(prev => prev.filter(f => f.name !== filename));
        setFileColumnsData(prev => prev.filter(f => f.filename !== filename));
    };

    const handleMappingConfirm = async (allMappings: Record<string, Record<string, string>>) => {
        if (!selectedProject) return;

        setShowMappingDialog(false);
        setUploading(true);

        try {
            let allEntries: TimesheetEntry[] = [];

            for (const file of pendingFiles) {
                const mapping = allMappings[file.name];
                if (mapping) {
                    // Upload file with its specific mapping
                    const result = await uploadFilesWithMapping([file], selectedProject.id, mapping);
                    allEntries = [...allEntries, ...result.entries];

                    if (result.errors && result.errors.length > 0) {
                        console.warn(`Fehler bei ${file.name}:`, result.errors);
                    }
                }
            }

            if (allEntries.length > 0) {
                const newEntries = [...entries, ...allEntries];
                setEntries(newEntries);

                // Auto-save
                await saveEntries(selectedProject.id, newEntries);
                setNotification({ open: true, title: "Erfolg", message: `${allEntries.length} Einträge erfolgreich importiert`, variant: "success" });
            } else {
                setNotification({ open: true, title: "Info", message: "Keine Einträge importiert", variant: "info" });
            }

        } catch (error) {
            console.error("Upload error:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Upload", variant: "error" });
        } finally {
            setUploading(false);
            // setPendingFiles([]); // Kept for re-mapping capability
        }
    };

    const handleSaveTemplate = async (name: string, mapping: Record<string, string>) => {
        try {
            await createMappingTemplate(name, mapping);
            await loadMappingTemplates();
            setNotification({ open: true, title: "Erfolg", message: `Template "${name}" gespeichert`, variant: "success" });
        } catch (error) {
            console.error("Fehler beim Speichern des Templates:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Speichern des Templates", variant: "error" });
        }
    };

    const handleMappingCancel = () => {
        setShowMappingDialog(false);
        setPendingFiles([]);
        setFileColumnsData([]);
    };

    const handleSave = async () => {
        if (!selectedProject) return;

        setLoading(true);
        try {
            await saveEntries(selectedProject.id, entries);
            setNotification({ open: true, title: "Erfolgreich gespeichert", message: "Einträge erfolgreich gespeichert", variant: "success" });
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            setNotification({ open: true, title: "Speicherfehler", message: "Fehler beim Speichern der Einträge", variant: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedProject) return;

        setExporting(true);
        try {
            const blob = await exportExcel(
                selectedProject.id,
                selectedProject.month,
                selectedProject.year
            );

            // Download file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${selectedProject.name}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Fehler beim Export:", error);
            setNotification({ open: true, title: "Export-Fehler", message: "Fehler beim Exportieren", variant: "error" });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
                        Timesheet Konsolidierung
                    </h1>
                    <p className="text-muted-foreground">
                        Automatische Konsolidierung von Leistungserfassungen
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Projekt auswählen</CardTitle>
                                <CardDescription>
                                    Wählen Sie ein bestehendes Projekt oder erstellen Sie ein neues
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MonthSelector
                                    selectedProjectId={selectedProject?.id || null}
                                    onProjectSelect={setSelectedProject}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Konsolidierte Einträge</CardTitle>
                                        <CardDescription
                                            className={fileColumnsData.length > 0 ? "cursor-pointer hover:text-primary" : ""}
                                            onDoubleClick={() => {
                                                if (fileColumnsData.length > 0) setShowMappingDialog(true);
                                            }}
                                            title={fileColumnsData.length > 0 ? "Doppelklick zum Bearbeiten des Mappings" : ""}
                                        >
                                            {selectedProject
                                                ? `${selectedProject.name} - ${entries.length} Einträge`
                                                : "Kein Projekt ausgewählt"}
                                        </CardDescription>
                                    </div>
                                    {selectedProject && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    // If we have files, this opens Mapping.
                                                    // If not, it opens Upload.
                                                    setShowMappingDialog(true);
                                                }}
                                                variant="default" // Primary action now
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                {fileColumnsData.length > 0 ? "Mapping" : "Import"}
                                            </Button>

                                            {entries.length > 0 && (
                                                <>
                                                    <Button
                                                        onClick={handleSave}
                                                        disabled={loading}
                                                        variant="outline"
                                                    >
                                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                                        Speichern
                                                    </Button>
                                                    <Button
                                                        onClick={handleExport}
                                                        disabled={exporting}
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0"
                                                        title="Excel Export"
                                                    >
                                                        {exporting ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!selectedProject ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p>Bitte wählen Sie zuerst ein Projekt aus</p>
                                    </div>
                                ) : loading ? (
                                    <div className="text-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
                                    </div>
                                ) : (
                                    <TimesheetTable
                                        entries={entries}
                                        onEntriesChange={setEntries}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Import Wizard (Step 1: Upload, Step 2: Mapping) */}
                {showMappingDialog && (
                    fileColumnsData.length > 0 ? (
                        <DragDropMapping
                            fileColumns={fileColumnsData}
                            targetFields={TARGET_FIELDS}
                            onConfirm={handleMappingConfirm}
                            onCancel={() => setShowMappingDialog(false)}
                            onAddFiles={handleAddFiles}
                            onRemoveFile={handleRemoveFile}
                        />
                    ) : (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="border-b px-6 py-4 flex items-center justify-between">
                                    <h2 className="text-xl font-bold">Dateien importieren</h2>
                                    <Button
                                        variant="ghost"
                                        className="h-9 w-9 p-0" // Manual icon sizing
                                        onClick={() => setShowMappingDialog(false)}
                                    >
                                        X
                                    </Button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                                            Laden Sie hier Ihre Timesheets (Excel, CSV, PDF, etc.) hoch.
                                            Im nächsten Schritt können Sie die Spalten zuordnen.
                                        </div>
                                        <FileUploader
                                            onFilesSelected={handleFilesSelected}
                                            disabled={uploading}
                                        />
                                        {uploading && (
                                            <div className="flex items-center justify-center gap-2 text-primary">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Verarbeite Dateien...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Notification Dialog */}
                <NotificationDialog
                    open={notification.open}
                    onOpenChange={(open) => setNotification({ ...notification, open })}
                    title={notification.title}
                    message={notification.message}
                    variant={notification.variant}
                />

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground">
                    <p>© 2026 Silicium Consulting - Timesheet Konsolidierung</p>
                </div>
            </div>
        </div>
    );
}

