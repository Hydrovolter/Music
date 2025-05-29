const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    height: "360",
    width: "640",
    videoId: "-",
    playerVars: {
      playsinline: 1,
      controls: 0,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady(event) {
  console.log("Player is ready");

  playPauseBtn.addEventListener("click", togglePlayback);
  volumeBtn.addEventListener("click", toggleMute);
  loopBtn.addEventListener("click", toggleLoop);

  seekBar.addEventListener("mousedown", startSeek);
  document.addEventListener("mousemove", dragSeek);
  document.addEventListener("mouseup", endSeek);

  setInterval(updateProgress, 500);

  if (albumCover.complete) {
    try {
      const dominantColor = colorThief.getColor(albumCover);
      applyColors(dominantColor);
    } catch (e) {
      console.error("Initial color extraction failed:", e);
    }
  } else {
    albumCover.onload = function () {
      try {
        const dominantColor = colorThief.getColor(albumCover);
        applyColors(dominantColor);
      } catch (e) {
        console.error("Initial color extraction failed:", e);
      }
    };
  }
}

function onPlayerStateChange(event) {
  console.log("Player state changed:", event.data);

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
    
    if (isLooping && player) {
      player.seekTo(0, true); 
      player.playVideo();     
    }
  }
  
}


// Toggle Mute function
function toggleMute() {
  if (!player) return;

  if (isMuted) {
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

  isLooping = !isLooping;
  if (isLooping) {
    loopBtn.classList.add("loop-active");
  } else {
    loopBtn.classList.remove("loop-active");
  }
}