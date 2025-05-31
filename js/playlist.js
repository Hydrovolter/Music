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
    if (!likedPlaylist.find(s => s.id === songData.id)) {
        likedPlaylist.push(songData);
        saveLikedPlaylist();

        if (typeof showToast === 'function') {
            const message = `"${escapeHtml(songData.title)}" added to Liked Songs!`;
            showToast(message, 3000);
        }

        // --- BEGIN MODIFICATION ---
        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LIKED_SONGS_PLAYLIST_ID) {
            renderSinglePlaylistView(LIKED_SONGS_PLAYLIST_ID);
        } else if (currentSidebarView === 'all_playlists') { // If viewing the overview
            renderAllPlaylistsView(); // Refresh the overview
        }
        // --- END MODIFICATION ---

        updateLikeButtonState(true);
    } else {
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
    if (!currentTrack || currentTrack.id == null) {
        console.warn("No current track to like/unlike, or track has no ID.");
        return;
    }
    if (isSongLiked(currentTrack.id)) {
        removeSongFromLikedPlaylist(currentTrack.id);
    } else {
        addSongToLikedPlaylist({
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            artwork: currentTrack.artwork // Ensure this is the 100x100 artwork
        });
    }
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
        if (!playlist.songs.find(s => s.id === songData.id)) {
            playlist.songs.push(songData);
            saveUserPlaylists();

            if (typeof showToast === 'function') {
                const message = `"${escapeHtml(songData.title)}" added to ${escapeHtml(playlist.name)}!`;
                showToast(message, 3000);
            }

            // --- BEGIN MODIFICATION ---
            if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                renderSinglePlaylistView(playlistId);
            } else if (currentSidebarView === 'all_playlists') { // If viewing the overview
                renderAllPlaylistsView(); // Refresh the overview
            }
            // --- END MODIFICATION ---

            console.log(`Song "${songData.title}" added to playlist "${playlist.name}"`);
        } else {
            if (typeof showToast === 'function') {
                const message = `"${escapeHtml(songData.title)}" is already in ${escapeHtml(playlist.name)}.`;
                showToast(message, 3000);
            }
        }
    } else {
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

function createPlaylistOverviewItem(playlistData) {
    const li = document.createElement('li');
    li.className = 'playlist-overview-item';
    li.setAttribute('data-playlist-id', playlistData.id);

    const songsText = playlistData.songs.length === 1 ? "1 song" : `${playlistData.songs.length} songs`;
    let artworkSrc;

    if (playlistData.id === LIKED_SONGS_PLAYLIST_ID) {
        artworkSrc = 'img/liked_songs.png';
    } else {
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

    // --- BEGIN MODIFICATION: Add class if this is the playing playlist ---
    let nameDisplayClasses = "playlist-overview-item-name";
    if (currentPlayingPlaylistId === playlistData.id) {
        nameDisplayClasses += " playing-playlist-title";
    }
    let nameDisplay = `<div class="${nameDisplayClasses}">${escapeHtml(playlistData.name)}</div>`;
    // --- END MODIFICATION ---

    let actionsHtml = '';
    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID) {
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
            <div class="playlist-overview-item-count">${songsText}</div>
        </div>
        ${actionsHtml}
    `;

    // ... (rest of the event listeners in this function remain the same)
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


    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID) {
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

    playlistDisplayAreaElement.innerHTML = '';
    sidebarTitleElement.textContent = escapeHtml(playlist.name);

    // --- BEGIN MODIFICATION: Add class to sidebar title if it's the playing playlist ---
    sidebarTitleElement.classList.remove('playing-playlist-title'); // Remove first to handle deselection
    if (currentPlayingPlaylistId === playlistId) {
        sidebarTitleElement.classList.add('playing-playlist-title');
    }
    // --- END MODIFICATION ---

    backToPlaylistsBtnElement.style.display = 'inline-block';
    createNewPlaylistBtnElement.style.display = 'none';

    // ... (rest of renderSinglePlaylistView, including song list rendering, remains the same)
    if (playlist.songs.length === 0) {
        playlistDisplayAreaElement.innerHTML = `<p class="empty-playlist-message">This playlist is empty.</p>`;
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
        li.setAttribute('draggable', true); 

        if (currentPlayingPlaylistId === playlistId && currentPlaylistTrackIndex === index && currentTrack && currentTrack.id === song.id) {
            li.classList.add('playing');
        }
        
        let actionButtonHtml = '';
        if (playlistId === LIKED_SONGS_PLAYLIST_ID) {
            actionButtonHtml = `
                <button class="unlike-song-from-liked-playlist-btn icon-action-btn" title="Remove from Liked Songs">
                    <i class="icon icon-heart-filled"></i> 
                </button>`;
        } else {
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
            const unlikeButton = e.target.closest('.unlike-song-from-liked-playlist-btn');
            const removeButton = e.target.closest('.remove-song-from-playlist-btn');

            if (unlikeButton) { 
                e.stopPropagation();
                removeSongFromLikedPlaylist(song.id); 
            } else if (removeButton) { 
                e.stopPropagation();
                removeSongFromUserPlaylist(playlistId, song.id);
            } else { 
                playSongFromCurrentPlaylist(playlistId, index);
            }
        });

        li.addEventListener('dragstart', (event) => handleSongDragStart(event, index, playlistId));
        li.addEventListener('dragover', handleSongDragOver);
        li.addEventListener('drop', (event) => handleSongDrop(event, index, playlistId));
        li.addEventListener('dragend', handleSongDragEnd);

        ul.appendChild(li);
    });
    playlistDisplayAreaElement.appendChild(ul);

    if (playlistDisplayAreaElement) {
        playlistDisplayAreaElement.scrollTop = currentScrollTop;
    }
}

// --- PLAYBACK LOGIC ADAPTATIONS ---
function playSongFromCurrentPlaylist(playlistId, songIndexInOriginalPlaylist) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist || !playlist.songs || songIndexInOriginalPlaylist < 0 || songIndexInOriginalPlaylist >= playlist.songs.length) {
        console.warn(`Cannot play song: invalid playlist or index. Playlist ID: ${playlistId}, Index: ${songIndexInOriginalPlaylist}`);
        clearPlaylistContext();
        return;
    }

    const songToPlay = playlist.songs[songIndexInOriginalPlaylist];

    if (isShuffleActive && currentPlayingPlaylistId === playlistId) {
        // User manually selected a song from the playlist view while shuffle is on.
        // This song "jumps the queue" and becomes the current one.
        // It should be removed from upcoming and added to played.

        const upcomingIndex = shuffleUpcomingQueue.findIndex(s => s.id === songToPlay.id);
        if (upcomingIndex > -1) {
            shuffleUpcomingQueue.splice(upcomingIndex, 1);
        }

        const playedIndex = shufflePlayedQueue.findIndex(s => s.id === songToPlay.id);
        if (playedIndex > -1) {
            // If it was already played, remove it to avoid duplicate in playedQueue later
            // (though push will add it as most recent)
            shufflePlayedQueue.splice(playedIndex, 1);
        }
        shufflePlayedQueue.push(songToPlay); // Add to end of played queue (most recent)
        console.log(`Shuffle: User selected "${songToPlay.title}". Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
    } else if (isShuffleActive && currentPlayingPlaylistId !== playlistId) {
        // User started a new playlist while shuffle was on from a previous one.
        // Or, shuffle was just turned on by toggleShuffle before this call (less likely path here)
        initializeShuffleQueues(playlist.songs, songToPlay.id);
    }
    // If shuffle is NOT active OR shuffle was just initialized for THIS song:
    // The currentTrack, currentPlayingPlaylistId, currentPlaylistTrackIndex will be set below.

    const previousPlayingPlaylistId = currentPlayingPlaylistId;
    currentPlayingPlaylistId = playlistId;
    currentPlaylistTrackIndex = songIndexInOriginalPlaylist; // Always store original index

    if (typeof playSong === 'function') {
        playSong(songToPlay.title, songToPlay.artist, songToPlay.artwork, songToPlay.id.toString());
    } else {
        console.error("Global playSong function not found!");
    }

    renderSidebar();
    updatePlaylistControlsVisibility(); // This now also updates shuffle button visibility
}

function playNextTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;

    const playlist = getPlaylistById(currentPlayingPlaylistId);
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        clearPlaylistContext();
        return;
    }

    if (isShuffleActive) {
        if (shuffleUpcomingQueue.length === 0) {
            if (loopState === 'playlist') {
                console.log("Shuffle: Upcoming empty, looping playlist.");
                initializeShuffleQueues(playlist.songs);
                 // After re-initializing, check if there are still songs to play
                if (shuffleUpcomingQueue.length > 0) {
                    const nextSongToPlay = shuffleUpcomingQueue.shift();
                    shufflePlayedQueue.push(nextSongToPlay);
                    const originalIndexOfNextSong = playlist.songs.findIndex(s => s.id === nextSongToPlay.id);
                    currentPlaylistTrackIndex = originalIndexOfNextSong;
                    currentPlayingPlaylistId = playlist.id;
                    console.log(`Shuffle: Playing next "${nextSongToPlay.title}" after loop. Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
                    if (typeof playSong === 'function') {
                        playSong(nextSongToPlay.title, nextSongToPlay.artist, nextSongToPlay.artwork, nextSongToPlay.id.toString());
                    }
                    renderSidebar();
                    updatePlaylistControlsVisibility();
                    return; // Important: exit after handling the looped shuffle
                } else {
                    // Playlist became empty even after trying to loop shuffle (e.g. 0 songs playlist)
                    clearPlaylistContext();
                    return;
                }
            } else {
                console.log("Shuffle: Upcoming empty, no loop. Showing toast.");
                if (typeof showToast === 'function') { // <<<< ADDED TOAST
                    showToast("Last track in shuffle. Enable loop to replay.", 3500);
                }
                return; // Stop here, don't proceed to play
            }
        }

        // This block is for when shuffleUpcomingQueue.length > 0 (normal shuffle next)
        const nextSongToPlay = shuffleUpcomingQueue.shift();
        shufflePlayedQueue.push(nextSongToPlay);
        const originalIndexOfNextSong = playlist.songs.findIndex(s => s.id === nextSongToPlay.id);
        currentPlaylistTrackIndex = originalIndexOfNextSong;
        currentPlayingPlaylistId = playlist.id;
        console.log(`Shuffle: Playing next "${nextSongToPlay.title}". Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
        if (typeof playSong === 'function') {
            playSong(nextSongToPlay.title, nextSongToPlay.artist, nextSongToPlay.artwork, nextSongToPlay.id.toString());
        }
        renderSidebar();
        updatePlaylistControlsVisibility();

    } else { // Original non-shuffle logic
        let nextIndex = currentPlaylistTrackIndex + 1;
        if (nextIndex >= playlist.songs.length) {
            if (loopState === 'playlist') {
                nextIndex = 0;
            } else {
                console.log("Playlist: Last track, no loop. Showing toast.");
                if (typeof showToast === 'function') { // <<<< ADDED TOAST
                    showToast("End of playlist! Enable loop to continue.", 3500);
                }
                return; // Stop here, don't proceed to play
            }
        }
        playSongFromCurrentPlaylist(currentPlayingPlaylistId, nextIndex);
    }
}

function playPreviousTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;

    const playlist = getPlaylistById(currentPlayingPlaylistId);
     if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        clearPlaylistContext();
        return;
    }

    if (isShuffleActive) {
        if (shufflePlayedQueue.length < 2) { // Need at least 2 songs in played: one current, one previous
            console.log("Shuffle: Not enough played history to go previous.");
            return; // Or play the first song of the shuffle cycle if desired
        }

        const currentSongFromPlayed = shufflePlayedQueue.pop(); // Remove current from played
        shuffleUpcomingQueue.unshift(currentSongFromPlayed); // Add it back to start of upcoming

        const previousSongToPlay = shufflePlayedQueue[shufflePlayedQueue.length - 1]; // Peek at new last (actual prev)
        
        const originalIndexOfPrevSong = playlist.songs.findIndex(s => s.id === previousSongToPlay.id);

        currentPlaylistTrackIndex = originalIndexOfPrevSong;
        currentPlayingPlaylistId = playlist.id;

        console.log(`Shuffle: Playing previous "${previousSongToPlay.title}". Upcoming: ${shuffleUpcomingQueue.length}, Played: ${shufflePlayedQueue.length}`);
        if (typeof playSong === 'function') {
            playSong(previousSongToPlay.title, previousSongToPlay.artist, previousSongToPlay.artwork, previousSongToPlay.id.toString());
        }
        renderSidebar();
        updatePlaylistControlsVisibility();

    } else { // Original non-shuffle logic
        let prevIndex = currentPlaylistTrackIndex - 1;
        if (prevIndex < 0) {
            // If loop playlist is active, wrap to last song, otherwise stop at first.
            if (loopState === 'playlist') {
                 prevIndex = playlist.songs.length - 1;
            } else {
                return; // Don't wrap if not looping playlist
            }
        }
        playSongFromCurrentPlaylist(currentPlayingPlaylistId, prevIndex);
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
function openAddToPlaylistModal(songDataOverride = null) {
    const songToAdd = songDataOverride || currentTrack; // Use override if provided, else global currentTrack

    if (!songToAdd || songToAdd.id == null) { // Check songToAdd.id
        showGeneralModal("Cannot Add Song", "No song selected or currently playing to add to a playlist.");
        return;
    }
    // Ensure songToAdd has all necessary properties (id, title, artist, artwork)
    if (!songToAdd.title || !songToAdd.artist || !songToAdd.artwork) {
        console.error("Song data for modal is incomplete:", songToAdd);
        showGeneralModal("Error", "Cannot add song due to incomplete data.");
        return;
    }


    modalPlaylistListElement.innerHTML = '';

    // Option to add to Liked Songs
    const likedItem = document.createElement('div');
    likedItem.className = 'modal-playlist-item';
    likedItem.textContent = "Liked Songs";
    likedItem.onclick = () => {
        // Use the data from songToAdd
        addSongToLikedPlaylist({
            id: songToAdd.id.toString(),
            title: songToAdd.title,
            artist: songToAdd.artist,
            artwork: songToAdd.artwork
        });
        closeAddToPlaylistModal();
    };
    modalPlaylistListElement.appendChild(likedItem);

    userPlaylists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'modal-playlist-item';
        playlistItem.textContent = escapeHtml(playlist.name);
        playlistItem.onclick = () => {
            // Use the data from songToAdd
            addSongToUserPlaylist(playlist.id, {
                id: songToAdd.id.toString(),
                title: songToAdd.title,
                artist: songToAdd.artist,
                artwork: songToAdd.artwork
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

function closeAddToPlaylistModal() {
    addToPlaylistModalElement.style.display = 'none';
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
    if (!playlist || playlist.id === LIKED_SONGS_PLAYLIST_ID) {
        console.warn("Attempted to edit Liked Songs or non-existent playlist.");
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