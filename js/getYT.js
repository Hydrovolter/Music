// GOOGLE API
function getYTGoogleAPI(query) {
    // Determine which Google API key to use based on the counter
    const keyIndex = googleApiKeyCounter % YT_KEYS.length;
    const currentGoogleAPIKey = YT_KEYS[keyIndex];

    // One-liner console.log to show which key is being used
    console.log(`Google API: Using key index ${keyIndex}`);

    const url = `${YT_EP}${encodeURIComponent(
        query
    )}&type=video&videoEmbeddable=true&key=${currentGoogleAPIKey}&maxResults=1`; // Use currentGoogleAPIKey here

    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            console.log("Youtube results (Google API):", data);
            if (data.items && data.items.length > 0) {
                const videoId = data.items[0].id.videoId;
                loadVid(videoId);
            } else {
                console.error("No YouTube results found (Google API)");
            }
        })
        .catch((error) => {
            console.error("Error searching YouTube (Google API):", error);
        });

    // Increment the Google API key counter for the next call
    googleApiKeyCounter++;
}
  
  // youtube-v3-alternative RAPIDAPI
  function getYTRapidAPI(query) {
    const keyIndex = rapidApiKeyCounter % RAPIDAPI_KEYS.length; // Get the current index
    const currentRapidAPIKey = RAPIDAPI_KEYS[keyIndex];

    console.log(`RapidAPI: Using key index ${keyIndex}`);
    // Your RapidAPI Key
    const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(
      query
    )}&geo=US&lang=en`;
  
    fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': currentRapidAPIKey, // RAPIDAPI_KEY
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("RapidAPI Youtube results:", data);
  
        if (data && data.data && data.data.length > 0) {
          const videoId = data.data[0].videoId;
  
          if (videoId) {
            loadVid(videoId);
          } else {
            console.error("Could not extract video ID from RapidAPI results.", data.data[0]);
          }
        } else {
          console.error("No RapidAPI YouTube results found or unexpected data structure.");
        }
      })
      .catch((error) => {
        console.error("Error searching RapidAPI YouTube:", error);
      });
      rapidApiKeyCounter++;
  }




let apiCallCounter = 0;
let rapidApiKeyCounter = 0;
let googleApiKeyCounter = 0;

function getYT(query) {
  // Use the modulo operator to alternate between 0 and 1
  if (apiCallCounter % 2 === 0) {
    console.log("Using Google API for search...");
    getYTGoogleAPI(query);
  } else {
    console.log("Using RapidAPI for search...");
    getYTRapidAPI(query);
  }
  // Increment the counter for the next call
  apiCallCounter++;
}
