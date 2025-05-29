// js/play.js

// artworkUrl is expected to be the 100x100 version from iTunes/search
// trackId should be a string if provided
function playSong(title, artist, artworkUrl, trackId = null) {
  const newTrackId = trackId ? trackId.toString() : `${title}-${artist}`.toLowerCase().replace(/\s+/g, '-');

  currentTrack = {
      id: newTrackId,
      title: title,
      artist: artist,
      artwork: artworkUrl, // Store the 100x100 for consistency
      artworkLarge: artworkUrl.replace("100x100", "600x600")
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
      if (albumCover.src !== window.location.href + 'img/empty_art.png' && albumCover.src !== 'img/empty_art.png') {
          try {
              const dominantColor = colorThief.getColor(albumCover);
              applyColors(dominantColor);
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
  };

  if (typeof updateLikeButtonState === 'function') {
      updateLikeButtonState(); // Update based on the new currentTrack.id
  }

  // If playSong is called NOT from playlist context, clear it.
  // This logic is now handled more directly by checking how playSong was invoked (e.g. from search.js vs playlist.js)
  // The `currentPlayingPlaylistType` is set by `playSongFromLikedPlaylist`.
  // If `playSong` is called from search, `currentPlayingPlaylistType` won't be 'liked'.

  const searchQuery = `${currentTrack.title} - ${currentTrack.artist}`;
  getYT(searchQuery); // This will eventually call loadVid -> player.playVideo()
}

function loadVid(videoId) {
  if (player && typeof player.loadVideoById === 'function') {
      // Ensure player is ready before calling playVideo.
      // The onStateChange event for BUFFERING or CUED can be used to trigger play.
      // Or, assume playVideo will work correctly after loadVideoById.
      player.loadVideoById(videoId);
      // player.playVideo(); // YT API will often autoplay after loadVideoById if player was playing.
                          // Or it will cue it. Let onStateChange handle playing.

      if (isMuted && typeof player.mute === 'function') {
          player.mute();
      } else if (typeof player.unMute === 'function') {
          player.unMute();
      }
  } else {
      console.error("YouTube player not ready or loadVideoById not available.");
  }
}