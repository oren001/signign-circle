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
    openSelectorBtn: document.getElementById('openSelectorBtn'),
    openVotingBtn: document.getElementById('openVotingBtn'),
    totalVotesBadge: document.getElementById('totalVotesBadge'),

    // Panels
    songSelectorPanel: document.getElementById('songSelectorPanel'),
    votingPanel: document.getElementById('votingPanel'),
    songList: document.getElementById('songList'),
    voteList: document.getElementById('voteList'),
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
        if (songId && songId !== currentSongId) {
            currentSongId = songId;
            displaySong(songId);
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
    elements.submitPinBtn.addEventListener('click', submitPin);
    elements.cancelPinBtn.addEventListener('click', () => elements.pinModal.classList.add('hidden'));

    // Panels
    elements.openSelectorBtn.addEventListener('click', () => {
        elements.songSelectorPanel.classList.remove('hidden');
        elements.votingPanel.classList.add('hidden');
    });
    elements.openVotingBtn.addEventListener('click', () => {
        elements.votingPanel.classList.remove('hidden');
        elements.songSelectorPanel.classList.add('hidden');
    });

    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.songSelectorPanel.classList.add('hidden');
            elements.votingPanel.classList.add('hidden');
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
    // Close panels when song is selected
    elements.songSelectorPanel.classList.add('hidden');
    renderSongSelector();
}

// ===== Renderers =====
function renderSongSelector() {
    elements.songList.innerHTML = '';
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = `song-card ${song.id === currentSongId ? 'active' : ''}`;
        div.innerHTML = `<button class="card-title">${escapeHtml(song.title)}</button>`;
        div.onclick = () => selectSong(song.id);
        elements.songList.appendChild(div);
    });
}

function renderVotingPanel() {
    elements.voteList.innerHTML = '';
    // Sort by votes
    const sorted = [...songs].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    sorted.forEach(song => {
        const div = document.createElement('div');
        div.className = 'vote-item';
        div.innerHTML = `
            <div class="vote-item-info">
                <div class="vote-item-title">${escapeHtml(song.title)}</div>
                <div class="vote-item-count">${song.votes || 0} הצבעות</div>
            </div>
            <button class="mini-vote-btn ${myVotes.has(song.id) ? 'voted' : ''}" onclick="toggleVote(event, '${song.id}')">
                ${myVotes.has(song.id) ? '✓' : '♡'}
            </button>
        `;
        div.onclick = () => selectSong(song.id);
        elements.voteList.appendChild(div);
    });
}

function selectSong(songId) {
    if (isLeader) {
        currentSongRef.set(songId);
    } else {
        displaySong(songId);
    }
}

function toggleVote(event, songId) {
    event.stopPropagation();
    if (myVotes.has(songId)) {
        myVotes.delete(songId);
        songsRef.child(songId).child('votes').transaction(v => Math.max(0, (v || 0) - 1));
    } else {
        myVotes.add(songId);
        songsRef.child(songId).child('votes').transaction(v => (v || 0) + 1);
    }
    localStorage.setItem('myVotes', JSON.stringify([...myVotes]));
    renderVotingPanel();
}

function updateTotalVotes() {
    const total = songs.reduce((sum, s) => sum + (s.votes || 0), 0);
    elements.totalVotesBadge.textContent = total;
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

if (window.firebaseDB) init();
