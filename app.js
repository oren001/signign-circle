// ===== Application State =====
let isLeader = false;
let currentUserId = generateUserId();
let currentSongId = null;
let songs = [];
let myVotes = new Set();
let searchQuery = '';

// ===== DOM Elements =====
const elements = {
    // Header
    syncStatus: document.getElementById('syncStatus'),
    viewerCount: document.getElementById('viewerCount'),
    leaderBtn: document.getElementById('leaderBtn'),
    feedbackBtn: document.getElementById('feedbackBtn'),

    // Song Viewer
    songDisplay: document.getElementById('songDisplay'),
    navControls: document.getElementById('navControls'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    openSelectorBtn: document.getElementById('openSelectorBtn'),
    // Panels
    songSelectorPanel: document.getElementById('songSelectorPanel'),
    songSearchInput: document.getElementById('songSearchInput'),
    songList: document.getElementById('songList'),
    leaderControls: document.getElementById('leaderControls'),
    songUrlInput: document.getElementById('songUrlInput'),
    addSongBtn: document.getElementById('addSongBtn'),

    // Modal
    pinModal: document.getElementById('pinModal'),
    pinInput: document.getElementById('pinInput'),
    submitPinBtn: document.getElementById('submitPinBtn'),
    cancelPinBtn: document.getElementById('cancelPinBtn'),
    pinError: document.getElementById('pinError')
};

// ===== Firebase References =====
const sessionRef = window.firebaseDB.ref(`sessions/${window.SESSION_ID}`);
const songsRef = sessionRef.child('songs');
const currentSongRef = sessionRef.child('currentSong');
const viewersRef = sessionRef.child('viewers');
const myViewerRef = viewersRef.child(currentUserId);

// ===== Wake Lock for Screen Always On =====
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('✓ Screen wake lock activated');

            wakeLock.addEventListener('release', () => {
                console.log('Wake lock released');
            });
        } else {
            console.warn('Wake Lock API not supported');
        }
    } catch (err) {
        console.error('Wake lock error:', err);
    }
}

// Re-request wake lock when page becomes visible again
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// ===== Initialization =====
async function init() {
    try {
        // Request wake lock to keep screen on
        await requestWakeLock();
        setupConnectionMonitoring();
        registerViewer();
        await loadInitialSongs();
        setupFirebaseListeners();
        setupEventListeners();
        loadMyVotes();
        loadLeaderStatus();

        // Setup upload listeners (from upload.js)
        if (typeof setupUploadListeners === 'function') {
            setupUploadListeners();
        }

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        updateSyncStatus('error', 'שגיאת חיבור');
    }
}

// ===== Firebase Monitoring =====
function setupConnectionMonitoring() {
    window.firebaseDB.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            updateSyncStatus('connected', 'מחובר');
            registerViewer();
        } else {
            updateSyncStatus('disconnected', 'מנותק');
        }
    });
}

function updateSyncStatus(status, text) {
    elements.syncStatus.className = `sync-status ${status}`;
    elements.syncStatus.querySelector('.status-text').textContent = text;
}

function registerViewer() {
    myViewerRef.set({ id: currentUserId, timestamp: firebase.database.ServerValue.TIMESTAMP });
    myViewerRef.onDisconnect().remove();
}

// ===== Initial Songs =====
async function loadInitialSongs() {
    const snapshot = await songsRef.once('value');
    if (!snapshot.exists()) {
        const response = await fetch('song-data.json');
        const data = await response.json();
        const songsObject = {};
        data.songs.forEach(song => { songsObject[song.id] = song; });
        await songsRef.set(songsObject);
    }

    // Load songs into memory
    const allSongs = await songsRef.once('value');
    songs = Object.values(allSongs.val() || {});
    renderSongSelector();
    renderVotingPanel();
    updateTotalVotes();
}


// ===== Firebase Listeners =====
function setupFirebaseListeners() {
    songsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        songs = Object.values(data);
        renderSongSelector();
        renderVotingPanel();
        updateTotalVotes();
    });

    currentSongRef.on('value', (snapshot) => {
        const songId = snapshot.val();
        if (songId) {
            if (songId !== currentSongId) {
                currentSongId = songId;
                displaySong(songId);
            }
        } else {
            // Default to cover page if nothing is active
            displaySong('book-page-1');
        }
    });

    viewersRef.on('value', (snapshot) => {
        const count = Object.keys(snapshot.val() || {}).length;
        elements.viewerCount.querySelector('.count-text').textContent = count;
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    elements.leaderBtn.addEventListener('click', () => elements.pinModal.classList.remove('hidden'));
    elements.feedbackBtn.addEventListener('click', handleFeedbackClick);
    elements.submitPinBtn.addEventListener('click', submitPin);
    elements.cancelPinBtn.addEventListener('click', () => elements.pinModal.classList.add('hidden'));

    // Panels
    elements.openSelectorBtn.addEventListener('click', () => {
        elements.songSelectorPanel.classList.remove('hidden');
    });

    elements.songSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderSongSelector();
    });

    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.songSelectorPanel.classList.add('hidden');
        });
    });

    // Leader navigation
    elements.prevBtn.addEventListener('click', navigatePrevious);
    elements.nextBtn.addEventListener('click', navigateNext);

    // Add song
    elements.addSongBtn.addEventListener('click', addSong);
}

// ===== Leader Management =====
function submitPin() {
    if (elements.pinInput.value === window.LEADER_PIN) {
        isLeader = true;
        updateLeaderUI();
        elements.pinModal.classList.add('hidden');
        localStorage.setItem('isLeader', 'true');
    } else {
        elements.pinError.classList.remove('hidden');
    }
}

function updateLeaderUI() {
    elements.leaderBtn.textContent = isLeader ? 'מצב מנחה' : 'הפוך למנחה';
    elements.leaderControls.classList.toggle('hidden', !isLeader);
    elements.navControls.classList.toggle('hidden', !isLeader);
}

function loadLeaderStatus() {
    if (localStorage.getItem('isLeader') === 'true') {
        isLeader = true;
        updateLeaderUI();
    }
}

// ===== Song Display =====
function displaySong(songId) {
    const song = songs.find(s => s.id === songId);
    if (!song) {
        console.warn('Song not found:', songId);
        return;
    }

    console.log('Displaying song:', song.title, song.source);
    currentSongId = songId;
    elements.songDisplay.innerHTML = '';

    // Check if it's a cover page (front or back) to apply special "wallpaper" style
    elements.songDisplay.classList.toggle('cover-mode', songId === 'book-page-1' || songId === 'book-page-292');

    if (song.type === 'image') {
        const img = document.createElement('img');
        img.src = song.source;
        img.alt = song.title;
        img.onerror = () => {
            console.error('Failed to load image:', song.source);
            elements.songDisplay.innerHTML = `<div class="error-msg">שגיאה בטעינת התמונה: ${song.title}</div>`;
        };
        elements.songDisplay.appendChild(img);
    } else if (song.type === 'url') {
        const iframe = document.createElement('iframe');
        iframe.src = song.source;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        elements.songDisplay.appendChild(iframe);
    }

    // Add Community Actions (Edit/Flag)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'song-actions';

    // Edit Button (Visible to Leaders)
    if (isLeader) { // Note: using global isLeader state
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.title = 'ערוך שם שיר';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => promptEditTitle(song);
        actionsDiv.appendChild(editBtn);
    }

    // Flag Button (Visible to All)
    const flagBtn = document.createElement('button');
    flagBtn.className = 'action-btn';
    flagBtn.title = 'דווח על איכות נמוכה';
    flagBtn.innerHTML = song.isFlagged ? '⚠️' : '🚩';
    if (song.isFlagged) flagBtn.classList.add('flagged');
    flagBtn.onclick = () => toggleFlag(song);
    actionsDiv.appendChild(flagBtn);

    elements.songDisplay.appendChild(actionsDiv);

    // Close panels when song is selected
    elements.songSelectorPanel.classList.add('hidden');
    renderSongSelector();
}

function isNightMode() {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
}

// ===== Renderers =====
function renderSongSelector() {
    if (!elements.songList) return;
    elements.songList.innerHTML = '';

    // 1. Filter songs by search query (including lyrics)
    if (searchQuery) {
        filteredSongs = songs.filter(song =>
            song.title.toLowerCase().includes(searchQuery) ||
            (song.fullText && song.fullText.toLowerCase().includes(searchQuery))
        );
    }

    // 2. Sort by votes and boost quiet songs if night mode
    const nightMode = isNightMode();
    const sortedSongs = [...filteredSongs].sort((a, b) => {
        let scoreA = a.votes || 0;
        let scoreB = b.votes || 0;

        if (nightMode) {
            if (a.isQuiet) scoreA += 1000;
            if (b.isQuiet) scoreB += 1000;
        }

        // Primary sort: Score (Votes + Night Mode Boost)
        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }

        // Secondary sort: Numerical Page Number (extract from ID)
        const getPageNum = (id) => {
            const match = id.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 999;
        };

        return getPageNum(a.id) - getPageNum(b.id);
    });

    // Update header with Night Mode status
    const titleRow = elements.songSelectorPanel.querySelector('.header-title-row');
    let nightBadge = titleRow.querySelector('.night-mode-badge');
    if (nightMode) {
        if (!nightBadge) {
            nightBadge = document.createElement('span');
            nightBadge.className = 'night-mode-badge';
            nightBadge.innerHTML = '🌙 מצב לילה פעיל';
            titleRow.insertBefore(nightBadge, titleRow.querySelector('.close-panel-btn'));
        }
    } else if (nightBadge) {
        nightBadge.remove();
    }

    // 3. Render
    if (sortedSongs.length === 0) {
        elements.songList.innerHTML = '<div class="no-results">לא נמצאו שירים</div>';
        return;
    }

    sortedSongs.forEach(song => {
        const isVoted = myVotes.has(song.id);
        sortedSongs.forEach(song => {
            const isVoted = myVotes.has(song.id);
            const div = document.createElement('div');
            div.className = `song-card ${song.id === currentSongId ? 'active' : ''}`;

            div.innerHTML = `
            <div class="card-title">
                ${escapeHtml(song.title)}
                ${song.isQuiet ? '<div class="quiet-icon" title="שיר שקט">🌙</div>' : ''}
                ${song.isFlagged ? '<div class="quality-badge">⚠️ איכות נמוכה</div>' : ''}
            </div>
            <div class="card-actions">
                <button class="card-vote-btn ${isVoted ? 'voted' : ''}" 
                        onclick="voteSong('${song.id}', event)">
                    <span>${isVoted ? '❤️' : '🤍'}</span>
                    <span>${song.votes || 0}</span>
                </button>
            </div>
        `;

            div.onclick = () => selectSong(song.id);
            elements.songList.appendChild(div);
        });
    }

function renderVotingPanel() {
            // Legacy function replaced by unified selector
            renderSongSelector();
        }

function selectSong(songId) {
            if (isLeader) {
                currentSongRef.set(songId);
            } else {
                displaySong(songId);
            }
        }

function voteSong(songId, event) {
            if (event) event.stopPropagation();
            if (myVotes.has(songId)) {
                myVotes.delete(songId);
                songsRef.child(songId).child('votes').transaction(v => Math.max(0, (v || 0) - 1));
            } else {
                myVotes.add(songId);
                songsRef.child(songId).child('votes').transaction(v => (v || 0) + 1);
            }
            localStorage.setItem('myVotes', JSON.stringify([...myVotes]));
            renderSongSelector();
        }

function updateTotalVotes() {
            // No longer needed for badge as it's removed, but we keep the logic if we want it later
        }

// ===== Navigation =====
function navigatePrevious() {
            const idx = songs.findIndex(s => s.id === currentSongId);
            if (idx > 0) selectSong(songs[idx - 1].id);
        }

function navigateNext() {
            const idx = songs.findIndex(s => s.id === currentSongId);
            if (idx < songs.length - 1) selectSong(songs[idx + 1].id);
        }

// ===== Add Song =====
async function addSong() {
            const val = elements.songUrlInput.value.trim();
            if (!val) return;
            const isUrl = val.startsWith('http');
            const newSong = {
                id: `song-${Date.now()}`,
                title: isUrl ? 'קישור חיצוני' : val,
                type: 'url',
                source: isUrl ? val : `https://www.ultimate-guitar.com/search.php?value=${encodeURIComponent(val)}`,
                votes: 0
            };
            await songsRef.child(newSong.id).set(newSong);
            elements.songUrlInput.value = '';
        }

// ===== Helpers =====
function generateUserId() {
            let id = localStorage.getItem('userId');
            if (!id) {
                id = `user-${Date.now()}`;
                localStorage.setItem('userId', id);
            }
            return id;
        }

function loadMyVotes() {
            const saved = localStorage.getItem('myVotes');
            if (saved) myVotes = new Set(JSON.parse(saved));
        }

function escapeHtml(text) {
            const d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }

// ===== Feedback System =====
function handleFeedbackClick() {
            const currentSong = songs.find(s => s.id === currentSongId);
            const songContext = currentSong ? currentSong.title : 'לא נבחר שיר';

            const feedback = prompt('💬 איך נוכל לשפר את האפליקציה?\n\n(השיר הנוכחי: ' + songContext + ')');

            if (feedback && feedback.trim()) {
                sessionRef.child('feedback').push({
                    text: feedback.trim(),
                    timestamp: Date.now(),
                    userId: currentUserId,
                    songContext: songContext
                }).then(() => {
                    alert('תודה על הפידבק! 🙏\n\nהמשוב שלך עוזר לנו לשפר את האפליקציה.');
                }).catch((error) => {
                    console.error('Error saving feedback:', error);
                    alert('שגיאה בשמירת הפידבק. נסה שוב.');
                });
            }
        }

// ===== Song Warnings =====
function checkSongWarning(song) {
            const title = song.title;

            // Feldman vs Shlomo Artzi
            if (title.includes('שלמה ארצי') || title === 'תרקוד' || title === 'תגידי') {
                if (confirm('⚠️ האם פלדמן באזור? (שירי שלמה ארצי אסורים בנוכחותו)')) {
                    return '⛔ לא ניתן לשיר שלמה ארצי כשיש פלדמן! תבחר שיר אחר.';
                }
            }

            // Gabi vs Anna
            if (title.includes('אנה')) {
                return '⚠️ בדוק האם גבי באזור - היא לא אוהבת את השיר\n\nלהמשיך בכל זאת?';
            }
            return null;
        }

// Override selectSong to add warning check
const originalSelectSong = selectSong;
    function selectSong(songId) {
        const song = songs.find(s => s.id === songId);
        if (!song) return;

        // Check for warnings
        const warning = checkSongWarning(song);
        if (warning) {
            if (warning.startsWith('⛔')) {
                alert(warning);
                return;
            }
            if (!confirm(warning)) {
                return; // User canceled
            }
        }

        // Continue with normal selection
        if (isLeader) {
            currentSongRef.set(songId);
        } else {
            displaySong(songId);
        }
    }

    if (window.firebaseDB) init();

    // ===== Community Action Handlers =====
    function promptEditTitle(song) {
        const newTitle = prompt('עריכת שם השיר:', song.title);
        if (newTitle && newTitle !== song.title) {
            updateSongData(song.id, { title: newTitle });
        }
    }

    function toggleFlag(song) {
        const isCurrentlyFlagged = !!song.isFlagged;
        const confirmMsg = isCurrentlyFlagged ? 'להסיר את הדיווח על איכות נמוכה?' : 'לדווח על שיר זה כבעל איכות נמוכה?';
        if (confirm(confirmMsg)) {
            updateSongData(song.id, { isFlagged: !isCurrentlyFlagged });
        }
    }

    function updateSongData(songId, updates) {
        if (window.firebaseDB && updates) {
            // Use the globally exposed functions from firebase-config.js if available, 
            // or let the real-time listener handle the local state.
            const songRef = window.ref(window.firebaseDB, `sessions/v2/songs/${songId}`);
            window.update(songRef, updates)
                .then(() => {
                    console.log(`Updated ${songId}:`, updates);
                })
                .catch(err => console.error('Firebase update failed:', err));
        }
    }
