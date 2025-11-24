// Helper function to get element by ID
function $(id) {
    return document.getElementById(id);
}

// Show/hide element utilities
function showElement(id) {
    const el = $(id);
    if (el) el.style.display = '';
}

function hideElement(id) {
    const el = $(id);
    if (el) el.style.display = 'none';
}

function toggleElement(id) {
    const el = $(id);
    if (el) {
        el.style.display = el.style.display === 'none' ? '' : 'none';
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textarea);
    }
}

