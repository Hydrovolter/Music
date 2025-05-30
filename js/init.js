// js/init.js

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const trackTitle = document.getElementById("trackTitle");
const artistName = document.getElementById("artistName");
const albumCover = document.getElementById("albumCover");
const playPauseBtn = document.getElementById("playPause");
const volumeBtn = document.getElementById("volumeBtn");
const seekBar = document.getElementById("seekbar");
const progressBar = document.getElementById("progress");
const currentTimeSpan = document.getElementById("currentTime");
const remainingTimeSpan = document.getElementById("remainingTime");
const lyricsToggle = document.getElementById("lyricsToggle");
const lyricsIcon = lyricsToggle.querySelector("i");
const playerInfo = document.getElementById("playerInfo");
const lyricsInfo = document.getElementById("lyricsInfo");
const lyricsSongTitle = document.getElementById("lyricsSongTitle");
const lyricsArtistName = document.getElementById("lyricsArtistName");
const lyricsContent = document.getElementById("lyricsContent");
const loopBtn = document.getElementById("loopBtn");
// Note: likeBtn, prevBtn, nextBtn are primarily handled in playlist.js init

let showingLyrics = false;
let isMuted = false;
let loopState = 'none';

let player; // YouTube player instance
let isPlaying = false; // Player's playing state
let isDragging = false; // Seekbar dragging state
let searchTimeout;

// currentTrack will store details of the song currently loaded OR playing
let currentTrack = {
  id: null,       // Unique ID (e.g., iTunes trackId, crucial for liking)
  title: "Not Playing",
  artist: "Not Playing",
  artwork: "img/empty_art.png",    // URL to 100x100 artwork (for playlists, like button context)
  artworkLarge: "img/empty_art.png" // URL to 600x600 artwork (for main player display)
};

const colorThief = new ColorThief();

let currentColor = { r: 115, g: 98, b: 86 }; // Default bg color start
let targetColor = { r: 115, g: 98, b: 86 };  // Default bg color target
let animationId = null;

// Playlist-specific state (like currentPlayingPlaylistType, currentPlaylistTrackIndex)
// is now managed within js/playlist.js