
import { read, utils } from 'xlsx';

export interface FilePreview {
    filename: string;
    headers: string[];
    rows: Record<string, any>[];
}

export const readFilePreview = async (file: File): Promise<FilePreview> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Get headers (first row)
                const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
                if (jsonData.length === 0) {
                    resolve({ filename: file.name, headers: [], rows: [] });
                    return;
                }

                const headers = (jsonData[0] as string[]) || [];

                // Get first 5 rows of data for preview
                // We use sheet_to_json with header option to get objects keyed by header
                const previewRows = utils.sheet_to_json(worksheet, {
                    header: headers,
                    range: 1, // Skip header row
                    defval: "" // Default value for empty cells
                }).slice(0, 5) as Record<string, any>[];

                resolve({
                    filename: file.name,
                    headers,
                    rows: previewRows
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);

        reader.readAsBinaryString(file);
    });
};
