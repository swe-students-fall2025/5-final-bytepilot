// Common JavaScript utilities

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

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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
        // Fallback for older browsers
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

// AJAX request helper
function ajaxRequest(url, method, data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    callback(null, response);
                } catch (e) {
                    callback(null, xhr.responseText);
                }
            } else {
                callback(new Error('Request failed with status: ' + xhr.status));
            }
        }
    };
    
    if (data) {
        xhr.send(JSON.stringify(data));
    } else {
        xhr.send();
    }
}

// Show loading state
function showLoading(elementId) {
    const el = $(elementId);
    if (el) {
        el.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';
    }
}

// Show empty state
function showEmptyState(elementId, message) {
    const el = $(elementId);
    if (el) {
        el.innerHTML = `<div style="text-align: center; padding: 40px; color: #999;">${message || 'No data available'}</div>`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Close modal on outside click
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal on close button click
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
});

