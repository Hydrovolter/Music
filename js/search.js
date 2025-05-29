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
      // Ensure essential data is present, especially trackId for liking
      if (!item.trackName || !item.artistName || !item.trackId || !item.artworkUrl100) {
          console.warn("Skipping search result due to missing data:", item);
          return;
      }

      const resultElement = document.createElement("div");
      resultElement.className = "result-item";
      resultElement.innerHTML = `
      <div class="result-img">
        <img src="${item.artworkUrl100}" alt="${item.trackName}" crossorigin="anonymous">
      </div>
      <div class="result-info">
        <div class="result-title">${item.trackName}</div>
        <div class="result-artist">${item.artistName}</div>
      </div>
    `;

      resultElement.addEventListener("click", () => {
          // When playing from search, it's not from the "liked" playlist context initially.
          if (typeof clearPlaylistContext === 'function') {
              clearPlaylistContext(); // Reset active playlist context
          }

          // Pass trackId as a string, and the 100x100 artwork.
          // playSong will derive the larger artwork.
          playSong(item.trackName, item.artistName, item.artworkUrl100, item.trackId.toString());

          hideSearchResults();
          searchInput.value = ""; // Clear search input
      });

      searchResults.appendChild(resultElement);
  });
}

function showSearchResults() {
  searchResults.classList.add("active");
}

function hideSearchResults() {
  searchResults.classList.remove("active");
}