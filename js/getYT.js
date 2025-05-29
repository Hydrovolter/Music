// --- Global Counters and API Keys (ensure these are defined globally) ---




let apiCallCounter = 0; // Cycles between Google API and RapidAPI
let rapidApiKeyCounter = 0; // Cycles RapidAPI keys
let googleApiKeyCounter = 0; // Cycles Google API keys

// GOOGLE API
function getYTGoogleAPI(query) {
    return new Promise((resolve, reject) => { // Return a Promise
        const keyIndex = googleApiKeyCounter % YT_KEYS.length;
        const currentGoogleAPIKey = YT_KEYS[keyIndex];

        console.log(`Google API: Using key index ${keyIndex}`);

        const url = `${YT_EP}${encodeURIComponent(
            query
        )}&type=video&videoEmbeddable=true&key=${currentGoogleAPIKey}&maxResults=1`;

        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    // Throw an error for HTTP issues (4xx, 5xx)
                    throw new Error(`Google API HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log("Youtube results (Google API):", data);
                if (data.items && data.items.length > 0) {
                    const videoId = data.items[0].id.videoId;
                    loadVid(videoId);
                    googleApiKeyCounter++; // Increment counter on success
                    resolve(true); // Resolve the Promise indicating success
                } else {
                    console.error("No YouTube results found (Google API)");
                    googleApiKeyCounter++; // Increment counter even if no results, to cycle key
                    reject(new Error("No YouTube results found (Google API)")); // Reject if no results
                }
            })
            .catch((error) => {
                console.error("Error searching YouTube (Google API):", error);
                googleApiKeyCounter++; // Increment counter on error, to cycle key
                reject(error); // Reject the Promise on fetch error
            });
    });
}

// youtube-v3-alternative RAPIDAPI
function getYTRapidAPI(query) {
    return new Promise((resolve, reject) => { // Return a Promise
        const keyIndex = rapidApiKeyCounter % RAPIDAPI_KEYS.length;
        const currentRapidAPIKey = RAPIDAPI_KEYS[keyIndex];

        console.log(`RapidAPI: Using key index ${keyIndex}`);

        const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(
            query
        )}&geo=US&lang=en`;

        fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': currentRapidAPIKey,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    // Throw an error for HTTP issues
                    throw new Error(`RapidAPI HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log("RapidAPI Youtube results:", data);
                if (data && data.data && data.data.length > 0) {
                    const videoId = data.data[0].videoId;
                    if (videoId) {
                        loadVid(videoId);
                        rapidApiKeyCounter++; // Increment counter on success
                        resolve(true); // Resolve the Promise indicating success
                    } else {
                        console.error("Could not extract video ID from RapidAPI results.", data.data[0]);
                        rapidApiKeyCounter++; // Increment counter even if no videoId, to cycle key
                        reject(new Error("Could not extract video ID from RapidAPI results.")); // Reject
                    }
                } else {
                    console.error("No RapidAPI YouTube results found or unexpected data structure.");
                    rapidApiKeyCounter++; // Increment counter even if no results, to cycle key
                    reject(new Error("No RapidAPI YouTube results found or unexpected data structure.")); // Reject
                }
            })
            .catch((error) => {
                console.error("Error searching RapidAPI YouTube:", error);
                rapidApiKeyCounter++; // Increment counter on error, to cycle key
                reject(error); // Reject the Promise on fetch error
            });
    });
}


// --- Main getYT function with fallback logic ---
async function getYT(query) {
    let searchSuccessful = false;

    // Determine the primary API for this call
    const primaryApiIsGoogle = (apiCallCounter % 2 === 0);

    if (primaryApiIsGoogle) {
        console.log("Attempting with Google API (Primary)...");
        try {
            await getYTGoogleAPI(query);
            searchSuccessful = true; // Primary attempt succeeded
        } catch (error) {
            console.warn("Google API failed. Attempting with RapidAPI (Fallback)...", error);
            try {
                await getYTRapidAPI(query);
                searchSuccessful = true; // Fallback attempt succeeded
            } catch (fallbackError) {
                console.error("Both Google API and RapidAPI failed:", fallbackError);
            }
        }
    } else { // Primary API is RapidAPI
        console.log("Attempting with RapidAPI (Primary)...");
        try {
            await getYTRapidAPI(query);
            searchSuccessful = true; // Primary attempt succeeded
        } catch (error) {
            console.warn("RapidAPI failed. Attempting with Google API (Fallback)...", error);
            try {
                await getYTGoogleAPI(query);
                searchSuccessful = true; // Fallback attempt succeeded
            } catch (fallbackError) {
                console.error("Both RapidAPI and Google API failed:", fallbackError);
            }
        }
    }

    // Only increment the main API counter if at least one API call was successful
    if (searchSuccessful) {
        apiCallCounter++;
    } else {
        // If both failed, we don't increment apiCallCounter.
        // This means the next getYT call will try the *same primary API* again,
        // allowing for a re-attempt with a potentially fresh state or a fix.
        console.warn("No video loaded after all attempts. Next getYT call will re-attempt the same primary API.");
    }
}