function playSong(title, artist, artwork) {
    trackTitle.textContent = title;
    artistName.textContent = artist;
  
    lyricsSongTitle.textContent = title;
    lyricsArtistName.textContent = artist;
  
    if (showingLyrics) {
      fetchLyrics(artist, title);
    }
  
    const highResArtwork = artwork.replace("100x100", "600x600");
  
    albumCover.crossOrigin = "anonymous";
    albumCover.src = highResArtwork;
  
    albumCover.onload = function () {
      try {
        const dominantColor = colorThief.getColor(albumCover);
        applyColors(dominantColor);
      } catch (e) {
        console.error("Color extraction failed:", e);
      }
    };
  
    currentTrack = {
      title: title,
      artist: artist,
      artwork: artwork,
    };
  
    const searchQuery = `${title} - ${artist}`;
    getYT(searchQuery);
  }

  function loadVid(videoId) {
    if (player && player.loadVideoById) {
      player.loadVideoById(videoId);
      player.playVideo();
  
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
      }
    } else {
      console.error("YouTube player not ready");
    }
  }
  