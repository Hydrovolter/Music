function applyColors(color) {
    if (!color || !Array.isArray(color) || color.length < 3) {
      return;
    }
  
    targetColor = { r: color[0], g: color[1], b: color[2] };
  
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  
    applyAnimation();
  }
  
  function applyAnimation() {
    const dr = (targetColor.r - currentColor.r) * 0.1;
    const dg = (targetColor.g - currentColor.g) * 0.1;
    const db = (targetColor.b - currentColor.b) * 0.1;
  
    currentColor.r += dr;
    currentColor.g += dg;
    currentColor.b += db;
  
    const r = Math.round(currentColor.r);
    const g = Math.round(currentColor.g);
    const b = Math.round(currentColor.b);
  
    const darkenAmount = 30;
    const endR = Math.max(0, r - darkenAmount);
    const endG = Math.max(0, g - darkenAmount);
    const endB = Math.max(0, b - darkenAmount);
  
    document.documentElement.style.setProperty(
      "--bg-start",
      `rgb(${r}, ${g}, ${b})`
    );
    document.documentElement.style.setProperty(
      "--bg-end",
      `rgb(${endR}, ${endG}, ${endB})`
    );
  
    const tolerance = 0.5;
    if (
      Math.abs(targetColor.r - currentColor.r) > tolerance ||
      Math.abs(targetColor.g - currentColor.g) > tolerance ||
      Math.abs(targetColor.b - currentColor.b) > tolerance
    ) {
      animationId = requestAnimationFrame(applyAnimation);
    } else {
      currentColor = { ...targetColor };
    }
  }
  

  function setAlbumArtAndBackgroundColor(artworkSrc) {
    if (!albumCover || !colorThief) {
        console.error("Album cover element or ColorThief not initialized.");
        applyColors([115, 98, 86]); // Default
        return;
    }

    // Reset previous onload/onerror to avoid multiple firings if called rapidly
    albumCover.onload = null;
    albumCover.onerror = null;

    const isDataUrl = artworkSrc && artworkSrc.startsWith('data:image');

    // For Data URLs, crossorigin attribute is not needed and can sometimes cause issues.
    // For external URLs, it's needed if the server doesn't send appropriate CORS headers
    // and ColorThief needs pixel access. iTunes artwork URLs generally work well with it.
    if (!isDataUrl) {
        albumCover.crossOrigin = "anonymous";
    } else {
        albumCover.removeAttribute('crossorigin'); // Remove if previously set
    }

    const attemptColorExtraction = () => {
        if (albumCover.src && !albumCover.src.endsWith('img/empty_art.png') && albumCover.naturalWidth > 0) {
            try {
                // Ensure the image is actually loaded and has dimensions
                // For very fast loading images (like data URLs), 'load' might fire before this check
                const dominantColor = colorThief.getColor(albumCover);
                applyColors(dominantColor);
            } catch (e) {
                console.error("Color extraction failed for:", albumCover.src, e);
                applyColors([100, 100, 100]); // Fallback color
            }
        } else if (albumCover.src && albumCover.src.endsWith('img/empty_art.png')) {
            applyColors([115, 98, 86]); // Default for placeholder
        } else {
            // This case might happen if the image source is invalid or loading fails before onerror
            console.warn("Album art source is empty or not the placeholder, applying default colors.");
            applyColors([115, 98, 86]);
        }
    };

    albumCover.onload = () => {
        console.log("Album art loaded:", albumCover.src.substring(0,100));
        attemptColorExtraction();
    };

    albumCover.onerror = () => {
        console.error("Failed to load album art from src:", artworkSrc ? artworkSrc.substring(0,100) : "undefined");
        albumCover.src = 'img/empty_art.png'; // Set to placeholder
        // The onload for 'img/empty_art.png' will then trigger default color
    };

    if (artworkSrc) {
        // Check if the new source is different from the current one
        // or if the current one is the placeholder and we're setting a real image.
        // This helps avoid unnecessary reloads if the art is the same.
        if (albumCover.src !== artworkSrc || albumCover.src.endsWith('img/empty_art.png')) {
            albumCover.src = artworkSrc;
            // If the image is already complete (e.g., cached or very fast data URL),
            // onload might not fire. So, try to extract colors directly.
            if (albumCover.complete && albumCover.naturalWidth > 0) {
                 console.log("Album art already complete, attempting color extraction directly:", artworkSrc.substring(0,100));
                 attemptColorExtraction();
            } else if (!artworkSrc.endsWith('img/empty_art.png') && albumCover.complete && albumCover.naturalWidth === 0) {
                // Image is "complete" but has no dimensions (likely error state for a non-placeholder)
                console.warn("Album art reported complete but has no dimensions. Triggering error handler logic.");
                albumCover.onerror(); // Manually trigger error handling
            }
        } else {
            // Source is the same and it's not the placeholder, colors should already be set.
            // console.log("Album art source is the same, skipping reload and color extraction.");
        }
    } else {
        albumCover.src = 'img/empty_art.png'; // This will trigger its own onload
    }
}