lyricsToggle.addEventListener("click", function () {
    showingLyrics = !showingLyrics;
  
    if (showingLyrics) {
      playerInfo.style.display = "none";
      lyricsInfo.style.display = "flex";
      fetchLyrics(currentTrack.artist, currentTrack.title);
      lyricsIcon.classList.remove("icon-lyrics");
      lyricsIcon.classList.add("icon-lyrics-on");
    } else {
      playerInfo.style.display = "flex";
      lyricsInfo.style.display = "none";
      lyricsIcon.classList.remove("icon-lyrics-on");
      lyricsIcon.classList.add("icon-lyrics");
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
  