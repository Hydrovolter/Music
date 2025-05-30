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
    addToPlaylistBtnElement.addEventListener('click', openAddToPlaylistModal);
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
        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LIKED_SONGS_PLAYLIST_ID) {
            renderSinglePlaylistView(LIKED_SONGS_PLAYLIST_ID);
        }
        // If Liked Songs playlist is currently playing, this new song is now at the end of its queue.
        // No specific index adjustment needed here unless we want to auto-play it.
        updateLikeButtonState(true); // Update the like button for the current track
    }
}

function removeSongFromLikedPlaylist(songId) {
    const initialLength = likedPlaylist.length;
    const songBeingRemoved = likedPlaylist.find(s => s.id === songId);

    likedPlaylist = likedPlaylist.filter(s => s.id !== songId);

    if (likedPlaylist.length < initialLength) {
        saveLikedPlaylist();
        if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === LIKED_SONGS_PLAYLIST_ID) {
            renderSinglePlaylistView(LIKED_SONGS_PLAYLIST_ID);
        }
        if (currentPlayingPlaylistId === LIKED_SONGS_PLAYLIST_ID && currentTrack && currentTrack.id === songId) {
            // If the removed song was the one playing from liked playlist
            // The player.js onPlayerStateChange will handle song end. If more songs, it might play next.
            // We might need to adjust currentPlaylistTrackIndex if the removed song was *before* the current one.
            // For simplicity, let's assume if current playing is removed, player stops or plays next if available.
            // A more robust way would be to re-calculate currentPlaylistTrackIndex
            const oldPlayingSongId = currentTrack.id;
            const newIndex = likedPlaylist.findIndex(s => s.id === oldPlayingSongId);
            if (newIndex === -1 && likedPlaylist.length > 0 && currentPlaylistTrackIndex >= likedPlaylist.length) {
                // If the song was last and removed, try to point to new last or 0
                currentPlaylistTrackIndex = Math.max(0, likedPlaylist.length - 1);
            } else if (newIndex !== -1) {
                 currentPlaylistTrackIndex = newIndex; // If it was another song.
            } else if (likedPlaylist.length === 0) {
                clearPlaylistContext();
            }
        }
        if (currentTrack && currentTrack.id === songId) {
            updateLikeButtonState(false);
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
    const stored = localStorage.getItem(USER_PLAYLISTS_STORAGE_KEY); // From init.js
    userPlaylists = stored ? JSON.parse(stored) : [];
}

function saveUserPlaylists() {
    localStorage.setItem(USER_PLAYLISTS_STORAGE_KEY, JSON.stringify(userPlaylists));
}

function createPlaylist(name) {
    const newPlaylist = {
        id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || "New Playlist",
        songs: [],
        // artwork: 'img/empty_art.png' // Placeholder for future custom artwork
    };
    userPlaylists.push(newPlaylist);
    saveUserPlaylists();
    return newPlaylist;
}

function getPlaylistById(playlistId) {
    if (playlistId === LIKED_SONGS_PLAYLIST_ID) {
        return { id: LIKED_SONGS_PLAYLIST_ID, name: "Liked Songs", songs: [...likedPlaylist] }; // Return a copy for safety
    }
    return userPlaylists.find(p => p.id === playlistId);
}

function renamePlaylist(playlistId, newName) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist && newName.trim() !== "") {
        playlist.name = newName.trim();
        saveUserPlaylists();
        if (currentSidebarView === 'all_playlists') {
            renderAllPlaylistsView();
        } else if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
            sidebarTitleElement.textContent = escapeHtml(playlist.name);
        }
    }
}

function deletePlaylist(playlistId) {
    const playlistName = getPlaylistById(playlistId)?.name || "this playlist";
    if (!confirm(`Are you sure you want to delete playlist "${escapeHtml(playlistName)}"?`)) {
        return;
    }

    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
    saveUserPlaylists();

    if (selectedPlaylistToViewId === playlistId) {
        switchSidebarView('all_playlists');
    } else if (currentSidebarView === 'all_playlists') {
        renderAllPlaylistsView();
    }

    if (currentPlayingPlaylistId === playlistId) {
        clearPlaylistContext(); // Stop playback from this playlist
        // Consider resetting player UI more explicitly here if needed
        if (typeof playSong === 'function') { // If playSong is global
             // playSong("Not Playing", "Not Playing", "img/empty_art.png", null); // Reset player
        }
    }
}

function addSongToUserPlaylist(playlistId, songData) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist && songData && songData.id) {
        if (!playlist.songs.find(s => s.id === songData.id)) {
            playlist.songs.push(songData);
            saveUserPlaylists();
            if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                renderSinglePlaylistView(playlistId);
            }
            console.log(`Song "${songData.title}" added to playlist "${playlist.name}"`);
        } else {
            alert(`Song "${songData.title}" is already in playlist "${playlist.name}".`);
        }
    }
}

function removeSongFromUserPlaylist(playlistId, songId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (playlist) {
        const initialLength = playlist.songs.length;
        playlist.songs = playlist.songs.filter(s => s.id !== songId);
        if (playlist.songs.length < initialLength) {
            saveUserPlaylists();
            if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId === playlistId) {
                renderSinglePlaylistView(playlistId);
            }
            // If the removed song was playing from this user playlist
            if (currentPlayingPlaylistId === playlistId && currentTrack && currentTrack.id === songId) {
                // More complex logic similar to removeSongFromLikedPlaylist might be needed here
                // For now, player.js will handle the ENDED state.
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
    playlistDisplayAreaElement.innerHTML = '';
    sidebarTitleElement.textContent = "Your Playlists";
    backToPlaylistsBtnElement.style.display = 'none';
    createNewPlaylistBtnElement.style.display = 'inline-block';

    const ul = document.createElement('ul');
    // ul.className = 'playlist-list-overview'; // Ensure this class is defined in CSS

    const likedSongsData = { id: LIKED_SONGS_PLAYLIST_ID, name: "Liked Songs", songs: likedPlaylist };
    ul.appendChild(createPlaylistOverviewItem(likedSongsData));

    userPlaylists.forEach(playlist => {
        ul.appendChild(createPlaylistOverviewItem(playlist));
    });

    playlistDisplayAreaElement.appendChild(ul);
    playlistDisplayAreaElement.scrollTop = 0;
}

function createPlaylistOverviewItem(playlistData) {
    const li = document.createElement('li');
    li.className = 'playlist-overview-item';
    li.setAttribute('data-playlist-id', playlistData.id);

    const songsText = playlistData.songs.length === 1 ? "1 song" : `${playlistData.songs.length} songs`;
    const artworkSrc = playlistData.artwork || (playlistData.songs.length > 0 && playlistData.songs[0].artwork ? playlistData.songs[0].artwork : 'img/empty_art.png');

    let nameDisplay = `<div class="playlist-overview-item-name">${escapeHtml(playlistData.name)}</div>`;
    let actionsHtml = '';

    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID) {
        actionsHtml = `
            <div class="playlist-item-actions">
                <button class="rename-playlist-btn" title="Rename"><i class="icon icon-edit"></i></button>
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

    const infoSection = li.querySelector('.playlist-overview-item-info');
    const artworkSection = li.querySelector('.playlist-overview-item-artwork');

    const viewPlaylistHandler = () => switchSidebarView('single_playlist_view', playlistData.id);

    if (infoSection) infoSection.addEventListener('click', (e) => {
        if (!e.target.closest('.playlist-item-actions') && !e.target.closest('.playlist-name-input')) {
            viewPlaylistHandler();
        }
    });
    if (artworkSection) artworkSection.addEventListener('click', (e) => {
         if (!e.target.closest('.playlist-item-actions') && !e.target.closest('.playlist-name-input')) {
            viewPlaylistHandler();
        }
    });

    if (playlistData.id !== LIKED_SONGS_PLAYLIST_ID) {
        const renameBtn = li.querySelector('.rename-playlist-btn');
        const deleteBtn = li.querySelector('.delete-playlist-btn');
        if(renameBtn) renameBtn.addEventListener('click', () => handleRenamePlaylist(playlistData.id, li));
        if(deleteBtn) deleteBtn.addEventListener('click', () => deletePlaylist(playlistData.id)); // Confirmation inside deletePlaylist
    }
    return li;
}

function renderSinglePlaylistView(playlistId) {
    if (!playlistDisplayAreaElement || !sidebarTitleElement || !backToPlaylistsBtnElement || !createNewPlaylistBtnElement) return;

    const playlist = getPlaylistById(playlistId);
    if (!playlist) {
        switchSidebarView('all_playlists');
        return;
    }

    playlistDisplayAreaElement.innerHTML = '';
    sidebarTitleElement.textContent = escapeHtml(playlist.name);
    backToPlaylistsBtnElement.style.display = 'inline-block';
    createNewPlaylistBtnElement.style.display = 'none';

    if (playlist.songs.length === 0) {
        playlistDisplayAreaElement.innerHTML = `<p class="empty-playlist-message">This playlist is empty.</p>`;
        return;
    }

    const ul = document.createElement('ul');
    // ul.className = 'playlist-list'; // Ensure this class is in CSS

    playlist.songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item'; // Re-use for songs in a playlist
        li.setAttribute('data-song-id', song.id.toString());
        li.setAttribute('draggable', true);

        if (currentPlayingPlaylistId === playlistId && currentPlaylistTrackIndex === index && currentTrack && currentTrack.id === song.id) {
            li.classList.add('playing');
        }

        let removeButtonHtml = '';
        if (playlistId !== LIKED_SONGS_PLAYLIST_ID) {
            removeButtonHtml = `<button class="remove-song-from-playlist-btn" title="Remove from playlist">×</button>`;
        }


        li.innerHTML = `
            <img src="${song.artwork || 'img/empty_art.png'}" alt="${escapeHtml(song.title)}" class="playlist-item-artwork">
            <div class="playlist-item-info">
                <div class="playlist-item-title">${escapeHtml(song.title)}</div>
                <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
            </div>
            ${removeButtonHtml}
        `;

        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-song-from-playlist-btn')) {
                if (playlistId === LIKED_SONGS_PLAYLIST_ID) { // Should not happen due to button conditional
                    // removeSongFromLikedPlaylist(song.id); // This path should ideally not be taken
                } else {
                    removeSongFromUserPlaylist(playlistId, song.id);
                }
            } else {
                playSongFromCurrentPlaylist(playlistId, index);
            }
        });

        li.addEventListener('dragstart', (event) => handleSongDragStart(event, index, playlistId));
        li.addEventListener('dragover', handleSongDragOver);
        li.addEventListener('drop', (event) => handleSongDrop(event, index, playlistId)); // index here is the one dropped ON
        li.addEventListener('dragend', handleSongDragEnd);

        ul.appendChild(li);
    });
    playlistDisplayAreaElement.appendChild(ul);
    playlistDisplayAreaElement.scrollTop = 0;
}

// --- PLAYBACK LOGIC ADAPTATIONS ---
function playSongFromCurrentPlaylist(playlistId, songIndex) {
    const playlist = getPlaylistById(playlistId); // This now gets a full playlist object
    if (!playlist || !playlist.songs || songIndex < 0 || songIndex >= playlist.songs.length) {
        console.warn(`Cannot play song: invalid playlist or index. Playlist ID: ${playlistId}, Index: ${songIndex}`);
        clearPlaylistContext();
        return;
    }

    const songToPlay = playlist.songs[songIndex];
    currentPlayingPlaylistId = playlistId;
    currentPlaylistTrackIndex = songIndex;

    // Call the global playSong function (defined in play.js)
    if (typeof playSong === 'function') {
        playSong(songToPlay.title, songToPlay.artist, songToPlay.artwork, songToPlay.id.toString());
    } else {
        console.error("Global playSong function not found!");
    }

    renderSidebar(); // Re-render to highlight playing song
    updatePlaylistControlsVisibility();
}

function playNextTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;
    const playlist = getPlaylistById(currentPlayingPlaylistId);

    if (playlist && playlist.songs.length > 0) {
        let nextIndex = currentPlaylistTrackIndex + 1;
        if (nextIndex >= playlist.songs.length) {
            nextIndex = 0; // Loop for 'playlist' loop state, or if user clicks next on last song
        }
        playSongFromCurrentPlaylist(currentPlayingPlaylistId, nextIndex);
    }
}

function playPreviousTrackInCurrentPlaylist() {
    if (!currentPlayingPlaylistId) return;
    const playlist = getPlaylistById(currentPlayingPlaylistId);

    if (playlist && playlist.songs.length > 0) {
        let prevIndex = currentPlaylistTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = playlist.songs.length - 1;
        }
        playSongFromCurrentPlaylist(currentPlayingPlaylistId, prevIndex);
    }
}

function updatePlaylistControlsVisibility() {
    if (!prevBtnElement || !nextBtnElement) return;
    const playlist = getPlaylistById(currentPlayingPlaylistId);
    const showControls = playlist && playlist.songs && playlist.songs.length > 0; // Show if any playlist has songs
    prevBtnElement.style.display = showControls ? 'inline-block' : 'none';
    nextBtnElement.style.display = showControls ? 'inline-block' : 'none';

    if (typeof updateLoopButtonIcon === 'function') updateLoopButtonIcon(); // Defined in player.js
}

function clearPlaylistContext() {
    const wasPlayingPlaylist = currentPlayingPlaylistId !== null;
    currentPlayingPlaylistId = null;
    currentPlaylistTrackIndex = -1;

    if (currentSidebarView === 'single_playlist_view' && selectedPlaylistToViewId) {
         const playlistBeingViewed = getPlaylistById(selectedPlaylistToViewId);
         if(playlistBeingViewed) renderSinglePlaylistView(selectedPlaylistToViewId); // Re-render to remove playing highlight
    } else if (currentSidebarView === 'all_playlists') {
        // If playing from "All Playlists" view (e.g. clicking play on a playlist overview - future feature)
        // For now, this else if might not be strictly necessary.
    }

    updatePlaylistControlsVisibility();

    if (wasPlayingPlaylist && typeof loopState !== 'undefined' && loopState === 'playlist') {
        loopState = 'none';
        if (typeof updateLoopButtonIcon === 'function') updateLoopButtonIcon();
    }
}

// --- "ADD TO PLAYLIST" MODAL ---
function openAddToPlaylistModal() {
    if (!currentTrack || currentTrack.id == null) {
        alert("No song is currently playing to add.");
        return;
    }
    modalPlaylistListElement.innerHTML = '';

    // Option to add to Liked Songs
    const likedItem = document.createElement('div');
    likedItem.className = 'modal-playlist-item';
    likedItem.textContent = "Liked Songs";
    likedItem.onclick = () => {
        addSongToLikedPlaylist({ id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist, artwork: currentTrack.artwork });
        closeAddToPlaylistModal();
    };
    modalPlaylistListElement.appendChild(likedItem);

    userPlaylists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'modal-playlist-item';
        playlistItem.textContent = escapeHtml(playlist.name);
        playlistItem.onclick = () => {
            addSongToUserPlaylist(playlist.id, { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist, artwork: currentTrack.artwork });
            closeAddToPlaylistModal();
        };
        modalPlaylistListElement.appendChild(playlistItem);
    });

    if (modalPlaylistListElement.children.length === 1 && userPlaylists.length === 0) { // Only "Liked Songs" showing and no user playlists
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
    const playlistName = prompt("Enter name for new playlist:", "My Playlist " + (userPlaylists.length + 1));
    if (playlistName && playlistName.trim() !== "") {
        createPlaylist(playlistName.trim());
        renderAllPlaylistsView();
    } else if (playlistName !== null) {
        alert("Playlist name cannot be empty.");
    }
}

function handleRenamePlaylist(playlistId, listItemElement) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist || playlist.id === LIKED_SONGS_PLAYLIST_ID) return;

    const nameDiv = listItemElement.querySelector('.playlist-overview-item-name');
    const currentName = playlist.name;
    nameDiv.innerHTML = `<input type="text" class="playlist-name-input" value="${escapeHtml(currentName)}">`;
    const inputField = nameDiv.querySelector('input');
    inputField.focus();
    inputField.select();

    const saveRename = () => {
        const newName = inputField.value.trim();
        if (newName && newName !== currentName) {
            renamePlaylist(playlistId, newName);
        } else { // If name is empty or same, revert to original
            nameDiv.textContent = escapeHtml(currentName); // Or just re-render
        }
        renderAllPlaylistsView(); // Re-render to ensure proper display and remove input
    };

    inputField.addEventListener('blur', saveRename, { once: true }); // Use {once: true} to avoid multiple fires if re-focused
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            inputField.blur(); // Trigger the blur event to save
        } else if (e.key === 'Escape') {
            nameDiv.textContent = escapeHtml(currentName); // Revert on escape
             renderAllPlaylistsView(); // And re-render
        }
    });
}

// --- DRAG AND DROP FOR SONGS (within a single playlist view) ---
let draggedSongIndex = null;
let draggedSongElement = null;
let dragOverPlaylistIdContext = null; // Stores playlist ID during drag operation

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