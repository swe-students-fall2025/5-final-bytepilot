// Setup event listeners
function setupEventListeners() {
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// ===== Create Forum Page Functions =====
let characters = [];
let selectedCharacters = [];

// Load characters from localStorage
function loadCharacters() {
    const stored = localStorage.getItem('characters');
    if (stored) {
        characters = JSON.parse(stored);
    }
    
    // Setup search input listener
    const searchInput = document.getElementById('character-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            performCharacterSearch(this.value.trim());
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', function(e) {
            const searchContainer = document.querySelector('.character-search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                const results = document.getElementById('character-search-results');
                if (results) {
                    results.classList.add('hidden');
                }
            }
        });
    }
}

// Perform character search
function performCharacterSearch(query) {
    const resultsContainer = document.getElementById('character-search-results');
    if (!resultsContainer) return;
    
    if (!query) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    if (characters.length === 0) {
        resultsContainer.innerHTML = '<div class="character-search-result-item empty-search-result">No characters available. Characters will be created when you add posts.</div>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    // Search in name, nickname, and fandom (case-insensitive)
    const lowerQuery = query.toLowerCase();
    const filtered = characters.filter((char, index) => {
        const name = (char.name || '').toLowerCase();
        const nickname = (char.nickname || '').toLowerCase();
        const fandom = (char.fandom || '').toLowerCase();
        return name.includes(lowerQuery) || nickname.includes(lowerQuery) || fandom.includes(lowerQuery);
    });
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="character-search-result-item empty-search-result">No characters found matching "' + escapeHtml(query) + '"</div>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    // Render search results
    resultsContainer.innerHTML = '';
    filtered.forEach((char, resultIndex) => {
        // Find original index in characters array
        const originalIndex = characters.findIndex(c => 
            c.name === char.name && 
            c.nickname === char.nickname && 
            c.fandom === char.fandom
        );
        
        if (originalIndex === -1) return;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'character-search-result-item';
        if (selectedCharacters.includes(originalIndex)) {
            resultItem.classList.add('selected');
        }
        
        resultItem.innerHTML = `
            <div class="character-result-name">${escapeHtml(char.name)}</div>
            <div class="character-result-nickname">Nickname: ${escapeHtml(char.nickname)}</div>
            <div class="character-result-fandom">Fandom: ${escapeHtml(char.fandom)}</div>
        `;
        
        resultItem.addEventListener('click', function() {
            toggleCharacter(originalIndex);
            // Keep search results visible after selection
            performCharacterSearch(document.getElementById('character-search-input').value.trim());
        });
        
        resultsContainer.appendChild(resultItem);
    });
    
    resultsContainer.classList.remove('hidden');
}

// Toggle character selection
function toggleCharacter(index) {
    if (selectedCharacters.includes(index)) {
        // Remove from selection
        selectedCharacters = selectedCharacters.filter(i => i !== index);
    } else {
        // Add to selection
        selectedCharacters.push(index);
    }
    
    updateSelectedTags();
    updateCharacterSelects();
}

// Update selected character tags display
function updateSelectedTags() {
    const tagsContainer = document.getElementById('selected-characters-tags');
    if (!tagsContainer) return;
    
    if (selectedCharacters.length === 0) {
        tagsContainer.innerHTML = '<p class="empty-message">No characters selected. Search and click on characters below to add them.</p>';
        return;
    }
    
    tagsContainer.innerHTML = '';
    selectedCharacters.forEach(index => {
        const char = characters[index];
        const tag = document.createElement('div');
        tag.className = 'character-tag';
        tag.innerHTML = `
            <span class="character-tag-name">${escapeHtml(char.name)} (${escapeHtml(char.nickname)})</span>
            <button type="button" class="character-tag-remove" data-index="${index}">&times;</button>
        `;
        
        const removeBtn = tag.querySelector('.character-tag-remove');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleCharacter(index);
            // Refresh search results if search is active
            const searchInput = document.getElementById('character-search-input');
            if (searchInput && searchInput.value.trim()) {
                performCharacterSearch(searchInput.value.trim());
            }
        });
        
        tagsContainer.appendChild(tag);
    });
}

// Update character select dropdowns
function updateCharacterSelects() {
    const selects = document.querySelectorAll('.character-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Character</option>';
        
        selectedCharacters.forEach(index => {
            const char = characters[index];
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${char.name} (${char.nickname})`;
            select.appendChild(option);
        });
        
        if (currentValue && selectedCharacters.includes(parseInt(currentValue))) {
            select.value = currentValue;
        }
    });
}

// Add new post editor
function addPost() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    const postItem = document.createElement('div');
    postItem.className = 'post-editor-item';
    
    const header = document.createElement('div');
    header.className = 'post-editor-header';
    
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'character-select-wrapper';
    
    const select = document.createElement('select');
    select.className = 'character-select';
    select.required = true;
    select.innerHTML = '<option value="">Select Character</option>';
    select.addEventListener('change', function() {
        toggleCharacterSettings(this);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-post';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function() {
        removePost(removeBtn);
    });
    
    // Character settings (avatar and nickname for this forum)
    const charSettings = document.createElement('div');
    charSettings.className = 'character-settings';
    
    const nicknameRow = document.createElement('div');
    nicknameRow.className = 'character-setting-row';
    nicknameRow.innerHTML = `
        <label>Nickname:</label>
        <input type="text" class="character-nickname-input" placeholder="Forum username for this character">
    `;
    
    const avatarRow = document.createElement('div');
    avatarRow.className = 'character-setting-row';
    avatarRow.innerHTML = `
        <label>Avatar:</label>
        <input type="file" class="character-avatar-input" accept="image/*">
    `;
    
    charSettings.appendChild(nicknameRow);
    charSettings.appendChild(avatarRow);
    
    selectWrapper.appendChild(select);
    header.appendChild(selectWrapper);
    header.appendChild(removeBtn);
    postItem.appendChild(header);
    postItem.appendChild(charSettings);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'post-content-input';
    textarea.rows = 4;
    textarea.placeholder = 'Enter post content...';
    textarea.required = true;
    
    postItem.appendChild(textarea);
    container.appendChild(postItem);
    
    updateCharacterSelects();
}

// Toggle character settings visibility
function toggleCharacterSettings(select) {
    const postItem = select.closest('.post-editor-item');
    const charSettings = postItem.querySelector('.character-settings');
    const charIndex = select.value;
    
    if (charIndex && characters[charIndex]) {
        charSettings.classList.add('active');
        const char = characters[charIndex];
        const nicknameInput = charSettings.querySelector('.character-nickname-input');
        if (nicknameInput && !nicknameInput.value) {
            nicknameInput.value = char.nickname || '';
        }
    } else {
        charSettings.classList.remove('active');
    }
}

// Remove post editor
function removePost(btn) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    if (container.children.length > 1) {
        const postItem = btn.closest('.post-editor-item');
        if (postItem) {
            postItem.remove();
        }
    } else {
        alert('At least one post is required!');
    }
}

// Preview forum
function previewForum() {
    const titleInput = document.getElementById('forum-title');
    if (!titleInput) return;
    
    const title = titleInput.value.trim();
    if (!title) {
        alert('Please enter a forum title!');
        return;
    }
    
    const posts = [];
    const postItems = document.querySelectorAll('.post-editor-item');
    let isValid = true;
    
    postItems.forEach((item, index) => {
        const select = item.querySelector('.character-select');
        const textarea = item.querySelector('.post-content-input');
        
        if (!select || !textarea) {
            isValid = false;
            return;
        }
        
        const charIndex = select.value;
        const content = textarea.value.trim();
        
        if (!charIndex || !content) {
            isValid = false;
            return;
        }
        
        const char = characters[parseInt(charIndex)];
        if (!char) {
            isValid = false;
            return;
        }
        
        posts.push({
            character: char,
            content: content,
            floor: index + 1
        });
    });
    
    if (!isValid) {
        alert('Please fill in all posts with character selection and content!');
        return;
    }
    
    if (posts.length === 0) {
        alert('Please add at least one post!');
        return;
    }
    
    // Generate preview HTML using DOM methods to avoid XSS
    const previewContent = document.getElementById('preview-content');
    if (!previewContent) return;
    
    previewContent.innerHTML = '';
    
    const threadInfo = document.createElement('div');
    threadInfo.className = 'thread-info-bar';
    const titleBar = document.createElement('div');
    titleBar.className = 'thread-title-bar';
    const h1 = document.createElement('h1');
    h1.textContent = title;
    titleBar.appendChild(h1);
    threadInfo.appendChild(titleBar);
    
    const postsContainer = document.createElement('div');
    postsContainer.className = 'posts-container';
    
    posts.forEach((post, index) => {
        const isOP = index === 0;
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.setAttribute('data-floor', post.floor);
        
        const displayNickname = post.nickname || post.character.nickname;
        const displayAvatar = post.avatar || post.character.pic || 'https://via.placeholder.com/80';
        
        const sidebar = document.createElement('div');
        sidebar.className = 'post-sidebar';
        sidebar.innerHTML = `
            <div class="user-avatar">
                <img src="${displayAvatar.startsWith('http') ? displayAvatar : 'https://via.placeholder.com/80'}" alt="${escapeHtml(displayNickname)}">
            </div>
            <div class="user-name">${escapeHtml(displayNickname)}</div>
            <div class="user-stats">
                <div>Character: ${escapeHtml(post.character.name)}</div>
                <div>Fandom: ${escapeHtml(post.character.fandom)}</div>
            </div>
            <div class="user-title">Member</div>
        `;
        
        const contentArea = document.createElement('div');
        contentArea.className = 'post-content-area';
        
        const postHeader = document.createElement('div');
        postHeader.className = 'post-header';
        postHeader.innerHTML = `
            <span class="post-number">${post.floor}#</span>
            ${isOP ? '<span class="post-author-label">Original Poster</span>' : ''}
            <span class="post-time">Posted on ${new Date().toLocaleString()}</span>
        `;
        
        const postBody = document.createElement('div');
        postBody.className = 'post-body';
        post.content.split('\n').forEach(p => {
            if (p.trim()) {
                const pEl = document.createElement('p');
                pEl.textContent = p;
                postBody.appendChild(pEl);
            }
        });
        
        const postFooter = document.createElement('div');
        postFooter.className = 'post-footer';
        if (isOP) {
            const collectBtn = document.createElement('button');
            collectBtn.className = 'post-action';
            collectBtn.textContent = '★ Collect';
            postFooter.appendChild(collectBtn);
        }
        const likeBtn = document.createElement('button');
        likeBtn.className = 'post-action';
        likeBtn.textContent = '👍 Like';
        postFooter.appendChild(likeBtn);
        const replyLink = document.createElement('a');
        replyLink.href = '#';
        replyLink.className = 'post-action';
        replyLink.textContent = 'Reply';
        postFooter.appendChild(replyLink);
        
        contentArea.appendChild(postHeader);
        contentArea.appendChild(postBody);
        contentArea.appendChild(postFooter);
        
        postItem.appendChild(sidebar);
        postItem.appendChild(contentArea);
        postsContainer.appendChild(postItem);
    });
    
    previewContent.appendChild(threadInfo);
    previewContent.appendChild(postsContainer);
    
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close preview
function closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save forum
function saveForum(status) {
    const titleInput = document.getElementById('forum-title');
    if (!titleInput) return;
    
    const title = titleInput.value.trim();
    if (!title) {
        alert('Please enter a forum title!');
        return;
    }
    
    const posts = [];
    const postItems = document.querySelectorAll('.post-editor-item');
    let isValid = true;
    
    postItems.forEach((item, index) => {
        const select = item.querySelector('.character-select');
        const textarea = item.querySelector('.post-content-input');
        
        if (!select || !textarea) {
            isValid = false;
            return;
        }
        
        const charIndex = select.value;
        const content = textarea.value.trim();
        
        if (!charIndex || !content) {
            isValid = false;
            return;
        }
        
        const charIndexNum = parseInt(charIndex);
        if (isNaN(charIndexNum) || !characters[charIndexNum]) {
            isValid = false;
            return;
        }
        
        // Get character settings for this forum
        const charSettings = item.querySelector('.character-settings');
        const nicknameInput = charSettings ? charSettings.querySelector('.character-nickname-input') : null;
        const avatarInput = charSettings ? charSettings.querySelector('.character-avatar-input') : null;
        
        const nickname = nicknameInput ? nicknameInput.value.trim() : characters[charIndexNum].nickname;
        const avatar = avatarInput && avatarInput.files[0] ? avatarInput.files[0].name : characters[charIndexNum].pic;
        
        posts.push({
            characterIndex: charIndexNum,
            content: content,
            floor: index + 1,
            nickname: nickname || characters[charIndexNum].nickname,
            avatar: avatar || characters[charIndexNum].pic
        });
    });
    
    if (!isValid) {
        alert('Please fill in all posts with character selection and content!');
        return;
    }
    
    if (posts.length === 0) {
        alert('Please add at least one post!');
        return;
    }
    
    // Save to localStorage
    const forum = {
        id: Date.now().toString(),
        title: title,
        posts: posts,
        status: status || 'draft',
        createdAt: new Date().toISOString(),
        publishedAt: status === 'published' ? new Date().toISOString() : null
    };
    
    try {
        let forums = JSON.parse(localStorage.getItem('forums') || '[]');
        forums.push(forum);
        localStorage.setItem('forums', JSON.stringify(forums));
        
        // Also save to published forums if publishing
        if (status === 'published') {
            let publishedForums = JSON.parse(localStorage.getItem('publishedForums') || '[]');
            publishedForums.push(forum);
            localStorage.setItem('publishedForums', JSON.stringify(publishedForums));
        }
        
        const message = status === 'published' 
            ? 'Forum published successfully! It is now visible in the community.'
            : 'Forum saved as draft successfully!';
        alert(message);
        window.location.href = '/forum';
    } catch (e) {
        alert('Error saving forum: ' + e.message);
        console.error(e);
    }
}

// Initialize create forum page
function initCreateForum() {
    try {
        // Add first post editor
        addPost();
        
        loadCharacters();
        
        const addPostBtn = document.getElementById('add-post-btn');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', addPost);
        }
        
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', previewForum);
        }
        
        const closePreviewBtn = document.getElementById('close-preview-btn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', closePreview);
        }
        
        const form = document.getElementById('create-forum-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveForum('draft');
            });
        }
        
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', function(e) {
                e.preventDefault();
                saveForum('draft');
            });
        }
        
        const publishBtn = document.getElementById('publish-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to publish this forum? It will be visible to all users in the community.')) {
                    saveForum('published');
                }
            });
        }
        
        // Close preview on outside click
        const previewModal = document.getElementById('preview-modal');
        if (previewModal) {
            previewModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closePreview();
                }
            });
        }
    } catch (e) {
        console.error('Initialization error:', e);
        alert('Error initializing page: ' + e.message);
    }
}

// ===== Index Page Functions =====
function initIndex() {
    // Load forums
    const forums = JSON.parse(localStorage.getItem('forums') || '[]');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    
    // Update stats
    document.getElementById('total-forums').textContent = forums.length;
    document.getElementById('total-characters').textContent = characters.length;
    document.getElementById('forum-count').textContent = forums.length;
    
    let totalPosts = 0;
    forums.forEach(forum => {
        totalPosts += forum.posts ? forum.posts.length : 0;
    });
    document.getElementById('total-posts').textContent = totalPosts;
    
    // Display my forums
    const forumsList = document.getElementById('forums-list');
    if (forums.length === 0) {
        // Keep the default message
    } else {
        forumsList.innerHTML = '';
        forums.reverse().forEach(forum => {
            const forumItem = document.createElement('div');
            forumItem.className = 'latest-post';
            const postCount = forum.posts ? forum.posts.length : 0;
            const createdDate = new Date(forum.createdAt).toLocaleDateString();
            const status = forum.status || 'draft';
            const statusText = status === 'published' ? 'Published' : 'Draft';
            forumItem.innerHTML = `
                <a href="/viewforum?id=${forum.id}">${escapeHtml(forum.title)}</a>
                <span class="post-meta">${postCount} posts | ${statusText} | Created ${createdDate}</span>
            `;
            forumsList.appendChild(forumItem);
        });
    }
    
    // Display published forums
    const publishedForums = forums.filter(f => f.status === 'published');
    document.getElementById('published-count').textContent = publishedForums.length;
    
    const publishedList = document.getElementById('published-list');
    if (publishedForums.length === 0) {
        // Keep the default message
    } else {
        publishedList.innerHTML = '';
        publishedForums.reverse().slice(0, 5).forEach(forum => {
            const forumItem = document.createElement('div');
            forumItem.className = 'latest-post';
            const postCount = forum.posts ? forum.posts.length : 0;
            const publishedDate = forum.publishedAt 
                ? new Date(forum.publishedAt).toLocaleDateString()
                : new Date(forum.createdAt).toLocaleDateString();
            forumItem.innerHTML = `
                <a href="/viewforum?id=${forum.id}">${escapeHtml(forum.title)}</a>
                <span class="post-meta">${postCount} posts | Published ${publishedDate}</span>
            `;
            publishedList.appendChild(forumItem);
        });
    }
}

// ===== Forum Page Functions =====
let currentFilter = 'all';
let allForums = [];

function loadForums() {
    allForums = JSON.parse(localStorage.getItem('forums') || '[]');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    
    // Count drafts and published
    let draftCount = 0;
    let publishedCount = 0;
    allForums.forEach(forum => {
        if (forum.status === 'published') {
            publishedCount++;
        } else {
            draftCount++;
        }
    });
    
    document.getElementById('draft-count').textContent = draftCount;
    document.getElementById('published-count').textContent = publishedCount;
    
    // Set active tab based on current filter
    const activeTab = document.querySelector(`.filter-tab[data-filter="${currentFilter}"]`);
    filterForums(currentFilter, activeTab);
}

function filterForums(filter, targetElement) {
    currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (targetElement) {
        targetElement.classList.add('active');
    }
    
    let filteredForums = allForums;
    if (filter === 'draft') {
        filteredForums = allForums.filter(f => f.status !== 'published');
    } else if (filter === 'published') {
        filteredForums = allForums.filter(f => f.status === 'published');
    }
    
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    const tbody = document.getElementById('forums-table-body');
    
    if (filteredForums.length === 0) {
        const message = filter === 'all' 
            ? 'No forums created yet. <a href="/createforum">Create your first forum</a> to get started!'
            : filter === 'draft'
            ? 'No draft forums. <a href="/createforum">Create a new forum</a>'
            : 'No published forums yet. Publish your forums to share them with the community!';
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-cell">
                    ${message}
                </td>
            </tr>
        `;
        document.getElementById('pagination-info').textContent = '0 forums';
        return;
    }
    
    tbody.innerHTML = '';
    filteredForums.reverse().forEach(forum => {
        const postCount = forum.posts ? forum.posts.length : 0;
        const createdDate = new Date(forum.createdAt).toLocaleDateString();
        const status = forum.status || 'draft';
        
        // Get unique character names
        const charIndices = new Set();
        if (forum.posts) {
            forum.posts.forEach(post => {
                if (post.characterIndex !== undefined) {
                    charIndices.add(post.characterIndex);
                }
            });
        }
        const charNames = Array.from(charIndices).map(idx => {
            const char = characters[idx];
            return char ? char.name : 'Unknown';
        }).join(', ') || 'N/A';
        
        const statusBadge = status === 'published' 
            ? '<span class="status-badge published">Published</span>'
            : '<span class="status-badge draft">Draft</span>';
        
        const row = document.createElement('tr');
        row.className = 'thread-row';
        row.innerHTML = `
            <td class="col-icon">📁</td>
            <td class="col-title">
                <a href="/viewforum?id=${forum.id}">${escapeHtml(forum.title)}</a>
            </td>
            <td class="col-author">${escapeHtml(charNames)}</td>
            <td class="col-replies">${postCount}</td>
            <td class="col-status">${statusBadge}</td>
            <td class="col-last">
                <div>${createdDate}</div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('pagination-info').textContent = `${filteredForums.length} forum${filteredForums.length !== 1 ? 's' : ''}`;
}

function initForum() {
    loadForums();
    
    // Setup filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.getAttribute('data-filter');
            filterForums(filter, this);
        });
    });
}

// ===== Community Page Functions =====
function loadPublishedForums() {
    // Get all forums and filter published ones
    const allForums = JSON.parse(localStorage.getItem('forums') || '[]');
    const publishedForums = allForums.filter(f => f.status === 'published');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    
    document.getElementById('published-count').textContent = publishedForums.length;
    document.getElementById('pagination-info').textContent = `${publishedForums.length} forum${publishedForums.length !== 1 ? 's' : ''}`;
    
    const tbody = document.getElementById('forums-table-body');
    if (publishedForums.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-cell">
                    No published forums yet. Be the first to publish a forum!
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    publishedForums.reverse().forEach(forum => {
        const postCount = forum.posts ? forum.posts.length : 0;
        const publishedDate = forum.publishedAt 
            ? new Date(forum.publishedAt).toLocaleDateString()
            : new Date(forum.createdAt).toLocaleDateString();
        
        // Get unique character names
        const charIndices = new Set();
        if (forum.posts) {
            forum.posts.forEach(post => {
                if (post.characterIndex !== undefined) {
                    charIndices.add(post.characterIndex);
                }
            });
        }
        const charNames = Array.from(charIndices).map(idx => {
            const char = characters[idx];
            return char ? char.name : 'Unknown';
        }).join(', ') || 'N/A';
        
        const row = document.createElement('tr');
        row.className = 'thread-row';
        row.innerHTML = `
            <td class="col-icon">📁</td>
            <td class="col-title">
                <a href="/viewforum?id=${forum.id}">${escapeHtml(forum.title)}</a>
            </td>
            <td class="col-author">${escapeHtml(charNames)}</td>
            <td class="col-replies">${postCount}</td>
            <td class="col-last">
                <div>${publishedDate}</div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function initCommunity() {
    loadPublishedForums();
}

// ===== Register Page Functions =====
function initRegister() {
    const form = document.querySelector('.auth-form-forum');
    if (form) {
        form.addEventListener('submit', function(e) {
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirm-password');
            
            if (password && confirmPassword && password.value !== confirmPassword.value) {
                e.preventDefault();
                alert('Passwords do not match!');
                return false;
            }
        });
    }
}

// ===== Page-specific initialization =====
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and initialize accordingly
    if (document.getElementById('create-forum-form')) {
        initCreateForum();
    } else if (document.getElementById('forums-list')) {
        initIndex();
    } else if (document.getElementById('forums-table-body') && document.querySelector('.filter-tabs')) {
        initForum();
    } else if (document.getElementById('forums-table-body') && document.querySelector('.thread-filters')) {
        initCommunity();
    } else if (document.getElementById('confirm-password')) {
        initRegister();
    } else {
        setupEventListeners();
    }
});

