export class FileManagerUI {
    static FILE_ICONS = {
        '.txt': '📄', '.doc': '📄', '.docx': '📄',
        '.pdf': '📕', '.jpg': '🖼️', '.jpeg': '🖼️',
        '.png': '🖼️', '.gif': '🖼️', '.mp3': '🎵',
        '.mp4': '🎬', '.zip': '📦', '.js': '📜',
        '.html': '🌐', '.css': '🎨', '.json': '📋'
    };

    constructor(manager) {
        this.manager = manager;
        this.breadcrumb = null;
        this.fileList = null;
    }

    createFileManager(container, clipboard) {
        const fileManager = document.createElement("div");
        fileManager.className = "file-manager";

        fileManager.append(
            this.createToolbar(clipboard),
            this.createBreadcrumb(),
            this.createFileList(),
            this.createStatusBar()
        );

        container.innerHTML = "";
        container.appendChild(fileManager);
    }

    createToolbar(clipboard) {
        const toolbar = document.createElement("div");
        toolbar.className = "toolbar";

        const buttons = [
            ["btn-up", "⮤ Up"],
            ["btn-refresh", "🔄 Refresh"],
            ["btn-new-folder", "📁 New Folder"],
            ["btn-copy", "🗐 Copy", true],
            ["btn-cut", "✂️ Cut", true],
            ["btn-paste", "📋 Paste", !clipboard],
            ["btn-delete", "🗑️ Delete", true],
            ["btn-upload", "⭱ Upload"],
            ["btn-download", "⭳ Download"]
        ];

        buttons.forEach(([id, text, disabled]) => {
            toolbar.appendChild(this.createButton(id, text, disabled));
        });

        toolbar.appendChild(this.createSearchBox());
        return toolbar;
    }

    createButton(id, text, disabled = false) {
        const btn = document.createElement("button");
        btn.id = id;
        btn.textContent = text;
        if (disabled) {
            btn.disabled = true;
        }
        return btn;
    }

    createSearchBox() {
        const searchBox = document.createElement("div");
        searchBox.className = "search-box";

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.id = "search-input";
        searchInput.placeholder = "Search...";

        const btnSearch = this.createButton("btn-search", "🔍");
        const btnClearSearch = this.createButton("btn-clear-search", "✕");
        btnClearSearch.style.display = "none";

        searchBox.append(searchInput, btnSearch, btnClearSearch);
        return searchBox;
    }

    createBreadcrumb() {
        const breadcrumb = document.createElement("div");
        breadcrumb.className = "breadcrumb";
        breadcrumb.id = "breadcrumb";
        this.breadcrumb = breadcrumb;
        return breadcrumb;
    }

    createFileList() {
        const fileList = document.createElement("div");
        fileList.className = "file-list";
        fileList.id = "file-list";

        const loading = document.createElement("div");
        loading.className = "loading";
        loading.textContent = "Loading...";

        fileList.appendChild(loading);
        this.fileList = fileList;
        return fileList;
    }

    createStatusBar() {
        const statusBar = document.createElement("div");
        statusBar.className = "status-bar";
        statusBar.id = "status-bar";
        statusBar.textContent = "Ready";
        return statusBar;
    }

    renderBreadcrumb() {
        const breadcrumb = document.getElementById("breadcrumb");
        breadcrumb.innerHTML = "";

        const parts = this.manager.currentPath.split("/").filter(p => p);

        const rootCrumb = document.createElement("span");
        rootCrumb.className = "crumb";
        rootCrumb.dataset.path = "";
        rootCrumb.textContent = "📂 Root";
        breadcrumb.appendChild(rootCrumb);

        let path = "";
        parts.forEach((part, i) => {
            path += "/" + part;

            const sep = document.createTextNode(" / ");
            breadcrumb.appendChild(sep);

            const crumb = document.createElement("span");
            crumb.className = "crumb";
            crumb.dataset.path = path;
            crumb.textContent = part;

            breadcrumb.appendChild(crumb);
        });

        this.breadcrumb = breadcrumb;
    }

    renderFileList(items, isSearchResults = false) {
        const fileList = document.getElementById("file-list");
        fileList.innerHTML = "";

        if (items.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "empty";
            emptyMessage.textContent = isSearchResults ? "No files found" : "No files or folders";
            fileList.appendChild(emptyMessage);
            return;
        }

        const table = document.createElement("table");
        table.className = "file-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        ["Name", "Size", "Modified"].forEach(label => {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });

        if (isSearchResults) {
            const thLocation = document.createElement("th");
            thLocation.textContent = "Location";
            headerRow.appendChild(thLocation);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        items.forEach(item => {
            tbody.appendChild(this.createFileRow(item, isSearchResults));
        });

        table.appendChild(tbody);
        fileList.appendChild(table);

        this.fileList = fileList;
    }

    createFileRow(item, isSearchResults = false) {
        const tr = document.createElement("tr");
        tr.className = "file-row";
        if (this.manager.selectedItems.has(item.path)) {
            tr.classList.add("selected");
        }
        tr.dataset.path = item.path;
        tr.dataset.isdir = item.isDirectory;

        const tdName = document.createElement("td");
        let icon = "📁";
        let size = "-";

        if (!item.isDirectory) {
            icon = FileManagerUI.FILE_ICONS[item.extension?.toLowerCase()] || "📄";
            size = this.formatSize(item.size);
        }

        tdName.textContent = `${icon} ${item.name}`;
        tr.appendChild(tdName);

        const tdSize = document.createElement("td");
        tdSize.textContent = size;
        tr.appendChild(tdSize);

        const tdDate = document.createElement("td");
        tdDate.textContent = new Date(item.lastModified).toLocaleString();
        tr.appendChild(tdDate);

        if (isSearchResults) {
            const tdLocation = document.createElement("td");
            tdLocation.textContent = this.getFileLocation(item.path);
            tr.appendChild(tdLocation);
        }

        return tr;
    }

    formatSize(bytes) {
        if (bytes === 0) {
            return '0 B';
        }

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileLocation(filePath) {
        const pathParts = filePath.split('/');
        pathParts.pop();

        if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === '')) {
            return '/';
        }

        const location = '/' + pathParts.filter(part => part !== '').join('/');
        return location;
    }
}
