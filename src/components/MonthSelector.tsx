"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProjects, createProject, deleteProject, type Project } from "@/lib/api";
import { formatMonth } from "@/lib/utils";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { NotificationDialog } from "@/components/ui/notification-dialog";

interface MonthSelectorProps {
    selectedProjectId: string | null;
    onProjectSelect: (project: Project) => void;
}

export function MonthSelector({
    selectedProjectId,
    onProjectSelect,
}: MonthSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewProject, setShowNewProject] = useState(false);
    const [newMonth, setNewMonth] = useState("");
    const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
    const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" | "warning" | "info" }>({ open: false, title: "", message: "", variant: "info" });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            console.error("Fehler beim Laden der Projekte:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        const month = parseInt(newMonth);
        const year = parseInt(newYear);

        if (!month || month < 1 || month > 12 || !year) {
            setNotification({ open: true, title: "Ungültige Eingabe", message: "Bitte gültigen Monat (1-12) und Jahr eingeben", variant: "warning" });
            return;
        }

        try {
            const project = await createProject(month, year);
            setProjects([...projects, project]);
            onProjectSelect(project);
            setShowNewProject(false);
            setNewMonth("");
            setNewYear(new Date().getFullYear().toString());
        } catch (error) {
            console.error("Fehler beim Erstellen des Projekts:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Erstellen des Projekts", variant: "error" });
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        try {
            await deleteProject(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
            if (selectedProjectId === projectId) {
                onProjectSelect(projects[0] || null as any);
            }
        } catch (error) {
            console.error("Fehler beim Löschen des Projekts:", error);
            setNotification({ open: true, title: "Fehler", message: "Fehler beim Löschen des Projekts", variant: "error" });
        }
    };

    if (loading) {
        return <div className="animate-pulse h-20 bg-accent-200 dark:bg-accent-800 rounded"></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monatsprojekt
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewProject(!showNewProject)}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Neues Projekt
                </Button>
            </div>

            {showNewProject && (
                <div className="p-4 border rounded-lg bg-white dark:bg-accent-900 space-y-3">
                    <h3 className="font-medium">Neues Projekt anlegen</h3>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Monat (1-12)"
                            value={newMonth}
                            onChange={(e) => setNewMonth(e.target.value)}
                            min="1"
                            max="12"
                        />
                        <Input
                            type="number"
                            placeholder="Jahr"
                            value={newYear}
                            onChange={(e) => setNewYear(e.target.value)}
                            min="2020"
                            max="2030"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreateProject} className="flex-1">
                            Erstellen
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowNewProject(false)}
                            className="flex-1"
                        >
                            Abbrechen
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2">
                {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Noch keine Projekte vorhanden. Erstellen Sie ein neues Projekt, um zu beginnen.
                    </p>
                ) : (
                    projects.map((project) => (
                        <div key={project.id} className="relative group">
                            <button
                                onClick={() => onProjectSelect(project)}
                                className={`w-full p-4 rounded-lg border text-left transition-all ${selectedProjectId === project.id
                                    ? "bg-primary-100 dark:bg-primary-950/30 border-primary-500 shadow-md"
                                    : "bg-white dark:bg-accent-900 border-accent-300 dark:border-accent-700 hover:border-primary-400"
                                    }`}
                            >
                                <div className="font-medium">{project.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Erstellt: {new Date(project.created_at).toLocaleDateString("de-DE")}
                                </div>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialog({ open: true, project });
                                }}
                                className="absolute top-2 right-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/50"
                                title="Projekt löschen"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <AlertDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ open, project: null })}
                title="Projekt löschen"
                description={`Möchten Sie das Projekt "${deleteDialog.project?.name}" wirklich löschen? Alle zugehörigen Einträge werden ebenfalls gelöscht.`}
                confirmText="Löschen"
                cancelText="Abbrechen"
                variant="destructive"
                onConfirm={() => {
                    if (deleteDialog.project) {
                        handleDeleteProject(deleteDialog.project.id, deleteDialog.project.name);
                    }
                }}
            />

            <NotificationDialog
                open={notification.open}
                onOpenChange={(open) => setNotification({ ...notification, open })}
                title={notification.title}
                message={notification.message}
                variant={notification.variant}
            />
        </div>
    );
}
