// js/play.js

// artworkUrl is expected to be the 100x100 version
// trackId should be a string if provided
function playSong(title, artist, artworkUrl, trackId = null, durationSeconds = 0, isLocal = false, localFileRef = null) {
    console.log("------------------------------------");
    console.log("playSong CALLED. Title:", title, "| isLocal:", isLocal, "| localFileRef exists:", !!localFileRef);
    if (localFileRef && localFileRef instanceof File) {
        console.log("  localFileRef Name:", localFileRef.name);
    }
    console.log("------------------------------------");

    const newTrackId = trackId ? trackId.toString() : `${title}-${artist}`.toLowerCase().replace(/\s+/g, '-');

    // Revoke old Blob URL if necessary
    if (localFileBlobUrl && 
        (!currentTrack || currentTrack.id !== newTrackId || !isLocal || (isLocal && currentTrack.localFileReference !== localFileRef))) {
        URL.revokeObjectURL(localFileBlobUrl);
        localFileBlobUrl = null;
        console.log("Revoked previous localFileBlobUrl (track or ref changed).");
    }

    // Temporarily store passed-in local file reference
    let directFileRef = isLocal ? localFileRef : null;

    currentTrack = {
        id: newTrackId,
        title: title,
        artist: artist,
        artwork: artworkUrl,
        artworkLarge: (artworkUrl && artworkUrl.startsWith('data:image')) ? artworkUrl : (artworkUrl ? artworkUrl.replace("100x100", "600x600") : 'img/empty_art.png'),
        durationSeconds: durationSeconds || 0,
        isLocalFile: isLocal, // Based on the 'isLocal' argument
        localFileReference: directFileRef // Initially set from argument
    };

    // Update UI elements
    trackTitle.textContent = currentTrack.title;
    artistName.textContent = currentTrack.artist;
    lyricsSongTitle.textContent = currentTrack.title;
    lyricsArtistName.textContent = currentTrack.artist;
    if (showingLyrics) fetchLyrics(currentTrack.artist, currentTrack.title);
    if (typeof setAlbumArtAndBackgroundColor === 'function') setAlbumArtAndBackgroundColor(currentTrack.artworkLarge);

    // --- BUTTON VISIBILITY LOGIC ---
    if (likeBtnElement && addToPlaylistBtnElement) {
        if (currentTrack.isLocalFile) {
            likeBtnElement.style.display = 'none';
            addToPlaylistBtnElement.style.display = 'none';
        } else {
            likeBtnElement.style.display = 'inline-block';
            addToPlaylistBtnElement.style.display = 'inline-block';
            if (typeof updateLikeButtonState === 'function') updateLikeButtonState();
        }
    }

    // --- PLAYER DECISION LOGIC ---
    if (currentTrack.isLocalFile) {
        let fileToPlay = currentTrack.localFileReference; // Use the one passed in arguments first

        // If no direct fileRef was passed (e.g., from a shuffled queue that might have lost it,
        // or from localStorage after refresh), try to find it in the master in-memory localFilesPlaylist.
        if (!fileToPlay && typeof localFilesPlaylist !== 'undefined' && Array.isArray(localFilesPlaylist)) {
            const masterLocalEntry = localFilesPlaylist.find(lfSong => lfSong.id === currentTrack.id && lfSong.fileObject);
            if (masterLocalEntry) {
                fileToPlay = masterLocalEntry.fileObject;
                currentTrack.localFileReference = fileToPlay; // Update currentTrack with the found File object
                console.log(`PLAYSONG: Found active File object for "${currentTrack.title}" in master localFilesPlaylist.`);
            }
        }

        if (fileToPlay) { // We have a File object to play
            console.log("PLAYSONG: Choosing HTML5 player for local file:", currentTrack.title);
            currentPlayingWith = 'html5';
            if (player && typeof player.pauseVideo === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
                player.pauseVideo(); // Ensure YouTube player is paused
            }
            playLocalFile(fileToPlay);
        } else {
            // No File object available (e.g., after refresh and no re-selection, or truly missing)
            currentPlayingWith = null;
            console.warn(`PLAYSONG: Cannot play local file "${currentTrack.title}" directly. File reference not found.`);
            showToast(`"${escapeHtml(currentTrack.title)}" is a local file. Please re-select it from the 'Local Files' playlist to play.`, 4500);
            isPlaying = false;
            if (playPauseBtn) {
                playPauseBtn.classList.remove("icon-pause");
                playPauseBtn.classList.add("icon-play");
            }
            if (likeBtnElement) likeBtnElement.style.display = 'none'; // Ensure hidden
            if (addToPlaylistBtnElement) addToPlaylistBtnElement.style.display = 'none'; // Ensure hidden
            if (typeof clearPlayerStateOnEnd === 'function') clearPlayerStateOnEnd();
        }
    } else { // Not a local file, proceed with YouTube
        console.log("PLAYSONG: Choosing YouTube player for (non-local):", currentTrack.title);
        currentPlayingWith = 'youtube';
        if (html5AudioPlayer && !html5AudioPlayer.paused) {
            html5AudioPlayer.pause(); // Ensure HTML5 player is paused
        }
        const searchQuery = `${currentTrack.title} - ${currentTrack.artist}`;
        getYT(searchQuery);
    }
}

// playLocalFile function - slightly ensure YouTube is paused before starting HTML5
function playLocalFile(fileObject) {
    if (!html5AudioPlayer) {
        console.error("HTML5 Audio Player not initialized!");
        return;
    }
    // Ensure YouTube player is paused
    if (player && typeof player.pauseVideo === 'function' && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    }
    // (Rest of playLocalFile is likely fine)
    // ...
    if (fileObject instanceof File) {
        localFileBlobUrl = URL.createObjectURL(fileObject);
        html5AudioPlayer.src = localFileBlobUrl;
    } else if (typeof fileObject === 'string' && fileObject.startsWith('blob:')) {
        html5AudioPlayer.src = fileObject;
        localFileBlobUrl = fileObject; 
    } else {
        console.error("Invalid local file reference for playLocalFile:", fileObject);
        showToast("Error: Could not load local file.", 3000);
        return;
    }

    html5AudioPlayer.load(); 
    html5AudioPlayer.play()
        .then(() => {
            isPlaying = true;
            if(playPauseBtn) {
                playPauseBtn.classList.remove("icon-play");
                playPauseBtn.classList.add("icon-pause");
            }
        })
        .catch(error => {
            console.error("Error playing local file:", error);
            showToast("Error: Could not play local file.", 3000);
            isPlaying = false;
            if(playPauseBtn) {
                playPauseBtn.classList.remove("icon-pause");
                playPauseBtn.classList.add("icon-play");
            }
        });
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