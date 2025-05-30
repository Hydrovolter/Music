// js/player.js

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    height: "1", // Keep small and out of sight
    width: "1",
    videoId: "-", // Initial dummy videoId, will be replaced
    playerVars: {
      playsinline: 1,
      controls: 0,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      autoplay: 0, // Important: We control play/pause via API
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError // Add an error handler
    },
  });
}

function onPlayerReady(event) {
  console.log("Player is ready");
  // Don't autoplay on ready unless a song is already cued by logic

  playPauseBtn.addEventListener("click", togglePlayback);
  volumeBtn.addEventListener("click", toggleMute);
  loopBtn.addEventListener("click", toggleLoop);

  seekBar.addEventListener("mousedown", startSeek);
  document.addEventListener("mousemove", dragSeek);
  document.addEventListener("mouseup", endSeek);

  setInterval(updateProgress, 500);
  updateLoopButtonIcon();

  // Initial color logic if albumCover is already loaded (e.g. from cache or default)
  if (albumCover.complete && albumCover.src !== window.location.href + 'img/empty_art.png' && albumCover.src !== 'img/empty_art.png') {
    try {
      const dominantColor = colorThief.getColor(albumCover);
      applyColors(dominantColor);
    } catch (e) {
      console.error("Initial color extraction failed (already complete):", e);
      applyColors([100,100,100]);
    }
  } else if (albumCover.src === window.location.href + 'img/empty_art.png' || albumCover.src === 'img/empty_art.png') {
    applyColors([115, 98, 86]); // Default for empty art
  }
  // albumCover.onload is set in play.js
}

function onPlayerStateChange(event) {
  console.log("Player state changed:", event.data, "| Loop state:", loopState, "| Current Playlist Track Index:", currentPlaylistTrackIndex, "| Liked Playlist Length:", (typeof likedPlaylist !== 'undefined' ? likedPlaylist.length : 'N/A'));

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

    if (loopState === 'song' && player) { // Loop current song - PRIORITY 1
      player.seekTo(0, true);
      player.playVideo();
    } else if (currentPlayingPlaylistType === 'liked' && // Check if it's the liked playlist - PRIORITY 2 (for playlist progression)
               typeof likedPlaylist !== 'undefined' && likedPlaylist.length > 0 &&
               typeof playNextTrackInCurrentPlaylist === 'function') {

        const isLastTrackInPlaylist = (currentPlaylistTrackIndex >= likedPlaylist.length - 1);

        if (loopState === 'playlist') { // Loop the entire playlist
            console.log("Song ended, looping liked playlist (loopState='playlist'). Playing next/first.");
            playNextTrackInCurrentPlaylist(); // This will handle wrapping from last to first
        } else if (loopState === 'none' && !isLastTrackInPlaylist) { // No loop, but not the last song
            console.log("Song ended, playing next in liked playlist (loopState='none', not last track).");
            playNextTrackInCurrentPlaylist();
        } else {
            // loopState is 'none' AND it was the last track OR
            // it's some other playlist type not explicitly handled for progression
            console.log("Song ended. Playlist finished (or not configured for auto-advance) and no loop active.");
            clearPlayerStateOnEnd();
        }
    } else {
      // Not in a 'liked' playlist context, or likedPlaylist is empty/undefined
      // AND not looping the current song (already handled by 'if loopState === song')
      console.log("Song ended. Not in a playlist or not looping song.");
      clearPlayerStateOnEnd();
    }
  } else if (event.data === YT.PlayerState.CUED && currentTrack && currentTrack.id !== null && !isPlaying) {
    // If a video is cued (e.g. after loadVideoById) and we intend to play it, start playback.
    // This can help if YT's own autoplay after loadVideoById is unreliable.
    // Be careful not to create play loops.
    console.log("Video cued, attempting to play.");
    player.playVideo();
  }
}

function clearPlayerStateOnEnd() {
    // Reset progress bar, time
    if(progressBar) progressBar.style.width = "0%";
    if(currentTimeSpan) currentTimeSpan.textContent = formatTime(0);
    if (player && typeof player.getDuration === 'function') {
        const duration = player.getDuration();
        if(remainingTimeSpan) remainingTimeSpan.textContent = "-" + formatTime(duration || 0);
    } else {
        if(remainingTimeSpan) remainingTimeSpan.textContent = "-0:00";
    }
    // Optionally, clear current track display if you want it to revert to "Not Playing"
    // currentTrack = { id: null, title: "Not Playing", artist: "Not Playing", artwork: "img/empty_art.png", artworkLarge: "img/empty_art.png" };
    // trackTitle.textContent = currentTrack.title;
    // artistName.textContent = currentTrack.artist;
    // albumCover.src = currentTrack.artworkLarge;
    // applyColors([115, 98, 86]);
    // if (typeof updateLikeButtonState === 'function') updateLikeButtonState(false);
    if (typeof clearPlaylistContext === 'function') {
        // clearPlaylistContext(); // This might be too aggressive here, consider context
    }
}


function onPlayerError(event) {
  console.error("YouTube Player Error:", event.data, "Song:", currentTrack.title);
  isPlaying = false;
  playPauseBtn.classList.remove("icon-pause");
  playPauseBtn.classList.add("icon-play");

  if (event.data === 101 || event.data === 150) {
      alert(`Error: "${currentTrack.title}" cannot be played due to embedding restrictions by the owner.`);
  }

  // Attempt to play next if in a 'loop playlist' context
  if (loopState === 'playlist' && // Check if playlist loop is active
      typeof playNextTrackInCurrentPlaylist === 'function' &&
      currentPlayingPlaylistType === 'liked' && likedPlaylist && likedPlaylist.length > 0) {
      console.warn("Player error, attempting to play next track in liked playlist (playlist loop active).");
      playNextTrackInCurrentPlaylist();
  } else if (loopState !== 'song') { // If not looping the current song (which would retry itself)
      clearPlayerStateOnEnd();
  }
  // If loopState === 'song', it will likely error again on retry. We might want to break this cycle.
  // For now, if looping song and error, it will retry. Consider adding error counter to break loop.
  if (loopState === 'song' && (event.data === 101 || event.data === 150)) {
      console.warn("Error on a song set to loop. Disabling loop to prevent error cycle.");
      loopState = 'none'; // Revert to no loop to prevent error loop
      updateLoopButtonIcon();
      clearPlayerStateOnEnd();
  }
}

// Toggle Mute function
function toggleMute() {
  if (!player || typeof player.isMuted !== 'function') return;

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

function toggleLoop() {
  if (!player) return;

  const playlistIsActive = (currentPlayingPlaylistType !== null && typeof likedPlaylist !== 'undefined' && likedPlaylist.length > 0);

  if (playlistIsActive) {
      // Cycle through 3 states: none -> playlist -> song -> none
      if (loopState === 'none') {
          loopState = 'playlist';
      } else if (loopState === 'playlist') {
          loopState = 'song';
      } else { // loopState === 'song'
          loopState = 'none';
      }
  } else {
      // No playlist active, cycle through 2 states: none -> song -> none
      if (loopState === 'none') {
          loopState = 'song';
      } else { // loopState === 'song'
          loopState = 'none';
      }
  }
  console.log("Loop state changed to:", loopState, "| Playlist active:", playlistIsActive);
  updateLoopButtonIcon();
}

// New function to update the loop button's visual state
function updateLoopButtonIcon() {
  if (!loopBtn) return;

  // Remove all potentially active loop classes first
  loopBtn.classList.remove('loop-active', 'loop-playlist-active');

  if (loopState === 'song') {
      // Add class for "loop current song" (repeat-1.svg, green)
      loopBtn.classList.add('loop-active');
  } else if (loopState === 'playlist') {
      // Add class for "loop playlist" (repeat.svg, green)
      loopBtn.classList.add('loop-playlist-active');
  }
  // If loopState is 'none', no extra class is added, so it uses default .icon-loop style
}