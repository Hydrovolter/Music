// js/player.js

// YouTube Iframe API setup (tag, firstScriptTag) - unchanged
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", { // player is global
    height: "1",
    width: "1",
    videoId: "-",
    playerVars: {
      playsinline: 1,
      controls: 0,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      autoplay: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    },
  });
}

function onPlayerReady(event) {
  console.log("Player is ready");

  playPauseBtn.addEventListener("click", togglePlayback);
  volumeBtn.addEventListener("click", toggleMute);
  loopBtn.addEventListener("click", toggleLoop);
  if (shuffleBtn) shuffleBtn.addEventListener("click", toggleShuffle);

  seekBar.addEventListener("mousedown", startSeek);
  document.addEventListener("mousemove", dragSeek);
  document.addEventListener("mouseup", endSeek);

  setInterval(updateProgress, 500);
  updateLoopButtonIcon();
  updateShuffleButtonIcon();

  // --- REMOVE OR COMMENT OUT THIS INITIAL COLOR LOGIC ---
  /*
  if (albumCover.complete && albumCover.src && !albumCover.src.endsWith('img/empty_art.png')) {
    try {
      const dominantColor = colorThief.getColor(albumCover);
      applyColors(dominantColor);
    } catch (e) {
      console.error("Initial color extraction failed (already complete):", e);
      applyColors([100,100,100]);
    }
  } else if (albumCover.src && albumCover.src.endsWith('img/empty_art.png')) {
    applyColors([115, 98, 86]);
  }
  */
  // --- END REMOVAL ---

  // When the app starts, the albumCover is 'img/empty_art.png'.
  // We want the default background for this.
  // Call setAlbumArtAndBackgroundColor with the default to initialize.
  if (typeof setAlbumArtAndBackgroundColor === 'function') {
      setAlbumArtAndBackgroundColor(albumCover.src); // This will handle the default art
  } else {
      applyColors([115, 98, 86]); // Fallback
  }
}

// Updates the visual state of the loop button based on global 'loopState'
function updateLoopButtonIcon() {
    if (!loopBtn) return; // loopBtn is global
    loopBtn.classList.remove('loop-active', 'loop-playlist-active');

    if (loopState === 'song') {
        loopBtn.classList.add('loop-active'); // For repeat-1.svg, green
    } else if (loopState === 'playlist') {
        loopBtn.classList.add('loop-playlist-active'); // For repeat.svg, green
    }
    // If 'none', no extra class, uses default .icon-loop style
}

// Manages cycling through loop states
function toggleLoop() {
    if (!player) return; // player is global

    // currentPlayingPlaylistId is global from init.js
    // likedPlaylist and userPlaylists are global from init.js
    const activePlaylist = getPlaylistById(currentPlayingPlaylistId); // from playlist.js
    const playlistIsEffectivelyActive = activePlaylist && activePlaylist.songs && activePlaylist.songs.length > 0;

    if (playlistIsEffectivelyActive) {
        if (loopState === 'none') loopState = 'playlist';
        else if (loopState === 'playlist') loopState = 'song';
        else loopState = 'none'; // 'song' -> 'none'
    } else { // No playlist active, or active playlist is empty
        if (loopState === 'none') loopState = 'song';
        else loopState = 'none'; // 'song' -> 'none'
    }
    console.log("Loop state changed to:", loopState, "| Playlist active for looping:", playlistIsEffectivelyActive);
    updateLoopButtonIcon();
}

function onPlayerStateChange(event) {
  console.log("Player state:", event.data, "| Loop:", loopState, "| Shuffle:", isShuffleActive, "| PlaylistID:", currentPlayingPlaylistId, "| TrackIdx:", currentPlaylistTrackIndex);

  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    playPauseBtn.classList.remove("icon-play");
    playPauseBtn.classList.add("icon-pause");
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    playPauseBtn.classList.remove("icon-pause");
    playPauseBtn.classList.add("icon-play");
  } else if (event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    playPauseBtn.classList.remove("icon-pause");
    playPauseBtn.classList.add("icon-play");

    if (loopState === 'song' && player) {
      player.seekTo(0, true);
      player.playVideo();
    } else if (isShuffleActive && currentPlayingPlaylistId) { // SHUFFLE takes precedence over simple playlist next
        playNextTrackInCurrentPlaylist(); // This will use shuffle logic
    } else if (currentPlayingPlaylistId && typeof getPlaylistById === 'function' && typeof playNextTrackInCurrentPlaylist === 'function') {
        // Non-shuffled playlist logic
        const currentPlaylist = getPlaylistById(currentPlayingPlaylistId);
        if (currentPlaylist && currentPlaylist.songs && currentPlaylist.songs.length > 0) {
            const isLastTrack = currentPlaylistTrackIndex >= currentPlaylist.songs.length - 1;
            if (loopState === 'playlist') {
                playNextTrackInCurrentPlaylist();
            } else if (loopState === 'none' && !isLastTrack) {
                playNextTrackInCurrentPlaylist();
            } else {
                clearPlayerStateOnEnd();
            }
        } else {
             clearPlayerStateOnEnd();
        }
    } else {
      clearPlayerStateOnEnd();
    }
  } else if (event.data === YT.PlayerState.CUED && currentTrack && currentTrack.id !== null && !isPlaying) {
    if (player && typeof player.playVideo === 'function') player.playVideo();
  }
}

function clearPlayerStateOnEnd() {
  if (progressBar) progressBar.style.width = "0%";
  if (currentTimeSpan) currentTimeSpan.textContent = formatTime(0);

  let durationToDisplay = 0;
  if (currentPlayingWith === 'youtube' && player && typeof player.getDuration === 'function') {
      if (player.getPlayerState && (player.getPlayerState() !== YT.PlayerState.UNSTARTED && player.getPlayerState() !== -1)) {
          durationToDisplay = player.getDuration() || 0;
      }
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer) {
      durationToDisplay = html5AudioPlayer.duration || 0;
      if (isNaN(durationToDisplay)) durationToDisplay = 0;
  }

  if (remainingTimeSpan) remainingTimeSpan.textContent = "-" + formatTime(durationToDisplay);

  // +++ START: MODIFICATION FOR BUTTON VISIBILITY ON CLEAR +++
  // If currentTrack is truly reset (e.g., its ID becomes null)
  // or if you have a specific "Not Playing" state check.
  // For simplicity, let's assume if clearPlayerStateOnEnd is called,
  // and we are not immediately playing another track, these buttons should be default.
  // However, playSong will manage their state when a NEW song (or "Not Playing") is set.
  // So, the most important part is that playSong handles it when transitioning *to* "Not Playing".

  // To ensure buttons are visible when app loads or truly stops:
  // This can be done when currentTrack is set to the initial "Not Playing" state.
  // Let's adjust playSong to handle the "Not Playing" state explicitly for button visibility.
  // No direct change here in clearPlayerStateOnEnd might be needed if playSong handles "Not Playing" correctly.
  // However, if playSong for "Not Playing" isn't explicitly called, this is a good failsafe:
  if (currentTrack && currentTrack.id === null) { // A good check for "Not Playing" state
      if (likeBtnElement) {
          likeBtnElement.style.display = 'inline-block';
          updateLikeButtonState(); // Reset heart to empty
      }
      if (addToPlaylistBtnElement) {
          addToPlaylistBtnElement.style.display = 'inline-block';
      }
      console.log("Reset Like/Add buttons to visible for 'Not Playing' state.");
  }
  // +++ END: MODIFICATION +++
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data, "Song:", currentTrack ? currentTrack.title : "N/A");
    isPlaying = false;
    if (playPauseBtn) {
        playPauseBtn.classList.remove("icon-pause");
        playPauseBtn.classList.add("icon-play");
    }

    if (event.data === 101 || event.data === 150) {
      if (typeof showGeneralModal === 'function') {
          // Use escapeModalHtml from modals.js if available, or a local/global escapeHtml
          const songTitle = currentTrack ? (typeof escapeModalHtml === 'function' ? escapeModalHtml(currentTrack.title) : currentTrack.title) : "This song";
          showGeneralModal(
              "Playback Error",
              `"${songTitle}" cannot be played due to video embedding restrictions by the owner.`
          );
      } else {
          alert(`Error: "${currentTrack ? currentTrack.title : "This song"}" cannot be played due to embedding restrictions.`);
      }
  }

    if (loopState === 'playlist' && currentPlayingPlaylistId && typeof playNextTrackInCurrentPlaylist === 'function') {
        console.warn("Player error, attempting next track due to 'loop playlist' state.");
        playNextTrackInCurrentPlaylist();
    } else if (loopState === 'song' && (event.data === 101 || event.data === 150)) {
        // If looping a song that causes an embedding error, stop looping it.
        console.warn("Embedding error on a looping song. Disabling loop for this track.");
        loopState = 'none';
        updateLoopButtonIcon();
        clearPlayerStateOnEnd();
    } else if (loopState !== 'song') { // If not looping the current song (which would retry itself)
        clearPlayerStateOnEnd();
    }
    // If loopState is 'song' and it's a different error, it will try to replay and likely error again.
    // A counter for repeated errors on the same song might be useful for breaking such loops.
}

// Toggle Mute function
function toggleMute() {
  if (currentPlayingWith === 'youtube' && player && typeof player.isMuted === 'function') {
      if (player.isMuted()) {
          player.unMute();
          volumeBtn.classList.remove("icon-muted");
          volumeBtn.classList.add("icon-volume");
          isMuted = false;
      } else {
          player.mute();
          volumeBtn.classList.remove("icon-volume");
          volumeBtn.classList.add("icon-muted");
          isMuted = true;
      }
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer) {
      html5AudioPlayer.muted = !html5AudioPlayer.muted;
      isMuted = html5AudioPlayer.muted;
      if (isMuted) {
          volumeBtn.classList.remove("icon-volume");
          volumeBtn.classList.add("icon-muted");
      } else {
          volumeBtn.classList.remove("icon-muted");
          volumeBtn.classList.add("icon-volume");
      }
  }
}

// --- SHUFFLE FUNCTIONS ---
function updateShuffleButtonIcon() {
  if (!shuffleBtn) return;
  if (isShuffleActive) {
      shuffleBtn.classList.add('shuffle-active');
  } else {
      shuffleBtn.classList.remove('shuffle-active');
  }
}

function toggleShuffle() {
  if (!currentPlayingPlaylistId) { // Shuffle only makes sense with an active playlist
      // Optionally inform user or just do nothing
      console.warn("Shuffle toggled but no active playlist.");
      isShuffleActive = false; // Ensure it's off
      updateShuffleButtonIcon();
      return;
  }

  isShuffleActive = !isShuffleActive;
  console.log("Shuffle state changed to:", isShuffleActive);

  if (isShuffleActive) {
      // If shuffle is activated, and a playlist is playing, initialize shuffle queues
      const playlist = getPlaylistById(currentPlayingPlaylistId);
      if (playlist && playlist.songs.length > 0) {
          // Pass the currently playing track's ID so it can be handled correctly
          const currentTrackIdForShuffle = currentTrack && currentTrack.id ? currentTrack.id : null;
          initializeShuffleQueues(playlist.songs, currentTrackIdForShuffle);
      } else {
          // Playlist became empty or invalid, turn shuffle off
          isShuffleActive = false;
      }
  } else {
      // Shuffle turned off, clear queues
      shuffleUpcomingQueue = [];
      shufflePlayedQueue = [];
  }
  updateShuffleButtonIcon();
  // No need to immediately play next song; current song continues.
  // The next/prev or song end logic will use the new shuffle state.
}


function clearPlayerStateOnEnd() {
  if (progressBar) progressBar.style.width = "0%";
  if (currentTimeSpan) currentTimeSpan.textContent = formatTime(0); // formatTime from playback.js

  let durationToDisplay = 0;
  if (currentPlayingWith === 'youtube' && player && typeof player.getDuration === 'function') {
      // Check if player is loaded and has a duration
      if (player.getPlayerState && (player.getPlayerState() !== YT.PlayerState.UNSTARTED && player.getPlayerState() !== -1) ) {
           durationToDisplay = player.getDuration() || 0;
      }
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer) {
      durationToDisplay = html5AudioPlayer.duration || 0;
      if (isNaN(durationToDisplay)) durationToDisplay = 0; // Handle NaN case
  }

  if (remainingTimeSpan) remainingTimeSpan.textContent = "-" + formatTime(durationToDisplay);

  // Optionally, if you want to reset the track title/artist display to "Not Playing"
  // when playback truly stops and doesn't auto-advance:
  /*
  if (!currentPlayingPlaylistId || (loopState === 'none' && isLastTrackInPlaylist())) { // Add isLastTrackInPlaylist helper
      if (trackTitle) trackTitle.textContent = "Not Playing";
      if (artistName) artistName.textContent = "Not Playing";
      if (albumCover) albumCover.src = "img/empty_art.png";
      if (typeof applyColors === 'function') applyColors([115, 98, 86]); // Reset background
      currentTrack = { id: null, title: "Not Playing", artist: "Not Playing", artwork: "img/empty_art.png", artworkLarge: "img/empty_art.png", isLocalFile: false, localFileReference: null, durationSeconds: 0 };
      currentPlayingWith = null;
      if(typeof updateLikeButtonState === 'function') updateLikeButtonState();
  }
  */
}