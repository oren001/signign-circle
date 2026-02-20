import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDZPAln8_cWGZ54ElCce7_rGensf5P51Aw",
    authDomain: "singing-circle.firebaseapp.com",
    databaseURL: "https://singing-circle-default-rtdb.firebaseio.com",
    projectId: "singing-circle",
    storageBucket: "singing-circle.firebasestorage.app",
    messagingSenderId: "154350722932",
    appId: "1:154350722932:web:86eaabc6c734c755625621"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const USER_ID = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', USER_ID);

// State
let state = {
    isLeader: false,
    currentSong: null,
    songs: [],
    viewport: {
        zoom: 1,
        x: 0,
        y: 0
    }
};

// DOM Elements
const els = {
    leaderBtn: document.getElementById('leaderBtn'),
    songImg: document.getElementById('currentSongImg'),
    songDisplay: document.getElementById('songDisplay'),
    viewerContainer: document.getElementById('viewerContainer'),
    songTitle: document.getElementById('currentSongTitle'),
    songSelector: document.getElementById('songSelector'),
    songList: document.getElementById('songListContainer'),
    searchInput: document.getElementById('searchInput'),
    openMenuBtn: document.getElementById('openMenuBtn'),
    closePanelBtn: document.getElementById('closePanelBtn')
};

// Refs
const refs = {
    currentSong: ref(db, 'currentSongId'),
    viewport: ref(db, 'viewport')
};

// --- SYNC ENGINE (Stream Leader View) ---

let lastBroadcast = 0;
let isSyncing = false;

// Helper: Parse Matrix
const getScaleFromMatrix = (transform) => {
    if (transform === 'none' || !transform) return 1;
    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (matrix) {
        return parseFloat(matrix[1].split(',')[0]);
    }
    return 1;
};

// BROADCAST (Leader)
const broadcastViewport = () => {
    if (!state.isLeader) return;

    const now = Date.now();
    if (now - lastBroadcast < 50) return; // Throttle 20fps

    const container = els.viewerContainer;
    const content = els.songDisplay;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Calculate Relative Scroll
    // We normalize by the *current* scaled dimensions to get exact percentage
    const scrollWidth = container.scrollWidth - container.clientWidth;
    const scrollHeight = container.scrollHeight - container.clientHeight;

    // Avoid division by zero
    const relX = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
    const relY = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    set(refs.viewport, {
        zoom: state.viewport.zoom,
        relX,
        relY,
        timestamp: now,
        userId: USER_ID
    });

    lastBroadcast = now;
};

// APPLY (Follower)
const applyViewport = (data) => {
    if (state.isLeader || data.userId === USER_ID) return;

    isSyncing = true;

    // 1. Apply Zoom
    els.songDisplay.style.transform = `scale(${data.zoom})`;
    els.songDisplay.style.width = 'fit-content';

    // 2. Apply Scroll (Next Frame to ensure layout updated)
    requestAnimationFrame(() => {
        const container = els.viewerContainer;

        const scrollWidth = container.scrollWidth - container.clientWidth;
        const scrollHeight = container.scrollHeight - container.clientHeight;

        container.scrollTo({
            left: data.relX * scrollWidth,
            top: data.relY * scrollHeight,
            behavior: 'auto' // Instant jump for sync
        });

        isSyncing = false;
    });
};

// --- TOUCH HANDLING (Pinch to Zoom) ---

let initialDist = null;
let initialZoom = 1;

els.songDisplay.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && state.isLeader) {
        initialDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoom = state.viewport.zoom;
        e.preventDefault();
    }
}, { passive: false });

els.songDisplay.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && state.isLeader && initialDist) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / initialDist;
        const newZoom = Math.min(Math.max(0.5, initialZoom * scale), 4);

        // Set origin to 0 0 for predictable scrolling
        els.songDisplay.style.transformOrigin = '0 0';
        els.songDisplay.style.transform = `scale(${newZoom})`;

        // Update state
        state.viewport.zoom = newZoom;
        broadcastViewport();
    }
}, { passive: false });

els.songDisplay.addEventListener('touchend', () => {
    initialDist = null;
});

// Scroll Listener
els.viewerContainer.addEventListener('scroll', () => {
    if (state.isLeader && !isSyncing) {
        broadcastViewport();
    }
});


// --- APP LOGIC ---

// Global Error Handler for better debugging on mobile
window.onerror = (msg, url, line) => {
    showToast(`❌ שגיאה: ${msg} (שורה ${line})`, '#e74c3c');
};

function showToast(text, bg = '#333') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = bg;
    toast.innerText = text;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Toggle Leader
els.leaderBtn.addEventListener('click', () => {
    state.isLeader = !state.isLeader;
    els.leaderBtn.classList.toggle('active');
    els.leaderBtn.innerHTML = state.isLeader ? '🎤 מנחה פעיל' : '🎤 הפוך למנחה';

    if (state.isLeader) {
        broadcastViewport();
    }
});

// Load Songs
onValue(ref(db, 'songs'), (snap) => {
    const data = snap.val();
    if (data) {
        state.songs = Object.values(data);
        renderSongList();

        // If we were waiting for songs to load a specific song
        if (state.pendingSongId) {
            loadSong(state.pendingSongId);
            state.pendingSongId = null;
        }
    }
});

// Sync Current Song
onValue(refs.currentSong, (snap) => {
    const id = snap.val();
    if (id) {
        if (state.songs.length > 0) {
            loadSong(id);
        } else {
            state.pendingSongId = id;
        }
    }
});

// Sync Viewport
onValue(refs.viewport, (snap) => {
    const data = snap.val();
    if (data) applyViewport(data);
});

function loadSong(id) {
    const song = state.songs.find(s => s.id === id);
    if (!song) {
        state.pendingSongId = id;
        els.songTitle.innerText = "מחפש שיר...";
        return;
    }

    state.currentSong = song;
    els.songTitle.innerText = song.title;

    els.songImg.style.opacity = '0.5';

    const src = song.source.startsWith('http') ? song.source : `songs/${song.source.split('/').pop()}`;
    els.songImg.src = src;
    els.songImg.style.display = 'block';

    els.songImg.onload = () => {
        els.songImg.style.opacity = '1';
    };

    els.songImg.onerror = () => {
        showToast(`⚠️ שגיאה בטעינת תמונה: ${song.source.split('/').pop()}`, '#e67e22');
        els.songImg.style.opacity = '1';
    };

    state.viewport.zoom = 1;
    els.songDisplay.style.transform = 'scale(1)';
    els.viewerContainer.scrollTo(0, 0);
}

function renderSongList() {
    els.songList.innerHTML = state.songs.map(song => `
        <div class="song-item" onclick="selectSong('${song.id}')">
            <div class="song-title">${song.title}</div>
            <div class="song-item-arrow">←</div>
        </div>
    `).join('');
}

window.selectSong = (id) => {
    if (state.isLeader) {
        set(refs.currentSong, id);
    } else {
        loadSong(id); // Local preview
    }
    els.songSelector.classList.add('hidden');
};

// UI Handling
els.openMenuBtn.onclick = () => els.songSelector.classList.remove('hidden');
els.closePanelBtn.onclick = () => els.songSelector.classList.add('hidden');

els.searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const items = els.songList.children;
    Array.from(items).forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? 'block' : 'none';
    });
});

// --- UPDATE CHECKER ---
const CURRENT_VERSION = "4.52.0";
const VERSION_URL = "version.json";

function checkForUpdates() {
    fetch(VERSION_URL + '?t=' + Date.now()) // bust cache
        .then(r => r.json())
        .then(data => {
            if (data.version !== CURRENT_VERSION) {
                showUpdateNotification(data.version);
            }
        })
        .catch(() => { }); // silent fail
}

function showUpdateNotification(newVersion) {
    const existing = document.getElementById('update-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.className = 'toast';
    toast.style.background = '#2ecc71'; // Green
    toast.style.cursor = 'pointer';
    toast.innerHTML = `🚀 גרסה חדשה (${newVersion}) זמינה! לחץ לרענון`;

    toast.onclick = () => window.location.reload();

    document.getElementById('toastContainer').appendChild(toast);
}

// Check every 30 seconds
setInterval(checkForUpdates, 30000);
// Check on load
checkForUpdates();
