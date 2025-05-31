// js/play.js

// artworkUrl is expected to be the 100x100 version
// trackId should be a string if provided
function playSong(title, artist, artworkUrl, trackId = null, durationSeconds = 0) {
    const newTrackId = trackId ? trackId.toString() : `${title}-${artist}`.toLowerCase().replace(/\s+/g, '-');
  
    currentTrack = {
        id: newTrackId,
        title: title,
        artist: artist,
        artwork: artworkUrl,
        artworkLarge: artworkUrl ? artworkUrl.replace("100x100", "600x600") : 'img/empty_art.png',
        // --- BEGIN MODIFICATION: Store durationSeconds ---
        durationSeconds: durationSeconds || 0 // Store it, default to 0 if not provided
        // --- END MODIFICATION ---
    };
  
    trackTitle.textContent = currentTrack.title;
    artistName.textContent = currentTrack.artist;
  
    lyricsSongTitle.textContent = currentTrack.title;
    lyricsArtistName.textContent = currentTrack.artist;
  
    if (showingLyrics) {
        fetchLyrics(currentTrack.artist, currentTrack.title);
    }
  
    albumCover.crossOrigin = "anonymous";
    albumCover.src = currentTrack.artworkLarge;
  
    albumCover.onload = function () {
        if (albumCover.src && !albumCover.src.endsWith('img/empty_art.png')) {
            try {
                const dominantColor = colorThief.getColor(albumCover);
                applyColors(dominantColor);
            } catch (e) {
                console.error("Color extraction failed (onload):", e);
                applyColors([100, 100, 100]);
            }
        } else {
             applyColors([115, 98, 86]);
        }
    };
    albumCover.onerror = function() {
        console.error("Failed to load album art:", currentTrack.artworkLarge);
        applyColors([100, 100, 100]);
        albumCover.src = 'img/empty_art.png';
    };
  
    if (typeof updateLikeButtonState === 'function') {
        updateLikeButtonState();
    }
  
    const searchQuery = `${currentTrack.title} - ${currentTrack.artist}`;
    getYT(searchQuery);
  }

function loadVid(videoId) {
  // player is global from init.js (and player.js)
  // isMuted is global from init.js
  if (player && typeof player.loadVideoById === 'function') {
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