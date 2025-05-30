// js/toast.js

const toastContainer = document.getElementById('toastContainer');
const MAX_TOASTS = 1; // Define the maximum number of toasts allowed

// Store references to active toasts and their removal timeouts
let activeToasts = []; // Array of { element: toastElement, timeoutId: id }

/**
 * Displays a toast message, managing the maximum number of toasts.
 * @param {string} message The message to display.
 * @param {number} duration How long the toast should be visible in milliseconds (default: 3000).
 */
function showToast(message, duration = 3000) {
    if (!toastContainer) {
        console.error("Toast container not found!");
        alert(message); // Fallback
        return;
    }

    // If max toasts (or more) are considered active, remove the oldest one.
    // "Oldest" here refers to the one added first to our activeToasts array.
    if (activeToasts.length >= MAX_TOASTS) {
        const oldestToastEntry = activeToasts.shift(); // Remove from beginning of our tracking array
        if (oldestToastEntry) {
            clearTimeout(oldestToastEntry.timeoutId); // Stop its scheduled removal
            // Force remove its 'show' class and then remove from DOM without waiting for transition
            // This is to make space immediately.
            if (oldestToastEntry.element.parentNode) {
                oldestToastEntry.element.classList.remove('show'); // Start fade if desired, but removal is next
                oldestToastEntry.element.remove(); // Immediate DOM removal
            }
        }
    }

    const toastElement = document.createElement('div');
    toastElement.className = 'toast-message';
    toastElement.textContent = message;

    toastContainer.appendChild(toastElement);

    // Trigger the animation for showing
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toastElement.classList.add('show');
        });
    });

    const removalTimeoutId = setTimeout(() => {
        // Start fade out animation
        toastElement.classList.remove('show');

        // Remove from DOM after transition
        const transitionEndHandler = () => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
            // Clean up from our activeToasts array
            activeToasts = activeToasts.filter(t => t.element !== toastElement);
            toastElement.removeEventListener('transitionend', transitionEndHandler); // Clean up listener
        };
        toastElement.addEventListener('transitionend', transitionEndHandler);

        // Fallback: if transitionend doesn't fire (e.g. element removed by other means, or no transition)
        // remove it from activeToasts after a bit longer than the transition duration
        setTimeout(() => {
            activeToasts = activeToasts.filter(t => t.element !== toastElement);
            if (toastElement.parentNode) { // If still in DOM and transitionend didn't fire
                 toastElement.remove();
            }
        }, duration + 500); // duration of show + css transition time (e.g., 300ms) + buffer

    }, duration);

    // Add to our tracking array
    activeToasts.push({ element: toastElement, timeoutId: removalTimeoutId });
}