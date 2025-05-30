// Callbacks for confirm/cancel actions
let generalModalConfirmCallback = null; // Not strictly needed if callbacks are passed directly to buttons
let generalModalCancelCallback = null;  // Same as above

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
        return; // Or handle gracefully
    }

    closeGeneralModalBtnElement.addEventListener('click', closeGeneralModal);
    generalModalElement.addEventListener('click', (event) => {
        // Close if clicked on the overlay (background)
        if (event.target === generalModalElement) {
            closeGeneralModal();
        }
    });
    console.log("General Modal system initialized.");


    // Initialize Create Playlist Modal Elements
    createPlaylistModalElement = document.getElementById('createPlaylistModal');
    // createPlaylistModalTitleElement = document.getElementById('createPlaylistModalTitle'); // If title is dynamic
    newPlaylistNameInputElement = document.getElementById('newPlaylistNameInput');
    confirmCreatePlaylistBtnElement = document.getElementById('confirmCreatePlaylistBtn');
    cancelCreatePlaylistBtnElement = document.getElementById('cancelCreatePlaylistBtn');
    closeCreatePlaylistModalBtnElement = document.getElementById('closeCreatePlaylistModal');

    if (!createPlaylistModalElement || !newPlaylistNameInputElement || !confirmCreatePlaylistBtnElement ||
        !cancelCreatePlaylistBtnElement || !closeCreatePlaylistModalBtnElement) {
        console.error("Create Playlist modal DOM elements not found. This functionality will be limited.");
    } else {
        closeCreatePlaylistModalBtnElement.addEventListener('click', closeCreatePlaylistModal);
        cancelCreatePlaylistBtnElement.addEventListener('click', closeCreatePlaylistModal);
        confirmCreatePlaylistBtnElement.addEventListener('click', handleConfirmCreatePlaylist);
        createPlaylistModalElement.addEventListener('click', (event) => {
            if (event.target === createPlaylistModalElement) {
                closeCreatePlaylistModal();
            }
        });
        // Allow 'Enter' key in input field to submit
        newPlaylistNameInputElement.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission if it were in a form
                handleConfirmCreatePlaylist();
            }
        });
        console.log("Create Playlist Modal system initialized.");
    }

    // Initialize Rename Playlist Modal Elements
    renamePlaylistModalElement = document.getElementById('renamePlaylistModal');
    renamePlaylistModalTitleElement = document.getElementById('renamePlaylistModalTitle'); // Get the title element
    renamePlaylistNameInputElement = document.getElementById('renamePlaylistNameInput');
    confirmRenamePlaylistBtnElement = document.getElementById('confirmRenamePlaylistBtn');
    cancelRenamePlaylistBtnElement = document.getElementById('cancelRenamePlaylistBtn');
    closeRenamePlaylistModalBtnElement = document.getElementById('closeRenamePlaylistModal');

    if (!renamePlaylistModalElement || !renamePlaylistNameInputElement || !confirmRenamePlaylistBtnElement ||
        !cancelRenamePlaylistBtnElement || !closeRenamePlaylistModalBtnElement || !renamePlaylistModalTitleElement) {
        console.error("Rename Playlist modal DOM elements not found. This functionality will be limited.");
    } else {
        closeRenamePlaylistModalBtnElement.addEventListener('click', closeRenamePlaylistModal);
        cancelRenamePlaylistBtnElement.addEventListener('click', closeRenamePlaylistModal);
        confirmRenamePlaylistBtnElement.addEventListener('click', handleConfirmRenamePlaylist);
        renamePlaylistModalElement.addEventListener('click', (event) => {
            if (event.target === renamePlaylistModalElement) {
                closeRenamePlaylistModal();
            }
        });
        renamePlaylistNameInputElement.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleConfirmRenamePlaylist();
            }
        });
        console.log("Rename Playlist Modal system initialized.");
    }
}

function showGeneralModal(title, message, buttonsConfig = []) {
    // buttonsConfig example:
    // [
    //   { text: 'OK', class: 'secondary', callback: () => console.log('OK clicked') },
    //   { text: 'Delete', class: 'primary', callback: handleDeleteFunction }
    // ]
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
    if (!createPlaylistModalElement || !newPlaylistNameInputElement) return;
    newPlaylistNameInputElement.value = "My Playlist " + (typeof userPlaylists !== 'undefined' ? userPlaylists.length + 1 : 1); // Suggest a name
    createPlaylistModalElement.style.display = 'flex';
    newPlaylistNameInputElement.focus(); // Focus on the input field
    newPlaylistNameInputElement.select(); // Select the suggested text
}

function closeCreatePlaylistModal() {
    if (!createPlaylistModalElement) return;
    createPlaylistModalElement.style.display = 'none';
    if(newPlaylistNameInputElement) newPlaylistNameInputElement.value = ''; // Clear input
}

function handleConfirmCreatePlaylist() {
    if (!newPlaylistNameInputElement) return;
    const playlistName = newPlaylistNameInputElement.value.trim();

    if (playlistName) {
        // Call the actual createPlaylist function (which should be in playlist.js)
        if (typeof createPlaylist === 'function') { // createPlaylist is from playlist.js
            createPlaylist(playlistName);
            if (typeof renderAllPlaylistsView === 'function') { // from playlist.js
                 renderAllPlaylistsView(); // Refresh the sidebar
            }
            closeCreatePlaylistModal();
        } else {
            console.error("createPlaylist function not found.");
            // Fallback to an alert if something is wrong with function availability
            showGeneralModal("Error", "Could not create playlist. Functionality missing.");
        }
    } else {
        // Use the general modal to show an error if the name is empty
        if (typeof showGeneralModal === 'function') {
            showGeneralModal("Invalid Name", "Playlist name cannot be empty.");
        } else {
            alert("Playlist name cannot be empty."); // Fallback
        }
        // Optionally, re-focus the input: newPlaylistNameInputElement.focus();
    }
}

function openRenamePlaylistModal(currentPlaylistId, currentName) {
    if (!renamePlaylistModalElement || !renamePlaylistNameInputElement || !renamePlaylistModalTitleElement) return;

    playlistIdToRename = currentPlaylistId; // Store the ID
    renamePlaylistModalTitleElement.textContent = `Rename "${escapeModalHtml(currentName)}"`; // Set dynamic title
    renamePlaylistNameInputElement.value = currentName; // Pre-fill with current name
    renamePlaylistModalElement.style.display = 'flex';
    renamePlaylistNameInputElement.focus();
    renamePlaylistNameInputElement.select();
}

function closeRenamePlaylistModal() {
    if (!renamePlaylistModalElement) return;
    renamePlaylistModalElement.style.display = 'none';
    if(renamePlaylistNameInputElement) renamePlaylistNameInputElement.value = '';
    playlistIdToRename = null; // Clear stored ID
}

function handleConfirmRenamePlaylist() {
    if (!renamePlaylistNameInputElement || !playlistIdToRename) return;

    const newPlaylistName = renamePlaylistNameInputElement.value.trim();
    const oldPlaylistData = typeof getPlaylistById === 'function' ? getPlaylistById(playlistIdToRename) : null; // getPlaylistById from playlist.js
    const oldName = oldPlaylistData ? oldPlaylistData.name : "";


    if (newPlaylistName && newPlaylistName !== oldName) {
        // Call the actual renamePlaylist function (which should be in playlist.js)
        if (typeof renamePlaylist === 'function') { // renamePlaylist is from playlist.js
            renamePlaylist(playlistIdToRename, newPlaylistName);
            // renderAllPlaylistsView() or renderSinglePlaylistView() will be called by renamePlaylist
            closeRenamePlaylistModal();
        } else {
            console.error("renamePlaylist function not found.");
            showGeneralModal("Error", "Could not rename playlist. Functionality missing.");
        }
    } else if (!newPlaylistName) {
        showGeneralModal("Invalid Name", "Playlist name cannot be empty.");
        // Optionally, re-focus: renamePlaylistNameInputElement.focus();
    } else { // Name is the same, or something else went wrong
        closeRenamePlaylistModal(); // Just close if name hasn't changed
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