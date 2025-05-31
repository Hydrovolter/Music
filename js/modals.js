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

function showGeneralModal(title, message, buttonsConfig = []) {
    if (!generalModalElement || !generalModalTitleElement || !generalModalMessageElement || !generalModalActionsElement) {
        console.error("Cannot show general modal: elements not initialized.");
        // Fallback to alert if modal elements aren't ready (though they should be if init is called)
        alert(`${title}\n${message.replace(/<br\s*\/?>/gi, "\n").replace(/<strong>|<\/strong>/gi, "")}`);
        return;
    }

    generalModalTitleElement.textContent = title;
    generalModalMessageElement.innerHTML = message; // Use innerHTML if message might contain simple HTML like <br>, <strong>
    generalModalActionsElement.innerHTML = ''; // Clear previous buttons

    if (buttonsConfig.length === 0) {
        // Default OK button if no buttons are specified (for simple alerts)
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.className = 'modal-button secondary'; // Assumes .modal-button and .secondary are globally styled
        okButton.onclick = closeGeneralModal;
        generalModalActionsElement.appendChild(okButton);
    } else {
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `modal-button ${btnConfig.class || 'secondary'}`;
            button.onclick = () => {
                closeGeneralModal(); // Always close modal on button click
                if (btnConfig.callback && typeof btnConfig.callback === 'function') {
                    btnConfig.callback();
                }
            };
            generalModalActionsElement.appendChild(button);
        });
    }
    generalModalElement.style.display = 'flex';
}

function closeGeneralModal() {
    if (!generalModalElement) return;
    generalModalElement.style.display = 'none';
    // Callbacks are tied to buttons, so no need to reset module-level generalModalConfirmCallback here
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