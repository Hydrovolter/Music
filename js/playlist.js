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

    likedPlaylistContentElement.innerHTML = ''; // Clear existing content

    if (likedPlaylist.length === 0) {
        likedPlaylistContentElement.innerHTML = '<p class="empty-playlist-message">Like some songs to see them here!</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'playlist-list';

    likedPlaylist.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.setAttribute('data-song-id', song.id);
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
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', (event) => handleDrop(event, index));
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

function handleDragStart(event, index) {
    draggedItemIndex = index;
    draggedItemElement = event.target;
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('dragging');
    // event.dataTransfer.setData('text/plain', index); // Not strictly needed if using module-level var
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const targetElement = event.target.closest('.playlist-item');
    if (targetElement && draggedItemElement && targetElement !== draggedItemElement) {
        // Optional: visual feedback for drop target
    }
}

function handleDrop(event, targetIndex) {
    event.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
        if (draggedItemElement) draggedItemElement.classList.remove('dragging');
        draggedItemIndex = null;
        draggedItemElement = null;
        return;
    }

    const itemToMove = likedPlaylist.splice(draggedItemIndex, 1)[0];
    likedPlaylist.splice(targetIndex, 0, itemToMove);

    // Adjust currentPlaylistTrackIndex if the playing song was moved
    if (currentPlayingPlaylistType === 'liked') {
        const playingSongId = currentTrack ? currentTrack.id : null;
        if (playingSongId) {
            const newPlayingIndex = likedPlaylist.findIndex(song => song.id === playingSongId);
            if (newPlayingIndex !== -1) {
                currentPlaylistTrackIndex = newPlayingIndex;
            } else { // Playing song somehow disappeared or ID mismatch after reorder
                clearPlaylistContext();
            }
        }
    }

    saveLikedPlaylist();
    renderLikedPlaylist(); // Re-render with new order and correct 'playing' state
    if (draggedItemElement) draggedItemElement.classList.remove('dragging');
    draggedItemIndex = null;
    draggedItemElement = null;
}

function handleDragEnd(event) {
    // Clean up 'dragging' class if drop didn't occur on a valid target or outside window
    if (draggedItemElement) draggedItemElement.classList.remove('dragging');
    const allItems = likedPlaylistContentElement.querySelectorAll('.playlist-item');
    allItems.forEach(item => item.classList.remove('dragging')); // Failsafe
    draggedItemIndex = null;
    draggedItemElement = null;
    // renderLikedPlaylist(); // Re-render to ensure consistent UI, especially if drag was cancelled
}