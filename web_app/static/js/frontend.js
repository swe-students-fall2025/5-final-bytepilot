let characters = [];
let selectedCharacters = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let searchTerm = ''; 

function $(id) {
    return document.getElementById(id);
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupEventListeners() {
    const copyLinks = document.querySelectorAll('.copy-link');
    copyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            copyThreadLink();
        });
    });
    
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

    const headerSearchInput = document.querySelector('.search-bar-input');
    const headerSearchBtn   = document.querySelector('.search-bar-btn');

    if (headerSearchInput && headerSearchBtn) {
        const submitGlobalSearch = () => {
            const term = headerSearchInput.value.trim();
            if (!term) return;

            window.location.href = '/community?q=' + encodeURIComponent(term);
        };

        headerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            submitGlobalSearch();
        });

        headerSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitGlobalSearch();
            }
        });
    }
}

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

function loadCharacters() {
    console.log('DEBUG: loadCharacters called');
    
    // Priority 1: Retrieve directly from template variables
    if (Array.isArray(window.INIT_CHARACTERS) && window.INIT_CHARACTERS.length > 0) {
        characters = window.INIT_CHARACTERS;
        console.log('DEBUG: Loaded from INIT_CHARACTERS:', characters.length, 'characters');
        wireCharacterSearch();
        return;
    }
    
    // Priority 2: Retrieve from old template variables
    if (Array.isArray(window.WINDOW_CHARACTERS_DATA) && window.WINDOW_CHARACTERS_DATA.length > 0) {
        characters = window.WINDOW_CHARACTERS_DATA;
        console.log('DEBUG: Loaded from WINDOW_CHARACTERS_DATA:', characters.length, 'characters');
        wireCharacterSearch();
        return;
    }
    
    // Priority 3: Retrieve from API
    console.log('DEBUG: No template data, fetching from API');
    fetch('/api/my_characters')
        .then(res => {
            if (!res.ok) {
                throw new Error('API request failed');
            }
            return res.json();
        })
        .then(data => {
            if (data && data.ok && Array.isArray(data.characters)) {
                characters = data.characters || [];
                console.log('DEBUG: Loaded from API:', characters.length, 'characters');
                
                // Ensure that _id is in string format
                characters.forEach(char => {
                    if (char._id && typeof char._id !== 'string') {
                        char._id = char._id.toString();
                    }
                });
                
                // Display Character Search Immediately
                wireCharacterSearch();
                
                // Update the role selection dropdown (if the post editor is already present)
                updateCharacterSelects();
            } else {
                characters = [];
                console.warn('DEBUG: No characters from API or invalid response');
                wireCharacterSearch();
            }
        })
        .catch(err => {
            console.error('DEBUG: Error fetching characters:', err);
            characters = [];
            wireCharacterSearch();
        })
        .finally(() => {
            // Ensure the search function is initialized
            setTimeout(() => {
                wireCharacterSearch();
            }, 100);
        });
}

function wireCharacterSearch() {
    const searchInput = document.getElementById('character-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            performCharacterSearch(this.value.trim());
        });
        searchInput.addEventListener('focus', function() {
            performCharacterSearch(this.value.trim());
        });
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

function performCharacterSearch(query) {
    const resultsContainer = document.getElementById('character-search-results');
    if (!resultsContainer) return;
    
    if (!query) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    if (characters.length === 0) {
        resultsContainer.innerHTML = '<div class="character-search-result-item empty-search-result">No characters available. <a href="/addcharacter">Add a character</a> to get started.</div>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
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
    
    resultsContainer.innerHTML = '';
    filtered.forEach((char, resultIndex) => {
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
            performCharacterSearch(document.getElementById('character-search-input').value.trim());
        });
        
        resultsContainer.appendChild(resultItem);
    });
    
    resultsContainer.classList.remove('hidden');
}

function toggleCharacter(index) {
    if (selectedCharacters.includes(index)) {
        selectedCharacters = selectedCharacters.filter(i => i !== index);
    } else {
        selectedCharacters.push(index);
    }
    
    updateSelectedTags();
    updateCharacterSelects();
}

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
            const searchInput = document.getElementById('character-search-input');
            if (searchInput && searchInput.value.trim()) {
                performCharacterSearch(searchInput.value.trim());
            }
        });
        
        tagsContainer.appendChild(tag);
    });
}

function updateCharacterSelects() {
    const selects = document.querySelectorAll('.character-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Character</option>';
        
        selectedCharacters.forEach(index => {
            const char = characters[index];
            if (char) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${char.name} (${char.nickname})`;
                select.appendChild(option);
            }
        });
        
        // Restore previous selection
        if (currentValue && selectedCharacters.includes(parseInt(currentValue))) {
            select.value = currentValue;
        } else if (select.dataset.presetValue) {
            // If a preset value exists, use the preset value.
            select.value = select.dataset.presetValue;
            delete select.dataset.presetValue;
        }
        
        // Trigger the change event to update character settings
        select.dispatchEvent(new Event('change'));
    });
}

function searchDatabaseCharacters(query) {
    if (!query || query.trim().length === 0) {
        return [];
    }
    
    const lowerQuery = query.toLowerCase().trim();
    return DATABASE_CHARACTERS.filter(char => {
        const name = (char.name || '').toLowerCase();
        const fandom = (char.fandom || '').toLowerCase();
        return name.includes(lowerQuery) || fandom.includes(lowerQuery);
    });
}

function displayDatabaseCharacterResults(results) {
    const resultsContainer = document.getElementById('character-db-search-results');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="character-search-result-item empty-search-result">No matching characters found in database.</div>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    resultsContainer.innerHTML = '';
    results.forEach(char => {
        const item = document.createElement('div');
        item.className = 'character-search-result-item';
        item.innerHTML = `
            <div class="character-result-name">${escapeHtml(char.name)}</div>
            <div class="character-result-fandom">Fandom: ${escapeHtml(char.fandom)}</div>
        `;
        item.addEventListener('click', function() {
            selectDatabaseCharacter(char);
        });
        resultsContainer.appendChild(item);
    });
    
    resultsContainer.classList.remove('hidden');
}

function selectDatabaseCharacter(char) {
    document.getElementById('character-name').value = char.name;
    document.getElementById('fandom').value = char.fandom;
    
    const searchInput = document.getElementById('character-db-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    const resultsContainer = document.getElementById('character-db-search-results');
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
    }
    
    document.getElementById('nickname').focus();
}
/*
function saveCharacter(name, fandom, nickname, pic) {
    try {
        let characters = JSON.parse(localStorage.getItem('characters') || '[]');
        
        const newCharacter = {
            name: name,
            fandom: fandom,
            nickname: nickname,
            pic: pic,
            createdAt: new Date().toISOString()
        };
        
        characters.push(newCharacter);
        
        localStorage.setItem('characters', JSON.stringify(characters));
        
        alert('Character added successfully!');
        
        window.location.href = '/createforum';
    } catch (e) {
        alert('Error saving character: ' + e.message);
        console.error(e);
    }
}
*/
function editCharacter(index) {
    alert('Edit functionality will be implemented. For now, please delete and recreate the character.');
}
/*
function deleteCharacter(index) {
    if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
        return;
    }
    
    try {
        const characters = JSON.parse(localStorage.getItem('characters') || '[]');
        if (index >= 0 && index < characters.length) {
            characters.splice(index, 1);
            localStorage.setItem('characters', JSON.stringify(characters));
            
            initCharactersList();
            
            alert('Character deleted successfully!');
        }
    } catch (e) {
        alert('Error deleting character: ' + e.message);
        console.error(e);
    }
}
*/
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

function closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
function getThreadIdFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
}

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
    /*
    try {
        let forums = JSON.parse(localStorage.getItem('forums') || '[]');
        const editingForumId = sessionStorage.getItem('editingForumId');
        
        let forum;
        let isEdit = false;
        
        if (editingForumId) {
            const forumIndex = forums.findIndex(f => f.id === editingForumId);
            if (forumIndex === -1) {
                alert('Forum not found!');
                sessionStorage.removeItem('editingForumId');
                return;
            }
            
            forum = forums[forumIndex];
            forum.title = title;
            forum.posts = posts;
            
            if (status) {
                forum.status = status;
            }
            
            if (status === 'published' && !forum.publishedAt) {
                forum.publishedAt = new Date().toISOString();
            }
            
            forums[forumIndex] = forum;
            isEdit = true;
            sessionStorage.removeItem('editingForumId');
        } else {
            forum = {
                id: Date.now().toString(),
                title: title,
                posts: posts,
                status: status || 'draft',
                createdAt: new Date().toISOString(),
                publishedAt: status === 'published' ? new Date().toISOString() : null
            };
            forums.push(forum);
        }
        
        localStorage.setItem('forums', JSON.stringify(forums));
        
        if (status === 'published') {
            let publishedForums = JSON.parse(localStorage.getItem('publishedForums') || '[]');
            if (isEdit) {
                const pubIndex = publishedForums.findIndex(f => f.id === forum.id);
                if (pubIndex !== -1) {
                    publishedForums[pubIndex] = forum;
                } else {
                    publishedForums.push(forum);
                }
            } else {
                publishedForums.push(forum);
            }
            localStorage.setItem('publishedForums', JSON.stringify(publishedForums));
        } else if (isEdit && forum.status !== 'published') {
            let publishedForums = JSON.parse(localStorage.getItem('publishedForums') || '[]');
            publishedForums = publishedForums.filter(f => f.id !== forum.id);
            localStorage.setItem('publishedForums', JSON.stringify(publishedForums));
        }
        
        const message = isEdit
            ? (status === 'published' 
                ? 'Forum updated and published successfully!'
                : 'Forum updated successfully!')
            : (status === 'published' 
                ? 'Forum published successfully! It is now visible in the community.'
                : 'Forum saved as draft successfully!');
        alert(message);
        window.location.href = '/forum';
    } catch (e) {
        alert('Error saving forum: ' + e.message);
        console.error(e);
    }
    */
   // use backend API to save forum instead of localStorage
    const editingForumId = sessionStorage.getItem('editingForumId') || null;

    const payload = {
        id: editingForumId, 
        title: title,
        status: status || 'draft',
        posts: posts
    };

    fetch('/createforum', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (!data.ok) {
            alert('Error saving forum: ' + (data.error || 'Unknown error'));
            return;
        }
        // clear editing state
        sessionStorage.removeItem('editingForumId');
        window.location.href = `/viewthread/${data.id}`;
    })
    .catch(err => {
        console.error(err);
        alert('Network error saving forum');
    });

}

function loadForumForEdit(forumId) {
    fetch(`/api/my_forums/${forumId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                alert(data.error || 'Error loading forum for edit');
                window.location.href = '/forum';
                return;
            }

            const forum = data.thread;

            document.querySelector('.auth-box-header h2').textContent = 'Edit Forum';
            document.querySelector('.auth-box-header p').textContent = 'Edit your forum dialogue';
            
            document.getElementById('forum-title').value = forum.title || '';
            
            // Wait for characters to finish loading
            const initEdit = () => {
                // first clear selectedCharacters
                selectedCharacters = [];
                
                // Extract all unique characterIndex values from the post
                if (forum.posts && forum.posts.length > 0) {
                    const charIndices = new Set();
                    forum.posts.forEach(post => {
                        if (post.characterIndex !== undefined && post.characterIndex !== null) {
                            // Ensure that characterIndex is a number
                            const index = parseInt(post.characterIndex);
                            if (!isNaN(index)) {
                                charIndices.add(index);
                            }
                        }
                    });
                    
                    // Set to selectedCharacters
                    selectedCharacters = Array.from(charIndices);
                    console.log('DEBUG: Selected characters for edit:', selectedCharacters);
                    console.log('DEBUG: Characters array:', characters);
                    
                    // Update UI immediately
                    updateSelectedTags();
                    
                    // Clear and recreate the post editor
                    const postsContainer = document.getElementById('posts-container');
                    postsContainer.innerHTML = '';
                    
                    forum.posts.forEach((post, index) => {
                        const characterIndex = post.characterIndex;
                        
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
                        
                        // Add options to this dropdown menu
                        selectedCharacters.forEach(idx => {
                            const char = characters[idx];
                            if (char) {
                                const option = document.createElement('option');
                                option.value = idx;
                                option.textContent = `${char.name} (${char.nickname})`;
                                // If this is the character currently in use in the post, set it to selected
                                if (idx === characterIndex) {
                                    option.selected = true;
                                }
                                select.appendChild(option);
                            }
                        });
                        
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
                        
                        const charSettings = document.createElement('div');
                        charSettings.className = 'character-settings';
                        
                        // If a character is selected, display the settings area
                        if (characterIndex !== undefined && characterIndex !== null) {
                            charSettings.classList.add('active');
                            const character = characters[characterIndex];
                            if (character) {
                                const nicknameRow = document.createElement('div');
                                nicknameRow.className = 'character-setting-row';
                                nicknameRow.innerHTML = `
                                    <label>Nickname:</label>
                                    <input type="text" class="character-nickname-input" 
                                    placeholder="Forum username for this character" 
                                    value="${escapeHtml(post.nickname || character.nickname)}">
                                `;
                                
                                const avatarRow = document.createElement('div');
                                avatarRow.className = 'character-setting-row';
                                avatarRow.innerHTML = `
                                    <label>Avatar:</label>
                                    <input type="file" class="character-avatar-input" accept="image/*">
                                `;
                                
                                // If an avatar file exists, display the filename
                                if (post.avatar && post.avatar !== character.pic) {
                                    avatarRow.innerHTML += `
                                        <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                            Current: ${escapeHtml(post.avatar)}
                                        </div>
                                    `;
                                }
                                
                                charSettings.appendChild(nicknameRow);
                                charSettings.appendChild(avatarRow);
                            }
                        }
                        
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
                        textarea.value = post.content || '';
                        
                        postItem.appendChild(textarea);
                        postsContainer.appendChild(postItem);
                    });
                }
            };
            
            // If the character has been loaded, initialize immediately
            if (characters.length > 0) {
                initEdit();
            } else {
                // Otherwise, wait for the character to finish loading
                console.log('DEBUG: Waiting for characters to load before editing...');
                const checkCharactersInterval = setInterval(() => {
                    if (characters.length > 0) {
                        clearInterval(checkCharactersInterval);
                        console.log('DEBUG: Characters loaded, now initializing edit');
                        initEdit();
                    }
                }, 100);
                
                // Set timeout
                setTimeout(() => {
                    clearInterval(checkCharactersInterval);
                    if (characters.length === 0) {
                        console.error('DEBUG: Characters never loaded');
                        alert('Failed to load characters. Please refresh the page.');
                    }
                }, 5000);
            }
            
            sessionStorage.setItem('editingForumId', forumId);
        })
        .catch(err => {
            console.error(err);
            alert('Network error loading forum for edit');
            window.location.href = '/forum';
        });
}

function editForum(forumId) {
    sessionStorage.setItem('editingForumId', forumId);
    window.location.href = '/createforum?edit=' + forumId;
}

function initIndex() {
    /*
    const forums = JSON.parse(localStorage.getItem('forums') || '[]');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    
    document.getElementById('total-forums').textContent = forums.length;
    document.getElementById('total-characters').textContent = characters.length;
    document.getElementById('forum-count').textContent = forums.length;
    
    let totalPosts = 0;
    forums.forEach(forum => {
        totalPosts += forum.posts ? forum.posts.length : 0;
    });
    document.getElementById('total-posts').textContent = totalPosts;
    
    const forumsList = document.getElementById('forums-list');
    if (forums.length === 0) {
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
                <a href="/viewthread?id=${forum.id}">${escapeHtml(forum.title)}</a>
                <span class="post-meta">${postCount} posts | ${statusText} | Created ${createdDate}</span>
            `;
            forumsList.appendChild(forumItem);
        });
    }
    
    const publishedForums = forums.filter(f => f.status === 'published');
    document.getElementById('published-count').textContent = publishedForums.length;
    
    const publishedList = document.getElementById('published-list');
    if (publishedForums.length === 0) {
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
                <a href="/viewthread?id=${forum.id}">${escapeHtml(forum.title)}</a>
                <span class="post-meta">${postCount} posts | Published ${publishedDate}</span>
            `;
            publishedList.appendChild(forumItem);
        });
    }
    */
    // use backend API to load index data instead of localStorage
    fetch('/api/my_forums')
        .then(res => {
            return res.json().catch(() => null);
        })
        .then(data => {
            if (!data || !data.ok) {
                console.warn('Unable to load /api/my_forums or not logged in');
                return;
            }

            const forums = data.forums || [];

            const totalForumsEl = document.getElementById('total-forums');
            const forumCountEl  = document.getElementById('forum-count');
            const totalPostsEl  = document.getElementById('total-posts');
            const forumsList    = document.getElementById('forums-list');

            // numbers / counters
            if (totalForumsEl) totalForumsEl.textContent = forums.length;
            if (forumCountEl)  forumCountEl.textContent  = forums.length;

            let totalPosts = 0;
            forums.forEach(f => {
                totalPosts += f.post_count || 0;
            });
            if (totalPostsEl) totalPostsEl.textContent = totalPosts;

            // list of latest forums
            if (!forumsList) return;

            forumsList.innerHTML = '';

            if (!forums.length) {
                forumsList.innerHTML = `
                    <div class="empty-message">
                        No forums created yet.
                        <a href="/createforum">Create your first forum</a> to get started!
                    </div>
                `;
                return;
            }

            // Sort by updated_at or created_at descending
            const sorted = forums.slice().sort((a, b) => {
                const da = new Date(a.updated_at || a.created_at || 0);
                const db = new Date(b.updated_at || b.created_at || 0);
                return db - da;
            });

            sorted.forEach(forum => {
                const forumItem = document.createElement('div');
                forumItem.className = 'latest-post';

                const postCount   = forum.post_count || 0;
                const status      = forum.status || 'draft';
                const statusText  = status === 'published' ? 'Published' : 'Draft';
                const dateStr     = forum.created_at || forum.updated_at || '';
                const createdDate = dateStr ? new Date(dateStr).toLocaleDateString() : '';

                forumItem.innerHTML = `
                    <a href="/viewthread/${forum.id}">${escapeHtml(forum.title || 'Untitled')}</a>
                    <span class="post-meta">
                        ${postCount} posts | ${statusText} | Created ${createdDate}
                    </span>
                `;
                forumsList.appendChild(forumItem);
            });
        })
        .catch(err => {
            console.error('Error loading /api/my_forums:', err);
        });
    //"Community" section – uses /api/published_forums
    fetch('/api/published_forums')
        .then(res => res.json())
        .then(data => {
            if (!data || !data.ok) {
                console.warn('Unable to load /api/published_forums');
                return;
            }

            const publishedForums = data.forums || [];

            const publishedCountEl = document.getElementById('published-count');
            const publishedList    = document.getElementById('published-list');

            if (publishedCountEl) {
                publishedCountEl.textContent = publishedForums.length;
            }

            if (!publishedList) return;

            publishedList.innerHTML = '';

            if (!publishedForums.length) {
                publishedList.innerHTML = `
                    <div class="empty-message">
                        No published forums yet. Be the first to publish a forum!
                    </div>
                `;
                return;
            }

            // Sort by published_at (fallback: created_at) descending and show top 5
            const sorted = publishedForums.slice().sort((a, b) => {
                const da = new Date(a.published_at || a.created_at || 0);
                const db = new Date(b.published_at || b.created_at || 0);
                return db - da;
            }).slice(0, 5);

            sorted.forEach(forum => {
                const forumItem = document.createElement('div');
                forumItem.className = 'latest-post';

                const postCount     = forum.post_count || 0;
                const dateStr       = forum.published_at || forum.created_at || '';
                const publishedDate = dateStr ? new Date(dateStr).toLocaleDateString() : '';

                forumItem.innerHTML = `
                    <a href="/viewthread/${forum.id}">${escapeHtml(forum.title || 'Untitled')}</a>
                    <span class="post-meta">
                        ${postCount} posts | Published ${publishedDate}
                    </span>
                `;
                publishedList.appendChild(forumItem);
            });
        })
        .catch(err => {
            console.error('Error loading /api/published_forums:', err);
        });
}

function loadForums() {
    const params = new URLSearchParams();
    if (currentFilter !== 'all') params.set('status', currentFilter);
    if (currentSearchTerm) params.set('q', currentSearchTerm);
    fetch('/api/my_forums?' + params.toString())
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                alert('Error loading forums: ' + (data.error || 'Unknown error'));
                return;
            }
            const forums = data.forums || [];
            const draftCountEl     = document.getElementById('draft-count');
            const publishedCountEl = document.getElementById('published-count');
            const forumCountEl     = document.getElementById('forum-count');

            const drafts = forums.filter(f => f.status === 'draft').length;
            const published = forums.filter(f => f.status === 'published').length;
            const total = forums.length;

            if (draftCountEl) {
                draftCountEl.textContent = drafts;
            }
            if (publishedCountEl) {
                publishedCountEl.textContent = published;
            }
            if (forumCountEl) {
                forumCountEl.textContent = `${total} forum${total !== 1 ? 's' : ''}`;
            }
            
            renderForumsTable(forums);
        })
        .catch(err => {
            console.error(err);
            alert('Network error loading forums');
        });
}

function renderForumsTable(forums) {
    const tbody = document.getElementById('forums-table-body');
    const infoEl = document.getElementById('pagination-info');

    if (!tbody) return;

    if (!forums.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-cell">
                    No forums found. <a href="/createforum">Create your first forum</a> to get started!
                </td>
            </tr>
        `;
        if (infoEl) infoEl.textContent = '0 forums';
        return;
    }

    tbody.innerHTML = '';
    forums.forEach(forum => {
        const createdDate = forum.created_at
            ? new Date(forum.created_at).toLocaleDateString()
            : '';
        const statusBadge = forum.status === 'published'
            ? '<span class="status-badge published">Published</span>'
            : '<span class="status-badge draft">Draft</span>';
        let charNames = 'N/A';
        if (Array.isArray(forum.characters) && forum.characters.length > 0) {
            charNames = forum.characters[0]?.nickname || 'N/A';
        }

        const row = document.createElement('tr');
        row.className = 'thread-row';
        row.innerHTML = `
            <td class="col-icon">📁</td>
            <td class="col-title">
                <a href="/viewthread/${forum.id}">${escapeHtml(forum.title)}</a>
            </td>
            <td class="col-author">${escapeHtml(charNames)}</td>
            <td class="col-replies">${forum.post_count}</td>
            <td class="col-status">${statusBadge}</td>
            <td class="col-last">
                <div>${createdDate}</div>
            </td>
            <td class="col-actions">
                <button class="btn-edit-forum" onclick="editForum('${forum.id}')" title="Edit Forum">Edit</button>
                <button class="btn-edit-forum btn-delete-forum" onclick="deleteForum('${forum.id}')" title="Delete Forum">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (infoEl) {
        infoEl.textContent = `${forums.length} forum${forums.length !== 1 ? 's' : ''}`;
    }
}

function deleteForum(threadId) {
    if (!confirm('Delete this forum? This cannot be undone.')) return;
    fetch(`/api/my_forums/${threadId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                alert(data.error || 'Failed to delete forum');
                return;
            }
            loadForums();
        })
        .catch(err => {
            console.error(err);
            alert('Network error deleting forum');
        });
}


function initForum() {

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            currentFilter = this.getAttribute('data-filter') || 'all';

            document.querySelectorAll('.filter-tab')
                .forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            loadForums();
        });
    });

    const searchInput = document.getElementById('forum-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = (e.target.value || '').toLowerCase().trim();
            loadForums();
        });
    }
    loadForums();
}


function loadPublishedForums() {
    /*
    const allForums = JSON.parse(localStorage.getItem('forums') || '[]');
    const publishedForums = allForums.filter(f => f.status === 'published');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    */
    // use backend API to load published forums instead of localStorage
    const params = new URLSearchParams();
    if (searchTerm) {
        params.set('q', searchTerm);
    }

    fetch('/api/published_forums?' + params.toString())
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                console.error(data.error || 'Failed to load community threads');
                return;
            }
            const publishedForums = data.forums || [];
            const publishedCountEl = document.getElementById('published-count');
            if (publishedCountEl) {
                publishedCountEl.textContent = publishedForums.length;
            }

            const forumCountEl = document.getElementById('forum-count');
            if (forumCountEl) {
                forumCountEl.textContent =
                    `${publishedForums.length} forum${publishedForums.length !== 1 ? 's' : ''}`;
            }
            const tbody = document.getElementById('forums-table-body');
            if (!publishedForums.length) {
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
                /*
                const postCount = forum.posts ? forum.posts.length : 0;
                const publishedDate = forum.publishedAt 
                    ? new Date(forum.publishedAt).toLocaleDateString()
                    : new Date(forum.createdAt).toLocaleDateString();
                
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
                */
                const postCount = forum.post_count || 0;
                const publishedDate = forum.published_at 
                    ? new Date(forum.published_at).toLocaleDateString()
                    : forum.created_at
                        ? new Date(forum.created_at).toLocaleDateString()
                        : '';
                let charNames = 'N/A';
                if (Array.isArray(forum.characters) && forum.characters.length > 0) {
                    charNames = forum.characters[0]?.nickname || 'N/A'; // OP only
                }
                const row = document.createElement('tr');
                row.className = 'thread-row';
                row.innerHTML = `
                    <td class="col-icon">📁</td>
                    <td class="col-title">
                        <a href="/viewthread/${forum.id}">${escapeHtml(forum.title)}</a>
                    </td>
                    <td class="col-author">${escapeHtml(charNames)}</td>
                    <td class="col-replies">${postCount}</td>
                    <td class="col-last">
                        <div>${publishedDate}</div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
}

function initCommunity() {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';

    searchTerm = q.trim();

    const headerSearchInput = document.querySelector('.search-bar-input');
    if (headerSearchInput && searchTerm) {
        headerSearchInput.value = q;
    }
    loadPublishedForums();
}

function initViewThread() {
    /*
    const urlParams = new URLSearchParams(window.location.search);
    const forumId = urlParams.get('id');
    
    if (!forumId) {
        document.getElementById('posts-container').innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No forum ID provided.</div>';
        return;
    }
    
    const forums = JSON.parse(localStorage.getItem('forums') || '[]');
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    
    const forum = forums.find(f => f.id === forumId);
    
    if (!forum) {
        document.getElementById('posts-container').innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Forum not found.</div>';
        return;
    }
    
    document.getElementById('thread-title').textContent = forum.title;
    const replyCount = forum.posts ? forum.posts.length - 1 : 0;
    document.getElementById('thread-replies').textContent = replyCount;
    document.getElementById('thread-views').textContent = Math.floor(Math.random() * 500) + 100;
    
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '';
    
    if (!forum.posts || forum.posts.length === 0) {
        postsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No posts in this forum.</div>';
        return;
    }
    
    const originalPosterCharacterIndex = forum.posts && forum.posts.length > 0 
        ? forum.posts[0].characterIndex 
        : null;
    
    forum.posts.forEach((post, index) => {
        const isOP = originalPosterCharacterIndex !== null && post.characterIndex === originalPosterCharacterIndex;
        const character = characters[post.characterIndex];
        
        if (!character) {
            console.warn('Character not found for index:', post.characterIndex);
            return;
        }
        
        const displayNickname = post.nickname || character.nickname;
        const displayAvatar = post.avatar || character.pic || 'https://via.placeholder.com/80';
        const postDate = forum.createdAt ? new Date(forum.createdAt) : new Date();
        if (index > 0) {
            postDate.setMinutes(postDate.getMinutes() + (index * 30));
        }
        
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.setAttribute('data-floor', post.floor);
        
        const sidebar = document.createElement('div');
        sidebar.className = 'post-sidebar';
        sidebar.innerHTML = `
            <div class="user-avatar">
                <img src="${displayAvatar}" alt="${escapeHtml(displayNickname)}">
            </div>
            <div class="user-name">${escapeHtml(displayNickname)}</div>
            <div class="user-stats">
                <div>Character: ${escapeHtml(character.name)}</div>
                <div>Fandom: ${escapeHtml(character.fandom)}</div>
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
            <span class="post-time">Posted on ${postDate.toLocaleString()}</span>
            <a href="#" class="view-author-only">View author only</a>
            ${index === 0 ? '<input type="number" placeholder="Go to floor" class="goto-floor">' : ''}
        `;
        
        const postBody = document.createElement('div');
        postBody.className = 'post-body';
        const contentLines = post.content.split('\n').filter(line => line.trim());
        contentLines.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line.trim();
            postBody.appendChild(p);
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
    
    const breadcrumbSpan = document.querySelector('.breadcrumbs span:last-child');
    if (breadcrumbSpan) {
        breadcrumbSpan.textContent = forum.title;
    }
    */
   const threadId = getThreadIdFromPath();
    if (!threadId) {
        document.getElementById('posts-container').innerHTML =
            '<div style="text-align: center; padding: 40px; color: #999;">No thread ID provided.</div>';
        return;
    }

    fetch(`/api/thread/${threadId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                document.getElementById('posts-container').innerHTML =
                    `<div style="text-align: center; padding: 40px; color: #999;">${escapeHtml(data.error || 'Unable to load thread.')}</div>`;
                return;
            }

            renderThread(data.thread);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('posts-container').innerHTML =
                '<div style="text-align: center; padding: 40px; color: #999;">Error loading thread.</div>';
        });
}

function renderThread(thread) {
    // Update title and counts
    document.getElementById('thread-title').textContent = thread.title || 'Untitled Thread';
    document.getElementById('thread-replies').textContent = thread.posts.length - 1;
    document.getElementById('thread-views').textContent = Math.floor(Math.random() * 500) + 100;

    // Update breadcrumbs last item
    const breadcrumbSpan = document.querySelector('.breadcrumbs span:last-child');
    if (breadcrumbSpan) {
        breadcrumbSpan.textContent = thread.title;
    }

    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '';

    if (!thread.posts.length) {
        postsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                No posts in this thread.
            </div>`;
        return;
    }

    thread.posts.forEach((post, index) => {
        const isOP = index === 0;

        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.dataset.floor = post.floor;

        const sidebar = document.createElement('div');
        sidebar.className = 'post-sidebar';
        sidebar.innerHTML = `
            <div class="user-avatar">
                <img src="${post.avatar || 'https://via.placeholder.com/80'}" alt="">
            </div>
            <div class="user-name">${escapeHtml(post.nickname || "Unknown")}</div>
            <div class="user-stats">
                <div>Floor: ${post.floor}</div>
            </div>
        `;

        const contentArea = document.createElement('div');
        contentArea.className = 'post-content-area';
        contentArea.innerHTML = `
            <div class="post-header">
                <span class="post-number">${post.floor}#</span>
                ${isOP ? '<span class="post-author-label">Original Poster</span>' : ''}
                <span class="post-time">${new Date(thread.created_at).toLocaleString()}</span>
            </div>
            <div class="post-body">
                ${escapeHtml(post.content).replace(/\n/g, '<br>')}
            </div>
            <div class="post-footer">
                <button class="post-action">👍 Like</button>
                <a href="#" class="post-action">Reply</a>
            </div>
        `;

        postItem.appendChild(sidebar);
        postItem.appendChild(contentArea);
        postsContainer.appendChild(postItem);
    });
}
/*
function initCharactersList() {
    const characters = JSON.parse(localStorage.getItem('characters') || '[]');
    const charactersList = document.getElementById('characters-list');
    const totalCharactersSpan = document.getElementById('total-characters');
    
    if (!charactersList || !totalCharactersSpan) return;
    
    totalCharactersSpan.textContent = characters.length;
    
    if (characters.length === 0) {
        charactersList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                No characters created yet. <a href="/addcharacter">Create your first character</a> to get started!
            </div>
        `;
        return;
    }
    
    charactersList.innerHTML = '';
    characters.forEach((character, index) => {
        const characterCard = document.createElement('div');
        characterCard.className = 'character-card';
        
        const createdDate = character.createdAt 
            ? new Date(character.createdAt).toLocaleDateString()
            : 'Unknown';
        
        characterCard.innerHTML = `
            <div class="character-card-avatar">
                <img src="${character.pic || 'https://via.placeholder.com/80'}" alt="${escapeHtml(character.name)}">
            </div>
            <div class="character-card-info">
                <h3 class="character-card-name">${escapeHtml(character.name)}</h3>
                <div class="character-card-details">
                    <div class="character-card-detail-item">
                        <span class="detail-label">Nickname:</span>
                        <span class="detail-value">${escapeHtml(character.nickname)}</span>
                    </div>
                    <div class="character-card-detail-item">
                        <span class="detail-label">Fandom:</span>
                        <span class="detail-value">${escapeHtml(character.fandom)}</span>
                    </div>
                    <div class="character-card-detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${createdDate}</span>
                    </div>
                </div>
            </div>
            <div class="character-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="editCharacter(${index})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCharacter(${index})">Delete</button>
            </div>
        `;
        
        charactersList.appendChild(characterCard);
    });
}
*/
function initCreateForum() {
    console.log('DEBUG: initCreateForum called');
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        // Load the character first
        loadCharacters();
        
        // Add the first post editor
        addPost();
        
        // If in edit mode, forum data will load later
        if (editId) {
            // Wait until character loading is complete before loading forum data
            setTimeout(() => {
                loadForumForEdit(editId);
            }, 300);
        }
        
        // Set event listeners
        const addPostBtn = document.getElementById('add-post-btn');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', function() {
                // Ensure character data has been loaded
                if (characters.length === 0) {
                    console.warn('No characters available. Please add characters first.');
                    return;
                }
                addPost();
            });
        }
        
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // Verify whether character data exists
                if (characters.length === 0) {
                    alert('Please add characters first before creating a forum!');
                    return;
                }
                saveForum('draft');
            });
        }
        
        const publishBtn = document.getElementById('publish-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // Verify whether character data exists
                if (characters.length === 0) {
                    alert('Please add characters first before publishing a forum!');
                    return;
                }
                if (confirm('Are you sure you want to publish this forum? It will be visible to all users in the community.')) {
                    saveForum('published');
                }
            });
        }
        
        const closePreviewBtn = document.getElementById('close-preview-btn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', closePreview);
        }
        
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

function initAddCharacter() {
    const searchInput = document.getElementById('character-db-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length === 0) {
                const resultsContainer = document.getElementById('character-db-search-results');
                if (resultsContainer) {
                    resultsContainer.classList.add('hidden');
                }
                return;
            }
            
            const results = searchDatabaseCharacters(query);
            displayDatabaseCharacterResults(results);
        });
        
        document.addEventListener('click', function(e) {
            const searchContainer = document.querySelector('.character-search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                const results = document.getElementById('character-db-search-results');
                if (results) {
                    results.classList.add('hidden');
                }
            }
        });
    }
    /*
    const form = document.getElementById('add-character-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('character-name').value.trim();
            const fandom = document.getElementById('fandom').value.trim();
            const nickname = document.getElementById('nickname').value.trim();
            const avatarInput = document.getElementById('avatar');
            
            if (!name || !fandom || !nickname) {
                alert('Please fill in all required fields!');
                return;
            }
            
            let avatarPic = '';
            if (avatarInput && avatarInput.files[0]) {
                const file = avatarInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    avatarPic = e.target.result;
                    saveCharacter(name, fandom, nickname, avatarPic);
                };
                
                reader.readAsDataURL(file);
            } else {
                avatarPic = 'https://via.placeholder.com/80';
                saveCharacter(name, fandom, nickname, avatarPic);
            }
        });
    }
    */
}

function initCharacter() {
  const input = document.getElementById("character-search-input");
  if (!input) return;

  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      const params = new URLSearchParams(window.location.search);

      q ? params.set("q", q) : params.delete("q");

      const qs = params.toString();
      window.location.href = qs ? `/characters?${qs}` : "/characters";
    }, 300);
  });
}

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

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // initExampleData();
    
    if (document.getElementById('create-forum-form')) {
        initCreateForum();
    } else if (document.getElementById('forums-list')) {
        initIndex();
    } else if (document.getElementById('forums-table-body')) {
        if (document.getElementById('draft-count') && document.querySelector('.filter-tab')) {
            initForum();
        } else {
            initCommunity();
        }
    } else if (document.getElementById('confirm-password')) {
        initRegister();
    } else if (document.getElementById('add-character-form')) {
        initAddCharacter();
    } else if (document.getElementById('posts-container') && document.getElementById('thread-title')) {
        initViewThread();
    } else if (document.getElementById('character-search-input')) {
        initCharacter();
    /*
    } else if (document.getElementById('characters-list')) {
        initCharactersList();
    */
    }
});
