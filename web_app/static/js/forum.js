// Setup event listeners
function setupEventListeners() {
    // Quick post form
    const quickPostForm = document.querySelector('.quick-post-form');
    if (quickPostForm) {
        quickPostForm.addEventListener('submit', handleQuickPost);
    }
    
    // Reply form
    const replyForm = document.querySelector('.reply-form');
    if (replyForm) {
        replyForm.addEventListener('submit', handleReply);
    }
    
    // Copy thread link
    const copyLinks = document.querySelectorAll('.copy-link');
    copyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            copyThreadLink();
        });
    });
    
    // Go to floor input
    const gotoFloorInputs = document.querySelectorAll('.goto-floor');
    gotoFloorInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const floor = parseInt(this.value);
                if (floor) {
                    goToFloor(floor);
                }
            }
        });
    });
}

// Handle quick post
function handleQuickPost(event) {
    event.preventDefault();
    alert('Post functionality requires backend connection. This is a demo page.');
}

// Handle reply
function handleReply(event) {
    event.preventDefault();
    alert('Reply functionality requires backend connection. This is a demo page.');
}

// Copy thread link
function copyThreadLink() {
    const url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            alert('Thread link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('Thread link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textarea);
    }
}

// Go to floor
function goToFloor(floor) {
    const postItem = document.querySelector(`.post-item[data-floor="${floor}"]`);
    if (postItem) {
        postItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postItem.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            postItem.style.backgroundColor = '';
        }, 2000);
    } else {
        alert(`Floor ${floor} not found`);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

