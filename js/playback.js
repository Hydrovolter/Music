function togglePlayback() {
    console.log("Toggle playback called");
    if (!player) return;
  
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
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
    if (!player || !player.getDuration) return;
  
    const rect = seekBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const percent = Math.min(Math.max(position, 0), 1);
  
    progressBar.style.width = percent * 100 + "%";
  
    const duration = player.getDuration();
    player.seekTo(percent * duration, true);
  }
  
  function updateProgress() {
    if (!player || !player.getDuration || isDragging) return;
  
    try {
      const duration = player.getDuration() || 0;
      const currentTime = player.getCurrentTime() || 0;
      const percent = (currentTime / duration) * 100;
  
      progressBar.style.width = percent + "%";
  
      currentTimeSpan.textContent = formatTime(currentTime);
      remainingTimeSpan.textContent = "-" + formatTime(duration - currentTime);
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  }
  
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  }
  