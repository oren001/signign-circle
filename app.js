// --- CRITICAL CACHE BUSTER ---
// If the user's browser has an old service worker caching index.html, it may load this file as a classic script.
// Top-level imports would throw a SyntaxError. We use dynamic imports instead.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister().then(boolean => {
                if (boolean) {
                    console.log('Unregistered old ServiceWorker successfully');
                }
            });
        }
    });
}

const firebaseConfig = {
    apiKey: "AIzaSyDZPAln8_cWGZ54ElCce7_rGensf5P51Aw",
    authDomain: "singing-circle.firebaseapp.com",
    databaseURL: "https://singing-circle-default-rtdb.firebaseio.com",
    projectId: "singing-circle",
    storageBucket: "singing-circle.firebasestorage.app",
    messagingSenderId: "154350722932",
    appId: "1:154350722932:web:86eaabc6c734c755625621"
};

const USER_ID = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', USER_ID);

let db, ref, onValue, set, runTransaction, refs;
const DB_PREFIX = 'v5';

Promise.all([
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js")
]).then(([firebaseApp, firebaseDb]) => {
    const app = firebaseApp.initializeApp(firebaseConfig);
    db = firebaseDb.getDatabase(app);
    ref = firebaseDb.ref;
    onValue = firebaseDb.onValue;
    set = firebaseDb.set;
    runTransaction = firebaseDb.runTransaction;

    refs = {
        currentSong: ref(db, `${DB_PREFIX}/currentSongId`),
        votes: ref(db, `${DB_PREFIX}/votes`)
    };

    initFirebaseListeners();
}).catch(err => {
    console.error("Firebase load error", err);
});

// State
let state = {
    isLeader: false,
    isFollowing: true,
    lastViewportData: null,
    currentSong: null,
    songs: [],
    votes: {},
    viewport: {
        zoom: 1,
        x: 0,
        y: 0
    }
};

// DOM Elements
const els = {
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    controlDrawer: document.getElementById('controlDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    leaderBtn: document.getElementById('leaderBtn'),
    clearVotesBtn: document.getElementById('clearVotesBtn'),
    openMenuBtn: document.getElementById('openMenuBtn'),
    songSelector: document.getElementById('songSelector'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    songList: document.getElementById('songListContainer'),
    viewerCount: document.getElementById('viewerCount'),
    pdfCanvas: document.getElementById('pdfCanvas'),
    pdfLoader: document.getElementById('pdfLoader'),
    songTitle: document.getElementById('currentSongTitle'),
    viewerContainer: document.getElementById('viewerContainer'),
    songDisplay: document.getElementById('songDisplay'),
    toastContainer: document.getElementById('toastContainer'),
    followLeaderBtn: document.getElementById('followLeaderBtn'),
    activeVoteBtn: document.getElementById('activeVoteBtn')
};

// Lazy Loading State
let listObserver = null;
let currentRenderedCount = 0;
const BATCH_SIZE = 50;
let currentSortedSongs = []; // Holds the active sorted array 
let currentSearchQuery = ''; // Holds active search term

// Wakelock State
let wakeLock = null;

// PDF State
// PDF page = book-page-N + PDF_PAGE_OFFSET (694)
// Confirmed: PDF page 773 = book-page-79 ('יש לי סיכוי') → offset = 694
const PDF_PAGE_OFFSET = 694;
let pdfDoc = null;
let pdfRendering = false;

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/legacy/build/pdf.worker.min.js';

// Load PDF once on startup
pdfjsLib.getDocument('songs.pdf').promise.then(pdf => {
    pdfDoc = pdf;
    showToast(`✅ PDF נטען (${pdf.numPages} דפים)`, '#27ae60');
    // If a song was selected before PDF loaded, render it now
    if (window._pendingPdfPage) {
        renderPdfPage(window._pendingPdfPage);
        window._pendingPdfPage = null;
    }
}).catch(err => {
    showToast('❌ שגיאה בטעינת PDF: ' + err.message, '#e74c3c');
    console.error('PDF load error:', err);
});

// Get the PDF page number for a song
function getPageNumber(song) {
    // book-page-79 → PDF page 79 + 694 = 773
    const match = song.id.match(/^book-page-(\d+)$/);
    if (match) return parseInt(match[1], 10) + PDF_PAGE_OFFSET;
    return null; // extracted-p* or other types without a book page
}

// Render a PDF page to the canvas
async function renderPdfPage(pageNum) {
    if (!pdfDoc) {
        window._pendingPdfPage = pageNum;
        els.pdfLoader.style.display = 'block';
        els.pdfLoader.innerHTML = '⏳ ה-PDF בטעינה...';
        return;
    }
    if (pdfRendering) return;
    pdfRendering = true;

    els.pdfCanvas.style.display = 'none';
    els.pdfLoader.style.display = 'block';
    els.pdfLoader.innerHTML = '⏳ טוען...';

    try {
        const page = await pdfDoc.getPage(pageNum);
        const containerWidth = els.viewerContainer.clientWidth || 400;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        els.pdfCanvas.width = scaledViewport.width;
        els.pdfCanvas.height = scaledViewport.height;

        await page.render({
            canvasContext: els.pdfCanvas.getContext('2d'),
            viewport: scaledViewport
        }).promise;

        els.pdfLoader.style.display = 'none';
        els.pdfCanvas.style.display = 'block';
        requestWakeLock();
    } catch (err) {
        showToast(`⚠️ שגיאה בטעינת דף ${pageNum}: ${err.message}`, '#e67e22');
        els.pdfLoader.style.display = 'none';
        console.error('PDF render error:', err);
    } finally {
        pdfRendering = false;
    }
}

// Refs
// (Moved inside dynamic import)

// --- OVERVIEW: SONG SYNC ONLY (v4.54.0) ---
// Viewport synchronization (zoom/pan) has been entirely removed. 
// Users can navigate freely natively. Only the current song selection is synchronized.

// Global Error Handler for better debugging on mobile
window.onerror = (msg, url, line) => {
    showToast(`❌ שגיאה: ${msg} (שורה ${line})`, '#e74c3c');
};

function showToast(text, bg = '#333') {
    // console.log("Toast suppressed:", text);
}

// --- FOLLOW LEADER / RESET VIEW ---

// This function now simply resets the user's manual zoom/pan back to (0,0) scale(1)
// It does NOT initiate ongoing coordinate synchronization anymore.
function resetViewToLeader() {
    if (state.isLeader) return;

    // Reset any arbitrary transforms and scroll position
    els.songDisplay.style.transform = `scale(1)`;
    els.songDisplay.style.transformOrigin = `0 0`;
    els.viewerContainer.scrollTo({ left: 0, top: 0, behavior: 'smooth' });

    // Hide the button after reset
    els.followLeaderBtn.classList.add('hidden');

    // We are now technically "Following" the leader's default view
    state.isFollowing = true;
    showToast('חזרת לתחילת השיר', '#27ae60');
}

// Show the "Follow Leader" button if user navigates away from default view
function checkBreakSync() {
    if (state.isLeader) return;
    if (state.isFollowing) {
        state.isFollowing = false;
        els.followLeaderBtn.classList.remove('hidden');
    }
}

// Active Song Vote Listener
if (els.activeVoteBtn) {
    els.activeVoteBtn.addEventListener('click', (e) => {
        if (state.currentSong && state.currentSong.id) {
            if (window.castVote) {
                window.castVote(state.currentSong.id, e);
            }
        }
    });
}

// --- WAKELOCK API ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
            console.log('Wake Lock is active');
        }
    } catch (err) {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

// Re-acquire wake lock when tab becomes visible again
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

// Wait until DOM is fully parsed to attach this specific button listener
if (els.followLeaderBtn) els.followLeaderBtn.addEventListener('click', resetViewToLeader);

// Trigger break sync if user scrolls at all
els.viewerContainer.addEventListener('scroll', checkBreakSync);

// Trigger break sync if user interacts (e.g., pinch zoom) via native visualViewport
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', checkBreakSync);
    window.visualViewport.addEventListener('scroll', checkBreakSync);
}


// --- UI LOGIC ---

// Drawer Handling
els.hamburgerBtn.onclick = () => {
    els.controlDrawer.classList.remove('hidden');
    // Ensure viewport is locked while drawer is open
    document.body.style.overflow = 'hidden';
};

els.closeDrawerBtn.onclick = () => {
    els.controlDrawer.classList.add('hidden');
    document.body.style.overflow = '';
};

// ... (other drawer buttons same) ...

// Close drawer when clicking buttons inside
els.openMenuBtn.addEventListener('click', () => {
    els.controlDrawer.classList.add('hidden');
    els.songSelector.classList.remove('hidden');
});

// Toggle Leader
els.leaderBtn.addEventListener('click', () => {
    state.isLeader = !state.isLeader;
    els.leaderBtn.classList.toggle('active');
    els.leaderBtn.innerHTML = state.isLeader ? '🎤 מנחה פעיל' : '🎤 הפוך למנחה';

    // Show/hide leader special tools
    if (els.clearVotesBtn) {
        els.clearVotesBtn.classList.toggle('hidden', !state.isLeader);
    }

    if (state.isLeader) {
        state.isFollowing = true;
        els.followLeaderBtn.classList.add('hidden');
        showToast('🌟 אתה כעת המנחה!', '#8b5cf6');
    }
    els.controlDrawer.classList.add('hidden'); // Close drawer after selection
});

// Clear All Votes
if (els.clearVotesBtn) {
    els.clearVotesBtn.addEventListener('click', () => {
        if (state.isLeader && confirm('האם אתה בטוח שברצונך לאפס את כל ההצבעות?')) {
            set(refs.votes, null);
            showToast('🗑️ כל ההצבעות אופסו', '#e74c3c');
            els.controlDrawer.classList.add('hidden');
        }
    });
}

function initFirebaseListeners() {
    // Load Songs
    onValue(ref(db, `${DB_PREFIX}/songs`), (snap) => {
        const data = snap.val();
        if (data) {
            state.songs = Object.values(data);
            showToast(`✅ נטענו ${state.songs.length} שירים`, '#27ae60');
            renderSongList();

            // If we were waiting for songs to load a specific song
            if (state.pendingSongId) {
                loadSong(state.pendingSongId);
                state.pendingSongId = null;
            }
        } else {
            showToast('⚠️ לא נמצאו שירים במאגר', '#f39c12');
        }
    }, (err) => {
        showToast(`❌ שגיאת בסיס נתונים (שירים): ${err.message}`, '#e74c3c');
    });

    // Sync Current Song
    onValue(refs.currentSong, (snap) => {
        const id = snap.val();
        showToast(`🎵 שיר נוכחי: ${id || 'אין'}`, '#8e44ad');
        if (id) {
            if (state.songs.length > 0) {
                loadSong(id);
            } else {
                state.pendingSongId = id;
                els.songTitle.innerText = "מחכה לרשימת השירים...";
                if (els.activeVoteBtn) els.activeVoteBtn.classList.add('hidden');
            }
        } else {
            els.songTitle.innerText = "בחרו שיר מהספריה";
            if (els.activeVoteBtn) els.activeVoteBtn.classList.add('hidden');
        }
    }, (err) => {
        showToast(`❌ שגיאת בסיס נתונים (סנכרון): ${err.message}`, '#e74c3c');
    });

    // Sync Votes
    onValue(refs.votes, (snap) => {
        const voteData = snap.val() || {};
        // Map votes onto state.songs and re-render
        if (state.songs.length > 0) {
            state.songs.forEach(song => {
                song.votes = voteData[song.id] || 0;
            });
            renderSongList();
        }
    });
}


function loadSong(id) {
    const song = state.songs.find(s => s.id === id);
    if (!song) {
        state.pendingSongId = id;
        els.songTitle.innerText = 'מחפש שיר...';
        if (els.activeVoteBtn) els.activeVoteBtn.classList.add('hidden');
        return;
    }

    state.currentSong = song;
    els.songTitle.innerHTML = `${song.title} <span style="font-size:0.6em; opacity:0.5; font-weight:normal;">[${song.id}]</span>`;
    if (els.activeVoteBtn) els.activeVoteBtn.classList.remove('hidden');

    const pageNum = getPageNumber(song);

    if (pageNum !== null) {
        renderPdfPage(pageNum);
    } else {
        // extracted-p* songs not in the main PDF
        els.pdfCanvas.style.display = 'none';
        els.pdfLoader.style.display = 'block';
        els.pdfLoader.innerHTML = `📄 "${song.title}"<br><small style="opacity:0.5;">שיר זה אינו בספר הראשי</small>`;
    }

    state.viewport.zoom = 1;
    els.songDisplay.style.transform = 'scale(1)';
    els.viewerContainer.scrollTo(0, 0);
}

function getSortValue(song, type) {
    const rawTitle = song.title || "תתתת";
    if (type === 'artist') {
        const parts = rawTitle.split('/');
        // If there is an artist defined after a slash, sort by it. Otherwise, use title.
        return parts.length > 1 ? parts[1].trim() : parts[0].trim();
    }
    // Default to Title extraction
    return rawTitle.split('/')[0].trim();
}

function renderNextBatch() {
    const fragment = document.createDocumentFragment();
    const start = currentRenderedCount;
    const end = Math.min(start + BATCH_SIZE, currentSortedSongs.length);

    // Simple text-node escaping helper to safely inject HTML
    const escapeHtml = (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    for (let i = start; i < end; i++) {
        const song = currentSortedSongs[i];
        const votes = state.votes[song.id] || 0;

        const rawTitle = song.title || 'ללא שם';
        let displayTitle = escapeHtml(rawTitle);

        // Inject Highlight spans if there is a search query
        if (currentSearchQuery.length > 0) {
            const lowerTitle = rawTitle.toLowerCase();
            const startIndex = lowerTitle.indexOf(currentSearchQuery);
            if (startIndex !== -1) {
                const matchText = rawTitle.substring(startIndex, startIndex + currentSearchQuery.length);
                const before = rawTitle.substring(0, startIndex);
                const after = rawTitle.substring(startIndex + currentSearchQuery.length);
                displayTitle = `${escapeHtml(before)}<span class="highlight">${escapeHtml(matchText)}</span>${escapeHtml(after)}`;
            }
        }

        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <div class="song-title" onclick="selectSong('${song.id}')">${displayTitle}</div>
            <div class="song-actions">
                <div class="vote-badge ${votes > 0 ? 'has-votes' : ''}">${votes}</div>
                <button class="vote-btn" onclick="castVote('${song.id}', event)">👍</button>
            </div>
        `;
        fragment.appendChild(div);
    }

    // Remove the old sentinel if it exists
    const oldSentinel = document.getElementById('list-sentinel');
    if (oldSentinel) {
        if (listObserver) listObserver.unobserve(oldSentinel);
        oldSentinel.remove();
    }

    els.songList.appendChild(fragment);
    currentRenderedCount = end;

    // If there are more songs to load, attach a new sentinel
    if (currentRenderedCount < currentSortedSongs.length) {
        const sentinel = document.createElement('div');
        sentinel.id = 'list-sentinel';
        sentinel.style.height = '20px'; // invisible trigger area
        els.songList.appendChild(sentinel);

        if (!listObserver) {
            listObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    // Slight delay allows the UI thread to breathe while scrolling fast
                    requestAnimationFrame(() => renderNextBatch());
                }
            }, { root: els.songSelector, rootMargin: '100px' });
        }
        listObserver.observe(sentinel);
    }
}

function renderSongList() {
    const sortBy = els.sortSelect ? els.sortSelect.value : 'votes';

    // 1. Filter by Search Query First
    let filteredSongs = [...state.songs];
    if (currentSearchQuery.length > 0) {
        filteredSongs = filteredSongs.filter(song => {
            const title = (song.title || "ללא שם").toLowerCase();
            return title.includes(currentSearchQuery);
        });
    }

    // 2. Sort the filtered subset
    currentSortedSongs = filteredSongs.sort((a, b) => {
        const votesA = state.votes[a.id] || 0;
        const votesB = state.votes[b.id] || 0;
        const textA = getSortValue(a, sortBy);
        const textB = getSortValue(b, sortBy);

        if (sortBy === 'votes') {
            if (votesB !== votesA) return votesB - votesA;
            return getSortValue(a, 'title').localeCompare(getSortValue(b, 'title'));
        } else {
            return textA.localeCompare(textB);
        }
    });

    // Reset list and state for new render cycle
    els.songList.innerHTML = '';
    currentRenderedCount = 0;
    if (listObserver) {
        listObserver.disconnect();
        listObserver = null;
    }

    renderNextBatch();
}

window.castVote = (id, event) => {
    // Prevent triggering selectSong if we clicked the vote button itself
    if (event) {
        event.stopPropagation();
    }

    // Optimistic UI Toast
    showToast(`הצבעת לשיר!`, '#3498db');

    const songVoteRef = ref(db, `${DB_PREFIX}/votes/${id}`);
    runTransaction(songVoteRef, (currentVotes) => {
        return (currentVotes || 0) + 1;
    });
};

window.selectSong = (id) => {
    if (state.isLeader) {
        set(refs.currentSong, id);
        // Clear votes for this song so it doesn't stay at the top forever
        set(ref(db, `${DB_PREFIX}/votes/${id}`), 0);
    } else {
        loadSong(id); // Local preview
    }
    els.songSelector.classList.add('hidden');
};

// Unified Control Drawer (Hamburger Menu)
els.hamburgerBtn.onclick = () => {
    els.controlDrawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

els.closeDrawerBtn.onclick = () => {
    els.controlDrawer.classList.add('hidden');
    document.body.style.overflow = '';
};

els.openMenuBtn.addEventListener('click', () => {
    els.controlDrawer.classList.add('hidden');
    els.songSelector.classList.remove('hidden');
    // Ensure accurate rendering based on current state & sort dropdown
    renderSongList();
});

// Close panel via the specific ✕ button in header
els.closePanelBtn.onclick = () => {
    els.songSelector.classList.add('hidden');
};

// Sort Dropdown listener
if (els.sortSelect) {
    els.sortSelect.addEventListener('change', () => {
        renderSongList();
    });
}

// Search & Highlight Logic
els.searchInput.addEventListener('input', (e) => {
    // Update global search state and trigger a complete re-render pipeline
    currentSearchQuery = e.target.value.toLowerCase();
    renderSongList();
});

// --- UPDATE CHECKER ---
const CURRENT_VERSION = "5.2.0";
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

// --- WHAT'S NEW MODAL LOGIC ---
const whatsNewModal = document.getElementById('whatsNewModal');
const closeWhatsNewBtn = document.getElementById('closeWhatsNewBtn');

if (whatsNewModal && closeWhatsNewBtn) {
    const hasSeenVersion = localStorage.getItem('nigunim_version_seen');
    if (hasSeenVersion !== CURRENT_VERSION) {
        // Delay slightly for better UX impact after load
        setTimeout(() => {
            whatsNewModal.classList.remove('hidden');
        }, 800);
    }

    closeWhatsNewBtn.addEventListener('click', () => {
        whatsNewModal.classList.add('hidden');
        localStorage.setItem('nigunim_version_seen', CURRENT_VERSION);
    });
}
