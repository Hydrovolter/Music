// Callbacks for confirm/cancel actions
let generalModalConfirmCallback = null; // Not strictly needed if callbacks are passed directly to buttons
let generalModalCancelCallback = null;  // Same as above

const MAX_ARTWORK_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit for Data URL before resize
const RESIZE_MAX_WIDTH = 300;
const RESIZE_MAX_HEIGHT = 300;


function initializeModals() {
    // Initialize General Modal Elements
    generalModalElement = document.getElementById('generalModal');
    generalModalTitleElement = document.getElementById('generalModalTitle');
    generalModalMessageElement = document.getElementById('generalModalMessage');
    generalModalActionsElement = document.getElementById('generalModalActions');
    closeGeneralModalBtnElement = document.getElementById('closeGeneralModal');

    if (!generalModalElement || !generalModalTitleElement || !generalModalMessageElement ||
        !generalModalActionsElement || !closeGeneralModalBtnElement) {
        console.error("General modal DOM elements not found. Modal functionality will be limited.");
    } else {
        closeGeneralModalBtnElement.addEventListener('click', closeGeneralModal);
        generalModalElement.addEventListener('click', (event) => {
            if (event.target === generalModalElement) closeGeneralModal();
        });
        console.log("General Modal system initialized.");
    }


    // Initialize Create Playlist Modal Elements
    createPlaylistModalElement = document.getElementById('createPlaylistModal');
    newPlaylistNameInputElement = document.getElementById('newPlaylistNameInput');
    confirmCreatePlaylistBtnElement = document.getElementById('confirmCreatePlaylistBtn');
    cancelCreatePlaylistBtnElement = document.getElementById('cancelCreatePlaylistBtn');
    closeCreatePlaylistModalBtnElement = document.getElementById('closeCreatePlaylistModal');
    // Artwork elements for Create modal
    createPlaylistArtworkEditorElement = document.getElementById('createPlaylistArtworkEditor');
    createPlaylistArtworkPreviewElement = document.getElementById('createPlaylistArtworkPreview');
    createPlaylistArtworkInputElement = document.getElementById('createPlaylistArtworkInput');
    clearCreatePlaylistArtworkBtnElement = document.getElementById('clearCreatePlaylistArtworkBtn');


    if (!createPlaylistModalElement || !newPlaylistNameInputElement || !confirmCreatePlaylistBtnElement ||
        !cancelCreatePlaylistBtnElement || !closeCreatePlaylistModalBtnElement ||
        !createPlaylistArtworkEditorElement || !createPlaylistArtworkPreviewElement ||
        !createPlaylistArtworkInputElement || !clearCreatePlaylistArtworkBtnElement) {
        console.error("Create Playlist modal DOM elements not found. This functionality will be limited.");
    } else {
        closeCreatePlaylistModalBtnElement.addEventListener('click', closeCreatePlaylistModal);
        cancelCreatePlaylistBtnElement.addEventListener('click', closeCreatePlaylistModal);
        confirmCreatePlaylistBtnElement.addEventListener('click', handleConfirmCreatePlaylist);
        createPlaylistModalElement.addEventListener('click', (event) => {
            if (event.target === createPlaylistModalElement) closeCreatePlaylistModal();
        });
        newPlaylistNameInputElement.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleConfirmCreatePlaylist();
            }
        });
        console.log("Create Playlist Modal system initialized.");
    }

    // Initialize Edit Playlist Modal Elements (formerly Rename)
    editPlaylistModalElement = document.getElementById('editPlaylistModal');
    editPlaylistModalTitleElement = document.getElementById('editPlaylistModalTitle');
    editPlaylistNameInputElement = document.getElementById('editPlaylistNameInput');
    confirmEditPlaylistBtnElement = document.getElementById('confirmEditPlaylistBtn');
    cancelEditPlaylistBtnElement = document.getElementById('cancelEditPlaylistBtn');
    closeEditPlaylistModalBtnElement = document.getElementById('closeEditPlaylistModal');
    // Artwork elements for Edit modal
    editPlaylistArtworkEditorElement = document.getElementById('editPlaylistArtworkEditor');
    editPlaylistArtworkPreviewElement = document.getElementById('editPlaylistArtworkPreview');
    editPlaylistArtworkInputElement = document.getElementById('editPlaylistArtworkInput');
    clearEditPlaylistArtworkBtnElement = document.getElementById('clearEditPlaylistArtworkBtn');


    if (!editPlaylistModalElement || !editPlaylistNameInputElement || !confirmEditPlaylistBtnElement ||
        !cancelEditPlaylistBtnElement || !closeEditPlaylistModalBtnElement || !editPlaylistModalTitleElement ||
        !editPlaylistArtworkEditorElement || !editPlaylistArtworkPreviewElement ||
        !editPlaylistArtworkInputElement || !clearEditPlaylistArtworkBtnElement) {
        console.error("Edit Playlist modal DOM elements not found. This functionality will be limited.");
    } else {
        closeEditPlaylistModalBtnElement.addEventListener('click', closeEditPlaylistModal);
        cancelEditPlaylistBtnElement.addEventListener('click', closeEditPlaylistModal);
        confirmEditPlaylistBtnElement.addEventListener('click', handleConfirmEditPlaylist);
        editPlaylistModalElement.addEventListener('click', (event) => {
            if (event.target === editPlaylistModalElement) closeEditPlaylistModal();
        });
        editPlaylistNameInputElement.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleConfirmEditPlaylist();
            }
        });
        console.log("Edit Playlist Modal system initialized.");
    }


    // Initialize Settings Modal
    initializeSettingsModal();
}

// --- Image Resizing Utility ---
function resizeImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round(width * (maxHeight / height));
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Prefer JPEG for photos to control quality and size
            // Prefer PNG if transparency is important, but for album art, JPEG is often better.
            let dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Adjust quality (0.0 to 1.0)
            if (dataUrl.length > MAX_ARTWORK_SIZE_BYTES && file.type === 'image/png') {
                // Fallback to PNG if JPEG is still too large (though unlikely if resize works)
                // Or try lower JPEG quality
                dataUrl = canvas.toDataURL('image/png');
            }
            callback(dataUrl);
        };
        img.onerror = () => {
            console.error("Error loading image for resize.");
            showToast("Error processing image.", 3000);
            callback(null); //  Indicate failure
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        console.error("Error reading file for resize.");
        showToast("Error reading image file.", 3000);
        callback(null);
    };
    reader.readAsDataURL(file);
}

// --- Artwork Editor Setup ---
// currentModalArtworkDataUrl is now global in init.js
function setupArtworkEditor(
    editorContainerElement,
    previewImgElement,
    fileInputElement,
    clearButtonElement,
    existingPlaylistData // Pass the playlist object (or null if creating) to get default art
) {
    const updatePreviewAndState = (dataUrl) => {
        currentModalArtworkDataUrl = dataUrl; // Update global state for the current modal operation
        if (dataUrl) {
            previewImgElement.src = dataUrl;
            clearButtonElement.style.display = 'block';
        } else {
            // Determine default based on existingPlaylistData
            let defaultSrc = 'img/empty_art.png';
            if (existingPlaylistData && existingPlaylistData.songs && existingPlaylistData.songs.length > 0 && existingPlaylistData.songs[0].artwork) {
                defaultSrc = existingPlaylistData.songs[0].artwork;
            }
            previewImgElement.src = defaultSrc;
            clearButtonElement.style.display = 'none'; // Hide if showing default
        }
    };

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            if (file.size > MAX_ARTWORK_SIZE_BYTES * 2) { // A bit more lenient before mandatory resize
                showToast("Image too large. Resizing...", 2000);
            }
            resizeImage(file, RESIZE_MAX_WIDTH, RESIZE_MAX_HEIGHT, (resizedDataUrl) => {
                if (resizedDataUrl) {
                    updatePreviewAndState(resizedDataUrl);
                } else {
                    // Resize failed, revert or keep old one if any
                    // For simplicity, let's stick to the previous state if resize fails
                    // updatePreviewAndState(currentModalArtworkDataUrl); // or show default
                }
            });
        } else if (file) {
            showToast("Invalid file type. Please select an image.", 3000);
        }
    };

    // Initial state for the editor
    let initialArtworkSrc = 'img/empty_art.png';
    let initialDataUrl = null;

    if (existingPlaylistData) { // For editing existing playlist
        if (existingPlaylistData.customArtwork) {
            initialArtworkSrc = existingPlaylistData.customArtwork;
            initialDataUrl = existingPlaylistData.customArtwork;
        } else if (existingPlaylistData.songs && existingPlaylistData.songs.length > 0 && existingPlaylistData.songs[0].artwork) {
            initialArtworkSrc = existingPlaylistData.songs[0].artwork;
            // initialDataUrl remains null because this isn't 'custom' user artwork yet
        }
    }
    previewImgElement.src = initialArtworkSrc;
    currentModalArtworkDataUrl = initialDataUrl; // Set global state for this modal
    clearButtonElement.style.display = initialDataUrl ? 'block' : 'none';


    // Event Listeners
    editorContainerElement.onclick = () => fileInputElement.click();
    fileInputElement.onchange = (event) => {
        handleFileSelect(event.target.files[0]);
        fileInputElement.value = ''; // Reset for next selection
    };

    editorContainerElement.ondragover = (event) => {
        event.preventDefault();
        editorContainerElement.classList.add('drag-over');
    };
    editorContainerElement.ondragleave = () => {
        editorContainerElement.classList.remove('drag-over');
    };
    editorContainerElement.ondrop = (event) => {
        event.preventDefault();
        editorContainerElement.classList.remove('drag-over');
        handleFileSelect(event.dataTransfer.files[0]);
    };

    clearButtonElement.onclick = (e) => {
        e.stopPropagation();
        updatePreviewAndState(null); // Clear custom artwork, show default
    };
}

function showGeneralModal(title, message, buttonsConfig = [], options = {}) { // Added options
    if (!generalModalElement || !generalModalTitleElement || !generalModalMessageElement || !generalModalActionsElement) {
        console.error("Cannot show general modal: elements not initialized.");
        alert(`${title}\n${message.replace(/<br\s*\/?>/gi, "\n").replace(/<strong>|<\/strong>/gi, "")}`);
        return;
    }

    // --- Z-INDEX FIX ---
    // If this modal is being shown 'on-top' of another, give it a higher z-index
    if (options.isOverlay) {
        generalModalElement.style.zIndex = '1001'; // Or higher if settingsModal is 1000
    } else {
        generalModalElement.style.zIndex = '1000'; // Default z-index
    }
    // --- END Z-INDEX FIX ---


    generalModalTitleElement.textContent = title;
    generalModalMessageElement.innerHTML = message;
    generalModalActionsElement.innerHTML = '';

    if (buttonsConfig.length === 0) {
        // ... (okButton logic)
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.className = 'modal-button secondary';
        okButton.onclick = () => closeGeneralModal(options.isOverlay); // Pass overlay status
        generalModalActionsElement.appendChild(okButton);
    } else {
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `modal-button ${btnConfig.class || 'secondary'}`;
            button.onclick = () => {
                closeGeneralModal(options.isOverlay); // Pass overlay status & always close on button click
                if (btnConfig.callback && typeof btnConfig.callback === 'function') {
                    btnConfig.callback();
                }
            };
            generalModalActionsElement.appendChild(button);
        });
    }
    generalModalElement.style.display = 'flex';
}

function closeGeneralModal(wasOverlay = false) { // Added wasOverlay
    if (!generalModalElement) return;
    generalModalElement.style.display = 'none';
    // --- Z-INDEX FIX ---
    // Reset z-index if it was an overlay, so it doesn't interfere next time
    if (wasOverlay) {
        generalModalElement.style.zIndex = '1000'; // Reset to default
    }
    // --- END Z-INDEX FIX ---
}

function openCreatePlaylistModal() {
    if (!createPlaylistModalElement || !newPlaylistNameInputElement ||
        !createPlaylistArtworkEditorElement || !createPlaylistArtworkPreviewElement ||
        !createPlaylistArtworkInputElement || !clearCreatePlaylistArtworkBtnElement) return;

    newPlaylistNameInputElement.value = "My Playlist " + (typeof userPlaylists !== 'undefined' ? userPlaylists.length + 1 : 1);
    currentModalArtworkDataUrl = null; // Reset global temp state

    setupArtworkEditor(
        createPlaylistArtworkEditorElement,
        createPlaylistArtworkPreviewElement,
        createPlaylistArtworkInputElement,
        clearCreatePlaylistArtworkBtnElement,
        null // No existing playlist data for a new one
    );

    createPlaylistModalElement.style.display = 'flex';
    newPlaylistNameInputElement.focus();
    newPlaylistNameInputElement.select();
}

function closeCreatePlaylistModal() {
    if (!createPlaylistModalElement) return;
    createPlaylistModalElement.style.display = 'none';
    if(newPlaylistNameInputElement) newPlaylistNameInputElement.value = '';
    currentModalArtworkDataUrl = null; // Clear temp state
    // Reset artwork preview to absolute default
    if(createPlaylistArtworkPreviewElement) createPlaylistArtworkPreviewElement.src = 'img/empty_art.png';
    if(clearCreatePlaylistArtworkBtnElement) clearCreatePlaylistArtworkBtnElement.style.display = 'none';

}

function handleConfirmCreatePlaylist() {
    if (!newPlaylistNameInputElement) return;
    const playlistName = newPlaylistNameInputElement.value.trim();

    if (playlistName) {
        if (typeof createPlaylist === 'function') {
            // currentModalArtworkDataUrl holds the Data URL from the editor (or null)
            createPlaylist(playlistName, currentModalArtworkDataUrl);
            if (typeof renderAllPlaylistsView === 'function') {
                 renderAllPlaylistsView();
            }
            closeCreatePlaylistModal();
            showToast(`Playlist "${escapeModalHtml(playlistName)}" created!`, 3000);
        } else {
            console.error("createPlaylist function not found.");
            showGeneralModal("Error", "Could not create playlist. Functionality missing.");
        }
    } else {
        showGeneralModal("Invalid Name", "Playlist name cannot be empty.");
    }
}

// Renamed from openRenamePlaylistModal
function openEditPlaylistModal(currentPlaylistId, currentName) {
    if (!editPlaylistModalElement || !editPlaylistNameInputElement || !editPlaylistModalTitleElement ||
        !editPlaylistArtworkEditorElement || !editPlaylistArtworkPreviewElement ||
        !editPlaylistArtworkInputElement || !clearEditPlaylistArtworkBtnElement) return;

    const playlistToEdit = typeof getPlaylistById === 'function' ? getPlaylistById(currentPlaylistId) : null;
    if (!playlistToEdit) {
        console.error("Playlist to edit not found:", currentPlaylistId);
        showGeneralModal("Error", "Could not find playlist to edit.");
        return;
    }

    playlistIdToEdit = currentPlaylistId; // Store the ID (global from init.js)
    editPlaylistModalTitleElement.textContent = `Edit "${escapeModalHtml(currentName)}"`;
    editPlaylistNameInputElement.value = currentName;
    currentModalArtworkDataUrl = playlistToEdit.customArtwork; // Initialize with existing custom art

    setupArtworkEditor(
        editPlaylistArtworkEditorElement,
        editPlaylistArtworkPreviewElement,
        editPlaylistArtworkInputElement,
        clearEditPlaylistArtworkBtnElement,
        playlistToEdit // Pass existing playlist data
    );

    editPlaylistModalElement.style.display = 'flex';
    editPlaylistNameInputElement.focus();
    editPlaylistNameInputElement.select();
}

// Renamed from closeRenamePlaylistModal
function closeEditPlaylistModal() {
    if (!editPlaylistModalElement) return;
    editPlaylistModalElement.style.display = 'none';
    if(editPlaylistNameInputElement) editPlaylistNameInputElement.value = '';
    playlistIdToEdit = null;
    currentModalArtworkDataUrl = null; // Clear temp state
    // Reset artwork preview to absolute default
    if(editPlaylistArtworkPreviewElement) editPlaylistArtworkPreviewElement.src = 'img/empty_art.png';
    if(clearEditPlaylistArtworkBtnElement) clearEditPlaylistArtworkBtnElement.style.display = 'none';
}

// Renamed from handleConfirmRenamePlaylist
function handleConfirmEditPlaylist() {
    if (!editPlaylistNameInputElement || !playlistIdToEdit) return;

    const newPlaylistName = editPlaylistNameInputElement.value.trim();
    const oldPlaylistData = typeof getPlaylistById === 'function' ? getPlaylistById(playlistIdToEdit) : null;
    const oldName = oldPlaylistData ? oldPlaylistData.name : "";

    // currentModalArtworkDataUrl holds the new Data URL (or null if cleared, or existing if unchanged by user)

    if (!newPlaylistName) {
        showGeneralModal("Invalid Name", "Playlist name cannot be empty.");
        return;
    }

    if (newPlaylistName !== oldName || (oldPlaylistData && oldPlaylistData.customArtwork !== currentModalArtworkDataUrl) || currentModalArtworkDataUrl === null && oldPlaylistData.customArtwork !== null) {
        if (typeof updatePlaylistDetails === 'function') { // updatePlaylistDetails is from playlist.js
            updatePlaylistDetails(playlistIdToEdit, newPlaylistName, currentModalArtworkDataUrl);
            closeEditPlaylistModal();
            showToast(`Playlist "${escapeModalHtml(newPlaylistName)}" updated!`, 3000);
        } else {
            console.error("updatePlaylistDetails function not found.");
            showGeneralModal("Error", "Could not update playlist. Functionality missing.");
        }
    } else { // No changes made
        closeEditPlaylistModal();
    }
}

// --- Settings Modal ---
// --- Settings Modal ---
function initializeSettingsModal() {
    settingsToggleElement = document.getElementById('settingsToggle');
    settingsModalElement = document.getElementById('settingsModal');
    closeSettingsModalBtnElement = document.getElementById('closeSettingsModal');
    exportDataBtnElement = document.getElementById('exportDataBtn');
    importFileDropZoneElement = document.getElementById('importFileDropZone');
    importDataInputElement = document.getElementById('importDataInput');
    importDataBtnElement = document.getElementById('importDataBtn');
    selectedFileNameElement = document.getElementById('selectedFileName');

    // --- START: Initialize GitHub info elements ---
    githubCommitLinkElement = document.getElementById('githubCommitLink');
    latestCommitShaElement = document.getElementById('latestCommitSha');
    latestCommitTimeAgoElement = document.getElementById('latestCommitTimeAgo');
    // --- END: Initialize GitHub info elements ---

    if (!settingsToggleElement || !settingsModalElement || !closeSettingsModalBtnElement ||
        !exportDataBtnElement || !importFileDropZoneElement || !importDataInputElement ||
        !importDataBtnElement || !selectedFileNameElement ||
        !githubCommitLinkElement || !latestCommitShaElement || !latestCommitTimeAgoElement) { // Add new elements to check
        console.error("One or more settings modal DOM elements not found. Settings functionality disabled/limited.");
        return;
    }

    settingsToggleElement.addEventListener('click', openSettingsModal);
    closeSettingsModalBtnElement.addEventListener('click', closeSettingsModal);
    settingsModalElement.addEventListener('click', (event) => {
        if (event.target === settingsModalElement) closeSettingsModal();
    });

    exportDataBtnElement.addEventListener('click', exportUserData);

    // Import File Handling
    // ... (existing import event listeners) ...
    importFileDropZoneElement.addEventListener('click', () => importDataInputElement.click());
    importDataInputElement.addEventListener('change', handleFileSelectedForImport);

    importFileDropZoneElement.addEventListener('dragover', (event) => {
        event.preventDefault();
        importFileDropZoneElement.classList.add('drag-over');
    });
    importFileDropZoneElement.addEventListener('dragleave', () => {
        importFileDropZoneElement.classList.remove('drag-over');
    });
    importFileDropZoneElement.addEventListener('drop', (event) => {
        event.preventDefault();
        importFileDropZoneElement.classList.remove('drag-over');
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFileSelectedForImport({ target: { files: event.dataTransfer.files } });
            event.dataTransfer.clearData();
        }
    });

    importDataBtnElement.addEventListener('click', confirmAndProcessImport);


    console.log("Settings Modal system initialized.");
}

async function fetchLatestCommitInfo() {
    if (!latestCommitShaElement || !latestCommitTimeAgoElement || !githubCommitLinkElement) return;

    latestCommitShaElement.textContent = 'loading...';
    latestCommitTimeAgoElement.textContent = '';
    githubCommitLinkElement.href = "https://github.com/Hydrovolter/Music"; // Default link

    try {
        const response = await fetch('https://api.github.com/repos/Hydrovolter/Music/commits?per_page=1');
        if (!response.ok) {
            throw new Error(`GitHub API error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
            const commit = data[0];
            const shortSha = commit.sha.substring(0, 7);
            latestCommitTimestamp = commit.commit.committer.date; // Store for ticking

            latestCommitShaElement.textContent = shortSha;
            githubCommitLinkElement.href = commit.html_url; // Link to the commit page
            latestCommitTimeAgoElement.title = new Date(latestCommitTimestamp).toLocaleString(); // Full date in title

            updateCommitTimeAgo(); // Initial display
            if (commitUpdateIntervalId) clearInterval(commitUpdateIntervalId); // Clear previous interval if any
            commitUpdateIntervalId = setInterval(updateCommitTimeAgo, 1000); // Update every second
        } else {
            throw new Error("No commit data received.");
        }
    } catch (error) {
        console.error("Failed to fetch latest commit info:", error);
        latestCommitShaElement.textContent = 'unavailable';
        latestCommitTimeAgoElement.textContent = '';
        if(githubCommitLinkElement) githubCommitLinkElement.href = "https://github.com/Hydrovolter/Music/commits";
    }
}

function formatTimeAgoSimple(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const months = Math.round(days / 30.44); // Average days in month
    const years = Math.round(days / 365.25);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    if (months < 12) return `${months}mo`;
    return `${years}y`;
}

function updateCommitTimeAgo() {
    if (latestCommitTimestamp && latestCommitTimeAgoElement) {
        latestCommitTimeAgoElement.textContent = formatTimeAgoSimple(latestCommitTimestamp);
    }
}

function openSettingsModal() {
    if (!settingsModalElement) return;
    // Reset import UI
    importedFileContent = null;
    if(importDataInputElement) importDataInputElement.value = '';
    if(selectedFileNameElement) selectedFileNameElement.textContent = '';
    if(importDataBtnElement) importDataBtnElement.disabled = true;
    
    settingsModalElement.style.display = 'flex';
    fetchLatestCommitInfo(); // Fetch commit info when modal opens
}

function closeSettingsModal() {
    if (!settingsModalElement) return;
    settingsModalElement.style.display = 'none';
    importedFileContent = null;

    // --- START: Clear GitHub interval and reset info ---
    if (commitUpdateIntervalId) {
        clearInterval(commitUpdateIntervalId);
        commitUpdateIntervalId = null;
    }
    latestCommitTimestamp = null;
    if (latestCommitShaElement) latestCommitShaElement.textContent = '';
    if (latestCommitTimeAgoElement) latestCommitTimeAgoElement.textContent = '';
    if (githubCommitLinkElement) githubCommitLinkElement.href = "https://github.com/Hydrovolter/Music"; // Reset link
}

// --- Export Functionality ---
function exportUserData() {
    const dataToExport = {};
    APP_STORAGE_KEYS.forEach(key => { // APP_STORAGE_KEYS from init.js
        const item = localStorage.getItem(key);
        if (item !== null) { // Only include keys that actually exist
            try {
                // Attempt to parse to ensure it's valid JSON if we want to store it as object,
                // but for export, storing raw string is fine. For re-importing as JSON later, it's good.
                dataToExport[key] = JSON.parse(item);
            } catch (e) {
                dataToExport[key] = item; // Store as string if not parseable (shouldn't happen for our app data)
            }
        }
    });

    if (Object.keys(dataToExport).length === 0) {
        showToast("No data to export.", 3000);
        return;
    }

    const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.download = `music_player_data_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Data exported successfully!", 3000);
}

// --- Import Functionality ---
function handleFileSelectedForImport(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.type === "application/json" || file.name.endsWith(".json")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                importedFileContent = e.target.result; // Store the raw string content
                if(selectedFileNameElement) selectedFileNameElement.textContent = `Selected: ${file.name}`;
                if(importDataBtnElement) importDataBtnElement.disabled = false;
            };
            reader.onerror = (e) => {
                showToast("Error reading file.", 3000);
                importedFileContent = null;
                if(selectedFileNameElement) selectedFileNameElement.textContent = '';
                if(importDataBtnElement) importDataBtnElement.disabled = true;
            };
            reader.readAsText(file);
        } else {
            showToast("Invalid file type. Please select a .json file.", 3000);
            importedFileContent = null;
            if(selectedFileNameElement) selectedFileNameElement.textContent = '';
            if(importDataBtnElement) importDataBtnElement.disabled = true;
            if(importDataInputElement) importDataInputElement.value = ''; // Clear file input
        }
    }
}

function confirmAndProcessImport() {
    const fileContentToProcess = importedFileContent; // Capture current value
    console.log("confirmAndProcessImport called. fileContentToProcess CAPTURED:", fileContentToProcess ? fileContentToProcess.substring(0,50) + "..." : "null");

    if (!fileContentToProcess) {
        showToast("No file selected for import.", 3000);
        return;
    }

    showGeneralModal(
        "Confirm Import",
        "Warning: Importing data will override your current playlists and app data. This action cannot be undone.<br><br>Are you sure you want to proceed?",
        [
            {
                text: 'Proceed with Import',
                class: 'primary',
                callback: () => { // Use an arrow function to ensure 'this' context if needed, and to pass the captured content
                    processImportedData(fileContentToProcess); // Pass the captured content
                }
            },
            {
                text: 'Cancel',
                class: 'secondary'
            }
        ],
        { isOverlay: true }
    );
}

function processImportedData(fileContentForProcessing) {
    console.log("processImportedData CALLED. fileContentForProcessing:", fileContentForProcessing ? fileContentForProcessing.substring(0, 50) + "..." : "null");
    if (!fileContentForProcessing) {
        showToast("Import failed: No file content was provided to process.", 3000);
        return;
    }

    let parsedDataFromFile; // Declare here to be accessible in finally if needed for reset

    try {
        parsedDataFromFile = JSON.parse(fileContentForProcessing);

        // --- BEGIN ENHANCED VALIDATION ---
        if (typeof parsedDataFromFile !== 'object' || parsedDataFromFile === null) {
            throw new Error("Invalid file structure: Data is not a valid JSON object.");
        }

        // Check if at least one of the expected app storage keys exists at the top level of the imported object.
        const hasAtLeastOneAppKey = APP_STORAGE_KEYS.some(key => parsedDataFromFile.hasOwnProperty(key));
        if (!hasAtLeastOneAppKey) {
            throw new Error("Invalid file structure: Does not contain recognizable application data.");
        }

        // Optional: More specific validation for each key's expected type (e.g., arrays)
        APP_STORAGE_KEYS.forEach(key => {
            if (parsedDataFromFile.hasOwnProperty(key)) {
                const LIKED_PLAYLIST_STORAGE_KEY_CONST = "musicPlayer_likedSongsPlaylist";
                const USER_PLAYLISTS_STORAGE_KEY_CONST = "musicPlayer_userPlaylists";
                const RECENT_SEARCHES_KEY_CONST = "musicPlayer_recentSearches";

                if ((key === LIKED_PLAYLIST_STORAGE_KEY_CONST ||
                     key === USER_PLAYLISTS_STORAGE_KEY_CONST ||
                     key === RECENT_SEARCHES_KEY_CONST) &&
                    !Array.isArray(parsedDataFromFile[key])) {
                    throw new Error(`Invalid file structure: Data for "${key}" is not an array.`);
                }
                // Add more type checks if other keys have specific expected types (e.g., object, string, number)
            }
        });
        // --- END ENHANCED VALIDATION ---

        // Clear existing app-specific localStorage data
        APP_STORAGE_KEYS.forEach(key => {
            localStorage.removeItem(key);
        });

        // Apply imported data to localStorage
        APP_STORAGE_KEYS.forEach(key => {
            if (parsedDataFromFile.hasOwnProperty(key)) {
                localStorage.setItem(key, JSON.stringify(parsedDataFromFile[key]));
                console.log(`Imported and set localStorage for: ${key}`);
            }
        });

        // --- Crucial: Reset and Reload application state ---
        // (Your extensive reset logic remains here...)
        // 1. Stop current playback & clear player state
        if (typeof player !== 'undefined' && player && typeof player.stopVideo === 'function') {
            player.stopVideo();
        }
        if (typeof clearPlayerStateOnEnd === 'function') { clearPlayerStateOnEnd(); }
        isPlaying = false;
        if (playPauseBtn) {
            playPauseBtn.classList.remove("icon-pause"); playPauseBtn.classList.add("icon-play");
        }

        // 2. Reset current track displayed in player UI
        currentTrack = {
            id: null, title: "Not Playing", artist: "Not Playing",
            artwork: "img/empty_art.png", artworkLarge: "img/empty_art.png", durationSeconds: 0
        };
        if(trackTitle) trackTitle.textContent = currentTrack.title;
        if(artistName) artistName.textContent = currentTrack.artist;
        if(albumCover) {
            albumCover.src = currentTrack.artworkLarge;
            albumCover.onload = () => { if(typeof applyColors === 'function') applyColors([115, 98, 86]); };
        }
        if(typeof applyColors === 'function') applyColors([115, 98, 86]);
        if (showingLyrics && typeof lyricsContent !== 'undefined') {
            if(lyricsSongTitle) lyricsSongTitle.textContent = "Not Playing";
            if(lyricsArtistName) lyricsArtistName.textContent = "Not Playing";
            lyricsContent.textContent = "No lyrics available.";
        }
        if(typeof updateLikeButtonState === 'function') updateLikeButtonState();

        // 3. Clear any active playlist context
        if (typeof clearPlaylistContext === 'function') {
            clearPlaylistContext();
        } else {
            currentPlayingPlaylistId = null; currentPlaylistTrackIndex = -1;
            isShuffleActive = false; loopState = 'none';
            if(typeof updatePlaylistControlsVisibility === 'function') updatePlaylistControlsVisibility();
            if(typeof updateShuffleButtonIcon === 'function') updateShuffleButtonIcon();
            if(typeof updateLoopButtonIcon === 'function') updateLoopButtonIcon();
        }

        // 4. Re-initialize the playlist system
        if (typeof initializePlaylistSystem === 'function') {
            initializePlaylistSystem();
        } else {
            console.error("initializePlaylistSystem function not found.");
        }

        // 5. Refresh recent searches
        if (typeof searchInput !== 'undefined' && searchInput === document.activeElement && searchInput.value.trim() === "" && typeof displayRecentSearches === 'function') {
            displayRecentSearches();
        }
        
        // This toast is only reached if all try block operations succeed
        showToast("Data imported successfully! UI refreshed.", 3500);
        closeSettingsModal(); 

    } catch (error) { // Catch JSON.parse errors or errors thrown by custom validation
        console.error("Error processing imported file:", error);
        // Provide a more user-friendly message, potentially including parts of the error message
        let userErrorMessage = "Import failed: Invalid file format or content.";
        if (error.message.startsWith("Invalid file structure:")) {
            userErrorMessage = `Import failed: ${error.message}`;
        } else if (error instanceof SyntaxError) { // Specifically for JSON.parse errors
             userErrorMessage = "Import failed: File is not valid JSON.";
        }
        showToast(userErrorMessage, 4000);
    } finally {
        // This block always runs, regardless of try/catch outcome
        importedFileContent = null;
        if(importDataInputElement) importDataInputElement.value = '';
        if(selectedFileNameElement) selectedFileNameElement.textContent = '';
        if(importDataBtnElement) importDataBtnElement.disabled = true;
    }
}




// Helper function for escaping HTML (can live here or in a general utils.js)
// Make sure this is accessible if other files need it, or they have their own.
function escapeModalHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return unsafe === null || typeof unsafe === 'undefined' ? '' : String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&")
         .replace(/</g, "<")
         .replace(/>/g, ">")
         .replace(/"/g, '"')
         .replace(/'/g, "'");
}