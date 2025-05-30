// js/history.js

const RECENT_SEARCHES_KEY = 'musicPlayer_recentSearches';
const MAX_RECENT_SEARCHES = 3;

/**
 * Retrieves the list of recent search queries from localStorage.
 * @returns {string[]} An array of recent search queries.
 */
function getRecentSearches() {
    const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
    return storedSearches ? JSON.parse(storedSearches) : [];
}

/**
 * Adds a search query to the recent searches list.
 * Moves existing query to the top if already present.
 * Limits the list to MAX_RECENT_SEARCHES.
 * @param {string} query The search query to add.
 */
function addRecentSearch(query) {
    if (!query || typeof query !== 'string' || query.trim() === "") return;
    query = query.trim(); // Normalize

    let searches = getRecentSearches();
    // Remove the query if it already exists, to move it to the top (most recent)
    searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    // Add the new query to the beginning
    searches.unshift(query);
    // Limit the number of recent searches
    if (searches.length > MAX_RECENT_SEARCHES) {
        searches = searches.slice(0, MAX_RECENT_SEARCHES);
    }
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

/**
 * Removes a specific search query from the recent searches list.
 * @param {string} queryToRemove The search query to remove.
 */
function removeRecentSearch(queryToRemove) {
    if (!queryToRemove || typeof queryToRemove !== 'string' || queryToRemove.trim() === "") return;
    queryToRemove = queryToRemove.trim();

    let searches = getRecentSearches();
    searches = searches.filter(s => s.toLowerCase() !== queryToRemove.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));

    // This function will be called from search.js, which can then decide to re-render
    // For example, after removing, if search input is focused and empty, search.js will call displayRecentSearches()
}