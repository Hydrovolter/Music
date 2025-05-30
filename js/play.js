// js/play.js

// artworkUrl is expected to be the 100x100 version
// trackId should be a string if provided
function playSong(title, artist, artworkUrl, trackId = null) {
  // Generate a fallback ID if trackId is not provided (less reliable for liking/uniqueness)
  const newTrackId = trackId ? trackId.toString() : `${title}-${artist}`.toLowerCase().replace(/\s+/g, '-');

  currentTrack = {
      id: newTrackId,
      title: title,
      artist: artist,
      artwork: artworkUrl, // Store the 100x100
      artworkLarge: artworkUrl ? artworkUrl.replace("100x100", "600x600") : 'img/empty_art.png'
  };

  trackTitle.textContent = currentTrack.title;
  artistName.textContent = currentTrack.artist;

  lyricsSongTitle.textContent = currentTrack.title;
  lyricsArtistName.textContent = currentTrack.artist;

  if (showingLyrics) { // showingLyrics is global from init.js
      fetchLyrics(currentTrack.artist, currentTrack.title); // fetchLyrics is global from lyrics.js
  }

  albumCover.crossOrigin = "anonymous";
  albumCover.src = currentTrack.artworkLarge;

  albumCover.onload = function () {
      // Check if the source is not the default empty art before trying colorThief
      if (albumCover.src && !albumCover.src.endsWith('img/empty_art.png')) {
          try {
              const dominantColor = colorThief.getColor(albumCover); // colorThief is global
              applyColors(dominantColor); // applyColors is global from bg.js
          } catch (e) {
              console.error("Color extraction failed (onload):", e);
              applyColors([100, 100, 100]); // Fallback color
          }
      } else {
           applyColors([115, 98, 86]); // Default for empty art
      }
  };
  albumCover.onerror = function() {
      console.error("Failed to load album art:", currentTrack.artworkLarge);
      applyColors([100, 100, 100]); // Fallback color on error
      albumCover.src = 'img/empty_art.png'; // Revert to default art on error
  };

  // Update UI elements that depend on the current track
  if (typeof updateLikeButtonState === 'function') { // From playlist.js
      updateLikeButtonState();
  }
  // updatePlaylistControlsVisibility is called by playSongFromCurrentPlaylist or clearPlaylistContext
  // If playSong is called from search, clearPlaylistContext (in search.js) should have been called first.

  const searchQuery = `${currentTrack.title} - ${currentTrack.artist}`;
  getYT(searchQuery); // getYT is global from getYT.js
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