searchInput.addEventListener("input", function () {
    clearTimeout(searchTimeout);
  
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length > 1) {
        searchSongs(query);
      } else {
        hideSearchResults();
      }
    }, 500);
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
  
    const url = `${SEARCH_EP}${encodeURIComponent(query)}&media=music&limit=10`;
  
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
  
    searchResults.innerHTML = "";
  
    results.forEach((item) => {
      if (!item.trackName || !item.artistName) return;
  
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
        playSong(item.trackName, item.artistName, item.artworkUrl100);
        hideSearchResults();
        searchInput.value = "";
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
  