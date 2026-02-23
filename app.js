// --- CRITICAL CACHE BUSTER ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
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

const USER_ID = localStorage.getItem('userId') || (`user-${Date.now()}`);
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

// --- CONFIG & STATE ---
const CURRENT_VERSION = "6.1.10";

// --- PDF MAPPING TABLE ---
const LEGACY_MAPPING = {
  "book-page-3": 25,
  "book-page-5": 5,
  "book-page-13": 13,
  "book-page-14": 73,
  "book-page-19": 122,
  "book-page-21": 140,
  "book-page-63": 665,
  "book-page-79": 773,
  "book-page-100": 848,
  "book-page-116": 927,
  "book-page-200": 1160,
  "book-page-292": 1470,
  "book-page-105": 871,
  "book-page-107": 882,
  "book-page-108": 882,
  "book-page-125": 961,
  "book-page-131": 984,
  "book-page-132": 985,
  "book-page-135": 993,
  "book-page-142": 1031,
  "book-page-144": 1038,
  "book-page-15": 81,
  "book-page-156": 1086,
  "book-page-160": 1097,
  "book-page-171": 1122,
  "book-page-178": 1129,
  "book-page-18": 107,
  "book-page-182": 1135,
  "book-page-183": 1136,
  "book-page-184": 1137,
  "book-page-185": 1137,
  "book-page-186": 1137,
  "book-page-187": 1139,
  "book-page-188": 1140,
  "book-page-199": 1172,
  "book-page-204": 1161,
  "book-page-206": 1172,
  "book-page-230": 1245,
  "book-page-24": 235,
  "book-page-257": 1343,
  "book-page-261": 1354,
  "book-page-269": 1391,
  "book-page-279": 1426,
  "book-page-283": 1436,
  "book-page-32": 320,
  "book-page-33": 325,
  "book-page-34": 350,
  "book-page-40": 426,
  "book-page-46": 457,
  "book-page-47": 89,
  "book-page-48": 470,
  "book-page-53": 542,
  "book-page-56": 616,
  "book-page-59": 652,
  "book-page-62": 659,
  "book-page-68": 721,
  "book-page-70": 724,
  "book-page-73": 737,
  "book-page-74": 739,
  "book-page-75": 740,
  "book-page-83": 793,
  "book-page-85": 802,
  "book-page-87": 810,
  "book-page-90": 829,
  "book-page-94": 835,
  "book-page-98": 846,
  "book-page-1": 23,
  "book-page-10": 10,
  "book-page-101": 853,
  "book-page-102": 858,
  "book-page-103": 862,
  "book-page-104": 867,
  "book-page-106": 877,
  "book-page-109": 888,
  "book-page-11": 11,
  "book-page-110": 894,
  "book-page-111": 900,
  "book-page-112": 905,
  "book-page-113": 911,
  "book-page-114": 916,
  "book-page-115": 922,
  "book-page-117": 931,
  "book-page-118": 935,
  "book-page-119": 939,
  "book-page-12": 12,
  "book-page-120": 943,
  "book-page-121": 947,
  "book-page-122": 951,
  "book-page-123": 954,
  "book-page-124": 958,
  "book-page-126": 965,
  "book-page-127": 969,
  "book-page-128": 973,
  "book-page-129": 977,
  "book-page-130": 981,
  "book-page-133": 988,
  "book-page-134": 991,
  "book-page-136": 998,
  "book-page-137": 1004,
  "book-page-138": 1009,
  "book-page-139": 1015,
  "book-page-140": 1020,
  "book-page-141": 1026,
  "book-page-143": 1035,
  "book-page-145": 1042,
  "book-page-146": 1046,
  "book-page-147": 1050,
  "book-page-148": 1054,
  "book-page-149": 1058,
  "book-page-150": 1062,
  "book-page-151": 1066,
  "book-page-152": 1070,
  "book-page-153": 1074,
  "book-page-154": 1078,
  "book-page-155": 1082,
  "book-page-157": 1089,
  "book-page-158": 1092,
  "book-page-159": 1095,
  "book-page-16": 90,
  "book-page-161": 1099,
  "book-page-162": 1101,
  "book-page-163": 1103,
  "book-page-164": 1105,
  "book-page-165": 1107,
  "book-page-166": 1110,
  "book-page-167": 1112,
  "book-page-168": 1115,
  "book-page-169": 1117,
  "book-page-17": 99,
  "book-page-170": 1120,
  "book-page-172": 1123,
  "book-page-173": 1124,
  "book-page-174": 1125,
  "book-page-175": 1126,
  "book-page-176": 1127,
  "book-page-177": 1128,
  "book-page-179": 1131,
  "book-page-180": 1132,
  "book-page-181": 1134,
  "book-page-189": 1143,
  "book-page-190": 1146,
  "book-page-191": 1149,
  "book-page-192": 1152,
  "book-page-193": 1155,
  "book-page-194": 1158,
  "book-page-195": 1161,
  "book-page-196": 1164,
  "book-page-197": 1167,
  "book-page-198": 1170,
  "book-page-2": 24,
  "book-page-20": 131,
  "book-page-201": 1160,
  "book-page-202": 1160,
  "book-page-203": 1161,
  "book-page-205": 1167,
  "book-page-207": 1175,
  "book-page-208": 1178,
  "book-page-209": 1181,
  "book-page-210": 1184,
  "book-page-211": 1187,
  "book-page-212": 1190,
  "book-page-213": 1193,
  "book-page-214": 1196,
  "book-page-215": 1199,
  "book-page-216": 1202,
  "book-page-217": 1205,
  "book-page-218": 1208,
  "book-page-219": 1211,
  "book-page-22": 172,
  "book-page-220": 1214,
  "book-page-221": 1217,
  "book-page-222": 1220,
  "book-page-223": 1223,
  "book-page-224": 1226,
  "book-page-225": 1229,
  "book-page-226": 1232,
  "book-page-227": 1235,
  "book-page-228": 1238,
  "book-page-229": 1242,
  "book-page-23": 204,
  "book-page-231": 1249,
  "book-page-232": 1253,
  "book-page-233": 1257,
  "book-page-234": 1261,
  "book-page-235": 1265,
  "book-page-236": 1269,
  "book-page-237": 1273,
  "book-page-238": 1277,
  "book-page-239": 1280,
  "book-page-240": 1284,
  "book-page-241": 1287,
  "book-page-242": 1291,
  "book-page-243": 1294,
  "book-page-244": 1298,
  "book-page-245": 1301,
  "book-page-246": 1305,
  "book-page-247": 1308,
  "book-page-248": 1312,
  "book-page-249": 1315,
  "book-page-25": 246,
  "book-page-250": 1319,
  "book-page-251": 1322,
  "book-page-252": 1326,
  "book-page-253": 1329,
  "book-page-254": 1333,
  "book-page-255": 1336,
  "book-page-256": 1340,
  "book-page-258": 1346,
  "book-page-259": 1349,
  "book-page-26": 257,
  "book-page-260": 1352,
  "book-page-262": 1359,
  "book-page-263": 1364,
  "book-page-264": 1369,
  "book-page-265": 1373,
  "book-page-266": 1378,
  "book-page-267": 1382,
  "book-page-268": 1387,
  "book-page-27": 268,
  "book-page-270": 1395,
  "book-page-271": 1398,
  "book-page-272": 1402,
  "book-page-273": 1405,
  "book-page-274": 1409,
  "book-page-275": 1412,
  "book-page-276": 1416,
  "book-page-277": 1419,
  "book-page-278": 1423,
  "book-page-28": 278,
  "book-page-280": 1429,
  "book-page-281": 1431,
  "book-page-282": 1434,
  "book-page-284": 1440,
  "book-page-285": 1444,
  "book-page-286": 1448,
  "book-page-287": 1452,
  "book-page-288": 1456,
  "book-page-289": 1460,
  "book-page-29": 289,
  "book-page-290": 1463,
  "book-page-291": 1467,
  "book-page-30": 299,
  "book-page-31": 310,
  "book-page-35": 363,
  "book-page-36": 376,
  "book-page-37": 389,
  "book-page-38": 401,
  "book-page-39": 414,
  "book-page-4": 15,
  "book-page-41": 431,
  "book-page-42": 436,
  "book-page-43": 441,
  "book-page-44": 446,
  "book-page-45": 452,
  "book-page-49": 484,
  "book-page-50": 499,
  "book-page-51": 513,
  "book-page-52": 528,
  "book-page-54": 567,
  "book-page-55": 592,
  "book-page-57": 628,
  "book-page-58": 640,
  "book-page-6": 6,
  "book-page-60": 654,
  "book-page-61": 657,
  "book-page-64": 676,
  "book-page-65": 687,
  "book-page-66": 698,
  "book-page-67": 710,
  "book-page-69": 723,
  "book-page-7": 7,
  "book-page-71": 728,
  "book-page-72": 733,
  "book-page-76": 748,
  "book-page-77": 756,
  "book-page-78": 765,
  "book-page-8": 8,
  "book-page-80": 778,
  "book-page-81": 783,
  "book-page-82": 788,
  "book-page-84": 798,
  "book-page-86": 806,
  "book-page-88": 816,
  "book-page-89": 823,
  "book-page-9": 9,
  "book-page-91": 831,
  "book-page-92": 832,
  "book-page-93": 834,
  "book-page-95": 838,
  "book-page-96": 841,
  "book-page-97": 844,
  "book-page-99": 847
};

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
    },
    pdfOffset: 0
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
    pdfViewer: document.getElementById('pdfViewer'),
    pdfLoader: document.getElementById('pdfLoader'),
    songTitle: document.getElementById('currentSongTitle'),
    viewerContainer: document.getElementById('viewerContainer'),
    songDisplay: document.getElementById('songDisplay'),
    toastContainer: document.getElementById('toastContainer'),
    followLeaderBtn: document.getElementById('followLeaderBtn'),
    activeVoteBtn: document.getElementById('activeVoteBtn'),
    offsetUp: document.getElementById('offsetUp'),
    offsetDown: document.getElementById('offsetDown'),
    currentOffsetDisplay: document.getElementById('currentOffsetDisplay'),
    currentPageDisplay: document.getElementById('currentPageDisplay')
};

// Lazy Loading State
let listObserver = null;
let currentRenderedCount = 0;
const BATCH_SIZE = 50;
let currentSortedSongs = [];
let currentSearchQuery = '';

// Wakelock State
let wakeLock = null;

// Get the PDF page number for a song
function getPageNumber(song) {
    if (!song) return null;

    if (song.id && LEGACY_MAPPING[song.id]) {
        return LEGACY_MAPPING[song.id];
    }

    if (song.id && song.id.startsWith('extracted-p')) {
        const num = parseInt(song.id.replace('extracted-p', ''), 10);
        if (!isNaN(num)) return num;
    }

    if (song.source) {
        const match = song.source.match(/page_(\d+)\.(png|jpg|jpeg)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return null;
}

// Render a PDF page using native iframe
function renderPdfPage(pageNum) {
    if (els.currentPageDisplay) els.currentPageDisplay.innerText = pageNum;
    if (els.currentOffsetDisplay) els.currentOffsetDisplay.innerText = state.pdfOffset;

    els.pdfViewer.style.display = 'none';
    els.pdfLoader.style.display = 'block';
    els.pdfLoader.innerHTML = '⏳ טוען דף...';

    const pdfUrl = `songs.pdf?v=${CURRENT_VERSION}#page=${pageNum}&view=FitH&scrollbar=0&toolbar=0&statusbar=0&navpanes=0`;

    els.pdfViewer.src = 'about:blank';

    setTimeout(() => {
        els.pdfViewer.src = pdfUrl;
        els.pdfLoader.style.display = 'none';
        els.pdfViewer.style.display = 'block';
        requestWakeLock();
    }, 50);
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
        // Fallback only for genuinely unknown formats
        els.pdfViewer.style.display = 'none';
        els.pdfLoader.style.display = 'block';
        els.pdfLoader.innerHTML = `📄 "${song.title}"<br><small style="opacity:0.5;">שגיאה: לא ניתן לאתר את עמוד השיר</small>`;
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

// --- DEBUG PDF OFFSET ---
if (els.offsetUp && els.offsetDown) {
    const updateOffset = (delta) => {
        state.pdfOffset += delta;
        console.log(`Debug: New PDF Offset = ${state.pdfOffset}`);
        if (state.currentSong) {
            loadSong(state.currentSong.id);
        }
    };
    els.offsetUp.onclick = () => updateOffset(1);
    els.offsetDown.onclick = () => updateOffset(-1);
}

// --- UPDATE CHECKER ---

function checkForUpdates() {
    fetch(VERSION_URL + '?t=' + Date.now()) // bust cache
        .then(r => r.json())
        .then(data => {
            // Only notify if the remote version is actually "newer" (different)
            // Ideally we'd do a semver compare, but checking for inequality is what was there.
            // Let's at least make sure we don't alert to "downgrade" if possible.
            if (data.version !== CURRENT_VERSION) {
                // If the user's current version is already higher or equal to the server, 
                // we might want to skip the toast. But for now, let's just make sure 
                // the server IS updated.
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

    toast.onclick = () => {
        // Force the browser to bypass cache for index.html by appending the new version as a query param
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('v', newVersion);
        window.location.href = currentUrl.toString();
    };

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
