lyricsToggle.addEventListener("click", function () {
    showingLyrics = !showingLyrics;
  
    if (showingLyrics) {
      playerInfo.style.display = "none";
      lyricsInfo.style.display = "flex";
      fetchLyrics(currentTrack.artist, currentTrack.title);
      lyricsToggle.innerHTML = '<i class="fa-solid fa-music"></i>';
    } else {
      playerInfo.style.display = "flex";
      lyricsInfo.style.display = "none";
      lyricsToggle.innerHTML = '<i class="fa-solid fa-align-left"></i>';
    }
  });
  
  function fetchLyrics(artist, title) {
    lyricsSongTitle.textContent = title;
    lyricsArtistName.textContent = artist;
    lyricsContent.textContent = "Loading lyrics...";
  
    const cleanArtist = encodeURIComponent(artist.trim());
    const cleanTitle = encodeURIComponent(title.trim());
  
    fetch(`${LYRIC_EP}${cleanArtist}/${cleanTitle}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Lyrics not found");
        }
        return response.json();
      })
      .then((data) => {
        if (data.lyrics) {
          const normalizedLyrics = data.lyrics.replace(/\n{3,}/g, "\n\n");
          const formattedLyrics = normalizedLyrics.replace(/\n/g, "<br>");
          lyricsContent.innerHTML = formattedLyrics;
        } else {
          lyricsContent.textContent = "No lyrics available.";
        }
      })
      .catch((error) => {
        console.error("Error fetching lyrics:", error);
        lyricsContent.textContent = "No lyrics available.";
      });
  }
  