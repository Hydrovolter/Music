# TODO

* []  volume slider
* [x] no. of tracks and duration under playlist
* [x] import/export (localstorage) [playlists / data]
* [] "import playlists from spotify" feature
* [] preferences / settings (bg, store recent searches)



# Music Player Enhancements

This document outlines proposed UI/UX improvements, new playback features, and advanced data management capabilities for your music player.

---

## I. UI & UX Enhancements

---

### Volume Slider

Instead of a simple mute/unmute button, a **visual volume slider** will provide more granular control.

* **UI:** Implement a horizontal slider within the player controls area.
* **API Integration:** Utilize the YouTube Player API's `setVolume(0-100)` and `getVolume()` methods.
* **State Management:** Persist the last volume setting in `localStorage` and apply it automatically when the player loads.

### Visual Feedback for Loop/Shuffle

Enhance the visual clarity of the loop and shuffle states.

* **Loop:** When active, add a small text label (e.g., "**Song**" or "**Playlist**") next to the loop icon to indicate its current mode. Alternatively, consider a more distinct visual change for each loop state.
* **Shuffle:** Ensure the shuffle button's active state is immediately and clearly discernible through a prominent visual cue.

### Keyboard Shortcuts

Introduce intuitive keyboard shortcuts for common player actions.

* **Spacebar**: Play/Pause
* **Left/Right Arrows**: Seek backward/forward within the current track. In a playlist context, these could also navigate to the previous/next track.
* **Up/Down Arrows**: Volume up/down (requires the volume slider implementation).
* **M**: Mute/Unmute toggle.
* **L**: Like/Unlike the current song.
* **S**: Toggle Shuffle for the active playlist.
* **R**: Cycle through the Loop states (e.g., No Loop, Loop Song, Loop Playlist).

### "Clear Queue" or "Stop Playback" Button

Provide an explicit control to stop playback and reset the player.

* **Functionality:** A dedicated button that halts current playback, clears the `currentTrack`, and returns the player UI to its "Not Playing" state. This action should also clear any active playlist context.

### Enhanced "Now Playing" Indication in Playlist

Improve the visual feedback for the currently playing song within a playlist.

* **Visual Cue:** In addition to green text, consider a small, animated "playing" icon next to the song title. Examples include a subtle bouncing bar visualizer or a spinning disc icon.

### Customizable Themes/Color Schemes (Advanced UI)

Allow users to personalize the player's appearance.

* **Options:** Offer a selection of predefined themes or, for advanced customization, integrate a color picker for users to set primary and accent colors. These custom colors would override any album art-based background colors.

### Full Screen Mode for Player (Visual Focus)

Provide a focused viewing experience for the player.

* **Functionality:** A button that expands the core player interface (album art, title, controls) to occupy a larger portion of the screen. This could be accompanied by a blurred version of the album art as a background for an immersive feel.

---

## II. Playlist & Library Management

---

### Playlist Descriptions

Empower users to add context to their custom playlists.

* **Feature:** Allow users to add a short textual description to each custom playlist.
* **Display:** This description would be visible when viewing the playlist.
* **Storage:** Store the description within the playlist object in `localStorage`.

### Duplicate Song Detection in Playlist

Prevent or manage the addition of duplicate songs to playlists.

* **Detection:** When a user attempts to add a song to a playlist, check if a song with the same ID already exists.
* **User Choice:** Instead of just a toast notification, consider a modal dialog that asks the user if they still wish to add the duplicate or prevent it.

### "Add to Queue" / Play Next

Introduce a flexible playback queue separate from main playlists.

* **Functionality:** Allow users to "Add to Queue" or "Play Next" from search results or other playlists, rather than immediate playback.
* **Queue Management:** This requires a dedicated playback queue. The `currentTrack` would become the first item in this queue, and the "Next" button would play sequentially from it.

### Bulk Actions for Playlists (Advanced)

Enable efficient management of multiple songs within a playlist.

* **Selection:** Implement a multi-select feature for songs in a playlist view.
* **Actions:** Once selected, allow users to:
    * Remove them from the playlist.
    * Add them to another existing playlist.

### Sort Playlist Songs

Provide options for organizing songs within a playlist.

* **Sorting Criteria:** Allow users to sort songs by:
    * Title
    * Artist
    * Date Added (requires storing a `dateAdded` timestamp for each song upon its addition to a playlist).

---

## III. Playback Features

---

### Playback Speed Control

Integrate controls for adjusting playback speed.

* **API Integration:** Utilize the YouTube Player API's `player.getPlaybackRate()` and `player.setPlaybackRate()`.
* **Controls:** Add options for common playback speeds, such as **0.75x, 1x, 1.25x, 1.5x, and 2x**. This is a native YouTube feature and should work seamlessly.

### Crossfade Between Songs (Web Audio API - Complex)

Enhance transitions between tracks with a subtle crossfade.

* **Implementation:** This feature would require leveraging the **Web Audio API**.
* **Considerations:** Be aware of potential challenges with `MediaElementAudioSourceNode` when trying to process audio directly from the YouTube player. This feature would be more straightforward to implement if you were also handling other audio sources that you control directly.

### Sleep Timer

Allow users to set a timer for automatic playback control.

* **Functionality:** Enable the user to set a specific duration (e.g., **15, 30, 60 minutes**) after which playback will automatically pause or stop.

---

## IV. Data & Integration

---

### Share Song/Playlist

Facilitate sharing of content with others.

* **Song Sharing:** Generate a link that directs users to the specific song on YouTube or a relevant music service. For a static player, this could involve copying the song title and artist to the clipboard.
* **Playlist Sharing:** Allow users to generate and copy a formatted text list of all songs within a playlist.

### Better Handling of API Key Limits for YouTube

Improve the resilience of API usage and user experience during quota limitations.

* **Smart Fallback:** If an API (Google/Rapid) consistently fails due to quota exhaustion, implement a system to temporarily "disable" that API for a set period (e.g., a few hours) and rely solely on the other available API. This requires storing the state of API availability.
* **User Feedback:** Display a subtle, non-intrusive message to the user if Youtube functionality is temporarily limited due to API quota issues.


# Music Player Advanced Enhancements

This document outlines further sophisticated features to enhance the music player's user experience, discovery, and utility.

---

## I. Enhancing Playback Experience

---

### "Mini Player" Mode

Introduce a compact player view for a less intrusive experience.

* **Functionality:** A dedicated button or action to collapse the main player UI into a highly compact version. This mini-player would typically display only essential information like album art, song title, artist, and fundamental controls (play/pause, next).
* **Placement:** The mini-player could either float freely, be draggable, or dock to a specific corner of the screen, allowing users to navigate or interact with other parts of your website (if applicable) while music continues to play.
* **Implementation:** Primarily achieved using CSS for styling and JavaScript to toggle classes and control element visibility based on the mini-player state.

### Persistent Queue (Beyond Current Playlist)

Implement a robust playback queue that persists across sessions.

* **Functionality:** Allow users to "Add to Queue" any song, whether from search results or any existing playlist.
* **Playback Logic:** Songs in this queue would play sequentially after the currently playing song finishes, or after the entire current playlist has concluded, depending on the chosen playback priority logic.
* **Management:** The queue needs a dedicated interface where users can view its contents, reorder tracks, and remove individual items.
* **State Management:** The entire queue state must be stored in `localStorage` to ensure persistence across browser sessions.
* **Complexity:** This significantly increases the complexity of your playback logic, as your `playNextTrackInCurrentPlaylist` function (or equivalent) would first need to check and prioritize items in the persistent queue.

### Remember Last Playback Position

For longer audio content, offer seamless resume functionality.

* **Functionality:** If a user stops playing a track, especially longer ones like podcasts, and returns to it later, the player should offer to resume playback from where they left off.
* **State Management:** Store the `trackId` and `currentTime` of the last played position in `localStorage`.
* **User Prompt:** When that `trackId` is initiated for playback again, display a prompt (e.g., a small overlay or toast) asking the user if they wish to resume from the last position or start over.
* **Applicability:** Most beneficial for content that is not typically "short songs."

### "Radio Mode" / Autoplay Similar Songs (API Dependent)

Enable continuous discovery of related music.

* **Functionality:** After a song or the current playlist finishes, the player would automatically find and play a similar song.
* **API Dependency:** This feature heavily relies on external APIs (e.g., Last.fm's similar tracks API, or Spotify's recommendation API if integrated).
* **Complexity:** This is a significant addition in terms of API integration, data parsing, and managing potential API rate limits.

---

## II. Improving Discovery & Library Interaction

---

### Advanced Search Filters

Enhance search capabilities for more refined results.

* **Functionality:** Allow users to filter search results by additional criteria, such as **genre** (if genre information is consistently available through the iTunes API or other integrated metadata sources).
* **Current Limitations:** Note that the basic iTunes search via the `term=` parameter offers limited filtering options. This might require additional metadata lookups or different API integrations.

### "Recently Played" Songs List

Provide easy access to previously enjoyed tracks.

* **Functionality:** Maintain a dynamically updated list of the last `X` songs played by the user.
* **Display:** This list should be prominently displayed, perhaps in a dedicated section within the sidebar or a separate "History" view.
* **State Management:** Store the list of recently played songs in `localStorage`.

### Tagging or Categorizing Playlists

Enable better organization and filtering of custom playlists.

* **Functionality:** Allow users to assign custom tags (e.g., "workout," "chill," "80s," "focus") to their created playlists.
* **Filtering:** Provide a mechanism (e.g., a tag cloud or filter dropdown) to filter the main playlist overview by these assigned tags.
* **Storage:** Store these tags as an array or similar structure within the corresponding playlist objects in `localStorage`.

### "Go to Artist" / "Go to Album"

Facilitate deeper exploration from playing or listed tracks.

* **Functionality:** Make the artist name and/or album title clickable elements within the "Now Playing" display or individual playlist items.
* **Action:** Clicking these elements would trigger a new search (using your existing search functionality) pre-filled with the artist's name to show their top songs, or the album title to show songs from that album. This leverages your existing search API calls.

---

## III. Visual & Theming

---

### Visual Accent on Hover for Controls

Enhance interactivity and affordance of player controls.

* **Functionality:** Implement subtle visual changes (e.g., slight background color shift, icon color change, gentle scaling animation) on hover for all interactive control elements (play, pause, next, volume slider, like button, etc.).
* **Purpose:** Improves the user experience by providing clear visual feedback that an element is interactive and responsive.

### Loading Skeletons for UI

Improve the perceived loading speed and polish.

* **Functionality:** Instead of generic "Loading..." text, display "skeleton" UI elements when content (e.g., search results, lyrics, playlist data) is being fetched. These are grayed-out placeholder shapes that mimic the structure of the content that will eventually load.
* **Implementation:** Involves using CSS to style these skeleton elements and JavaScript to toggle their visibility, showing them during data fetching and hiding them once the actual content is available.

### Option to Disable Dynamic Background

Provide user control over visual aesthetics.

* **Functionality:** Add a toggle switch in the settings or preferences menu that allows users to disable the album art-based dynamic background.
* **Fallback:** When disabled, the background should revert to a default static color, gradient, or a user-chosen static background.

---

## IV. Utility & Sharing

---

### "Copy Song Info" Button

Enable quick sharing of track details.

* **Functionality:** A button, either in the main player UI or next to individual song entries, that copies the "Artist - Title" string of the current or selected song to the user's clipboard.
* **Implementation:** Utilizes the `navigator.clipboard.writeText()` API.

### Playlist Statistics (Simple)

Provide basic insights into playlists.

* **Functionality:** When viewing a playlist, display simple summary statistics, such as:
    * The total number of songs.
    * The number of unique artists represented.
    * The most common genre (if you reliably store genre data per song).

### Integration with URL Parameters (Basic Sharing)

Enable direct linking to specific player states.

* **Functionality:** Design the player to respond to specific URL hash parameters. For example:
    * `yourplayer.html#play=TRACK_ID`: Attempts to auto-play a specific track upon page load (requires an iTunes lookup by ID).
    * `yourplayer.html#search=QUERY`: Automatically performs a search with the specified query upon page load.
* **Implementation:** On page load, check `window.location.hash`. If it matches a defined pattern, trigger the corresponding player action (e.g., fetching and playing a track, or initiating a search). This makes sharing specific songs or search contexts easier.

---

## V. Advanced (Potentially More Complex for "Static")

---

### Local File Playback (Significant Addition)

Allow users to play audio files directly from their local system.

* **Functionality:** Implement an `<input type="file" accept="audio/*">` element that allows users to select audio files from their computer.
* **Playback:** These files can then be played using the Web Audio API for more advanced processing (like EQ/visualizer) or simply via a standard `<audio>` HTML tag.
* **Metadata Reading:** For a richer experience, consider integrating a library (like `jsmediatags`) to read ID3 tags from local files to extract title, artist, album art, and other metadata.
* **Impact:** This dramatically changes the player's scope, moving beyond just streaming from online sources.

### Last.fm Scrobbling (External API Integration)

Integrate with a popular music tracking service.

* **Functionality:** If the user connects their Last.fm account, automatically "scrobble" (record) played tracks to their Last.fm profile.
* **Complexity:** This is an advanced feature requiring:
    * **OAuth Implementation:** Securely connecting with the Last.fm API using OAuth for user authentication and authorization.
    * **API Interaction:** Sending playback data (track, artist, album, duration, timestamp) to the Last.fm API according to their specifications.
    * **User Interface:** Providing a way for users to link/unlink their Last.fm account within your player.


    II. Enhancing the "Now Playing" Experience:
Artist/Album Links to External Services:
When a song is playing, make the artist and album name (if you fetch album info) clickable links that go to that artist/album on Spotify, Apple Music, or even a Google search.
Implementation: Construct search URLs (e.g., https://open.spotify.com/search/artist%3A${artistName}).
Visual Cue for Song Duration/Progress on Album Art:
Subtly overlay a thin progress bar directly on the album art image itself, in addition to the main seekbar. Could be a circular progress bar around a circular album art, or a line at the bottom.
"Add to new playlist" directly from "Add to playlist" modal:
In the "Add to Playlist" modal, alongside the list of existing playlists, have a small "+" button or a "Create new playlist & add" option that takes them to the create playlist flow, and then automatically adds the current song to it.


Explicit Content Indicator:
iTunes API provides trackExplicitness ("explicit" or "notExplicit"). Show a small "E" icon or similar if a track is explicit, like many music services do.

Simple Text-Based "Up Next" Display:
If a playlist or queue is active, subtly show the title of the next song somewhere in the UI (e.g., faded below the current timecodes).