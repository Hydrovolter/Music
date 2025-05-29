// --- Global Counters and API Keys (ensure these are defined globally) ---
// ... (Your existing global definitions for YT_EP, RAPIDAPI_HOST, YT_KEYS, RAPIDAPI_KEYS) ...

let apiCallCounter = 0; // Cycles between Google API and RapidAPI
let rapidApiKeyCounter = 0; // Tracks the current RapidAPI key index
let googleApiKeyCounter = 0; // Tracks the current Google API key index

// GOOGLE API
async function getYTGoogleAPI(query) {
    // Keep track of the starting key index for this attempt to prevent infinite loops
    const initialKeyIndex = googleApiKeyCounter % YT_KEYS.length;
    let attempts = 0;
    let foundVideo = false;
    let lastError = null;

    // Loop through all available Google API keys
    while (attempts < YT_KEYS.length && !foundVideo) {
        const currentKeyIndex = googleApiKeyCounter % YT_KEYS.length;
        const currentGoogleAPIKey = YT_KEYS[currentKeyIndex];

        console.log(`Google API: Attempting with key index ${currentKeyIndex} (Attempt ${attempts + 1}/${YT_KEYS.length})`);

        const url = `${YT_EP}${encodeURIComponent(
            query
        )}&type=video&videoEmbeddable=true&key=${currentGoogleAPIKey}&maxResults=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Google API HTTP error! status: ${response.status} for key index ${currentKeyIndex}`);
            }
            const data = await response.json();

            console.log("Youtube results (Google API):", data);
            if (data.items && data.items.length > 0) {
                const videoId = data.items[0].id.videoId;
                loadVid(videoId);
                foundVideo = true; // Mark as successful
                // No need to increment googleApiKeyCounter here; it will naturally advance on next getYTGoogleAPI call
                // because of the final increment after the loop.
            } else {
                lastError = new Error(`No YouTube results found (Google API) for key index ${currentKeyIndex}`);
                console.error(lastError.message);
            }
        } catch (error) {
            lastError = error;
            console.error(`Error searching YouTube (Google API) with key index ${currentKeyIndex}:`, error);
        }

        if (!foundVideo) {
            // Only increment to try the next key if the current one didn't find a video
            googleApiKeyCounter++;
            attempts++;
        }
    }

    if (foundVideo) {
        return Promise.resolve(true); // Resolve if a video was found
    } else {
        // If no video was found after all key attempts
        return Promise.reject(lastError || new Error("Google API exhausted all keys without success."));
    }
}

// youtube-v3-alternative RAPIDAPI
async function getYTRapidAPI(query) {
    const initialKeyIndex = rapidApiKeyCounter % RAPIDAPI_KEYS.length;
    let attempts = 0;
    let foundVideo = false;
    let lastError = null;

    // Loop through all available RapidAPI keys
    while (attempts < RAPIDAPI_KEYS.length && !foundVideo) {
        const currentKeyIndex = rapidApiKeyCounter % RAPIDAPI_KEYS.length;
        const currentRapidAPIKey = RAPIDAPI_KEYS[currentKeyIndex];

        console.log(`RapidAPI: Attempting with key index ${currentKeyIndex} (Attempt ${attempts + 1}/${RAPIDAPI_KEYS.length})`);

        const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(
            query
        )}&geo=US&lang=en`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': RAPIDAPI_HOST,
                    'x-rapidapi-key': currentRapidAPIKey,
                },
            });
            if (!response.ok) {
                throw new Error(`RapidAPI HTTP error! status: ${response.status} for key index ${currentKeyIndex}`);
            }
            const data = await response.json();

            console.log("RapidAPI Youtube results:", data);
            if (data && data.data && data.data.length > 0) {
                const videoId = data.data[0].videoId;
                if (videoId) {
                    loadVid(videoId);
                    foundVideo = true; // Mark as successful
                    // No need to increment rapidApiKeyCounter here; it will naturally advance on next getYTRapidAPI call
                } else {
                    lastError = new Error(`Could not extract video ID from RapidAPI results for key index ${currentKeyIndex}`);
                    console.error(lastError.message, data.data[0]);
                }
            } else {
                lastError = new Error(`No RapidAPI YouTube results found or unexpected data structure for key index ${currentKeyIndex}`);
                console.error(lastError.message);
            }
        } catch (error) {
            lastError = error;
            console.error(`Error searching RapidAPI YouTube with key index ${currentKeyIndex}:`, error);
        }

        if (!foundVideo) {
            // Only increment to try the next key if the current one didn't find a video
            rapidApiKeyCounter++;
            attempts++;
        }
    }

    if (foundVideo) {
        return Promise.resolve(true); // Resolve if a video was found
    } else {
        // If no video was found after all key attempts
        return Promise.reject(lastError || new Error("RapidAPI exhausted all keys without success."));
    }
}


// --- Main getYT function with fallback logic (remains largely the same) ---
async function getYT(query) {
    let searchSuccessful = false;

    // Determine the primary API for this call
    const primaryApiIsGoogle = (apiCallCounter % 2 === 0);

    if (primaryApiIsGoogle) {
        console.log("Attempting with Google API (Primary)...");
        try {
            await getYTGoogleAPI(query); // This will now try all Google keys internally
            searchSuccessful = true; // Primary attempt succeeded
        } catch (error) {
            console.warn("Google API failed after trying all its keys. Attempting with RapidAPI (Fallback)...", error);
            try {
                await getYTRapidAPI(query); // This will now try all RapidAPI keys internally
                searchSuccessful = true; // Fallback attempt succeeded
            } catch (fallbackError) {
                console.error("Both Google API (all keys) and RapidAPI (all keys) failed:", fallbackError);
            }
        }
    } else { // Primary API is RapidAPI
        console.log("Attempting with RapidAPI (Primary)...");
        try {
            await getYTRapidAPI(query); // This will now try all RapidAPI keys internally
            searchSuccessful = true; // Primary attempt succeeded
        } catch (error) {
            console.warn("RapidAPI failed after trying all its keys. Attempting with Google API (Fallback)...", error);
            try {
                await getYTGoogleAPI(query); // This will now try all Google keys internally
                searchSuccessful = true; // Fallback attempt succeeded
            } catch (fallbackError) {
                console.error("Both RapidAPI (all keys) and Google API (all keys) failed:", fallbackError);
            }
        }
    }

    // Only increment the main API counter if at least one API call was successful
    if (searchSuccessful) {
        apiCallCounter++;
    } else {
        console.warn("No video loaded after all attempts across both APIs and all their keys. Next getYT call will re-attempt the same primary API.");
    }
}