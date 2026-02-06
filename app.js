// ===== Application State =====
let isLeader = false;
let currentUserId = generateUserId();
let currentSongId = null;
let songs = [];
let myVotes = new Set();

// ===== DOM Elements =====
const elements = {
    // Header
    syncStatus: document.getElementById('syncStatus'),
    viewerCount: document.getElementById('viewerCount'),
    leaderBtn: document.getElementById('leaderBtn'),

    // Song Viewer
    songDisplay: document.getElementById('songDisplay'),
    navControls: document.getElementById('navControls'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),

    // Sidebar
    votingSidebar: document.getElementById('votingSidebar'),
    leaderControls: document.getElementById('leaderControls'),
    songUrlInput: document.getElementById('songUrlInput'),
    addSongBtn: document.getElementById('addSongBtn'),
    sortByVotes: document.getElementById('sortByVotes'),
    songList: document.getElementById('songList'),
    toggleSidebar: document.getElementById('toggleSidebar'),

    // Modal
    pinModal: document.getElementById('pinModal'),
    pinInput: document.getElementById('pinInput'),
    submitPinBtn: document.getElementById('submitPinBtn'),
    cancelPinBtn: document.getElementById('cancelPinBtn'),
    pinError: document.getElementById('pinError'),

    // Mobile
    mobileToggle: document.getElementById('mobileToggle'),
    voteBadge: document.getElementById('voteBadge')
};

// ===== Firebase References =====
const sessionRef = window.firebaseDB.ref(`sessions/${window.SESSION_ID}`);
const songsRef = sessionRef.child('songs');
const currentSongRef = sessionRef.child('currentSong');
const viewersRef = sessionRef.child('viewers');
const myViewerRef = viewersRef.child(currentUserId);

// ===== Initialization =====
async function init() {
    try {
        // Set up Firebase connection monitoring
        setupConnectionMonitoring();

        // Register this viewer
        registerViewer();

        // Load initial song data
        await loadInitialSongs();

        // Set up Firebase listeners
        setupFirebaseListeners();

        // Set up UI event listeners
        setupEventListeners();

        // Load user's votes from localStorage
        loadMyVotes();

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        updateSyncStatus('error', 'שגיאת חיבור');
    }
}

// ===== Firebase Connection Monitoring =====
function setupConnectionMonitoring() {
    const connectedRef = window.firebaseDB.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            updateSyncStatus('connected', 'מחובר');
            // Re-register viewer on reconnect
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

// ===== Viewer Registration =====
function registerViewer() {
    // Set viewer presence
    myViewerRef.set({
        id: currentUserId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Remove viewer on disconnect
    myViewerRef.onDisconnect().remove();
}

// ===== Load Initial Songs =====
async function loadInitialSongs() {
    try {
        // Check if songs already exist in Firebase
        const snapshot = await songsRef.once('value');

        if (!snapshot.exists()) {
            // Load from local JSON file
            const response = await fetch('song-data.json');
            const data = await response.json();

            // Upload to Firebase
            const songsObject = {};
            data.songs.forEach(song => {
                songsObject[song.id] = song;
            });

            await songsRef.set(songsObject);
            console.log('Initial songs loaded to Firebase');
        }
    } catch (error) {
        console.error('Error loading initial songs:', error);
    }
}

// ===== Firebase Listeners =====
function setupFirebaseListeners() {
    // Listen for song list changes
    songsRef.on('value', (snapshot) => {
        const songsData = snapshot.val() || {};
        songs = Object.values(songsData);
        renderSongList();
        updateVoteBadge();
    });

    // Listen for current song changes
    currentSongRef.on('value', (snapshot) => {
        const songId = snapshot.val();
        if (songId && songId !== currentSongId) {
            currentSongId = songId;
            displaySong(songId);
        }
    });

    // Listen for viewer count changes
    viewersRef.on('value', (snapshot) => {
        const viewers = snapshot.val() || {};
        const count = Object.keys(viewers).length;
        elements.viewerCount.querySelector('.count-text').textContent = count;
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Leader button
    elements.leaderBtn.addEventListener('click', showPinModal);

    // PIN modal
    elements.submitPinBtn.addEventListener('click', submitPin);
    elements.cancelPinBtn.addEventListener('click', hidePinModal);
    elements.pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitPin();
    });

    // Navigation
    elements.prevBtn.addEventListener('click', navigatePrevious);
    elements.nextBtn.addEventListener('click', navigateNext);

    // Add song
    elements.addSongBtn.addEventListener('click', addSong);
    elements.songUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSong();
    });

    // Sort toggle
    elements.sortByVotes.addEventListener('change', renderSongList);

    // Mobile sidebar toggle
    elements.mobileToggle.addEventListener('click', toggleSidebar);
    elements.toggleSidebar.addEventListener('click', toggleSidebar);
}

// ===== Leader Mode =====
function showPinModal() {
    elements.pinModal.classList.remove('hidden');
    elements.pinInput.value = '';
    elements.pinError.classList.add('hidden');
    elements.pinInput.focus();
}

function hidePinModal() {
    elements.pinModal.classList.add('hidden');
}

function submitPin() {
    const pin = elements.pinInput.value;

    if (pin === window.LEADER_PIN) {
        isLeader = true;
        updateLeaderUI();
        hidePinModal();
        saveLeaderStatus();
    } else {
        elements.pinError.classList.remove('hidden');
        elements.pinInput.value = '';
        elements.pinInput.focus();
    }
}

function updateLeaderUI() {
    if (isLeader) {
        elements.leaderBtn.textContent = 'מצב מנחה';
        elements.leaderBtn.classList.add('active');
        elements.leaderControls.classList.remove('hidden');
        elements.navControls.classList.remove('hidden');
    } else {
        elements.leaderBtn.textContent = 'הפוך למנחה';
        elements.leaderBtn.classList.remove('active');
        elements.leaderControls.classList.add('hidden');
        elements.navControls.classList.add('hidden');
    }
}

function saveLeaderStatus() {
    localStorage.setItem('isLeader', isLeader);
}

function loadLeaderStatus() {
    const saved = localStorage.getItem('isLeader');
    if (saved === 'true') {
        isLeader = true;
        updateLeaderUI();
    }
}

// ===== Song Display =====
function displaySong(songId) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    currentSongId = songId;

    // Clear previous content
    elements.songDisplay.innerHTML = '';

    if (song.type === 'image') {
        // Display image
        const img = document.createElement('img');
        img.src = song.source;
        img.alt = song.title;
        img.style.animation = 'fadeIn 0.5s ease';
        elements.songDisplay.appendChild(img);
    } else if (song.type === 'url') {
        // Display URL in iframe
        const iframe = document.createElement('iframe');
        iframe.src = song.source;
        iframe.style.animation = 'fadeIn 0.5s ease';
        iframe.allow = 'fullscreen';
        elements.songDisplay.appendChild(iframe);
    }

    // Update active state in song list
    renderSongList();
}

// ===== Song List Rendering =====
function renderSongList() {
    if (songs.length === 0) {
        elements.songList.innerHTML = '<div class="loading-songs">אין שירים עדיין</div>';
        return;
    }

    // Sort songs if needed
    let sortedSongs = [...songs];
    if (elements.sortByVotes.checked) {
        sortedSongs.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    }

    elements.songList.innerHTML = '';

    sortedSongs.forEach(song => {
        const songItem = createSongItem(song);
        elements.songList.appendChild(songItem);
    });
}

function createSongItem(song) {
    const div = document.createElement('div');
    div.className = 'song-item';

    if (song.id === currentSongId) {
        div.classList.add('active');
    }

    if (myVotes.has(song.id)) {
        div.classList.add('voted');
    }

    const typeLabel = song.type === 'image' ? '📄 תמונה' : '🔗 קישור';

    div.innerHTML = `
        <div class="song-header">
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-type">${typeLabel}</div>
        </div>
        <div class="song-footer">
            <button class="vote-btn ${myVotes.has(song.id) ? 'voted' : ''}" data-song-id="${song.id}">
                ${myVotes.has(song.id) ? '✓' : '♡'} הצבע
            </button>
            <div class="vote-count">${song.votes || 0} הצבעות</div>
        </div>
    `;

    // Click song to select (leader only)
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('vote-btn') && isLeader) {
            selectSong(song.id);
        }
    });

    // Vote button
    const voteBtn = div.querySelector('.vote-btn');
    voteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleVote(song.id);
    });

    return div;
}

// ===== Voting System =====
function toggleVote(songId) {
    if (myVotes.has(songId)) {
        // Remove vote
        myVotes.delete(songId);
        songsRef.child(songId).child('votes').transaction((currentVotes) => {
            return Math.max(0, (currentVotes || 0) - 1);
        });
    } else {
        // Add vote
        myVotes.add(songId);
        songsRef.child(songId).child('votes').transaction((currentVotes) => {
            return (currentVotes || 0) + 1;
        });
    }

    saveMyVotes();
    renderSongList();
    updateVoteBadge();
}

function saveMyVotes() {
    localStorage.setItem('myVotes', JSON.stringify([...myVotes]));
}

function loadMyVotes() {
    const saved = localStorage.getItem('myVotes');
    if (saved) {
        myVotes = new Set(JSON.parse(saved));
    }
}

function updateVoteBadge() {
    const totalVotes = songs.reduce((sum, song) => sum + (song.votes || 0), 0);
    elements.voteBadge.textContent = totalVotes;
}

// ===== Song Selection (Leader Only) =====
function selectSong(songId) {
    if (!isLeader) return;
    currentSongRef.set(songId);
}

// ===== Navigation (Leader Only) =====
function navigatePrevious() {
    if (!isLeader || songs.length === 0) return;

    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    selectSong(songs[prevIndex].id);
}

function navigateNext() {
    if (!isLeader || songs.length === 0) return;

    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
    selectSong(songs[nextIndex].id);
}

// ===== Add Song (Leader Only) =====
async function addSong() {
    if (!isLeader) return;

    const input = elements.songUrlInput.value.trim();
    if (!input) return;

    // Determine if it's a URL or search query
    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    let newSong;
    if (isUrl) {
        // Add as URL
        newSong = {
            id: `song-${Date.now()}`,
            title: extractTitleFromUrl(input),
            type: 'url',
            source: input,
            votes: 0,
            addedBy: currentUserId
        };
    } else {
        // Search for song (simplified - just create a search URL)
        const searchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(input)}`;
        newSong = {
            id: `song-${Date.now()}`,
            title: input,
            type: 'url',
            source: searchUrl,
            votes: 0,
            addedBy: currentUserId
        };
    }

    // Add to Firebase
    await songsRef.child(newSong.id).set(newSong);

    // Clear input
    elements.songUrlInput.value = '';

    // Select the new song
    selectSong(newSong.id);
}

function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const path = urlObj.pathname.split('/').filter(p => p);

        if (path.length > 0) {
            // Try to extract song name from path
            const lastPart = path[path.length - 1];
            return decodeURIComponent(lastPart.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, ''));
        }

        return hostname;
    } catch {
        return 'שיר חיצוני';
    }
}

// ===== Mobile Sidebar Toggle =====
function toggleSidebar() {
    elements.votingSidebar.classList.toggle('open');
}

// ===== Utility Functions =====
function generateUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Start Application =====
// Wait for Firebase to be ready
if (window.firebaseDB) {
    init();
    loadLeaderStatus();
} else {
    console.error('Firebase not initialized');
    updateSyncStatus('error', 'שגיאת Firebase');
}
