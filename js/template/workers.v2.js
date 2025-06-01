// src/index.js for Cloudflare Worker

// Define your allowed origins
const ALLOWED_ORIGINS = [
    'http://localhost:5503',
    'http://localhost:7000',       // Your local development
    'https://hydrovolter.com',
    'https://hydrovolter.pages.dev',
    'https://hydrovolter.vercel.app' // Assuming this is your Vercel deployment preview/prod
    // Add any other specific subdomains or variations if needed
];

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin');
        let corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type', // Add any other headers your client might send
        };

        // Dynamically set Access-Control-Allow-Origin
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        } else {
            // If the origin is not allowed, you might choose to not send any CORS headers,
            // or for OPTIONS requests, still respond but without allowing the origin.
            // For non-OPTIONS requests from disallowed origins, they'll fail standard CORS checks.
            // For simplicity here, if it's an OPTIONS request from an unknown origin,
            // we might still respond with generic allow methods/headers but NO allow-origin.
            // Or, more strictly, return an error for OPTIONS from unknown origins.
            // Let's be somewhat permissive for OPTIONS to allow browsers to determine.
            if (request.method === 'OPTIONS') {
                 // For OPTIONS from a non-allowed origin, we can still return the allowed methods/headers
                 // but the browser will ultimately block the subsequent actual request if origin isn't matched.
                 // Or, be more strict:
                 // return new Response('CORS Preflight: Origin not allowed.', { status: 403 });
            }
            // For actual GET requests from non-allowed origins, they'll just fail CORS on the browser side
            // if Access-Control-Allow-Origin isn't set or doesn't match.
        }


        if (request.method === 'OPTIONS') {
            // Handle OPTIONS preflight request
            return new Response(null, { headers: corsHeaders });
        }

        // For actual GET requests, ensure the origin was allowed before proceeding
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
            return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
                status: 403, // Forbidden
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers even for error
            });
        }
        // If origin is null (e.g. server-to-server, or older browsers/tools not sending Origin),
        // and you want to block them, you could add a check here.
        // For now, we proceed if origin is null or allowed.

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
                let artworkUrl = 'img/empty_art.png';
                if (track.album.images && track.album.images.length > 0) {
                    let bestImage = track.album.images.reduce((smallest, current) => {
                        if (!smallest) return current;
                        if (current.width >= 60 && current.width < smallest.width) return current;
                        if (smallest.width < 60 && current.width > smallest.width) return current;
                        return smallest;
                    }, track.album.images[track.album.images.length - 1]);
                    artworkUrl = bestImage.url;
                }

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
                artworkUrl: (playlistDetails.images && playlistDetails.images.length > 0) ? playlistDetails.images[0].url : 'img/empty_art.png',
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

// Helper functions (getSpotifyAccessToken, getPlaylistDetails, getPlaylistTracks) remain the same
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
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(name),album(name,images),duration_ms)),next&limit=50`;

    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: { 'Authorization': 'Bearer ' + accessToken },
        });
        if (!response.ok) throw new Error(`Spotify API error (tracks): ${response.statusText} (${response.status})`);
        const data = await response.json();
        tracks = tracks.concat(data.items.filter(item => item.track));
        nextUrl = data.next;
    }
    return tracks;
}