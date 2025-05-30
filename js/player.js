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

  // playPauseBtn, volumeBtn, loopBtn are global from init.js
  // seekBar is global from init.js
  playPauseBtn.addEventListener("click", togglePlayback); // togglePlayback is global from playback.js
  volumeBtn.addEventListener("click", toggleMute);
  loopBtn.addEventListener("click", toggleLoop);
  if (shuffleBtn) shuffleBtn.addEventListener("click", toggleShuffle);

  seekBar.addEventListener("mousedown", startSeek); // startSeek from playback.js
  document.addEventListener("mousemove", dragSeek); // dragSeek from playback.js
  document.addEventListener("mouseup", endSeek);   // endSeek from playback.js

  setInterval(updateProgress, 500); // updateProgress from playback.js
  updateLoopButtonIcon(); // Initialize loop button icon based on global loopState
  updateShuffleButtonIcon();

  // Initial color logic - unchanged
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
    // progressBar, currentTimeSpan, remainingTimeSpan are global
    // formatTime is from playback.js
    if(progressBar) progressBar.style.width = "0%";
    if(currentTimeSpan) currentTimeSpan.textContent = formatTime(0);
    if (player && typeof player.getDuration === 'function') {
        const duration = player.getDuration();
        if(remainingTimeSpan) remainingTimeSpan.textContent = "-" + formatTime(duration || 0);
    } else {
        if(remainingTimeSpan) remainingTimeSpan.textContent = "-0:00";
    }
    // Optionally, clear current track display if desired, but typically not needed
    // as the UI still shows the last played song until a new one starts.
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
  if (!player || typeof player.isMuted !== 'function') return;
  // isMuted is global
  // volumeBtn is global
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