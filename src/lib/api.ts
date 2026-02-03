import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

console.log("Initializing API Client with Base URL:", `${API_URL}/api`);

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
});

export interface TimesheetEntry {
    id?: string;
    project_id?: string;
    consultant_name: string;
    company: string;
    process_stream: string;
    service_date: string;
    hours: number;
    description: string;
    project_phase?: string | null;
    non_billable_hours?: number;
    source_file?: string | null;
    created_at?: string;
}

export interface Project {
    id: string;
    name: string;
    month: number;
    year: number;
    created_at: string;
}

export interface UploadResponse {
    entries: TimesheetEntry[];
    errors: string[];
}

// Upload files and parse
export async function uploadFiles(
    files: File[],
    projectId: string
): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("project_id", projectId);

    const response = await api.post<UploadResponse>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}

// Get all projects
export async function getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");
    return response.data;
}

// Create new project
export async function createProject(
    month: number,
    year: number
): Promise<Project> {
    const response = await api.post<Project>("/projects", { month, year });
    return response.data;
}

// Delete project
export async function deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
}

// Get entries for a project
export async function getProjectEntries(
    projectId: string
): Promise<TimesheetEntry[]> {
    const response = await api.get<TimesheetEntry[]>(
        `/projects/${projectId}/entries`
    );
    return response.data;
}

// Save entries
export async function saveEntries(
    projectId: string,
    entries: TimesheetEntry[]
): Promise<void> {
    await api.post(`/projects/${projectId}/entries`, { entries });
}

// Export to Excel
export async function exportExcel(
    projectId: string,
    month: number,
    year: number
): Promise<Blob> {
    const response = await api.get(`/export/${projectId}`, {
        params: { month, year },
        responseType: "blob",
    });
    return response.data;
}

// Mapping Templates
export interface MappingTemplate {
    id: string;
    name: string;
    mapping: Record<string, string>;  // {"consultant": "Berater", "hours": "Stunden", ...}
    created_at: string;
    updated_at: string;
}

export interface FileColumns {
    filename: string;
    columns: string[];
    rows: Array<Record<string, any>>;
    suggested_mapping?: Record<string, string>;
}

// Get all mapping templates
export async function getMappingTemplates(): Promise<MappingTemplate[]> {
    const response = await api.get<MappingTemplate[]>("/mapping-templates");
    return response.data;
}

// Create mapping template
export async function createMappingTemplate(
    name: string,
    mapping: Record<string, string>
): Promise<MappingTemplate> {
    const response = await api.post<MappingTemplate>("/mapping-templates", {
        name,
        mapping,
    });
    return response.data;
}

// Delete mapping template
export async function deleteMappingTemplate(templateId: string): Promise<void> {
    await api.delete(`/mapping-templates/${templateId}`);
}

// Preview file columns
export async function previewFileColumns(
    files: File[],
    projectId: string
): Promise<FileColumns[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("project_id", projectId);

    const response = await api.post<FileColumns[]>("/upload/preview", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}

// Upload files with mapping
export async function uploadFilesWithMapping(
    files: File[],
    projectId: string,
    mapping: Record<string, string>
): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("project_id", projectId);
    formData.append("mapping", JSON.stringify(mapping));

    const response = await api.post<UploadResponse>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}

