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
const shuffleBtn = document.getElementById("shuffleBtn");


let showingLyrics = false;
let isMuted = false;
let loopState = 'none';
let isShuffleActive = false;

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

// --- Playlist System Variables ---
const LIKED_SONGS_PLAYLIST_ID = 'liked_songs';
const USER_PLAYLISTS_STORAGE_KEY = 'musicPlayer_userPlaylists';
const LIKED_PLAYLIST_STORAGE_KEY = 'musicPlayer_likedSongsPlaylist'; // Keep this for liked songs

let likedPlaylist = []; // Holds {id, title, artist, artwork} for liked songs
let userPlaylists = []; // Holds {id, name, songs: [...]} for user-created playlists

let currentPlayingPlaylistId = null; // ID of the playing playlist (e.g., 'liked_songs', or a user playlist ID)
let currentPlaylistTrackIndex = -1;   // Index in the currentPlayingPlaylistId's song array

let currentSidebarView = 'all_playlists'; // 'all_playlists' or 'single_playlist_view'
let selectedPlaylistToViewId = null;  // ID of the playlist being viewed in the sidebar (not necessarily playing)

// DOM Elements for playlist system (to be fetched in playlist.js's initializePlaylistSystem)
let playlistDisplayAreaElement;
let sidebarTitleElement;
let backToPlaylistsBtnElement;
let createNewPlaylistBtnElement;
let addToPlaylistBtnElement;
let addToPlaylistModalElement;
let modalPlaylistListElement;
let closeModalAddToPlaylistBtnElement;
let likeBtnElement; // Will be grabbed in playlist.js
let prevBtnElement; // Will be grabbed in playlist.js
let nextBtnElement; // Will be grabbed in playlist.js

// DOM Elements for General Modal
let generalModalElement;
let generalModalTitleElement;
let generalModalMessageElement;
let generalModalActionsElement;
let closeGeneralModalBtnElement;

// DOM Elements for Create Playlist Modal
let createPlaylistModalElement;
let createPlaylistModalTitleElement; // Though title is static here, good practice
let newPlaylistNameInputElement;
let confirmCreatePlaylistBtnElement;
let cancelCreatePlaylistBtnElement;
let closeCreatePlaylistModalBtnElement;

// DOM Elements for Rename Playlist Modal
let renamePlaylistModalElement;
let renamePlaylistModalTitleElement; // If you want to include the old name in the title
let renamePlaylistNameInputElement;
let confirmRenamePlaylistBtnElement;
let cancelRenamePlaylistBtnElement;
let closeRenamePlaylistModalBtnElement;
let playlistIdToRename = null; // To store the ID of the playlist being renamed