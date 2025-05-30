// js/toast.js

const toastContainer = document.getElementById('toastContainer');

/**
 * Displays a toast message.
 * @param {string} message The message to display.
 * @param {number} duration How long the toast should be visible in milliseconds (default: 3000).
 */
function showToast(message, duration = 3000) {
    if (!toastContainer) {
        console.error("Toast container not found!");
        // Fallback to alert if container is missing
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Trigger the animation
    // We need a slight delay or force reflow for the transition to work on newly added elements
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double requestAnimationFrame ensures styles are applied then transitioned
            toast.classList.add('show');
        });
    });


    // Remove the toast after the duration
    setTimeout(() => {
        toast.classList.remove('show');
        // Listen for transition end to remove from DOM, prevents abrupt disappearance
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) { // Check if still in DOM
                toast.parentNode.removeChild(toast);
            }
        }, { once: true }); // Important: only fire once
    }, duration);
}