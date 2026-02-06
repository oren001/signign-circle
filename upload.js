// ===== Upload Song Functionality =====

// Upload modal elements
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const submitUploadBtn = document.getElementById('submitUploadBtn');
const songNameInput = document.getElementById('songNameInput');
const songImageInput = document.getElementById('songImageInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadError = document.getElementById('uploadError');

let selectedFile = null;

// Open upload modal
function openUploadModal() {
    uploadModal.classList.remove('hidden');
    resetUploadForm();
}

// Close upload modal
function closeUploadModal() {
    uploadModal.classList.add('hidden');
    resetUploadForm();
}

// Reset upload form
function resetUploadForm() {
    songNameInput.value = '';
    songImageInput.value = '';
    selectedFile = null;
    fileNameDisplay.textContent = 'בחר תמונה...';
    imagePreview.classList.add('hidden');
    uploadProgress.classList.add('hidden');
    uploadError.classList.add('hidden');
    progressFill.style.width = '0%';
    submitUploadBtn.disabled = false;
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showUploadError('אנא בחר קובץ תמונה (PNG, JPG, WebP)');
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showUploadError('גודל הקובץ חורג מ-5MB. אנא בחר תמונה קטנה יותר.');
        return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    uploadError.classList.add('hidden');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Show upload error
function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.classList.remove('hidden');
}

// Upload song
async function uploadSong() {
    // Validate inputs
    const songName = songNameInput.value.trim();

    if (!songName) {
        showUploadError('אנא הזן שם לשיר');
        return;
    }

    if (!selectedFile) {
        showUploadError('אנא בחר תמונה');
        return;
    }

    // Check if Firebase Storage is available
    if (!window.firebaseStorage) {
        showUploadError('Firebase Storage לא זמין. אנא רענן את הדף.');
        console.error('Firebase Storage not initialized');
        return;
    }

    try {
        submitUploadBtn.disabled = true;
        uploadProgress.classList.remove('hidden');
        uploadError.classList.add('hidden');

        console.log('Starting upload...', {
            songName,
            fileSize: selectedFile.size,
            fileType: selectedFile.type
        });

        // Generate unique song ID
        const songId = `user-song-${Date.now()}`;
        const fileName = `${songId}.${selectedFile.name.split('.').pop()}`;

        // Upload to Firebase Storage
        console.log(`Uploading to user-songs/${fileName}...`);
        const storageRef = window.firebaseStorage.ref(`user-songs/${fileName}`);

        // Add metadata to prompt content-type recognition
        const metadata = {
            contentType: selectedFile.type
        };

        const uploadTask = storageRef.put(selectedFile, metadata);

        // Add a safety timeout - if no progress after 10 seconds, something is wrong
        let lastTransfer = 0;
        let stuckTimeout = setTimeout(() => {
            if (lastTransfer === 0) {
                console.error('Upload stuck at 0% for 10 seconds. Check Firebase Storage rules and settings.');
                showUploadError('ההעלאה נתקעה. וודא ש-Firebase Storage מופעל ושיש הרשאות כתיבה.');
                submitUploadBtn.disabled = false;
                uploadProgress.classList.add('hidden');
                uploadTask.cancel();
            }
        }, 10000);

        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                lastTransfer = snapshot.bytesTransferred;
                console.log('Upload progress:', Math.round(progress) + '%', `(${snapshot.bytesTransferred}/${snapshot.totalBytes})`);

                progressFill.style.width = progress + '%';
                progressText.textContent = `מעלה... ${Math.round(progress)}%`;

                if (progress > 0) {
                    clearTimeout(stuckTimeout);
                }
            },
            (error) => {
                clearTimeout(stuckTimeout);
                console.error('Firebase Storage Error Details:', {
                    code: error.code,
                    message: error.message,
                    serverResponse: error.serverResponse
                });

                let errorMsg = `שגיאה בהעלאה (${error.code}): ${error.message}`;

                if (error.code === 'storage/unauthorized') {
                    errorMsg = 'אין הרשאה להעלות. וודא שכללי האבטחה (Rules) ב-Storage פתוחים לכתיבה.';
                } else if (error.code === 'storage/retry-limit-exceeded') {
                    errorMsg = 'חיבור איטי מדי או נותק. נסה שוב.';
                }

                showUploadError(errorMsg);
                submitUploadBtn.disabled = false;
                uploadProgress.classList.add('hidden');
            },
            async () => {
                clearTimeout(stuckTimeout);
                // Upload completed successfully
                try {
                    console.log('Upload completed! Getting download URL...');
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('Download URL successfully retrieved:', downloadURL);

                    // Save song data to Firebase Database
                    const newSong = {
                        id: songId,
                        title: songName,
                        type: 'image',
                        source: downloadURL,
                        votes: 0,
                        addedBy: 'user',
                        uploadedAt: Date.now(),
                        uploadedByName: 'Anonymous'
                    };

                    console.log('Saving new song to Database...', newSong);
                    await songsRef.child(songId).set(newSong);

                    progressText.textContent = 'הושלם בהצלחה! ✓';
                    console.log('Done!');

                    // Close modal after short delay
                    setTimeout(() => {
                        closeUploadModal();
                    }, 1500);

                } catch (error) {
                    console.error('Post-upload processing error:', error);
                    showUploadError('התמונה הועלתה אך אירעה שגיאה בשמירת הנתונים: ' + error.message);
                    submitUploadBtn.disabled = false;
                }
            }
        );

    } catch (error) {
        console.error('Upload error:', error);
        showUploadError('שגיאה בהעלאת השיר: ' + error.message);
        submitUploadBtn.disabled = false;
        uploadProgress.classList.add('hidden');
    }
}

// Setup upload event listeners
function setupUploadListeners() {
    openUploadBtn.addEventListener('click', openUploadModal);
    closeUploadBtn.addEventListener('click', closeUploadModal);
    cancelUploadBtn.addEventListener('click', closeUploadModal);
    submitUploadBtn.addEventListener('click', uploadSong);
    songImageInput.addEventListener('change', handleFileSelect);

    // Click on label to trigger file input
    document.querySelector('.file-input-label').addEventListener('click', () => {
        songImageInput.click();
    });
}
