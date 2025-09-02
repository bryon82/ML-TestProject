export class FileManagerEvents {
    constructor(manager) {
        this.manager = manager;
        this.isNavigatingFromUrl = false;
    }

    attachEvents() {
        this.attachToolbarEvents();
        this.attachSearchEvents();
        this.attachDragDropEvents();
        this.addShortcuts();
    }

    attachToolbarEvents() {
        const eventMap = {
            'btn-up': () => this.manager.goUp(),
            'btn-new-folder': () => this.manager.showCreateFolderDialog(),
            'btn-refresh': () => this.manager.refreshDirectory(),
            'btn-copy': () => this.manager.copySelectedItems(),
            'btn-cut': () => this.manager.cutSelectedItems(),
            'btn-paste': () => this.manager.paste(),
            'btn-delete': () => this.manager.deleteSelectedItems(),
            'btn-search': () => this.manager.search(),
            'btn-clear-search': () => this.manager.clearSearch(),
            'btn-upload': () => this.manager.showUploadDialog(),
            'btn-download': () => this.manager.downloadSelected()
        };

        Object.entries(eventMap).forEach(([id, handler]) => {
            document.getElementById(id).addEventListener('click', handler);
        });
    }

    attachSearchEvents() {
        const searchInput = document.getElementById('search-input');

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.manager.search();
            }
        });

        searchInput.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('btn-clear-search');
            clearBtn.style.display = e.target.value ? 'inline-block' : 'none';
        });
    }

    attachDragDropEvents() {
        this.manager.container.addEventListener("dragover", (e) => {
            e.preventDefault();
            this.manager.container.classList.add("dragover");
        });

        this.manager.container.addEventListener("dragleave", () => {
            this.manager.container.classList.remove("dragover");
        });

        this.manager.container.addEventListener("drop", async (e) => {
            e.preventDefault();
            this.manager.container.classList.remove("dragover");

            if (e.dataTransfer.files.length > 0) {
                await this.manager.uploadFiles(e.dataTransfer.files);
            }
        });
    }

    attachBreadcrumbEvents(breadcrumb) {
        breadcrumb.querySelectorAll(".crumb").forEach(el => {
            el.addEventListener("click", () => {
                const targetPath = el.getAttribute("data-path");
                this.manager.loadDirectory(targetPath);
            });
        });
    }

    attachFileListEvents(fileList) {
        fileList.querySelectorAll('.file-row').forEach(row => {
            const path = row.dataset.path;
            const isDir = row.dataset.isdir === 'true';

            row.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    this.manager.toggleSelectItem(path);
                } else {
                    this.manager.selectItem(path, true);
                }
            });

            row.addEventListener('dblclick', () => this.manager.openItem(path, isDir));
        });
    }

    setupUrlHandling() {
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });

        window.addEventListener('hashchange', (event) => {
            this.handleHashChange(event);
        });

        this.setInitialHistoryState();
    }

    handlePopState(event) {
        console.log('Popstate event:', event.state);
        if (event.state?.fileManagerPath !== undefined) {
            this.isNavigatingFromUrl = true;
            this.manager.loadDirectory(event.state.fileManagerPath);
            this.manager.setSearchInput(event.state.search);
        }
    }

    handleHashChange(event) {
        console.log('Hash change event:', {
            oldURL: event.oldURL,
            newURL: event.newURL,
            currentHash: window.location.hash
        });

        if (!this.isNavigatingFromUrl) {
            const newState = this.getStateFromUrl();
            console.log('Hash changed to:', newState);

            this.manager.setSearchInput(newState.search);
            this.isNavigatingFromUrl = true;

            this.manager.loadDirectory(newState.path || '').then(() => {
                if (newState.search) {
                    this.manager.search();
                }
            });
        }
    }

    setInitialHistoryState() {
        const currentState = this.getStateFromUrl();
        if (!history.state || history.state.fileManagerPath === undefined) {
            console.log('Setting initial history state:', currentState);
            this.updateUrl(currentState.path || '', currentState.search || '', true);
        }
    }

    getStateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.substring(1);

        const state = {
            path: hash || params.get('path') || '',
            search: params.get('search') || ''
        };

        console.log('Parsing URL state:', {
            fullUrl: window.location.href,
            hash: window.location.hash,
            search: window.location.search,
            parsedState: state
        });

        return state;
    }

    updateUrl(path, searchQuery = '', replace = false) {
        if (this.isNavigatingFromUrl) {
            this.isNavigatingFromUrl = false;
            return;
        }

        const url = new URL(window.location);
        url.hash = path || '';

        if (searchQuery) {
            url.searchParams.set('search', searchQuery);
        } else {
            url.searchParams.delete('search');
        }

        const state = { fileManagerPath: path, search: searchQuery };

        if (replace) {
            history.replaceState(state, '', url);
        } else {
            history.pushState(state, '', url);
        }
    }

    addShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'c': {
                        if (this.manager.selectedItems.size > 0) {
                            e.preventDefault();
                            this.manager.copySelectedItems();
                        }
                        break;
                    }
                    case 'x': {
                        if (this.manager.selectedItems.size > 0) {
                            e.preventDefault();
                            this.manager.cutSelectedItems();
                        }
                        break;
                    }
                    case 'v':
                        e.preventDefault();
                        this.manager.paste();
                        break;
                }
            } else if (e.key === 'Delete') {
                if (this.manager.selectedItems.size > 0) {
                    this.manager.deleteSelectedItems();
                }
            }
        });
    }
}
