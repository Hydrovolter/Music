// src/index.js for Cloudflare Worker

export default {
    async fetch(request, env, ctx) {
        // Enable CORS for all origins (adjust if needed for production)
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
  
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
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
                if (!item.track || !item.track.id) return null; // Skip if track is null or no ID (e.g., local file, removed track)
  
                const track = item.track;
                const artists = track.artists.map(artist => artist.name).join(', ');
                // Find the smallest image >= 60px width, or the smallest available if none meet criteria
                let artworkUrl = 'img/empty_art.png'; // Default placeholder for your app
                if (track.album.images && track.album.images.length > 0) {
                    let bestImage = track.album.images.reduce((smallest, current) => {
                        if (!smallest) return current;
                        if (current.width >= 60 && current.width < smallest.width) return current;
                        if (smallest.width < 60 && current.width > smallest.width) return current; // if smallest is too small, pick any larger one
                        return smallest;
                    }, track.album.images[track.album.images.length - 1]); // fallback to last (often smallest) if no logic hits
                    artworkUrl = bestImage.url;
                }
  
  
                return {
                    // Create a semi-unique ID for your app to avoid collisions if user imports same song from different playlists
                    // Or if Spotify has multiple versions of a song.
                    // Using spotify track ID + first artist name can be a good heuristic.
                    id: `spotify-${track.id}-${track.artists[0] ? track.artists[0].name.replace(/\s+/g, '_') : 'unknown'}`,
                    title: track.name,
                    artist: artists,
                    artwork: artworkUrl,
                    durationSeconds: Math.round(track.duration_ms / 1000),
                    // You could add albumName: track.album.name if needed
                };
            }).filter(track => track !== null); // Remove any null tracks
  
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
    if (!response.ok) throw new Error(`Spotify API error (playlist details): ${response.status}`);
    return await response.json();
  }
  
  async function getPlaylistTracks(playlistId, accessToken) {
    let tracks = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(name),album(name,images),duration_ms)),next&limit=50`;
  
    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: { 'Authorization': 'Bearer ' + accessToken },
        });
        if (!response.ok) throw new Error(`Spotify API error (tracks): ${response.status}`);
        const data = await response.json();
        tracks = tracks.concat(data.items.filter(item => item.track)); // Ensure item.track is not null
        nextUrl = data.next;
    }
    return tracks;
  }