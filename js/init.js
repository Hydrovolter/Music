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
const playerInfo = document.getElementById("playerInfo");
const lyricsInfo = document.getElementById("lyricsInfo");
const lyricsSongTitle = document.getElementById("lyricsSongTitle");
const lyricsArtistName = document.getElementById("lyricsArtistName");
const lyricsContent = document.getElementById("lyricsContent");

let showingLyrics = false;
let isMuted = false;

let player;
let isPlaying = false;
let isDragging = false;
let searchTimeout;
let currentTrack = {
  title: "Not Playing",
  artist: "Not Playing",
  artwork: "/img/empty_art.png",
};

const colorThief = new ColorThief();

let currentColor = { r: 115, g: 98, b: 86 };
let targetColor = { r: 115, g: 98, b: 86 };
let animationId = null;
