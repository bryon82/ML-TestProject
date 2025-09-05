export class FileManagerAPI {
    constructor(baseUrl = '/api/filemanager') {
        this.baseUrl = baseUrl;
    }

    async request(url, options = {}) {
        try {
            const isFormData = options.body instanceof FormData;

            const response = await fetch(url, {
                headers: {
                    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async browse(options) {
        const params = new URLSearchParams();

        params.append("path", options.path);

        return await this.request(`${this.baseUrl}/browse?${params.toString()}`);        
    }

    async search(options) {
        const params = new URLSearchParams();

        params.append("query", options.query);
        if (options.includeFiles !== undefined) {
            params.append("includeFiles", options.includeFiles);
        }
        if (options.includeDirectories !== undefined) {
            params.append("includeDirectories", options.includeDirectories);
        }

        return await this.request(`${this.baseUrl}/search?${params.toString()}`);        
    }

    async deleteItem(path) {
        return await this.request(`${this.baseUrl}/delete`, {
            method: 'DELETE',
            body: JSON.stringify({ path })
        });
    }

    async moveItem(sourcePath, destinationPath) {
        return await this.request(`${this.baseUrl}/move`, {
            method: 'POST',
            body: JSON.stringify({ sourcePath, destinationPath })
        });
    }

    async copyItem(sourcePath, destinationPath, overwrite = false) {
        return await this.request(`${this.baseUrl}/copy`, {
            method: 'POST',
            body: JSON.stringify({ sourcePath, destinationPath, overwrite })
        });
    }

    async createFolder(parentPath, folderName) {
        return await this.request(`${this.baseUrl}/createfolder`, {
            method: 'POST',
            body: JSON.stringify({ parentPath, folderName })
        });
    }

    async uploadFiles(path, files) {
        const formData = new FormData();
        for (let f of files) {
            formData.append("files", f);
        }
        formData.append("path", path);

        return this.request(`${this.baseUrl}/upload`, {
            method: "POST",
            body: formData
        });
    }

    getDownloadUrl(path) {
        return `${this.baseUrl}/download?path=${encodeURIComponent(path)}`;
    }

    async downloadBatch(paths) {
        const res = await fetch(`${this.baseUrl}/download-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths })
        });

        if (!res.ok) {
            throw new Error(`Batch download failed: ${res.status}`);
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        let filename = "download.zip";
        const disposition = res.headers.get("content-disposition");
        if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^;\n"]+)/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
    }
}
