// js/play.js

// artworkUrl is expected to be the 100x100 version
// trackId should be a string if provided
function playSong(title, artist, artworkUrl, trackId = null, durationSeconds = 0, isLocal = false, localFileRef = null) {
    // Debugging logs (can be removed later)
    console.log("------------------------------------");
    console.log("playSong CALLED with:");
    console.log("  Title:", title);
    console.log("  isLocal FLAG:", isLocal); // Ensure this is correctly passed
    console.log("  localFileRef EXISTS:", !!localFileRef);
    if (localFileRef && localFileRef instanceof File) {
        console.log("  localFileRef Name:", localFileRef.name);
    }
    console.log("------------------------------------");

    const newTrackId = trackId ? trackId.toString() : `${title}-${artist}`.toLowerCase().replace(/\s+/g, '-');

    if (localFileBlobUrl && (!currentTrack || currentTrack.id !== newTrackId || !currentTrack.isLocalFile || (currentTrack.isLocalFile && currentTrack.localFileReference !== localFileRef) )) {
        URL.revokeObjectURL(localFileBlobUrl);
        localFileBlobUrl = null;
        console.log("Revoked previous localFileBlobUrl because track changed or file ref changed.");
    }

    currentTrack = {
        id: newTrackId,
        title: title,
        artist: artist,
        artwork: artworkUrl,
        artworkLarge: (artworkUrl && artworkUrl.startsWith('data:image')) ? artworkUrl : (artworkUrl ? artworkUrl.replace("100x100", "600x600") : 'img/empty_art.png'),
        durationSeconds: durationSeconds || 0,
        isLocalFile: isLocal,
        localFileReference: isLocal ? localFileRef : null
    };

    trackTitle.textContent = currentTrack.title;
    artistName.textContent = currentTrack.artist;
    lyricsSongTitle.textContent = currentTrack.title;
    lyricsArtistName.textContent = currentTrack.artist;
    if (showingLyrics) fetchLyrics(currentTrack.artist, currentTrack.title);
    if (typeof setAlbumArtAndBackgroundColor === 'function') setAlbumArtAndBackgroundColor(currentTrack.artworkLarge);
    
    // +++ START: MODIFICATION FOR BUTTON VISIBILITY +++
    if (likeBtnElement && addToPlaylistBtnElement) {
        if (currentTrack.isLocalFile) {
            console.log("Hiding Like and AddToPlaylist buttons for local file.");
            likeBtnElement.style.display = 'none';
            addToPlaylistBtnElement.style.display = 'none';
        } else {
            console.log("Showing Like and AddToPlaylist buttons for non-local file.");
            likeBtnElement.style.display = 'inline-block'; // Or your default display value e.g. 'flex'
            addToPlaylistBtnElement.style.display = 'inline-block'; // Or your default display value
            // Only update like button state if it's NOT a local file
            if (typeof updateLikeButtonState === 'function') {
                 updateLikeButtonState(); // Sets heart to empty/filled
            }
        }
    } else {
        console.warn("likeBtnElement or addToPlaylistBtnElement not found for visibility update.");
    }
    // +++ END: MODIFICATION FOR BUTTON VISIBILITY +++


    // --- REVISED DECISION LOGIC (from previous step, this part should be fine) ---
    if (currentTrack.isLocalFile && currentTrack.localFileReference) {
        console.log("PLAYSONG: Choosing HTML5 player for local file:", currentTrack.title);
        currentPlayingWith = 'html5';
        playLocalFile(currentTrack.localFileReference);
    } else if (currentTrack.isLocalFile && !currentTrack.localFileReference) {
        currentPlayingWith = null;
        console.warn(`PLAYSONG: Cannot play local file "${currentTrack.title}" directly. File reference lost (likely after refresh).`);
        showToast(`"${escapeHtml(currentTrack.title)}" is a local file. Please re-select it from the 'Local Files' playlist to play.`, 4500);
        isPlaying = false;
        if (playPauseBtn) {
            playPauseBtn.classList.remove("icon-pause");
            playPauseBtn.classList.add("icon-play");
        }
        // Ensure buttons are hidden here too, as playback won't start
        if (likeBtnElement) likeBtnElement.style.display = 'none';
        if (addToPlaylistBtnElement) addToPlaylistBtnElement.style.display = 'none';
        if (typeof clearPlayerStateOnEnd === 'function') clearPlayerStateOnEnd();
    } else { // Not a local file
        console.log("PLAYSONG: Choosing YouTube player for (non-local):", currentTrack.title);
        currentPlayingWith = 'youtube';
        if (html5AudioPlayer && !html5AudioPlayer.paused) {
            html5AudioPlayer.pause();
        }
        const searchQuery = `${currentTrack.title} - ${currentTrack.artist}`;
        getYT(searchQuery);
    }
}

// +++ ADD THIS NEW FUNCTION for playing local files +++
function playLocalFile(fileObject) {
    if (!html5AudioPlayer) {
        console.error("HTML5 Audio Player not initialized!");
        return;
    }

    // Stop YouTube player if it was playing
    if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo(); // or stopVideo()
    }
    playPauseBtn.classList.remove("icon-pause"); // Reset UI just in case
    playPauseBtn.classList.add("icon-play");


    if (fileObject instanceof File) {
        localFileBlobUrl = URL.createObjectURL(fileObject);
        html5AudioPlayer.src = localFileBlobUrl;
    } else if (typeof fileObject === 'string' && fileObject.startsWith('blob:')) {
        // If re-playing from a stored blob URL (less likely with current setup but good for future)
        html5AudioPlayer.src = fileObject;
        localFileBlobUrl = fileObject; // Keep track to revoke later
    } else {
        console.error("Invalid local file reference:", fileObject);
        showToast("Error: Could not load local file.", 3000);
        return;
    }

    html5AudioPlayer.load(); // Important to re-load if src changes
    html5AudioPlayer.play()
        .then(() => {
            isPlaying = true;
            playPauseBtn.classList.remove("icon-play");
            playPauseBtn.classList.add("icon-pause");
        })
        .catch(error => {
            console.error("Error playing local file:", error);
            showToast("Error: Could not play local file.", 3000);
            isPlaying = false;
            playPauseBtn.classList.remove("icon-pause");
            playPauseBtn.classList.add("icon-play");
        });

    // Update isMuted state for html5 player
    html5AudioPlayer.muted = isMuted;
}

function loadVid(videoId) {
  // player is global from init.js (and player.js)
  // isMuted is global from init.js
  if (player && typeof player.loadVideoById === 'function') {
      currentPlayingWith = 'youtube'; // Explicitly set
      player.loadVideoById(videoId);
      // Autoplay is handled by YouTube API or onPlayerStateChange (YT.PlayerState.CUED)

      if (isMuted && typeof player.mute === 'function') {
          player.mute();
      } else if (typeof player.unMute === 'function' && !isMuted) { // only unmute if not muted
          player.unMute();
      }
  } else {
      console.error("YouTube player not ready or loadVideoById not available.");
  }
}