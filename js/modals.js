// Callbacks for confirm/cancel actions
let generalModalConfirmCallback = null; // Not strictly needed if callbacks are passed directly to buttons
let generalModalCancelCallback = null;  // Same as above

function initializeModals() {
    generalModalElement = document.getElementById('generalModal');
    generalModalTitleElement = document.getElementById('generalModalTitle');
    generalModalMessageElement = document.getElementById('generalModalMessage');
    generalModalActionsElement = document.getElementById('generalModalActions');
    closeGeneralModalBtnElement = document.getElementById('closeGeneralModal');

    if (!generalModalElement || !generalModalTitleElement || !generalModalMessageElement ||
        !generalModalActionsElement || !closeGeneralModalBtnElement) {
        console.error("General modal DOM elements not found. Modal functionality will be limited.");
        return; // Or handle gracefully
    }

    closeGeneralModalBtnElement.addEventListener('click', closeGeneralModal);
    generalModalElement.addEventListener('click', (event) => {
        // Close if clicked on the overlay (background)
        if (event.target === generalModalElement) {
            closeGeneralModal();
        }
    });
    console.log("General Modal system initialized.");
}

function showGeneralModal(title, message, buttonsConfig = []) {
    // buttonsConfig example:
    // [
    //   { text: 'OK', class: 'secondary', callback: () => console.log('OK clicked') },
    //   { text: 'Delete', class: 'primary', callback: handleDeleteFunction }
    // ]
    if (!generalModalElement || !generalModalTitleElement || !generalModalMessageElement || !generalModalActionsElement) {
        console.error("Cannot show general modal: elements not initialized.");
        // Fallback to alert if modal elements aren't ready (though they should be if init is called)
        alert(`${title}\n${message.replace(/<br\s*\/?>/gi, "\n").replace(/<strong>|<\/strong>/gi, "")}`);
        return;
    }

    generalModalTitleElement.textContent = title;
    generalModalMessageElement.innerHTML = message; // Use innerHTML if message might contain simple HTML like <br>, <strong>
    generalModalActionsElement.innerHTML = ''; // Clear previous buttons

    if (buttonsConfig.length === 0) {
        // Default OK button if no buttons are specified (for simple alerts)
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.className = 'modal-button secondary'; // Assumes .modal-button and .secondary are globally styled
        okButton.onclick = closeGeneralModal;
        generalModalActionsElement.appendChild(okButton);
    } else {
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `modal-button ${btnConfig.class || 'secondary'}`;
            button.onclick = () => {
                closeGeneralModal(); // Always close modal on button click
                if (btnConfig.callback && typeof btnConfig.callback === 'function') {
                    btnConfig.callback();
                }
            };
            generalModalActionsElement.appendChild(button);
        });
    }
    generalModalElement.style.display = 'flex';
}

function closeGeneralModal() {
    if (!generalModalElement) return;
    generalModalElement.style.display = 'none';
    // Callbacks are tied to buttons, so no need to reset module-level generalModalConfirmCallback here
}

// Helper function for escaping HTML (can live here or in a general utils.js)
// Make sure this is accessible if other files need it, or they have their own.
function escapeModalHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return unsafe === null || typeof unsafe === 'undefined' ? '' : String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&")
         .replace(/</g, "<")
         .replace(/>/g, ">")
         .replace(/"/g, '"')
         .replace(/'/g, "'");
}