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
    playPauseBtn.classList.remove("fa-play");
    playPauseBtn.classList.add("fa-pause");
  } else if (
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.ENDED
  ) {
    isPlaying = false;
    playPauseBtn.classList.remove("fa-pause");
    playPauseBtn.classList.add("fa-play");
  }
}
// Toggle Mute function
function toggleMute() {
  if (!player) return;

  if (isMuted) {
    player.unMute();
    volumeBtn.className = "fa-solid fa-volume-high control-btn";
    isMuted = false;
  } else {
    player.mute();
    volumeBtn.className = "fa-solid fa-volume-xmark control-btn";
    isMuted = true;
  }
}
