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
  console.log("Player state changed:", event.data, "isLooping:", isLooping, "currentPlayingPlaylistType:", currentPlayingPlaylistType);

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

    if (isLooping && player) { // Single track loop
      player.seekTo(0, true);
      player.playVideo();
    } else if (typeof playNextTrackInCurrentPlaylist === 'function' &&
               currentPlayingPlaylistType === 'liked' && likedPlaylist && likedPlaylist.length > 0) {
        // If not looping single song, and playing from liked playlist, play next
        // But only if there are more songs or it's not the only song (unless we want single song in playlist to loop)
        if (likedPlaylist.length > 1 || (likedPlaylist.length === 1 /* && some_playlist_loop_setting (future) */)) {
            console.log("Song ended, playing next in liked playlist.");
            playNextTrackInCurrentPlaylist();
        } else {
            // Single song in playlist ended, not looping. Reset things.
            clearPlayerStateOnEnd();
        }
    } else {
      // Song ended, not looping, and not part of an active auto-advancing playlist
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
    // 2 – invalid parameter
    // 5 – HTML5 player error
    // 100 – video not found (removed or private)
    // 101 – playback disallowed by owner (embedding)
    // 150 – same as 101
    isPlaying = false; // Ensure player state is updated
    playPauseBtn.classList.remove("icon-pause");
    playPauseBtn.classList.add("icon-play");

    if (event.data === 101 || event.data === 150) {
        // Consider using a less intrusive notification system in the future
        alert(`Error: "${currentTrack.title}" cannot be played due to embedding restrictions by the owner.`);
    }

    // Attempt to play next if in a playlist context and not looping current song
    if (!isLooping && typeof playNextTrackInCurrentPlaylist === 'function' &&
        currentPlayingPlaylistType === 'liked' && likedPlaylist && likedPlaylist.length > 0) {
        console.warn("Player error, attempting to play next track in liked playlist.");
        playNextTrackInCurrentPlaylist();
    } else {
        // Error on a single track or looping track, stop and clear
        clearPlayerStateOnEnd();
        if (isLooping) { // Turn off loop to prevent error loop on the same track
            isLooping = false;
            if(loopBtn) loopBtn.classList.remove("loop-active");
        }
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
  isLooping = !isLooping;
  if (isLooping) {
    loopBtn.classList.add("loop-active");
  } else {
    loopBtn.classList.remove("loop-active");
  }
  console.log("Looping (single track) toggled:", isLooping);
}