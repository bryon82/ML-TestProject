import { FileManagerUI } from './fileManagerUI.js';
import { FileManagerAPI } from './fileManagerAPI.js';
import { FileManagerEvents } from './fileManagerEvents.js';

export class FileManager {
    constructor(container) {
        this.ui = new FileManagerUI(this);
        this.api = new FileManagerAPI();
        this.events = new FileManagerEvents(this);
        this.container = container;
        this.currentPath = '';
        this.selectedItems = new Set();
        this.clipboard = null;
        
    }

    async init() {
        this.ui.createFileManager(this.container, this.clipboard);
        this.events.attachEvents();

        const initialState = this.events.getStateFromUrl();
        console.log('Initial state from URL:', initialState);

        this.setSearchInput(initialState.search);
        await this.loadDirectory(initialState.path || '', true);

        if (initialState.search) {
            await this.search();
        }
    }

    async loadDirectory(path, skipUrlUpdate = false) {
        try {
            this.setStatus('Loading...');
            const result = await this.api.browse({ path: path });

            this.currentPath = result.currentPath;
            this.selectedItems.clear();

            if (!skipUrlUpdate) {
                const searchQuery = this.getSearchQuery();
                this.events.updateUrl(this.currentPath, searchQuery);
            }

            this.ui.renderBreadcrumb();
            this.events.attachBreadcrumbEvents(this.ui.breadcrumb);
            this.ui.renderFileList(result.items, false);
            this.events.attachFileListEvents(this.ui.fileList);
            this.updateToolbarButtons();
            this.setStatus(`${result.items.length} items`);
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
            console.error('Failed to load directory:', error);
        }
    }

    goUp() {
        const parts = this.currentPath.split('/').filter(p => p);
        if (parts.length > 0) {
            parts.pop();
            const newPath = parts.join('/');
            this.loadDirectory(newPath);
        }
    }

    async refreshDirectory() {
        const searchQuery = this.getSearchQuery();

        if (searchQuery) {
            await this.search();
        } else {
            await this.loadDirectory(this.currentPath);
        }
    }


    selectItem(path, clearOthers = false) {
        if (clearOthers) {
            this.selectedItems.clear();
        }
        this.selectedItems.add(path);
        this.updateSelectionDisplay();
        this.updateToolbarButtons();
    }

    toggleSelectItem(path) {
        if (this.selectedItems.has(path)) {
            this.selectedItems.delete(path);
        } else {
            this.selectedItems.add(path);
        }
        this.updateSelectionDisplay();
        this.updateToolbarButtons();
    }

    updateSelectionDisplay() {
        document.querySelectorAll('.file-row').forEach(row => {
            const path = row.dataset.path;
            row.classList.toggle('selected', this.selectedItems.has(path));
        });
    }

    updateToolbarButtons() {
        const hasSelection = this.selectedItems.size > 0;
        const hasPaste = !!this.clipboard;

        const buttonStates = {
            'btn-copy': !hasSelection,
            'btn-cut': !hasSelection,
            'btn-delete': !hasSelection,
            'btn-paste': !hasPaste
        };

        Object.entries(buttonStates).forEach(([id, disabled]) => {
            document.getElementById(id).disabled = disabled;
        });

        this.updateStatusWithSelection();
    }

    updateStatusWithSelection() {
        if (this.selectedItems.size > 0) {
            const count = this.selectedItems.size;
            this.setStatus(`${count} item${count > 1 ? 's' : ''} selected`);
        }
    }

    async search() {
        const query = this.getSearchQuery();
        if (!query) {
            return;
        }

        try {
            this.setStatus('Searching...');
            this.events.updateUrl(this.currentPath, query);

            const result = await this.api.search({ query: query });
            this.ui.renderFileList(result.results, true);
            this.events.attachFileListEvents(this.ui.fileList);
            this.setStatus(`Found ${result.results.length} items for "${query}"`);

            document.getElementById('btn-clear-search').style.display = 'inline-block';
        } catch (error) {
            this.setStatus(`Search failed: ${error.message}`);
        }
    }

    async clearSearch() {
        this.setSearchInput('');
        this.events.updateUrl(this.currentPath, '');
        await this.refreshDirectory();
    }

    getSearchQuery() {
        return document.getElementById('search-input')?.value.trim() || '';
    }

    setSearchInput(value) {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('btn-clear-search');

        if (value) {
            searchInput.value = value;
            clearBtn.style.display = 'inline-block';
        } else {
            searchInput.value = '';
            clearBtn.style.display = 'none';
        }
    }

    async openItem(path, isDirectory) {
        if (isDirectory) {
            await this.loadDirectory(path);
        } else {
            this.downloadFile(path);
        }
    }

    async deleteSelectedItems() {
        if (this.selectedItems.size === 0) {
            return;
        }

        const items = Array.from(this.selectedItems);
        const itemText = items.length === 1
            ? `"${items[0].split('/').pop()}"`
            : `${items.length} selected items`;

        if (!confirm(`Are you sure you want to delete ${itemText}?`)) {
            return;
        }

        try {
            this.setStatus('Deleting items...');

            for (const path of items) {
                await this.api.deleteItem(path);
            }

            this.selectedItems.clear();
            await this.refreshDirectory();
            this.setStatus(`${items.length} item${items.length > 1 ? 's' : ''} deleted successfully`);
        } catch (error) {
            this.setStatus(`Delete failed: ${error.message}`);
        }
    }

    copySelectedItems() {
        if (this.selectedItems.size === 0) {
            return;
        }

        const items = Array.from(this.selectedItems);
        this.clipboard = { paths: items, operation: 'copy' };

        const count = items.length;
        this.setStatus(`${count} item${count > 1 ? 's' : ''} copied to clipboard`);
        this.updateToolbarButtons();
    }

    cutSelectedItems() {
        if (this.selectedItems.size === 0) {
            return;
        }

        const items = Array.from(this.selectedItems);
        this.clipboard = { paths: items, operation: 'move' };

        const count = items.length;
        this.setStatus(`${count} item${count > 1 ? 's' : ''} cut to clipboard`);
        this.updateToolbarButtons();
    }

    async paste() {
        if (!this.clipboard) {
            this.setStatus('Nothing to paste');
            return;
        }

        try {
            this.setStatus('Pasting items...');

            for (const sourcePath of this.clipboard.paths) {
                const fileName = sourcePath.split('/').pop();
                const destinationPath = this.currentPath ? `${this.currentPath}/${fileName}` : fileName;

                if (this.clipboard.operation === 'copy') {
                    await this.api.copyItem(sourcePath, destinationPath);
                } else {
                    await this.api.moveItem(sourcePath, destinationPath);
                }
            }

            await this.refreshDirectory();
            const count = this.clipboard.paths.length;
            this.setStatus(`${count} item${count > 1 ? 's' : ''} ${this.clipboard.operation === 'copy' ? 'copied' : 'moved'} successfully`);

            this.clipboard = null;
            this.updateToolbarButtons();
        } catch (error) {
            this.setStatus(`${this.clipboard.operation} failed: ${error.message}`);
        }
    }

    downloadFile(path) {
        try {
            const url = this.api.getDownloadUrl(path);
            const a = document.createElement("a");
            a.href = url;
            a.download = "";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            this.setStatus(`Download failed: ${error.message}`);
        }
    }

    async downloadSelected() {
        try {
            if (this.selectedItems.size === 0) {
                return;
            }

            const selected = Array.from(this.selectedItems);

            if (selected.length === 1) {
                const item = selected[0];
                if (this.isDirectory(item)) {
                    await this.api.downloadBatch([item]);
                } else {
                    this.downloadFile(item);
                }
            } else {
                await this.api.downloadBatch(selected);
            }
        } catch (error) {
            this.setStatus(`Download failed: ${error.message}`);
        }
    }

    showUploadDialog() {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.addEventListener("change", async () => {
            if (input.files.length > 0) {
                await this.uploadFiles(input.files);
            }
        });
        input.click();
    }

    async uploadFiles(files) {
        try {
            await this.api.uploadFiles(this.currentPath, files);
            await this.loadDirectory(this.currentPath);
        } catch (error) {
            this.setStatus(`Upload failed: ${error.message}`);
        }
    }

    async createFolder(name) {
        try {
            await this.api.createFolder(this.currentPath, name);
            await this.refreshDirectory();
            this.setStatus('Folder created successfully');
        } catch (error) {
            this.setStatus(`Create folder failed: ${error.message}`);
        }
    }

    showCreateFolderDialog() {
        const name = prompt('Enter folder name:');
        if (name) {
            this.createFolder(name);
        }
    }

    isDirectory(path) {
        const fileList = document.getElementById('file-list');
        const row = fileList.querySelector(`[data-path="${path}"]`);
        return row ? row.dataset.isdir === 'true' : null;
    }

    setStatus(message) {
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
            statusBar.textContent = message;
        }
        console.log(message);
    }

    async navigateToPath(path, searchQuery = '') {
        if (searchQuery) {
            this.setSearchInput(searchQuery);
        }

        await this.loadDirectory(path);

        if (searchQuery) {
            await this.search();
        }
    }
}