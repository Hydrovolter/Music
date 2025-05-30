// --- Event Listeners for searchInput ---

searchInput.addEventListener("focus", function () {
  if (searchInput.value.trim() === "") {
      displayRecentSearches();
  }
  // If there's text, the 'input' event will handle regular search suggestions or actual search
});

searchInput.addEventListener("input", function () {
  clearTimeout(searchTimeout); // searchTimeout should be defined (e.g., in init.js or top of this file)
  const query = searchInput.value.trim();

  if (query.length > 1) {
      searchTimeout = setTimeout(() => {
          searchSongs(query);
      }, 300);
  } else if (query.length === 0) {
      displayRecentSearches(); // Show recent searches if input is cleared
  } else {
      // Query is 1 char, or just spaces - hide main song search results
      hideSearchResults(); 
      // Optionally, you could still show recent searches here if desired,
      // but typical behavior is to hide until input is empty or long enough for song search.
  }
});

searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();
      if (query.length > 1) {
          searchSongs(query); // searchSongs will handle adding to recent history on success
      } else if (query.length === 0) {
          hideSearchResults(); // Don't search an empty string on enter
      }
  }
});

// --- Main Search Function ---
function searchSongs(query) {
  if (!searchResults) { // Guard
      console.error("Search results element not found");
      return;
  }
  searchResults.innerHTML = '<div class="loading">Searching...</div>';
  showSearchResults();

  // SEARCH_EP should be globally available from endpoints.js
  const url = `${SEARCH_EP}${encodeURIComponent(query)}&media=music&entity=song&limit=10`;

  fetch(url)
      .then((response) => response.json())
      .then((data) => {
          console.log("iTunes search results:", data);
          // displaySearchResults is for song results. displayRecentSearches is for history.
          if (data.results && data.results.length > 0) {
              // Uses addRecentSearch() from history.js
              addRecentSearch(query); 
              displaySongSearchResults(data.results); // Renamed for clarity
          } else {
              // Don't add to history if no song results found for this query
              displaySongSearchResults(data.results); // Will show "No results found"
          }
      })
      .catch((error) => {
          console.error("Error searching iTunes:", error);
          searchResults.innerHTML =
              '<div class="loading">Search failed. Please try again.</div>';
      });
}

// Renamed your original displaySearchResults to avoid conflict with the new one for history
// This function displays actual song search results from iTunes.
function displaySongSearchResults(results) {
  if (!searchResults) return; 

  if (!results || results.length === 0) {
      searchResults.innerHTML = '<div class="loading">No results found</div>';
      // showSearchResults(); // Already called by searchSongs which calls this
      return;
  }

  searchResults.innerHTML = ""; // Clear loading message or recent searches

  results.forEach((item) => {
      if (!item.trackName || !item.artistName || !item.trackId || !item.artworkUrl100) {
          console.warn("Skipping search result due to missing data:", item);
          return;
      }

      const resultElement = document.createElement("div");
      resultElement.className = "result-item"; // For actual song results

      resultElement.dataset.trackId = item.trackId.toString();
      resultElement.dataset.trackName = item.trackName;
      resultElement.dataset.artistName = item.artistName;
      resultElement.dataset.artworkUrl100 = item.artworkUrl100;

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
      resultElement.addEventListener("click", (event) => {
          // Only play if the click was not on the "add to playlist" button
          if (event.target.closest('.add-to-playlist-search-btn')) {
              // The button's own click listener (below) will handle its action and stop propagation.
              return; 
          }

          // Clicked on song info/artwork area to play
          if (typeof clearPlaylistContext === 'function') clearPlaylistContext();
          playSong(item.trackName, item.artistName, item.artworkUrl100, item.trackId.toString());
          hideSearchResults();
          if (searchInput) searchInput.value = "";

          // IMPORTANT: Stop this click from bubbling up to the document listener
          event.stopPropagation();
      });

      const addToPlaylistBtnForResult = resultElement.querySelector('.add-to-playlist-search-btn');
      if (addToPlaylistBtnForResult) {
          addToPlaylistBtnForResult.addEventListener('click', (event) => {
              event.stopPropagation(); // Crucial: Prevent parent (resultElement) click and document click
              const songDataForModal = {
                  id: item.trackId.toString(),
                  title: item.trackName,
                  artist: item.artistName,
                  artwork: item.artworkUrl100
              };
              if (typeof openAddToPlaylistModal === 'function') {
                  openAddToPlaylistModal(songDataForModal);
              } else {
                  console.error("openAddToPlaylistModal function not found");
              }
          });
      }
      searchResults.appendChild(resultElement);
  });
  // showSearchResults(); // Already called by searchSongs which calls this
}

// --- Utility functions (showSearchResults, hideSearchResults) ---
// These should be your existing functions:
function showSearchResults() {
  if (searchResults) searchResults.classList.add("active");
}

function hideSearchResults() {
  if (searchResults) searchResults.classList.remove("active");
}

// --- Display Logic for Recent Searches ---
function displayRecentSearches() {
  // Uses getRecentSearches() from history.js or this file
  const recentSearches = getRecentSearches(); 

  if (!searchResults) return; 

  if (recentSearches.length === 0) {
      searchResults.innerHTML = '<div class="loading" style="padding: 10px 0;">No recent searches.</div>';
      showSearchResults(); 
      return;
  }

  searchResults.innerHTML = ''; 
  const title = document.createElement('div');
  title.className = 'recent-searches-title';
  title.textContent = 'Recent Searches';
  searchResults.appendChild(title);

  recentSearches.forEach(query => {
      const recentItem = document.createElement('div');
      recentItem.className = 'recent-search-item result-item'; 

      recentItem.innerHTML = `
          <span class="recent-search-query">${escapeHtml(query)}</span>
          <button class="remove-recent-search-btn icon-action-btn" title="Remove from history">
              <i class="icon icon-close"></i>
          </button>
      `;

      // Event listener for the entire recentItem (covers clicking the query text area)
      recentItem.addEventListener('click', (event) => {
          // If the click was specifically on the remove button,
          // let its own handler (which also stops propagation) do the work.
          if (event.target.closest('.remove-recent-search-btn')) {
              return;
          }
          
          // This click is on the recent search item (likely the query text area) to initiate a search
          searchInput.value = query; 
          searchSongs(query); // This will refresh the searchResults content
          
          // IMPORTANT: Stop this click from bubbling up to the document listener
          event.stopPropagation(); 
      });

      const removeBtn = recentItem.querySelector('.remove-recent-search-btn');
      if (removeBtn) {
          removeBtn.addEventListener('click', (event) => {
              event.stopPropagation(); // Crucial: Prevent parent (recentItem) click and document click
              removeRecentSearch(query); 
              displayRecentSearches();   // Re-render the recent searches list immediately
          });
      }
      searchResults.appendChild(recentItem);
  });
  showSearchResults(); 
}