import { FileManager } from './fileManager.js';

let fileManager;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing File Manager");
        
    fileManager = new FileManager(document.getElementById('file-manager-container'));

    try {
        await fileManager.init();
        console.log("File Manager initialized successfully");
        
        handleUrlOnLoad();

    } catch (error) {
        console.error("Failed to initialize File Manager:", error);
    }
});

const handleUrlOnLoad = () => {
    console.log("Handling URL on page load:", window.location.href);

    if (window.location.hash && fileManager) {
        const state = {
            path: window.location.hash.substring(1),
            search: new URLSearchParams(window.location.search).get('search') || ''
        };
        console.log("Page loaded with hash, navigating to:", state);
        
        fileManager.navigateToPath(state.path, state.search);        
    }
};
