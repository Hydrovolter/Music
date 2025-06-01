function togglePlayback() {
  if (currentPlayingWith === 'youtube' && player) {
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer) {
      if (isPlaying) html5AudioPlayer.pause();
      else html5AudioPlayer.play().catch(e => console.error("Error in html5 play:", e));
  } else {
      console.log("No active player to toggle.");
  }
}

function startSeek(e) {
  isDragging = true;
  seekBar.classList.add("active");
  updateSeekPosition(e);
}

function dragSeek(e) {
  if (isDragging) {
      updateSeekPosition(e);
  }
}

function endSeek() {
  if (isDragging) {
      isDragging = false;
      seekBar.classList.remove("active");
  }
}

function updateSeekPosition(e) {
  const rect = seekBar.getBoundingClientRect();
  const position = (e.clientX - rect.left) / rect.width;
  const percent = Math.min(Math.max(position, 0), 1);

  progressBar.style.width = percent * 100 + "%";

  if (currentPlayingWith === 'youtube' && player && player.getDuration) {
      const duration = player.getDuration();
      player.seekTo(percent * duration, true);
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer && html5AudioPlayer.duration) {
      html5AudioPlayer.currentTime = percent * html5AudioPlayer.duration;
  }
}

function updateProgress() {
  if (isDragging) return;
  let duration = 0;
  let currentTime = 0;

  if (currentPlayingWith === 'youtube' && player && player.getDuration) {
      try {
          duration = player.getDuration() || 0;
          currentTime = player.getCurrentTime() || 0;
      } catch (error) { console.error("Error getting YT progress:", error); return; }
  } else if (currentPlayingWith === 'html5' && html5AudioPlayer && html5AudioPlayer.duration) {
      duration = html5AudioPlayer.duration || 0;
      currentTime = html5AudioPlayer.currentTime || 0;
  } else {
      // No active player or duration not available yet
      progressBar.style.width = "0%";
      currentTimeSpan.textContent = formatTime(0);
      remainingTimeSpan.textContent = "-" + formatTime(0);
      return;
  }
  
  if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      progressBar.style.width = percent + "%";
  } else {
      progressBar.style.width = "0%";
  }

  currentTimeSpan.textContent = formatTime(currentTime);
  remainingTimeSpan.textContent = "-" + formatTime(duration - currentTime);
}
  
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  }
  