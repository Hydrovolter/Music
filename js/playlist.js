// js/playlist.js

const LIKED_PLAYLIST_STORAGE_KEY = 'musicPlayer_likedSongsPlaylist';
let likedPlaylist = []; // Array to hold liked song objects {id, title, artist, artwork}
let currentPlayingPlaylistType = null; // e.g., 'liked', null if not playing from a playlist
let currentPlaylistTrackIndex = -1;   // Index of the currently playing song in the active playlist

// DOM Elements (get them once)
let likedPlaylistContentElement;
let likeBtnElement;
let prevBtnElement;
let nextBtnElement;


function initializePlaylistSystem() {
    // DOM elements are fetched here because this function is called on DOMContentLoaded
    likedPlaylistContentElement = document.getElementById('likedPlaylistContent');
    likeBtnElement = document.getElementById('likeBtn');
    prevBtnElement = document.getElementById('prevBtn');
    nextBtnElement = document.getElementById('nextBtn');

    if (!likedPlaylistContentElement || !likeBtnElement || !prevBtnElement || !nextBtnElement) {
        console.error("Playlist system DOM elements not found. Aborting initialization.");
        return;
    }

    loadLikedPlaylist();
    renderLikedPlaylist();

    likeBtnElement.addEventListener('click', toggleLikeCurrentSong);
    nextBtnElement.addEventListener('click', playNextTrackInCurrentPlaylist);
    prevBtnElement.addEventListener('click', playPreviousTrackInCurrentPlaylist);
    updatePlaylistControlsVisibility(); // Initial check
}

function loadLikedPlaylist() {
    const storedPlaylist = localStorage.getItem(LIKED_PLAYLIST_STORAGE_KEY);
    if (storedPlaylist) {
        try {
            likedPlaylist = JSON.parse(storedPlaylist);
        } catch (e) {
            console.error("Error parsing liked playlist from localStorage:", e);
            likedPlaylist = [];
        }
    } else {
        likedPlaylist = [];
    }
}

function saveLikedPlaylist() {
    localStorage.setItem(LIKED_PLAYLIST_STORAGE_KEY, JSON.stringify(likedPlaylist));
}

function renderLikedPlaylist() {
    if (!likedPlaylistContentElement) return;

    likedPlaylistContentElement.innerHTML = '';

    if (likedPlaylist.length === 0) {
        likedPlaylistContentElement.innerHTML = '<p class="empty-playlist-message">Like some songs to see them here!</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'playlist-list';

    likedPlaylist.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        // IMPORTANT: Ensure id is a string for consistent dataset access
        li.setAttribute('data-song-id', song.id.toString());
        li.setAttribute('draggable', true);

        if (currentPlayingPlaylistType === 'liked' && currentPlaylistTrackIndex === index && currentTrack && currentTrack.id === song.id) {
            li.classList.add('playing');
        }

        li.innerHTML = `
            <img src="${song.artwork}" alt="${song.title}" class="playlist-item-artwork">
            <div class="playlist-item-info">
                <div class="playlist-item-title">${song.title}</div>
                <div class="playlist-item-artist">${song.artist}</div>
            </div>
        `;

        li.addEventListener('click', () => {
            playSongFromLikedPlaylist(index);
        });

        // Drag and Drop event listeners
        li.addEventListener('dragstart', (event) => handleDragStart(event, index));
        li.addEventListener('dragover', handleDragOver); // This will handle the "make space" visual
        li.addEventListener('dragleave', handleDragLeave); // Optional: for removing gaps if mouse leaves item quickly
        li.addEventListener('drop', (event) => handleDrop(event, index)); // index is of the item being dropped ONTO
        li.addEventListener('dragend', handleDragEnd);

        ul.appendChild(li);
    });
    likedPlaylistContentElement.appendChild(ul);
}

function addSongToLikedPlaylist(songData) {
    if (!songData || !songData.id) {
        console.error("Cannot add song: missing song data or ID.", songData);
        return;
    }
    if (!likedPlaylist.find(s => s.id === songData.id)) {
        likedPlaylist.push(songData);
        saveLikedPlaylist();
        renderLikedPlaylist();
        updateLikeButtonState(true);
    }
}

function removeSongFromLikedPlaylist(songId) {
    const initialLength = likedPlaylist.length;
    likedPlaylist = likedPlaylist.filter(s => s.id !== songId);

    if (likedPlaylist.length < initialLength) { // If a song was actually removed
        // If the removed song was the one playing from the liked playlist
        if (currentPlayingPlaylistType === 'liked' && currentTrack && currentTrack.id === songId) {
            // If it was the current song, we need to decide what to do.
            // For now, let's assume it stops, or if more songs, plays next.
            // This part can be complex. Let's keep it simple: it's removed, player state will handle end.
            // If the removed song was *before* the currently playing one in the list, adjust index
            if (currentPlaylistTrackIndex !== -1) {
                const oldPlayingSong = likedPlaylist[currentPlaylistTrackIndex]; // song at old index
                // find new index of that song, if it still exists
                const newIdx = likedPlaylist.findIndex(s => s.id === (oldPlayingSong ? oldPlayingSong.id : null));
                if (newIdx !== -1) {
                    currentPlaylistTrackIndex = newIdx;
                } else {
                    // The currently playing song (or what was supposed to be) was the one removed, or list shifted
                    // Reset or try to play next if applicable. For now, player.js handles 'ENDED' state.
                }
            }
        }
        saveLikedPlaylist();
        renderLikedPlaylist();
        if (currentTrack && currentTrack.id === songId) {
            updateLikeButtonState(false);
        }
        updatePlaylistControlsVisibility();
    }
}


function isSongLiked(songId) {
    if (!songId) return false;
    return likedPlaylist.some(s => s.id === songId);
}

function toggleLikeCurrentSong() {
    if (!currentTrack || currentTrack.id == null) { // Check for null or undefined ID explicitly
        console.warn("No current track to like/unlike, or track has no ID.");
        return;
    }

    if (isSongLiked(currentTrack.id)) {
        removeSongFromLikedPlaylist(currentTrack.id);
    } else {
        const songToAdd = {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            artwork: currentTrack.artwork // Ensure this is the 100x100 artwork
        };
        addSongToLikedPlaylist(songToAdd);
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

function playSongFromLikedPlaylist(index) {
    if (index >= 0 && index < likedPlaylist.length) {
        const songToPlay = likedPlaylist[index];
        currentPlayingPlaylistType = 'liked';
        currentPlaylistTrackIndex = index;
        playSong(songToPlay.title, songToPlay.artist, songToPlay.artwork, songToPlay.id.toString());
        renderLikedPlaylist(); // Re-render to highlight playing song
        updatePlaylistControlsVisibility();
    } else {
        console.warn(`Attempted to play song from liked playlist at invalid index: ${index}`);
        currentPlayingPlaylistType = null;
        currentPlaylistTrackIndex = -1;
        updatePlaylistControlsVisibility();
    }
}

function playNextTrackInCurrentPlaylist() {
    if (currentPlayingPlaylistType === 'liked' && likedPlaylist.length > 0) {
        let nextIndex = currentPlaylistTrackIndex + 1;
        if (nextIndex >= likedPlaylist.length) {
            nextIndex = 0; // Loop to the beginning
        }
        if (likedPlaylist.length === 1 && currentPlaylistTrackIndex === 0 && !isLooping) {
             // If only one song and not looping, effectively "ends". Handled by onPlayerStateChange.
             return;
        }
        playSongFromLikedPlaylist(nextIndex);
    }
}

function playPreviousTrackInCurrentPlaylist() {
    if (currentPlayingPlaylistType === 'liked' && likedPlaylist.length > 0) {
        let prevIndex = currentPlaylistTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = likedPlaylist.length - 1; // Loop to the end
        }
        playSongFromLikedPlaylist(prevIndex);
    }
}

function updatePlaylistControlsVisibility() {
    if (!prevBtnElement || !nextBtnElement) return;
    const showControls = currentPlayingPlaylistType === 'liked' && likedPlaylist.length > 1;
    prevBtnElement.style.display = showControls ? 'inline-block' : 'none';
    nextBtnElement.style.display = showControls ? 'inline-block' : 'none';
}

function clearPlaylistContext() {
    currentPlayingPlaylistType = null;
    currentPlaylistTrackIndex = -1;
    renderLikedPlaylist(); // Remove any 'playing' highlight
    updatePlaylistControlsVisibility();
}


// Drag and Drop Handlers
let draggedItemIndex = null;
let draggedItemElement = null;

// --- Drag and Drop Handlers ---

function handleDragStart(event, index) {
    draggedItemIndex = index;
    draggedItemElement = event.target; // event.target is the li element
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString()); // Good practice
    
    // Add class slightly later to allow browser to capture the drag image without opacity
    setTimeout(() => {
        if (draggedItemElement) draggedItemElement.classList.add('dragging');
    }, 0);
}

function clearGapIndicators() {
    const items = likedPlaylistContentElement.querySelectorAll('.playlist-item');
    items.forEach(item => {
        item.classList.remove('show-gap-above', 'show-gap-below');
    });
}

function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = 'move';

    const currentTargetLi = event.target.closest('.playlist-item');

    if (!currentTargetLi || !draggedItemElement || currentTargetLi === draggedItemElement) {
        // If not over a valid item, or over itself, clear any gaps and do nothing
        // (Or if over itself, one might argue no gap should appear, handled by currentTargetLi === draggedItemElement)
        // clearGapIndicators(); // This might cause flickering if cleared too aggressively.
                             // Better to clear once and apply to new target.
        return;
    }
    
    clearGapIndicators(); // Clear previous gaps first

    const rect = currentTargetLi.getBoundingClientRect();
    const offsetY = event.clientY - rect.top; // Y position within the target element
    const isDraggingOverUpperHalf = offsetY < rect.height / 2;

    if (isDraggingOverUpperHalf) {
        currentTargetLi.classList.add('show-gap-above');
    } else {
        currentTargetLi.classList.add('show-gap-below');
    }
}

function handleDragLeave(event) {
    // When the mouse leaves a playlist item, if it's not entering another one immediately,
    // the gap indicator on it should be removed.
    // This is partially handled by clearGapIndicators() in handleDragOver.
    // A more robust dragleave would check relatedTarget.
    const leftItem = event.target.closest('.playlist-item');
    if (leftItem) { // Check if we are still over any item of the list
        const relatedTargetIsItem = event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest('.playlist-item');
        if(!relatedTargetIsItem || !likedPlaylistContentElement.contains(event.relatedTarget)) {
            // If leaving an item and not entering another item within the playlist container immediately
            leftItem.classList.remove('show-gap-above', 'show-gap-below');
        }
    }
     // More simply, rely on handleDragOver to manage this or handleDragEnd for final cleanup.
}


function handleDrop(event, indexOfTheItemDroppedOn) {
    event.preventDefault();
    clearGapIndicators(); // Clean up visual indicators

    if (draggedItemIndex === null) { // Should not happen if dragstart was successful
        if (draggedItemElement) draggedItemElement.classList.remove('dragging');
        return;
    }
    
    // The element that received the drop event
    const droppedOnLiElement = event.currentTarget; // Since listener is on the li

    // If dropped on the original dragged item's placeholder (less likely with this styling)
    // or if somehow draggedItemIndex is same as indexOfTheItemDroppedOn initially,
    // but the drop target check in dragOver should prevent this.
    // For safety, if dropped on itself visually, do nothing (though array indices might differ due to removal).
    const targetSongId = droppedOnLiElement.dataset.songId;
    if (likedPlaylist[draggedItemIndex].id.toString() === targetSongId) {
         // If the item being dragged has the same ID as the item it's dropped on,
         // and no gap class was applied (meaning it was likely dropped directly on itself without shifting)
         // then just clean up and return. This check might be redundant with proper gap logic.
         if (!droppedOnLiElement.classList.contains('show-gap-above') && !droppedOnLiElement.classList.contains('show-gap-below')) {
            if (draggedItemElement) draggedItemElement.classList.remove('dragging');
            // draggedItemIndex = null; // Reset in dragend
            // draggedItemElement = null; // Reset in dragend
            return;
         }
    }


    const itemToMove = likedPlaylist[draggedItemIndex]; // Get the item before splicing

    // Determine if the drop was intended to be before or after the target item
    const rect = droppedOnLiElement.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const insertBeforeTarget = offsetY < rect.height / 2;

    // Perform the actual array manipulation
    likedPlaylist.splice(draggedItemIndex, 1); // Remove from old position

    // Find the new index of the item we dropped onto, *after* the dragged item was removed
    let newDropTargetIndex = likedPlaylist.findIndex(song => song.id.toString() === targetSongId);
    
    if (newDropTargetIndex === -1) { // Should not happen if data is consistent
        console.error("Drop target item not found in playlist after splice.");
        // As a fallback, re-add the item to its original position or end, and re-render.
        likedPlaylist.splice(draggedItemIndex, 0, itemToMove); // Put it back
        renderLikedPlaylist();
        return;
    }


    if (insertBeforeTarget) {
        likedPlaylist.splice(newDropTargetIndex, 0, itemToMove);
    } else {
        likedPlaylist.splice(newDropTargetIndex + 1, 0, itemToMove);
    }

    // Adjust currentPlaylistTrackIndex if the playing song was moved
    if (currentPlayingPlaylistType === 'liked') {
        const playingSongId = currentTrack ? currentTrack.id : null;
        if (playingSongId) {
            const newPlayingIndex = likedPlaylist.findIndex(song => song.id === playingSongId);
            if (newPlayingIndex !== -1) {
                currentPlaylistTrackIndex = newPlayingIndex;
            } else {
                // This case implies the playing song was the one moved, and its ID is now part of 'itemToMove'
                // So, find 'itemToMove' (which is 'playingSongId') in the new 'likedPlaylist'
                const currentSongNewIdx = likedPlaylist.findIndex(s => s.id === playingSongId);
                if (currentSongNewIdx !== -1) {
                     currentPlaylistTrackIndex = currentSongNewIdx;
                } else {
                    clearPlaylistContext(); // Should not happen if IDs are consistent
                }
            }
        }
    }

    saveLikedPlaylist();
    renderLikedPlaylist(); // Re-renders the list, which naturally removes dragging and gap classes
                           // and correctly applies 'playing' class if needed.

    // draggedItemIndex and draggedItemElement are reset in dragend
}


function handleDragEnd(event) {
    clearGapIndicators(); // Final cleanup of gap indicators

    // Remove 'dragging' class from the original element if it still exists in the DOM
    // and wasn't removed by a re-render (e.g., if drag was cancelled).
    if (draggedItemElement) {
        draggedItemElement.classList.remove('dragging');
    }

    // Fallback to ensure all items are visually clean,
    // especially if drop happened outside valid area or was cancelled.
    const allItems = likedPlaylistContentElement.querySelectorAll('.playlist-item');
    allItems.forEach(item => {
        item.classList.remove('dragging', 'show-gap-above', 'show-gap-below');
    });

    draggedItemIndex = null;
    draggedItemElement = null;
}