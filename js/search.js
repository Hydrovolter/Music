// js/search.js

searchInput.addEventListener("input", function () {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length > 1) {
          searchSongs(query);
      } else {
         if (typeof hideSearchResults === 'function') hideSearchResults();
      }
  }, 300);
});

searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();
      if (query.length > 1) {
          searchSongs(query);
      }
  }
});

function searchSongs(query) {
  searchResults.innerHTML = '<div class="loading">Searching...</div>';
  showSearchResults();

  // Prioritize 'song' entity for better track matches
  const url = `${SEARCH_EP}${encodeURIComponent(query)}&media=music&entity=song&limit=10`;

  fetch(url)
      .then((response) => response.json())
      .then((data) => {
          console.log("iTunes search results:", data);
          displaySearchResults(data.results);
      })
      .catch((error) => {
          console.error("Error searching iTunes:", error);
          searchResults.innerHTML =
              '<div class="loading">Search failed. Please try again.</div>';
      });
}

function displaySearchResults(results) {
  if (!results || results.length === 0) {
      searchResults.innerHTML = '<div class="loading">No results found</div>';
      return;
  }

  searchResults.innerHTML = ""; // Clear previous results

  results.forEach((item) => {
      if (!item.trackName || !item.artistName || !item.trackId || !item.artworkUrl100) {
          console.warn("Skipping search result due to missing data:", item);
          return;
      }

      const resultElement = document.createElement("div");
      resultElement.className = "result-item";

      // Store all necessary song data on the element for easy access
      // This is an alternative to setting currentTrack globally before opening modal
      resultElement.dataset.trackId = item.trackId.toString();
      resultElement.dataset.trackName = item.trackName;
      resultElement.dataset.artistName = item.artistName;
      resultElement.dataset.artworkUrl100 = item.artworkUrl100;
      // artworkUrl600 can be derived if needed: item.artworkUrl100.replace('100x100', '600x600')

      resultElement.innerHTML = `
          <div class="result-img">
              <img src="${item.artworkUrl100}" alt="${escapeHtml(item.trackName)}" crossorigin="anonymous">
          </div>
          <div class="result-info">
              <div class="result-title">${escapeHtml(item.trackName)}</div>
              <div class="result-artist">${escapeHtml(item.artistName)}</div>
          </div>
          <button class="add-to-playlist-search-btn icon-action-btn" title="Add to playlist">
              <i class="icon icon-plus-circle"></i>
          </button>
      `;

      // Click listener for the main result item (plays the song)
      const infoAndImageArea = resultElement.querySelector('.result-info'); // Or bind to resultElement and check target
      
      resultElement.addEventListener("click", (event) => {
          // Only play if the click was not on the "add to playlist" button
          if (event.target.closest('.add-to-playlist-search-btn')) {
              return; // Do nothing if the button itself was clicked, its own listener will handle it
          }

          if (typeof clearPlaylistContext === 'function') {
              clearPlaylistContext();
          }
          // playSong expects trackId as string, and 100x100 artwork
          playSong(item.trackName, item.artistName, item.artworkUrl100, item.trackId.toString());
          hideSearchResults();
          searchInput.value = "";
      });

      // Click listener for the "Add to Playlist" button within this search result
      const addToPlaylistBtnForResult = resultElement.querySelector('.add-to-playlist-search-btn');
      if (addToPlaylistBtnForResult) {
          addToPlaylistBtnForResult.addEventListener('click', (event) => {
              event.stopPropagation(); // Prevent the parent resultElement's click listener from firing

              // Prepare song data for the modal
              const songDataForModal = {
                  id: item.trackId.toString(), // Ensure ID is a string
                  title: item.trackName,
                  artist: item.artistName,
                  artwork: item.artworkUrl100 // The 100x100 artwork is what playlist.js expects
                  // artworkLarge is not strictly needed by the add to playlist modal itself
              };

              // Call a modified version of openAddToPlaylistModal or pass data directly
              // For simplicity, let's assume openAddToPlaylistModal can accept songData (needs modification)
              // OR we temporarily set a global variable that openAddToPlaylistModal reads
              
              // Option A: Modify openAddToPlaylistModal (preferred) - see js/playlist.js change below
              if (typeof openAddToPlaylistModal === 'function') {
                  openAddToPlaylistModal(songDataForModal);
              } else {
                  console.error("openAddToPlaylistModal function not found");
              }

              // Option B: Temporarily set currentTrack (less clean, but works if openAddToPlaylistModal isn't changed)
              /*
              currentTrackForModal = { // Use a temporary distinct variable or carefully manage currentTrack
                  id: item.trackId.toString(),
                  title: item.trackName,
                  artist: item.artistName,
                  artwork: item.artworkUrl100,
                  artworkLarge: item.artworkUrl100.replace('100x100', '600x600')
              };
              // Then call the original openAddToPlaylistModal which reads from global currentTrack
              // This requires openAddToPlaylistModal to be robust about currentTrack's state.
              // openAddToPlaylistModal(); 
              */

              // Do NOT hide search results here, user might want to add more songs
              // searchInput.value = ""; // Also don't clear input
          });
      }
      searchResults.appendChild(resultElement);
  });
}

function showSearchResults() {
  searchResults.classList.add("active");
}

function hideSearchResults() {
  searchResults.classList.remove("active");
}