// js/playlist.js

// --- INITIALIZATION ---
function initializePlaylistSystem() {
    // Fetch DOM Elements
    playlistDisplayAreaElement = document.getElementById('playlistDisplayArea');
    sidebarTitleElement = document.getElementById('sidebarTitle');
    backToPlaylistsBtnElement = document.getElementById('backToPlaylistsBtn');
    createNewPlaylistBtnElement = document.getElementById('createNewPlaylistBtn');
    addToPlaylistBtnElement = document.getElementById('addToPlaylistBtn');
    addToPlaylistModalElement = document.getElementById('addToPlaylistModal');
    modalPlaylistListElement = document.getElementById('modalPlaylistList');
    closeModalAddToPlaylistBtnElement = document.getElementById('closeAddToPlaylistModal');
    likeBtnElement = document.getElementById('likeBtn');
    prevBtnElement = document.getElementById('prevBtn');
    nextBtnElement = document.getElementById('nextBtn');

    if (!playlistDisplayAreaElement || !sidebarTitleElement || !backToPlaylistsBtnElement ||
        !createNewPlaylistBtnElement || !addToPlaylistBtnElement || !addToPlaylistModalElement ||
        !modalPlaylistListElement || !closeModalAddToPlaylistBtnElement || !likeBtnElement ||
        !prevBtnElement || !nextBtnElement) {
        console.error("One or more playlist system DOM elements not found. Aborting.");
        return;
    }

    loadLikedPlaylist();
    loadUserPlaylists();
    loadLocalFilesPlaylist();

    renderSidebar(); // Initial render

    // Event Listeners
    likeBtnElement.addEventListener('click', toggleLikeCurrentSong);
    nextBtnElement.addEventListener('click', playNextTrackInCurrentPlaylist);
    prevBtnElement.addEventListener('click', playPreviousTrackInCurrentPlaylist);
    backToPlaylistsBtnElement.addEventListener('click', () => switchSidebarView('all_playlists'));
    createNewPlaylistBtnElement.addEventListener('click', handleCreateNewPlaylist);
    addToPlaylistBtnElement.addEventListener('click', () => { openAddToPlaylistModal(); });
    closeModalAddToPlaylistBtnElement.addEventListener('click', closeAddToPlaylistModal);

    window.addEventListener('click', (event) => {
        if (event.target === addToPlaylistModalElement) {
            closeAddToPlaylistModal();
        }
    });

    updatePlaylistControlsVisibility(); // Initial check for prev/next buttons
}

// --- DATA MANAGEMENT (LIKED SONGS) ---
function loadLikedPlaylist() {
    const stored = localStorage.getItem(LIKED_PLAYLIST_STORAGE_KEY); // From init.js
    likedPlaylist = stored ? JSON.parse(stored) : [];
}

function saveLikedPlaylist() {
    localStorage.setItem(LIKED_PLAYLIST_STORAGE_KEY, JSON.stringify(likedPlaylist));
}

function addSongToLikedPlaylist(songData) {
    if (!songData || !songData.id) {
        console.error("Cannot add to liked: missing song data or ID.", songData);
        return;
    }
    // Ensure durationSeconds is part of songData being pushed
    if (songData.durationSeconds === undefined) {
        console.warn(`Song "${songData.title}" added to Liked without duration. Defaulting to 0.`);
        songData.durationSeconds = 0; // Or fetch it if critical, but for now default
    }

    if (!likedPlaylist.find(s => s.id === songData.id)) {
        likedPlaylist.push(songData); // songData now includes durationSeconds
        saveLikedPlaylist();
        // ... (toast and re-render logic from previous step)
        if (typeof showToast === 'function') {
            const message = `"${escapeHtml(songData.title)}" added to Liked Songs!`;
            showToast(message, 3000);
        }
        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LIKED_SONGS_PLAYLIST_ID) {
            renderSinglePlaylistView(LIKED_SONGS_PLAYLIST_ID);
        } else if (currentSidebarView === 'all_playlists') {
            renderAllPlaylistsView();
        }
        updateLikeButtonState(true);

    } else {
        // ... (toast for already liked)
        if (typeof showToast === 'function') {
            const message = `"${escapeHtml(songData.title)}" is already in Liked Songs.`;
            showToast(message, 3000);
        }
    }
}

function removeSongFromLikedPlaylist(songId) {
    const initialLength = likedPlaylist.length;
    const songBeingRemoved = likedPlaylist.find(s => s.id === songId);

    likedPlaylist = likedPlaylist.filter(s => s.id !== songId);

    if (likedPlaylist.length < initialLength) {
        saveLikedPlaylist();

        // --- BEGIN MODIFICATION ---
        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LIKED_SONGS_PLAYLIST_ID) {
            renderSinglePlaylistView(LIKED_SONGS_PLAYLIST_ID);
        } else if (currentSidebarView === 'all_playlists') { // If viewing the overview
            renderAllPlaylistsView(); // Refresh the overview
        }
        // --- END MODIFICATION ---

        if (songBeingRemoved && typeof showToast === 'function') {
            showToast(`"${escapeHtml(songBeingRemoved.title)}" removed from Liked Songs.`, 3000);
        }


        if (currentPlayingPlaylistId === LIKED_SONGS_PLAYLIST_ID && currentTrack && currentTrack.id === songId) {
            const oldPlayingSongId = currentTrack.id;
            const newIndex = likedPlaylist.findIndex(s => s.id === oldPlayingSongId);
            if (newIndex === -1 && likedPlaylist.length > 0 && currentPlaylistTrackIndex >= likedPlaylist.length) {
                currentPlaylistTrackIndex = Math.max(0, likedPlaylist.length - 1);
            } else if (newIndex !== -1) {
                 currentPlaylistTrackIndex = newIndex;
            } else if (likedPlaylist.length === 0) {
                clearPlaylistContext(); // This also handles player controls visibility
            }
        }
        if (currentTrack && currentTrack.id === songId) {
            updateLikeButtonState(false); // Update player's heart icon
        }
    }
}

function isSongLiked(songId) {
    if (!songId) return false;
    return likedPlaylist.some(s => s.id === songId);
}

function toggleLikeCurrentSong() {
    // +++ START: ADD THIS GUARD +++
    if (currentTrack && currentTrack.isLocalFile) {
        if (typeof showToast === 'function') {
            showToast("Local files cannot be added to 'Liked Songs'.", 3500);
        }
        console.log("Attempted to like a local file. Aborted.");
        return; // Prevent liking
    }
    // +++ END: ADD THIS GUARD +++

    if (!currentTrack || currentTrack.id == null) {
        console.warn("No current track to like/unlike, or track has no ID.");
        if (currentTrack && currentTrack.id == null && typeof showToast === 'function') {
            showToast("Cannot like: Track information incomplete.", 3000);
        }
        return;
    }

    if (isSongLiked(currentTrack.id)) {
        removeSongFromLikedPlaylist(currentTrack.id);
    } else {
        if (currentTrack.durationSeconds === undefined) {
            console.warn(`Liking current track "${currentTrack.title}" but its duration is undefined. Defaulting to 0.`);
        }
        addSongToLikedPlaylist({
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            artwork: currentTrack.artwork,
            durationSeconds: currentTrack.durationSeconds || 0,
            // IMPORTANT: Do NOT add isLocalFile: true or fileObject here.
            // Liked Songs playlist should only store metadata as if it were an online track.
            // The fact that its origin was local is irrelevant once it's "liked" in this simplified model.
        });
    }
    // updateLikeButtonState is called within add/remove if currentTrack matches
}


function updateLikeButtonState(isLikedOverride) {
    if (!likeBtnElement) return;
    const liked = typeof isLikedOverride === 'boolean' ? isLikedOverride : (currentTrack && currentTrack.id != null ? isSongLiked(currentTrack.id) : false);

    if (liked) {
        likeBtnElement.classList.remove('icon-heart-empty');
        likeBtnElement.classList.add('icon-heart-filled');
    } else {
        likeBtnElement.classList.remove('icon-heart-filled');
        likeBtnElement.classList.add('icon-heart-empty');
    }
}

// --- DATA MANAGEMENT (LOCAL FILES) ---
function loadLocalFilesPlaylist() {
    const stored = localStorage.getItem(LOCAL_FILES_PLAYLIST_STORAGE_KEY);
    localFilesPlaylist = stored ? JSON.parse(stored) : [];
    // After loading, songs in localFilesPlaylist will NOT have the .fileObject property.
    // They WILL have .isLocalFile = true.
}

function saveLocalFilesPlaylist() {
    const playlistToSave = localFilesPlaylist.map(song => {
        const { fileObject, ...rest } = song; // Destructure to remove fileObject
        return rest; // Only 'rest' (metadata) is saved
    });
    localStorage.setItem(LOCAL_FILES_PLAYLIST_STORAGE_KEY, JSON.stringify(playlistToSave));
}

function addSongToLocalFilesPlaylist(songData) {
    if (!songData || !songData.id) {
        console.error("Cannot add to Local Files: missing song data or ID.", songData);
        return;
    }
    if (songData.durationSeconds === undefined) {
        songData.durationSeconds = 0;
    }
    songData.isLocalFile = true; // Ensure this flag is always set

    const existingSongIndex = localFilesPlaylist.findIndex(s => s.id === songData.id);

    if (existingSongIndex !== -1) {
        // Song with this ID already exists. Update it.
        console.log(`Updating existing local file entry: "${songData.title}" with new file data.`);
        // Merge, ensuring new fileObject and potentially updated metadata are used
        localFilesPlaylist[existingSongIndex] = {
            ...localFilesPlaylist[existingSongIndex], // Keep old stable properties like ID
            title: songData.title,                   // Update metadata from new file
            artist: songData.artist,
            album: songData.album,
            artwork: songData.artwork,
            artworkLarge: songData.artworkLarge,
            durationSeconds: songData.durationSeconds,
            originalFileName: songData.originalFileName, // Could also update if file name changed but ID matched
            fileObject: songData.fileObject,         // Crucially, update the fileObject
            isLocalFile: true                        // Re-affirm
        };
        
        saveLocalFilesPlaylist(); // Save updated metadata (if any) to localStorage

        if (typeof showToast === 'function') {
            const message = `"${escapeHtml(songData.title)}" re-selected and updated!`;
            showToast(message, 3000);
        }
    } else {
        // New song, add it
        localFilesPlaylist.push(songData);
        saveLocalFilesPlaylist(); // Save new entry's metadata to localStorage

        if (typeof showToast === 'function') {
            const message = `"${escapeHtml(songData.title)}" added to Local Files!`;
            showToast(message, 3000);
        }
    }

    // Re-render the view
    if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LOCAL_FILES_PLAYLIST_ID) {
        renderSinglePlaylistView(LOCAL_FILES_PLAYLIST_ID);
    } else if (currentSidebarView === 'all_playlists') {
        renderAllPlaylistsView();
    }
}

function removeSongFromLocalFilesPlaylist(songId) {
    const initialLength = localFilesPlaylist.length;
    const songBeingRemoved = localFilesPlaylist.find(s => s.id === songId);

    localFilesPlaylist = localFilesPlaylist.filter(s => s.id !== songId);

    if (localFilesPlaylist.length < initialLength) {
        saveLocalFilesPlaylist();

        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LOCAL_FILES_PLAYLIST_ID) {
            renderSinglePlaylistView(LOCAL_FILES_PLAYLIST_ID);
        } else if (currentSidebarView === 'all_playlists') {
            renderAllPlaylistsView();
        }

        if (songBeingRemoved && typeof showToast === 'function') {
            showToast(`"${escapeHtml(songBeingRemoved.title)}" removed from Local Files.`, 3000);
        }

        // Update playback context if needed
        if (currentPlayingPlaylistId === LOCAL_FILES_PLAYLIST_ID && currentTrack && currentTrack.id === songId) {
            if (localFilesPlaylist.length === 0) {
                clearPlaylistContext();
            } else {
                // If the removed song was currently playing, advance or adjust index
                const newIndex = localFilesPlaylist.findIndex(s => s.id === currentTrack.id); // Check if still there (shouldn't be)
                if (newIndex === -1) { // Song removed was current
                    if (currentPlaylistTrackIndex >= localFilesPlaylist.length) {
                        currentPlaylistTrackIndex = Math.max(0, localFilesPlaylist.length - 1);
                    }
                    // Player's ENDED state or next/prev logic will handle what to play next if anything.
                    // Or, you could explicitly try to play the song now at currentPlaylistTrackIndex
                    // if you want immediate continuation. For now, let player.js handle it.
                }
            }
        }
    }
}

// --- DATA MANAGEMENT (USER PLAYLISTS) ---
function loadUserPlaylists() {
    const stored = localStorage.getItem(USER_PLAYLISTS_STORAGE_KEY);
    userPlaylists = stored ? JSON.parse(stored) : [];
    // Ensure existing playlists have the customArtwork property
    userPlaylists.forEach(p => {
        if (p.customArtwork === undefined) {
            p.customArtwork = null;
        }
    });
}


function saveUserPlaylists() {
    localStorage.setItem(USER_PLAYLISTS_STORAGE_KEY, JSON.stringify(userPlaylists));
}

// Modified createPlaylist
function createPlaylist(name, customArtworkDataUrl = null) { // Added customArtworkDataUrl
    const newPlaylist = {
        id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || "New Playlist",
        songs: [],
        customArtwork: customArtworkDataUrl // Store it
    };
    userPlaylists.push(newPlaylist);
    saveUserPlaylists();
    return newPlaylist;
}

function getPlaylistById(playlistId) {
    if (playlistId === LIKED_SONGS_PLAYLIST_ID) {
        // Liked Songs playlist doesn't have custom artwork editable by user
        return { id: LIKED_SONGS_PLAYLIST_ID, name: "Liked Songs", songs: [...likedPlaylist], customArtwork: null };
    }

    if (playlistId === LOCAL_FILES_PLAYLIST_ID) {
        return {
            id: LOCAL_FILES_PLAYLIST_ID,
            name: "Local Files",
            songs: [...localFilesPlaylist], // Return a copy
            customArtwork: 'img/local_files.png', // Fixed artwork path
            isLocalFilesPlaylist: true // Flag for easy identification
        };
    }

    return userPlaylists.find(p => p.id === playlistId);
}

// Renamed from renamePlaylist and updated
function updatePlaylistDetails(playlistId, newName, newCustomArtworkDataUrl) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist) {
        let changed = false;
        if (newName && newName.trim() !== "" && playlist.name !== newName.trim()) {
            playlist.name = newName.trim();
            changed = true;
        }
        // Check if newCustomArtworkDataUrl is explicitly passed (it could be null to clear it)
        if (newCustomArtworkDataUrl !== undefined && playlist.customArtwork !== newCustomArtworkDataUrl) {
            playlist.customArtwork = newCustomArtworkDataUrl;
            changed = true;
        }

        if (changed) {
            saveUserPlaylists();
            // Re-render views
            if (currentSidebarView === 'all_playlists') {
                renderAllPlaylistsView();
            } else if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                if (sidebarTitleElement) sidebarTitleElement.textContent = escapeHtml(playlist.name); // Update title if viewing
                renderSinglePlaylistView(playlistId);
            }
            // If the currently playing playlist was edited, its display in the sidebar might need an update too
            // This is generally covered by the above re-renders.
        }
    }
}

function deletePlaylist(playlistId) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist) return;
    const playlistName = playlist.name || "this playlist";

    showGeneralModal(
        "Confirm Deletion",
        `Are you sure you want to delete the playlist "<strong>${escapeModalHtml(playlistName)}</strong>"?<br>This action cannot be undone.`,
        [
            {
                text: 'Delete',
                class: 'primary',
                callback: () => {
                    if (playlistId === LIKED_SONGS_PLAYLIST_ID || playlistId === LOCAL_FILES_PLAYLIST_ID) {
                        console.warn("Attempted to delete a special playlist:", playlistId);
                        if(typeof showToast === 'function') showToast("This playlist cannot be deleted.", 3000);
                        return;
                    }
                    
                    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
                    saveUserPlaylists();
                    if (selectedPlaylistToViewId === playlistId) switchSidebarView('all_playlists');
                    else if (currentSidebarView === 'all_playlists') renderAllPlaylistsView();
                    if (currentPlayingPlaylistId === playlistId) clearPlaylistContext();
                    console.log(`Playlist "${escapeModalHtml(playlistName)}" deleted.`);
                    showToast(`Playlist "${escapeModalHtml(playlistName)}" deleted.`, 3000);
                }
            },
            { text: 'Cancel', class: 'secondary', callback: () => console.log('Deletion cancelled.') }
        ]
    );
}

function addSongToUserPlaylist(playlistId, songData) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist && songData && songData.id) {
        // Ensure durationSeconds is part of songData being pushed
        if (songData.durationSeconds === undefined) {
            console.warn(`Song "${songData.title}" added to playlist "${playlist.name}" without duration. Defaulting to 0.`);
            songData.durationSeconds = 0;
        }

        if (!playlist.songs.find(s => s.id === songData.id)) {
            playlist.songs.push(songData); // songData now includes durationSeconds
            saveUserPlaylists();
            // ... (toast and re-render logic from previous step)
             if (typeof showToast === 'function') {
                const message = `"${escapeHtml(songData.title)}" added to ${escapeHtml(playlist.name)}!`;
                showToast(message, 3000);
            }
            if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                renderSinglePlaylistView(playlistId);
            } else if (currentSidebarView === 'all_playlists') {
                renderAllPlaylistsView();
            }
            console.log(`Song "${songData.title}" added to playlist "${playlist.name}"`);
        } else {
            // ... (toast for song already in playlist)
            if (typeof showToast === 'function') {
                const message = `"${escapeHtml(songData.title)}" is already in ${escapeHtml(playlist.name)}.`;
                showToast(message, 3000);
            }
        }
    } else {
        // ... (error handling)
        if (!playlist) console.error("Playlist not found for ID:", playlistId);
        if (!songData || !songData.id) console.error("Invalid song data for addSongToUserPlaylist:", songData);
        if (typeof showToast === 'function') {
             showToast("Error: Could not add song to playlist.", 3000);
        }
    }
}

function removeSongFromUserPlaylist(playlistId, songId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist) {
        const initialLength = playlist.songs.length;
        const songBeingRemoved = playlist.songs.find(s => s.id === songId);
        playlist.songs = playlist.songs.filter(s => s.id !== songId);

        if (playlist.songs.length < initialLength) {
            saveUserPlaylists();

            // --- BEGIN MODIFICATION ---
            if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                renderSinglePlaylistView(playlistId);
            } else if (currentSidebarView === 'all_playlists') { // If viewing the overview
                renderAllPlaylistsView(); // Refresh the overview
            }
            // --- END MODIFICATION ---
            
            if (songBeingRemoved && typeof showToast === 'function') {
                showToast(`"${escapeHtml(songBeingRemoved.title)}" removed from ${escapeHtml(playlist.name)}.`, 3000);
            }

            if (currentPlayingPlaylistId === playlistId && currentTrack && currentTrack.id === songId) {
                // If the removed song was playing from this user playlist
                // Player.js ENDED state or next/prev logic will handle advancing if possible.
                // We might need to adjust currentPlaylistTrackIndex if the removed song was *before* current.
                // For simplicity, if current playing is removed, player handles next or stops.
                // If the playlist becomes empty, clear context.
                if (playlist.songs.length === 0) {
                    clearPlaylistContext();
                } else {
                    // Check if currentTrackIndex is now out of bounds
                    if (currentPlaylistTrackIndex >= playlist.songs.length) {
                        currentPlaylistTrackIndex = playlist.songs.length - 1; // Point to new last song
                    }
                    // If the song removed was *before* the current one, the index of the current playing song
                    // in the modified array would have shifted.
                    const stillPlayingSong = playlist.songs.find(s => s.id === currentTrack.id);
                    if (stillPlayingSong) {
                        currentPlaylistTrackIndex = playlist.songs.findIndex(s => s.id === currentTrack.id);
                    } else {
                        // Current track was the one removed, and playlist not empty,
                        // player will likely stop or try to play next based on its ENDED logic.
                        // No direct action needed here other than the render.
                    }
                }
            }
        }
    }
}

function reorderSongInPlaylist(playlistId, oldIndex, newIndex) {
    const playlistRef = (playlistId === LIKED_SONGS_PLAYLIST_ID) ? likedPlaylist : userPlaylists.find(p => p.id === playlistId)?.songs;
    if (!playlistRef) return;

    const itemToMove = playlistRef.splice(oldIndex, 1)[0];
    playlistRef.splice(newIndex, 0, itemToMove);

    if (playlistId === LIKED_SONGS_PLAYLIST_ID) {
        saveLikedPlaylist();
    } else {
        saveUserPlaylists(); // Assumes playlistRef was a direct reference to a user playlist's songs array
    }

    if (currentPlayingPlaylistId === playlistId && currentTrack) {
        const newPlayingIndex = playlistRef.findIndex(song => song.id === currentTrack.id);
        if (newPlayingIndex !== -1) {
            currentPlaylistTrackIndex = newPlayingIndex;
        }
    }

    if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
        renderSinglePlaylistView(playlistId);
    }
}

// --- UI RENDERING ---
function renderSidebar() {
    if (!playlistDisplayAreaElement) return; // Guard if elements not ready
    if (currentSidebarView === 'all_playlists') {
        renderAllPlaylistsView();
    } else if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId) {
        renderSinglePlaylistView(selectedPlaylistToViewId);
    }
}

function switchSidebarView(view, playlistId = null) {
    currentSidebarView = view;
    selectedPlaylistToViewId = playlistId; // This is ID of playlist to *view*, not necessarily play
    renderSidebar();
}

function renderAllPlaylistsView() {
    if (!playlistDisplayAreaElement || !sidebarTitleElement || !backToPlaylistsBtnElement || !createNewPlaylistBtnElement) return;

    // --- BEGIN MODIFICATION: Store scroll and clear title class ---
    let currentScrollTop = 0;
    if (playlistDisplayAreaElement) {
        currentScrollTop = playlistDisplayAreaElement.scrollTop;
    }

    if (sidebarTitleElement) { // Ensure element exists
        sidebarTitleElement.textContent = "Your Playlists";
        sidebarTitleElement.classList.remove('playing-playlist-title'); // Remove the class here
    }
    // --- END MODIFICATION ---

    playlistDisplayAreaElement.innerHTML = '';
    // sidebarTitleElement.textContent = "Your Playlists"; // Moved up
    backToPlaylistsBtnElement.style.display = 'none';
    createNewPlaylistBtnElement.style.display = 'inline-block';

    const ul = document.createElement('ul');
    // ul.className = 'playlist-list-overview';

    const likedSongsData = { id: LIKED_SONGS_PLAYLIST_ID, name: "Liked Songs", songs: likedPlaylist };
    ul.appendChild(createPlaylistOverviewItem(likedSongsData));

    const localFilesData = { id: LOCAL_FILES_PLAYLIST_ID, name: "Local Files", songs: localFilesPlaylist };
    ul.appendChild(createPlaylistOverviewItem(localFilesData));

    userPlaylists.forEach(playlist => {
        ul.appendChild(createPlaylistOverviewItem(playlist));
    });

    playlistDisplayAreaElement.appendChild(ul);

    // --- BEGIN MODIFICATION: Restore scroll position ---
    if (playlistDisplayAreaElement) {
        playlistDisplayAreaElement.scrollTop = currentScrollTop;
    }
    // --- END MODIFICATION ---
}

// Modify createPlaylistOverviewItem to use actual durations
function createPlaylistOverviewItem(playlistData) {
    const li = document.createElement('li');
    li.className = 'playlist-overview-item';
    li.setAttribute('data-playlist-id', playlistData.id);

    const songCount = playlistData.songs.length;
    const songsText = songCount === 1 ? "1 song" : `${songCount} songs`;

    // --- BEGIN MODIFICATION: Calculate total duration from actual song data ---
    let totalDurationSeconds = 0;
    if (songCount > 0) {
        totalDurationSeconds = playlistData.songs.reduce((sum, song) => {
            return sum + (song.durationSeconds || 0); // Use stored durationSeconds, fallback to 0
        }, 0);
    }
    const formattedDuration = formatPlaylistDuration(totalDurationSeconds);
    const countAndDurationText = songCount > 0 ? `${songsText} • ${formattedDuration}` : songsText;
    // --- END MODIFICATION ---

    let artworkSrc;
    if (playlistData.id === LIKED_SONGS_PLAYLIST_ID) {
        artworkSrc = 'img/liked_songs.png';
    } else if (playlistData.id === LOCAL_FILES_PLAYLIST_ID) { // +++ ADD THIS ELSE IF +++
        artworkSrc = 'img/local_files.png';
    } else { // User playlist
        li.setAttribute('draggable', true);
        if (playlistData.customArtwork) {
            artworkSrc = playlistData.customArtwork;
        } else if (playlistData.songs.length > 0 && playlistData.songs[0].artwork) {
            artworkSrc = playlistData.songs[0].artwork;
        } else {
            artworkSrc = 'img/empty_art.png';
        }
        li.addEventListener('dragstart', (event) => handlePlaylistDragStart(event, playlistData.id));
        li.addEventListener('dragover', handlePlaylistDragOver);
        li.addEventListener('drop', (event) => handlePlaylistDrop(event, playlistData.id));
        li.addEventListener('dragend', handlePlaylistDragEnd);
    }


    let nameDisplayClasses = "playlist-overview-item-name";
    if (currentPlayingPlaylistId === playlistData.id) {
        nameDisplayClasses += " playing-playlist-title";
    }
    let nameDisplay = `<div class="${nameDisplayClasses}">${escapeHtml(playlistData.name)}</div>`;

    let actionsHtml = '';
    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID && playlistData.id !== LOCAL_FILES_PLAYLIST_ID) { // +++ ADD LOCAL_FILES CHECK +++
        actionsHtml = `
            <div class="playlist-item-actions">
                <button class="edit-playlist-btn" title="Edit Playlist"><i class="icon icon-edit"></i></button>
                <button class="delete-playlist-btn" title="Delete"><i class="icon icon-trash"></i></button>
            </div>`;
    }


    li.innerHTML = `
        <img src="${artworkSrc}" alt="${escapeHtml(playlistData.name)}" class="playlist-overview-item-artwork">
        <div class="playlist-overview-item-info">
            ${nameDisplay}
            <div class="playlist-overview-item-count">${countAndDurationText}</div>
        </div>
        ${actionsHtml}
    `;

    // ... (event listeners in this function remain the same)
    const infoSection = li.querySelector('.playlist-overview-item-info');
    const artworkSection = li.querySelector('.playlist-overview-item-artwork');
    const viewPlaylistHandler = () => switchSidebarView('single_playlist_view', playlistData.id);

    const combinedClickHandler = (e) => {
        if (e.target.closest('.playlist-item-actions') ||
            (draggedPlaylistElement && draggedPlaylistElement.classList.contains('dragging'))) {
            return;
        }
        viewPlaylistHandler();
    };
    
    if (infoSection) infoSection.addEventListener('click', combinedClickHandler);
    if (artworkSection) artworkSection.addEventListener('click', combinedClickHandler);


    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID && playlistData.id !== LOCAL_FILES_PLAYLIST_ID) { // +++ ADD LOCAL_FILES CHECK +++
        const editBtn = li.querySelector('.edit-playlist-btn');
        const deleteBtn = li.querySelector('.delete-playlist-btn');
        if(editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); handleEditPlaylist(playlistData.id); });
        if(deleteBtn) deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletePlaylist(playlistData.id); });
    }
    return li;
}

function reorderUserPlaylists(draggedInitialIndex, targetVisualIndex) {
    // draggedInitialIndex: original index in userPlaylists
    // targetVisualIndex: the index where it should appear *after* the move, relative to the original array.
    // E.g., to move to the very start, targetVisualIndex = 0.
    // To move to be the item at index K (pushing K and subsequent down), targetVisualIndex = K.

    if (draggedInitialIndex < 0 || draggedInitialIndex >= userPlaylists.length ||
        targetVisualIndex < 0 || targetVisualIndex > userPlaylists.length) { // targetVisualIndex can be userPlaylists.length for appending
        console.warn("Invalid indices for playlist reorder", draggedInitialIndex, targetVisualIndex);
        return;
    }
    
    // If trying to drop in the same spot (no actual move needed)
    // Note: if targetVisualIndex is intended to be "insert before this index"
    // then if draggedInitialIndex === targetVisualIndex, no move.
    // if targetVisualIndex is "insert after this index (targetVisualIndex-1)", then no move if draggedInitialIndex === targetVisualIndex-1
    // Let's assume targetVisualIndex is "insert AT this index".
    if (draggedInitialIndex === targetVisualIndex || draggedInitialIndex === targetVisualIndex -1 && targetVisualIndex > draggedInitialIndex) { // No actual move
        // renderAllPlaylistsView(); // Still re-render to clear any drag artifacts
        return;
    }


    const itemToMove = userPlaylists.splice(draggedInitialIndex, 1)[0];

    // Adjust targetVisualIndex if the removal of itemToMove affected it
    let effectiveTargetIndex = targetVisualIndex;
    if (draggedInitialIndex < targetVisualIndex) {
        effectiveTargetIndex--; // The target position shifted left because an item before it was removed
    }
    
    // Clamp effectiveTargetIndex to be within the bounds of the (now shorter) array for insertion
    effectiveTargetIndex = Math.max(0, Math.min(effectiveTargetIndex, userPlaylists.length));

    userPlaylists.splice(effectiveTargetIndex, 0, itemToMove);

    saveUserPlaylists();
    renderAllPlaylistsView(); // Re-render the overview to reflect the new order and clear drag artifacts
}

function renderSinglePlaylistView(playlistId) {
    if (!playlistDisplayAreaElement || !sidebarTitleElement || !backToPlaylistsBtnElement || !createNewPlaylistBtnElement) return;

    const playlist = getPlaylistById(playlistId);
    if (!playlist) {
        switchSidebarView('all_playlists');
        return;
    }

    let currentScrollTop = 0;
    if (playlistDisplayAreaElement) {
        currentScrollTop = playlistDisplayAreaElement.scrollTop;
    }

    playlistDisplayAreaElement.innerHTML = ''; // Clear previous content
    sidebarTitleElement.textContent = escapeHtml(playlist.name);

    sidebarTitleElement.classList.remove('playing-playlist-title');
    if (currentPlayingPlaylistId === playlistId) {
        sidebarTitleElement.classList.add('playing-playlist-title');
    }

    backToPlaylistsBtnElement.style.display = 'inline-block';
    createNewPlaylistBtnElement.style.display = 'none';

    // +++ CREATE AND APPEND UPLOAD AREA FIRST (IF IT'S THE LOCAL FILES PLAYLIST) +++
    if (playlistId === LOCAL_FILES_PLAYLIST_ID) {
        const uploadArea = document.createElement('div');
        uploadArea.className = 'local-files-upload-area';
        uploadArea.id = 'localFilesDropZone';
        uploadArea.innerHTML = `
            <span class="drop-zone-prompt-local">Drag & drop audio files here, or click to select</span>
        `;
        playlistDisplayAreaElement.appendChild(uploadArea); // <<< ADD IT HERE

        const localFilesInputElement = document.getElementById('localFilesInput');

        if (localFilesInputElement) {
            uploadArea.addEventListener('click', () => localFilesInputElement.click());
            uploadArea.addEventListener('dragover', (event) => {
                event.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            uploadArea.addEventListener('drop', (event) => {
                event.preventDefault();
                uploadArea.classList.remove('drag-over');
                if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    handleLocalFilesSelected(event.dataTransfer.files);
                    if (event.dataTransfer.items) event.dataTransfer.items.clear(); // For Chromium
                    else event.dataTransfer.clearData();
                }
            });
            localFilesInputElement.addEventListener('change', (event) => {
                if (event.target.files && event.target.files.length > 0) {
                    handleLocalFilesSelected(event.target.files);
                }
                if (event.target) event.target.value = ''; // Reset file input
            });
        } else {
            console.error("localFilesInput element not found!");
            uploadArea.innerHTML = `<span class="drop-zone-prompt-local">Error: File input not found.</span>`;
            uploadArea.style.borderColor = "red";
        }
    }
    // +++ END UPLOAD AREA CREATION +++

    if (playlist.songs.length === 0) {
        // If it's the Local Files playlist, the upload area serves as the "empty" state.
        // For other playlists, show the "This playlist is empty" message.
        if (playlistId !== LOCAL_FILES_PLAYLIST_ID) {
            const emptyMessageP = document.createElement('p');
            emptyMessageP.className = 'empty-playlist-message';
            emptyMessageP.textContent = 'This playlist is empty.';
            playlistDisplayAreaElement.appendChild(emptyMessageP);
        }
        // Restore scroll position if needed, though likely 0 for empty.
        if (playlistDisplayAreaElement) {
            playlistDisplayAreaElement.scrollTop = currentScrollTop;
        }
        return;
    }

    const ul = document.createElement('ul');

    playlist.songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.setAttribute('data-song-id', song.id.toString());

        // Local files songs are not draggable to reorder within the playlist FOR NOW
        // If you want them draggable, remove this condition.
        if (playlistId !== LOCAL_FILES_PLAYLIST_ID) {
            li.setAttribute('draggable', true);
            li.addEventListener('dragstart', (event) => handleSongDragStart(event, index, playlistId));
            li.addEventListener('dragover', handleSongDragOver);
            li.addEventListener('drop', (event) => handleSongDrop(event, index, playlistId));
            li.addEventListener('dragend', handleSongDragEnd);
        }


        if (currentPlayingPlaylistId === playlistId && currentPlaylistTrackIndex === index && currentTrack && currentTrack.id === song.id) {
            li.classList.add('playing');
        }
        
        let actionButtonHtml = '';
        if (playlistId === LIKED_SONGS_PLAYLIST_ID) {
            actionButtonHtml = `
                <button class="unlike-song-from-liked-playlist-btn icon-action-btn" title="Remove from Liked Songs">
                    <i class="icon icon-heart-filled"></i> 
                </button>`;
        } else if (playlistId === LOCAL_FILES_PLAYLIST_ID) {
            actionButtonHtml = `
                <button class="remove-local-file-btn icon-action-btn" title="Remove from Local Files">
                    <i class="icon icon-local-file-remove"></i>
                </button>`;
        } else { // User playlist
            actionButtonHtml = `
                <button class="remove-song-from-playlist-btn icon-action-btn" title="Remove from playlist">
                    <i class="icon icon-trash"></i>
                </button>`;
        }

        li.innerHTML = `
            <img src="${song.artwork || 'img/empty_art.png'}" alt="${escapeHtml(song.title)}" class="playlist-item-artwork">
            <div class="playlist-item-info">
                <div class="playlist-item-title">${escapeHtml(song.title)}</div>
                <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
            </div>
            ${actionButtonHtml} 
        `;

        li.addEventListener('click', (e) => {
            // Prevent click if dragging over this item from another operation
            if (e.target.closest('.show-gap-above') || e.target.closest('.show-gap-below')) {
                 return;
            }

            const unlikeButton = e.target.closest('.unlike-song-from-liked-playlist-btn');
            const removeUserPlaylistSongButton = e.target.closest('.remove-song-from-playlist-btn');
            const removeLocalFileButton = e.target.closest('.remove-local-file-btn');

            if (unlikeButton) { 
                e.stopPropagation();
                removeSongFromLikedPlaylist(song.id); 
            } else if (removeLocalFileButton) {
                e.stopPropagation();
                removeSongFromLocalFilesPlaylist(song.id);
            } else if (removeUserPlaylistSongButton) { 
                e.stopPropagation();
                removeSongFromUserPlaylist(playlistId, song.id);
            } else { 
                playSongFromCurrentPlaylist(playlistId, index);
            }
        });
        ul.appendChild(li);
    });
    playlistDisplayAreaElement.appendChild(ul); // Append the song list UL *after* the upload area (if any)

    if (playlistDisplayAreaElement) {
        playlistDisplayAreaElement.scrollTop = currentScrollTop;
    }
}

// --- PLAYBACK LOGIC ADAPTATIONS ---
// When playing a song from a playlist, ensure duration is passed to playSong
function playSongFromCurrentPlaylist(playlistId, songIndexInOriginalPlaylist) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist || !playlist.songs || songIndexInOriginalPlaylist < 0 || songIndexInOriginalPlaylist >= playlist.songs.length) {
        console.warn(`Cannot play song: invalid playlist or index. Playlist ID: ${playlistId}, Index: ${songIndexInOriginalPlaylist}`);
        clearPlaylistContext();
        return;
    }

    const songToPlay = playlist.songs[songIndexInOriginalPlaylist];

    // DEBUGGING (Keep these for now if you want to confirm)
    console.log("playSongFromCurrentPlaylist: Attempting to play:", songToPlay.title);
    console.log("playSongFromCurrentPlaylist: songToPlay object:", JSON.parse(JSON.stringify(songToPlay, (key, value) => key === 'fileObject' ? '[File Object Present]' : value)));
    console.log("playSongFromCurrentPlaylist: songToPlay.isLocalFile:", songToPlay.isLocalFile);
    console.log("playSongFromCurrentPlaylist: songToPlay.fileObject exists:", !!songToPlay.fileObject);


    // ... (shuffle logic, if any, remains the same) ...
    if (isShuffleActive && currentPlayingPlaylistId === playlistId) {
        const upcomingIndex = shuffleUpcomingQueue.findIndex(s => s.id === songToPlay.id);
        if (upcomingIndex > -1) shuffleUpcomingQueue.splice(upcomingIndex, 1);
        const playedIndex = shufflePlayedQueue.findIndex(s => s.id === songToPlay.id);
        if (playedIndex > -1) shufflePlayedQueue.splice(playedIndex, 1);
        shufflePlayedQueue.push(songToPlay);
    } else if (isShuffleActive && currentPlayingPlaylistId !== playlistId) {
        // If starting a new playlist with shuffle active, or switching to a shuffled playlist
        initializeShuffleQueues(playlist.songs, songToPlay.id);
    }
    // ... end shuffle logic ...


    currentPlayingPlaylistId = playlistId;
    currentPlaylistTrackIndex = songIndexInOriginalPlaylist;

    if (typeof playSong === 'function') {
        // ***** THIS IS THE CRITICAL FIX *****
        playSong(
            songToPlay.title,
            songToPlay.artist,
            songToPlay.artwork,
            songToPlay.id.toString(),
            songToPlay.durationSeconds || 0,
            songToPlay.isLocalFile || false,  // Pass the isLocalFile flag
            songToPlay.isLocalFile ? songToPlay.fileObject : null // Pass the fileObject if it's a local file
        );
        // ***** END OF FIX *****
    } else {
        console.error("Global playSong function not found!");
    }

    renderSidebar();
    updatePlaylistControlsVisibility();
}


function playNextTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;

    const playlist = getPlaylistById(currentPlayingPlaylistId);
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        clearPlaylistContext();
        return;
    }

    let songToPlayNext = null; // Object to hold the song to be played

    if (isShuffleActive) {
        console.log("playNextTrackInCurrentPlaylist: SHUFFLE ACTIVE");
        if (shuffleUpcomingQueue.length === 0) {
            if (loopState === 'playlist') {
                console.log("Shuffle: Upcoming empty, looping playlist.");
                initializeShuffleQueues(playlist.songs, null); // Re-init without current track to get full shuffle
                if (shuffleUpcomingQueue.length > 0) {
                    songToPlayNext = shuffleUpcomingQueue.shift();
                    shufflePlayedQueue.push(songToPlayNext);
                } else {
                    clearPlaylistContext(); return;
                }
            } else {
                console.log("Shuffle: Upcoming empty, no loop.");
                showToast("Last track in shuffle. Enable loop to replay.", 3500);
                return;
            }
        } else {
            songToPlayNext = shuffleUpcomingQueue.shift();
            shufflePlayedQueue.push(songToPlayNext);
        }
        
        if (songToPlayNext) {
             // Find original index for currentPlaylistTrackIndex (for UI highlighting, though less critical in shuffle)
            currentPlaylistTrackIndex = playlist.songs.findIndex(s => s.id === songToPlayNext.id);
            console.log(`Shuffle: Next track is "${songToPlayNext.title}". Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
        }

    } else { // Original non-shuffle logic
        console.log("playNextTrackInCurrentPlaylist: Shuffle INACTIVE");
        let nextIndex = currentPlaylistTrackIndex + 1;
        if (nextIndex >= playlist.songs.length) {
            if (loopState === 'playlist') {
                nextIndex = 0;
            } else {
                showToast("End of playlist! Enable loop to continue.", 3500);
                return;
            }
        }
        currentPlaylistTrackIndex = nextIndex;
        songToPlayNext = playlist.songs[currentPlaylistTrackIndex];
    }

    if (songToPlayNext) {
        // +++ CRITICAL DEBUGGING FOR songToPlayNext +++
        console.log("===> Preparing to play (Next):", songToPlayNext.title);
        console.log("     isLocalFile:", songToPlayNext.isLocalFile);
        console.log("     fileObject exists:", !!songToPlayNext.fileObject);
        if (songToPlayNext.fileObject) {
            console.log("     fileObject Name:", songToPlayNext.fileObject.name);
        }
        console.log("     Full songToPlayNext object (minus File):", JSON.parse(JSON.stringify(songToPlayNext, (k,v) => k === 'fileObject' ? '[File Object]' : v)));
        // +++ END CRITICAL DEBUGGING +++

        if (typeof playSong === 'function') {
            playSong(
                songToPlayNext.title,
                songToPlayNext.artist,
                songToPlayNext.artwork,
                songToPlayNext.id.toString(),
                songToPlayNext.durationSeconds || 0,
                songToPlayNext.isLocalFile || false,
                songToPlayNext.isLocalFile ? songToPlayNext.fileObject : null
            );
        }
        renderSidebar(); // To update playing highlight
        updatePlaylistControlsVisibility();
    } else {
        console.log("playNextTrackInCurrentPlaylist: No songToPlayNext determined.");
        // Potentially clear player if truly end of a non-looping shuffle
        if (isShuffleActive && shuffleUpcomingQueue.length === 0 && loopState !== 'playlist') {
             if(typeof clearPlayerStateOnEnd === 'function') clearPlayerStateOnEnd();
        }
    }
}

function playPreviousTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;
    const playlist = getPlaylistById(currentPlayingPlaylistId);
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        clearPlaylistContext();
        return;
    }

    let songToPlayPrev = null;

    if (isShuffleActive) {
        console.log("playPreviousTrackInCurrentPlaylist: SHUFFLE ACTIVE");
        if (shufflePlayedQueue.length < 2) {
            console.log("Shuffle: Not enough played history for previous.");
            return;
        }
        const currentSongFromPlayed = shufflePlayedQueue.pop(); 
        shuffleUpcomingQueue.unshift(currentSongFromPlayed); 
        songToPlayPrev = shufflePlayedQueue[shufflePlayedQueue.length - 1]; 
        
        if (songToPlayPrev) {
            currentPlaylistTrackIndex = playlist.songs.findIndex(s => s.id === songToPlayPrev.id);
            console.log(`Shuffle: Previous track is "${songToPlayPrev.title}". Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
        }
    } else {
        console.log("playPreviousTrackInCurrentPlaylist: Shuffle INACTIVE");
        let prevIndex = currentPlaylistTrackIndex - 1;
        if (prevIndex < 0) {
            if (loopState === 'playlist') {
                prevIndex = playlist.songs.length - 1;
            } else {
                return; 
            }
        }
        currentPlaylistTrackIndex = prevIndex;
        songToPlayPrev = playlist.songs[currentPlaylistTrackIndex];
    }

    if (songToPlayPrev) {
        // +++ CRITICAL DEBUGGING FOR songToPlayPrev +++
        console.log("===> Preparing to play (Previous):", songToPlayPrev.title);
        console.log("     isLocalFile:", songToPlayPrev.isLocalFile);
        console.log("     fileObject exists:", !!songToPlayPrev.fileObject);
        if (songToPlayPrev.fileObject) {
            console.log("     fileObject Name:", songToPlayPrev.fileObject.name);
        }
        console.log("     Full songToPlayPrev object (minus File):", JSON.parse(JSON.stringify(songToPlayPrev, (k,v) => k === 'fileObject' ? '[File Object]' : v)));
        // +++ END CRITICAL DEBUGGING +++

        if (typeof playSong === 'function') {
            playSong(
                songToPlayPrev.title,
                songToPlayPrev.artist,
                songToPlayPrev.artwork,
                songToPlayPrev.id.toString(),
                songToPlayPrev.durationSeconds || 0,
                songToPlayPrev.isLocalFile || false,
                songToPlayPrev.isLocalFile ? songToPlayPrev.fileObject : null
            );
        }
        renderSidebar();
        updatePlaylistControlsVisibility();
    } else {
         console.log("playPreviousTrackInCurrentPlaylist: No songToPlayPrev determined.");
    }
}


function updatePlaylistControlsVisibility() {
    if (!prevBtnElement || !nextBtnElement || !shuffleBtn) return; // Add shuffleBtn check
    const playlist = getPlaylistById(currentPlayingPlaylistId);
    const showControls = playlist && playlist.songs && playlist.songs.length > 0;

    prevBtnElement.style.display = showControls ? 'inline-block' : 'none';
    nextBtnElement.style.display = showControls ? 'inline-block' : 'none';
    shuffleBtn.style.display = showControls ? 'inline-block' : 'none'; // <<< ADD THIS

    if (typeof updateLoopButtonIcon === 'function') updateLoopButtonIcon();
    if (typeof updateShuffleButtonIcon === 'function') updateShuffleButtonIcon(); // <<< ADD THIS
}

function clearPlaylistContext() {
    const wasPlayingPlaylist = currentPlayingPlaylistId !== null;
    currentPlayingPlaylistId = null;
    currentPlaylistTrackIndex = -1;

    isShuffleActive = false;
    shuffleUpcomingQueue = [];
    shufflePlayedQueue = [];
    if(typeof updateShuffleButtonIcon === 'function') updateShuffleButtonIcon();

    // --- MODIFICATION: Explicitly call renderSidebar if the view might need an update ---
    // This ensures that if the overview or a single playlist view was showing the "playing" state,
    // it gets cleared.
    if (wasPlayingPlaylist) { // Only re-render if something *was* playing from a playlist
        renderSidebar(); // This will call either renderAllPlaylistsView or renderSinglePlaylistView
    } else {
        // If nothing was playing from a playlist, but controls still need update (e.g. shuffle toggled off)
        updatePlaylistControlsVisibility();
    }
    // --- END MODIFICATION ---


    // updatePlaylistControlsVisibility(); // Original call - renderSidebar above covers its visual aspect for titles

    if (wasPlayingPlaylist && typeof loopState !== 'undefined' && loopState === 'playlist') {
        loopState = 'none';
        if (typeof updateLoopButtonIcon === 'function') updateLoopButtonIcon();
    }
}

// --- "ADD TO PLAYLIST" MODAL ---
// In openAddToPlaylistModal: ensure currentTrack has durationSeconds
function openAddToPlaylistModal(songDataOverride = null) {
    const songToAdd = songDataOverride || currentTrack;

    // +++ START: ADD THIS GUARD +++
    if (songToAdd && songToAdd.isLocalFile) {
        if (typeof showToast === 'function') {
            showToast("Local files cannot be added to other playlists.", 3500);
        }
        console.log("Attempted to open 'Add to Playlist' modal for a local file. Aborted.");
        return; // Prevent modal from opening
    }
    // +++ END: ADD THIS GUARD +++

    if (!songToAdd || songToAdd.id == null) {
        showGeneralModal("Cannot Add Song", "No song selected or currently playing to add to a playlist.");
        return;
    }
    // ... (rest of the function for handling incomplete song data and populating the modal)
    // The existing logic for songToAdd.durationSeconds etc. can remain.
     if (!songToAdd.title || !songToAdd.artist || !songToAdd.artwork || songToAdd.durationSeconds === undefined) {
        console.error("Song data for modal is incomplete (missing duration?):", songToAdd);
        let duration = songToAdd.durationSeconds;
        if (songToAdd.id === currentTrack.id && currentTrack.durationSeconds !== undefined) {
            duration = currentTrack.durationSeconds;
        } else if (songToAdd.durationSeconds === undefined) {
             console.warn("Duration missing for song in 'Add to Playlist' modal. Defaulting to 0. Song:", songToAdd.title);
             duration = 0;
        }
        
        const completeSongToAdd = {
            ...songToAdd,
            durationSeconds: duration
        };
        
        if (!completeSongToAdd.title || !completeSongToAdd.artist || !completeSongToAdd.artwork) {
            showGeneralModal("Error", "Cannot add song due to incomplete data.");
            return;
        }
        _populateAndShowAddToPlaylistModal(completeSongToAdd);

    } else {
        _populateAndShowAddToPlaylistModal(songToAdd);
    }
}

function closeAddToPlaylistModal() {
    addToPlaylistModalElement.style.display = 'none';
}

async function handleLocalFilesSelected(files) {
    if (!window.jsmediatags) {
        console.error("jsmediatags library not loaded.");
        showToast("Error: Could not process local files (library missing).", 4000);
        return;
    }

    let filesProcessed = 0;
    let filesSuccessfullyAdded = 0;

    showToast(`Processing ${files.length} file(s)...`, 2000);

    for (const file of files) {
        if (!file.type.startsWith('audio/')) {
            console.warn(`Skipping non-audio file: ${file.name}`);
            showToast(`Skipped non-audio file: ${escapeHtml(file.name)}`, 3000);
            filesProcessed++;
            if (filesProcessed === files.length && filesProcessed > filesSuccessfullyAdded) {
                showToast(`Finished processing. ${filesSuccessfullyAdded} audio file(s) added.`, 3000);
            }
            continue;
        }

        try {
            const tagData = await new Promise((resolve, reject) => {
                new window.jsmediatags.Reader(file)
                    .read({
                        onSuccess: (tag) => resolve(tag),
                        onError: (error) => reject(error)
                    });
            });

            let artworkDataUrl = 'img/local_files_song_default.png'; // Default
            if (tagData.tags.picture) {
                const { data, format } = tagData.tags.picture;
                let base64String = "";
                for (let i = 0; i < data.length; i++) {
                    base64String += String.fromCharCode(data[i]);
                }
                artworkDataUrl = `data:${format};base64,${window.btoa(base64String)}`;
            }

            const songId = `local_${file.name.replace(/[^a-zA-Z0-9-_]/g, '')}_${file.size}_${file.lastModified}`;

            const songInfo = {
                id: songId,
                title: tagData.tags.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: tagData.tags.artist || "Unknown Artist",
                album: tagData.tags.album || "Unknown Album",
                artwork: artworkDataUrl,
                artworkLarge: artworkDataUrl, // For local files, small and large art are often the same
                durationSeconds: 0, // Placeholder
                isLocalFile: true,
                originalFileName: file.name,
                fileObject: file
            };

            // Get duration
            const audioEl = document.createElement('audio');
            const durationPromise = new Promise((resolveDuration, rejectDuration) => {
                audioEl.preload = 'metadata';
                audioEl.onloadedmetadata = () => {
                    songInfo.durationSeconds = Math.round(audioEl.duration);
                    URL.revokeObjectURL(audioEl.src);
                    resolveDuration();
                };
                audioEl.onerror = (e) => {
                    console.error("Error loading audio for duration:", file.name, e);
                    URL.revokeObjectURL(audioEl.src);
                    // Resolve anyway, duration will be 0
                    resolveDuration(); 
                };
                audioEl.src = URL.createObjectURL(file);
            });

            await durationPromise;
            addSongToLocalFilesPlaylist(songInfo);
            filesSuccessfullyAdded++;

        } catch (error) {
            console.warn("Could not read tags or get duration for:", file.name, error);
            // Attempt to add with minimal info if tag reading failed
            const songId = `local_err_${file.name.replace(/[^a-zA-Z0-9-_]/g, '')}_${file.size}_${file.lastModified}`;
            const basicSongInfo = {
                id: songId,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Unknown Artist",
                album: "Unknown Album",
                artwork: 'img/local_files_song_default.png',
                artworkLarge: 'img/local_files_song_default.png',
                durationSeconds: 0,
                isLocalFile: true,
                originalFileName: file.name,
                fileObject: file // Keep the file object for potential future use
            };
            // Try to get duration even if tags failed
            const audioEl = document.createElement('audio');
            const basicDurationPromise = new Promise((resolveDuration) => { /* simplified duration fetch */ 
                 audioEl.preload = 'metadata';
                 audioEl.onloadedmetadata = () => { 
                     basicSongInfo.durationSeconds = Math.round(audioEl.duration);
                     URL.revokeObjectURL(audioEl.src); resolveDuration();
                 };
                 audioEl.onerror = () => { URL.revokeObjectURL(audioEl.src); resolveDuration(); };
                 audioEl.src = URL.createObjectURL(file);
            });
            await basicDurationPromise;
            addSongToLocalFilesPlaylist(basicSongInfo);
            filesSuccessfullyAdded++; // Still count as "added" to give user feedback
            showToast(`Added "${escapeHtml(basicSongInfo.title)}" with limited info.`, 3500);
        }
        filesProcessed++;
        if (filesProcessed === files.length && filesProcessed > 0) {
             showToast(`Finished processing ${filesProcessed} file(s). ${filesSuccessfullyAdded} added.`, 3500);
        }
    }
}

// --- PLAYLIST MANAGEMENT UI HANDLERS ---
function handleCreateNewPlaylist() {
    if (typeof openCreatePlaylistModal === 'function') { // openCreatePlaylistModal is from modals.js
        openCreatePlaylistModal();
    } else {
        console.error("openCreatePlaylistModal function not found!");
        // Fallback to prompt if modal function isn't available
        const playlistNameFallback = prompt("Enter name for new playlist (modal error):", "My Playlist");
        if (playlistNameFallback && playlistNameFallback.trim() !== "") {
            createPlaylist(playlistNameFallback.trim());
            renderAllPlaylistsView();
        } else if (playlistNameFallback !== null) {
            alert("Playlist name cannot be empty.");
        }
    }
}

// Renamed from handleRenamePlaylist
function handleEditPlaylist(playlistIdToEdit) {
    const playlist = getPlaylistById(playlistIdToEdit);
    if (!playlist || playlist.id === LIKED_SONGS_PLAYLIST_ID || playlist.id === LOCAL_FILES_PLAYLIST_ID) {
        console.warn("Attempted to edit a special playlist or non-existent playlist.");
        if(typeof showToast === 'function') showToast("This playlist cannot be edited.", 3000);
        return;
    }

    if (typeof openEditPlaylistModal === 'function') { // openEditPlaylistModal is from modals.js
        openEditPlaylistModal(playlist.id, playlist.name); // Pass ID and current name
    } else {
        console.error("openEditPlaylistModal function not found!");
        // Fallback could be more complex here, maybe just rename via prompt
        const newNameFallback = prompt(`Enter new name for "${escapeHtml(playlist.name)}":`, playlist.name);
        if (newNameFallback && newNameFallback.trim() !== "" && newNameFallback.trim() !== playlist.name) {
            updatePlaylistDetails(playlist.id, newNameFallback.trim(), playlist.customArtwork); // Pass existing artwork
        } else if (newNameFallback && newNameFallback.trim() === "") {
            if(typeof showGeneralModal === 'function') showGeneralModal("Invalid Name", "Playlist name cannot be empty.");
            else alert("Playlist name cannot be empty.");
        }
    }
}

// --- DRAG AND DROP FOR SONGS (within a single playlist view) ---
let draggedSongIndex = null;
let draggedSongElement = null;
let dragOverPlaylistIdContext = null; // Stores playlist ID during drag operation

// New state variables for playlist dragging
let draggedPlaylistIndex = null;     // Index in the userPlaylists array
let draggedPlaylistElement = null;

function handleSongDragStart(event, index, playlistId) {
    draggedSongIndex = index;
    draggedSongElement = event.target;
    dragOverPlaylistIdContext = playlistId; // Set context for this drag operation
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString()); // Standard practice
    setTimeout(() => {
        if (draggedSongElement) draggedSongElement.classList.add('dragging');
    }, 0);
}

function handleSongDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const currentTargetLi = event.target.closest('.playlist-item');

    if (!currentTargetLi || !draggedSongElement || currentTargetLi === draggedSongElement ||
        !playlistDisplayAreaElement.contains(currentTargetLi)) { // Ensure target is within the display area
        return;
    }
    clearGapIndicators(); // Clear previous gaps
    const rect = currentTargetLi.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    currentTargetLi.classList.add(offsetY < rect.height / 2 ? 'show-gap-above' : 'show-gap-below');
}

function handleSongDrop(event, indexOfTheItemDroppedOn, playlistIdForDropTarget) {
    event.preventDefault();
    clearGapIndicators();

    if (draggedSongIndex === null || dragOverPlaylistIdContext !== playlistIdForDropTarget ||
        dragOverPlaylistIdContext !== selectedPlaylistToViewId) {
        // Dragged from different playlist context or something went wrong
        if (draggedSongElement) draggedSongElement.classList.remove('dragging');
        draggedSongIndex = null;
        draggedSongElement = null;
        dragOverPlaylistIdContext = null;
        return;
    }

    // At this point, playlistIdForDropTarget is the same as dragOverPlaylistIdContext
    const currentReorderingPlaylistId = dragOverPlaylistIdContext;

    reorderSongInPlaylist(currentReorderingPlaylistId, draggedSongIndex, indexOfTheItemDroppedOn);
    // reorderSongInPlaylist now handles saving and re-rendering the single playlist view.
    // The re-render will also clean up dragging classes.

    // Reset state variables in handleSongDragEnd
}

function handleSongDragEnd(event) {
    clearGapIndicators();
    if (draggedSongElement) {
        draggedSongElement.classList.remove('dragging');
    }
    // Failsafe: remove dragging from all items if something went wrong
    const allItems = playlistDisplayAreaElement.querySelectorAll('.playlist-item.dragging');
    allItems.forEach(item => item.classList.remove('dragging'));

    draggedSongIndex = null;
    draggedSongElement = null;
    dragOverPlaylistIdContext = null;
}

function clearGapIndicators() {
    const items = playlistDisplayAreaElement.querySelectorAll('.playlist-item');
    items.forEach(item => {
        item.classList.remove('show-gap-above', 'show-gap-below');
    });
}

// --- DRAG AND DROP FOR PLAYLIST OVERVIEW ITEMS ---

function handlePlaylistDragStart(event, playlistId) {
    draggedPlaylistIndex = userPlaylists.findIndex(p => p.id === playlistId);
    // Explicitly prevent dragging "Liked Songs" even if draggable was somehow set
    if (draggedPlaylistIndex === -1 || playlistId === LIKED_SONGS_PLAYLIST_ID) {
        event.preventDefault();
        return;
    }

    draggedPlaylistElement = event.target.closest('.playlist-overview-item');
    if (!draggedPlaylistElement) { // Should not happen if event is on the li
        event.preventDefault();
        return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playlistId); // Store playlistId

    setTimeout(() => { // Timeout to allow browser to render drag image before class change
        if (draggedPlaylistElement) draggedPlaylistElement.classList.add('dragging');
    }, 0);
}

function handlePlaylistDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetLiElement = event.target.closest('.playlist-overview-item');

    // Do not allow dropping on "Liked Songs" or on the item being dragged
    if (!targetLiElement || targetLiElement === draggedPlaylistElement || 
        targetLiElement.getAttribute('data-playlist-id') === LIKED_SONGS_PLAYLIST_ID) {
        clearPlaylistGapIndicators(); // Clear any gaps if hovering over an invalid target
        return;
    }

    clearPlaylistGapIndicators(); // Clear previous gaps

    const rect = targetLiElement.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const middleY = rect.height / 2;

    if (offsetY < middleY) {
        targetLiElement.classList.add('show-gap-above');
    } else {
        targetLiElement.classList.add('show-gap-below');
    }
}

function handlePlaylistDrop(event, targetPlaylistIdOnDrop) {
    event.preventDefault();
    clearPlaylistGapIndicators();

    if (!draggedPlaylistElement || draggedPlaylistIndex === -1 || targetPlaylistIdOnDrop === LIKED_SONGS_PLAYLIST_ID) {
        // Invalid drag operation or dropping on "Liked Songs"
        if (draggedPlaylistElement) draggedPlaylistElement.classList.remove('dragging');
        draggedPlaylistIndex = -1;
        draggedPlaylistElement = null;
        return;
    }

    const targetLiElement = event.target.closest('.playlist-overview-item');
    if (!targetLiElement) { // Should not happen if drop event is on a valid target
        if (draggedPlaylistElement) draggedPlaylistElement.classList.remove('dragging');
        draggedPlaylistIndex = -1;
        draggedPlaylistElement = null;
        return;
    }

    const targetPlaylistIndexInUserPlaylists = userPlaylists.findIndex(p => p.id === targetPlaylistIdOnDrop);
    if (targetPlaylistIndexInUserPlaylists === -1) { // Target playlist not found (error)
        if (draggedPlaylistElement) draggedPlaylistElement.classList.remove('dragging');
        draggedPlaylistIndex = -1;
        draggedPlaylistElement = null;
        return;
    }

    // Determine target insert position based on drop location relative to the target item's middle
    let visualTargetIndex = targetPlaylistIndexInUserPlaylists; // This is the index of the item we are dropping ONTO

    const rect = targetLiElement.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const middleY = rect.height / 2;

    if (offsetY > middleY) { // Dropped on the lower half, so insert AFTER this item
        visualTargetIndex++;
    }
    // If dropped on upper half, visualTargetIndex remains the index of the target item (insert BEFORE it)

    reorderUserPlaylists(draggedPlaylistIndex, visualTargetIndex);
    // Drag end will clean up remaining state and classes.
    // reorderUserPlaylists will call renderAllPlaylistsView which also helps clean up.
}

function handlePlaylistDragEnd(event) {
    clearPlaylistGapIndicators();
    if (draggedPlaylistElement) {
        draggedPlaylistElement.classList.remove('dragging');
    }
    // Failsafe removal
    const allDraggingItems = playlistDisplayAreaElement.querySelectorAll('.playlist-overview-item.dragging');
    allDraggingItems.forEach(item => item.classList.remove('dragging'));

    draggedPlaylistIndex = -1;
    draggedPlaylistElement = null;
}

function clearPlaylistGapIndicators() {
    const items = playlistDisplayAreaElement.querySelectorAll('.playlist-overview-item');
    items.forEach(item => {
        item.classList.remove('show-gap-above', 'show-gap-below');
    });
}

// --- SHUFFLE HELPER ---
function shuffleArray(array) {
    let newArray = [...array]; // Create a copy
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// --- SHUFFLE QUEUE MANAGEMENT ---
function initializeShuffleQueues(playlistSongs, currentlyPlayingSongId = null) {
    if (!isShuffleActive || !playlistSongs || playlistSongs.length === 0) {
        shuffleUpcomingQueue = [];
        shufflePlayedQueue = [];
        isShuffleActive = false; // Turn off if no songs
        if (typeof updateShuffleButtonIcon === 'function') updateShuffleButtonIcon();
        return;
    }

    // Create a queue of song *objects* or just *IDs*. IDs are simpler for queue management.
    // Let's use song objects for now to easily access details later.
    shuffleUpcomingQueue = shuffleArray(playlistSongs);
    shufflePlayedQueue = [];

    if (currentlyPlayingSongId) {
        const currentSongIndexInUpcoming = shuffleUpcomingQueue.findIndex(s => s.id === currentlyPlayingSongId);
        if (currentSongIndexInUpcoming > -1) {
            const currentSongObject = shuffleUpcomingQueue.splice(currentSongIndexInUpcoming, 1)[0];
            shufflePlayedQueue.push(currentSongObject); // Current song is first in played queue
        } else {
            // If current song wasn't in the list for some reason, just proceed.
        }
    }
    console.log("Shuffle queues initialized. Upcoming:", shuffleUpcomingQueue.map(s=>s.title), "Played:", shufflePlayedQueue.map(s=>s.title));
}


// --- Helper Function to Format Duration (same as your previous request) ---
function formatPlaylistDuration(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) { // Changed to <= 0
        return "0s";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let durationStr = "";
    if (hours > 0) {
        durationStr += `${hours}hr`;
        if (minutes > 0) {
            durationStr += ` ${minutes}m`;
        }
    } else if (minutes > 0) {
        durationStr += `${minutes}m`;
        if (seconds > 0) { // Only show seconds if there are minutes but no hours
            durationStr += ` ${seconds}s`;
        }
    } else if (seconds > 0) {
        durationStr += `${seconds}s`;
    } else {
        return "0s"; // Should ideally not be reached if totalSeconds > 0
    }
    return durationStr.trim();
}

// Helper for openAddToPlaylistModal to avoid code duplication
function _populateAndShowAddToPlaylistModal(songToAddWithDuration) {
    if (!modalPlaylistListElement || !addToPlaylistModalElement) {
        console.error("Add to playlist modal elements not found.");
        return;
    }
    modalPlaylistListElement.innerHTML = '';

    const createClickHandler = (addFunction, playlistContextId = null) => {
        return () => {
            addFunction(playlistContextId ? playlistContextId : songToAddWithDuration, playlistContextId ? songToAddWithDuration : undefined);
            closeAddToPlaylistModal();
        };
    };
    
    // Option to add to Liked Songs
    const likedItem = document.createElement('div');
    likedItem.className = 'modal-playlist-item';
    likedItem.textContent = "Liked Songs";
    likedItem.onclick = () => {
        addSongToLikedPlaylist({ // Pass the full song object
            id: songToAddWithDuration.id.toString(),
            title: songToAddWithDuration.title,
            artist: songToAddWithDuration.artist,
            artwork: songToAddWithDuration.artwork,
            durationSeconds: songToAddWithDuration.durationSeconds
        });
        closeAddToPlaylistModal();
    };
    modalPlaylistListElement.appendChild(likedItem);

    userPlaylists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'modal-playlist-item';
        playlistItem.textContent = escapeHtml(playlist.name);
        playlistItem.onclick = () => {
            addSongToUserPlaylist(playlist.id, { // Pass the full song object
                id: songToAddWithDuration.id.toString(),
                title: songToAddWithDuration.title,
                artist: songToAddWithDuration.artist,
                artwork: songToAddWithDuration.artwork,
                durationSeconds: songToAddWithDuration.durationSeconds
            });
            closeAddToPlaylistModal();
        };
        modalPlaylistListElement.appendChild(playlistItem);
    });

    if (modalPlaylistListElement.children.length === 1 && userPlaylists.length === 0) {
         const noUserPlaylistsMsg = document.createElement('p');
         noUserPlaylistsMsg.textContent = 'No other playlists. Create one first!';
         noUserPlaylistsMsg.style.textAlign = 'center';
         noUserPlaylistsMsg.style.marginTop = '10px';
         modalPlaylistListElement.appendChild(noUserPlaylistsMsg);
    }

    addToPlaylistModalElement.style.display = 'flex';
}

// Helper to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        // console.warn("escapeHtml called with non-string:", unsafe);
        return unsafe === null || typeof unsafe === 'undefined' ? '' : String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&")
         .replace(/</g, "<")
         .replace(/>/g, ">")
         .replace(/"/g, '"')
         .replace(/'/g, "'")
}