// src/index.js for Cloudflare Worker

// Define your allowed origins
const ALLOWED_ORIGINS = [
    "http://localhost:5503",
    "http://localhost:7000",
    "https://hydrovolter.pages.dev",
    "http://hydrovolter.pages.dev",
    "https://hydrovolter.vercel.app",
    "http://hydrovolter.vercel.app",
    "https://hydrovolter.com",
    "http://hydrovolter.com",
    "https://hydrovolter.github.io",
    "http://hydrovolter.github.io",
    "https://hydrovolter.netlify.app",
    "http://hydrovolter.netlify.app",
    "https://hydrovolter.web.app",
    "http://hydrovolter.web.app",
    "https://hydrovolter.firebaseapp.com",
    "http://hydrovolter.firebaseapp.com",
    "https://ko-fi.com",
    "https://hydrovolters.pages.dev",
    "http://hydrovolters.pages.dev"
  ];

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin');
        let corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
            return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const url = new URL(request.url);
        const playlistId = url.searchParams.get('playlistId');

        if (!playlistId) {
            return new Response(JSON.stringify({ error: 'Playlist ID is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
             return new Response(JSON.stringify({ error: 'Spotify API credentials not configured in Worker environment.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        try {
            const accessToken = await getSpotifyAccessToken(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
            if (!accessToken) {
                throw new Error('Failed to get Spotify access token');
            }

            const playlistDetails = await getPlaylistDetails(playlistId, accessToken);
            const allTracks = await getPlaylistTracks(playlistId, accessToken);

            const processedTracks = allTracks.map(item => {
                if (!item.track || !item.track.id) return null;

                const track = item.track;
                const artists = track.artists.map(artist => artist.name).join(', ');

                // --- START: MODIFIED ARTWORK SELECTION LOGIC ---
                let artworkUrl = 'img/empty_art.png'; // Your app's default placeholder for track art
                if (track.album.images && track.album.images.length > 0) {
                    const images = track.album.images;
                    // Spotify typically provides images sorted: [large ~640px, medium ~300px, small ~64px]

                    // Prefer medium size (index 1) if available
                    if (images.length > 1 && images[1] && images[1].url) {
                        artworkUrl = images[1].url;
                    }
                    // Else, fallback to largest size (index 0) if available
                    else if (images.length > 0 && images[0] && images[0].url) {
                        artworkUrl = images[0].url;
                    }
                    // Else, as a last resort, try the smallest if it's all that's left (e.g., images.length is 3 but 0 and 1 were bad)
                    else if (images.length > 2 && images[2] && images[2].url) {
                         artworkUrl = images[2].url;
                    }
                    // If the array structure is unexpected, or only one image, images[0].url (if it exists) would have been caught by the second condition.
                    // The initial artworkUrl = 'img/empty_art.png' acts as a final fallback.
                }
                // --- END: MODIFIED ARTWORK SELECTION LOGIC ---

                return {
                    id: `spotify-${track.id}-${track.artists[0] ? track.artists[0].name.replace(/\s+/g, '_') : 'unknown'}`,
                    title: track.name,
                    artist: artists,
                    artwork: artworkUrl,
                    durationSeconds: Math.round(track.duration_ms / 1000),
                };
            }).filter(track => track !== null);

            const playlistData = {
                name: playlistDetails.name || `Spotify Playlist ${playlistId.substring(0,5)}`,
                description: playlistDetails.description || '',
                // For the playlist's own cover image, the largest (images[0]) is usually best.
                artworkUrl: (playlistDetails.images && playlistDetails.images.length > 0 && playlistDetails.images[0].url)
                            ? playlistDetails.images[0].url
                            : 'img/empty_art.png', // App's default for playlist cover
                songs: processedTracks,
            };

            return new Response(JSON.stringify(playlistData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error('Worker error:', error.message, error.stack);
            return new Response(JSON.stringify({ error: error.message || 'Failed to process Spotify playlist' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};

async function getSpotifyAccessToken(clientId, clientSecret) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
        },
        body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Spotify Token Error:", response.status, errorBody);
        return null;
    }
    const data = await response.json();
    return data.access_token;
}

async function getPlaylistDetails(playlistId, accessToken) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,owner`, {
        headers: { 'Authorization': 'Bearer ' + accessToken },
    });
    if (!response.ok) throw new Error(`Spotify API error (playlist details): ${response.statusText} (${response.status})`);
    return await response.json();
}

async function getPlaylistTracks(playlistId, accessToken) {
    let tracks = [];
    // Request specific fields to minimize data transfer and simplify processing
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,duration_ms,artists(name),album(images))),next&limit=50`;

    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: { 'Authorization': 'Bearer ' + accessToken },
        });
        if (!response.ok) throw new Error(`Spotify API error (tracks): ${response.statusText} (${response.status})`);
        const data = await response.json();
        // Filter out items where item.track might be null (e.g., if a track was removed or is a local file on Spotify)
        tracks = tracks.concat(data.items.filter(item => item.track));
        nextUrl = data.next;
    }
    return tracks;
}