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

// Helper function to compress and resize image
function compressImage(file, maxWidth = 1000, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if too wide
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG Base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
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

    try {
        submitUploadBtn.disabled = true;
        uploadProgress.classList.remove('hidden');
        uploadError.classList.add('hidden');
        progressText.textContent = 'מעבד תמונה...';
        progressFill.style.width = '30%';

        console.log('Compressing image...', {
            originalSize: Math.round(selectedFile.size / 1024) + 'KB'
        });

        // 1. Compress Image
        const compressedBase64 = await compressImage(selectedFile);

        console.log('Compression complete', {
            newSize: Math.round(compressedBase64.length / 1024) + 'KB'
        });

        progressText.textContent = 'שומר נתונים...';
        progressFill.style.width = '70%';

        // 2. Generate unique song ID
        const songId = `user-song-${Date.now()}`;

        // 3. Save directly to Firebase Database (no Storage needed!)
        const newSong = {
            id: songId,
            title: songName,
            type: 'image',
            source: compressedBase64, // The full image is now a string!
            votes: 0,
            addedBy: 'user',
            uploadedAt: Date.now(),
            uploadedByName: 'Anonymous'
        };

        console.log('Saving to database...', songId);
        await songsRef.child(songId).set(newSong);

        progressFill.style.width = '100%';
        progressText.textContent = 'הושלם בהצלחה! ✓';
        console.log('Done!');

        // Close modal after short delay
        setTimeout(() => {
            closeUploadModal();
        }, 1500);

    } catch (error) {
        console.error('Upload process error:', error);
        showUploadError('שגיאה בתהליך ההעלאה: ' + error.message);
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
