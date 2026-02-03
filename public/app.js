// Global state
let socket = null;
let currentUser = null;
let currentRoom = null;
let currentDM = null;
let rooms = [];
let users = [];
let files = [];
let blockedUsers = new Set();
let adminCredentials = null;
let map = null;
let selectedLocation = null;
let unreadDMs = new Map(); // Track unread DMs by user ID

// Notification sound system
let notificationEnabled = localStorage.getItem('notificationSound') !== 'false';
let notificationVolume = parseFloat(localStorage.getItem('notificationVolume') || '0.5');

function createNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.value = notificationVolume * 0.3;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
    
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.value = 1000;
    gainNode2.gain.value = notificationVolume * 0.3;
    
    oscillator2.start(audioContext.currentTime + 0.1);
    oscillator2.stop(audioContext.currentTime + 0.2);
}

function playNotificationSound() {
    if (notificationEnabled) {
        try {
            createNotificationSound();
        } catch (error) {
            console.error('Error playing notification:', error);
        }
    }
}

function addNotificationControls() {
    const userInfo = document.querySelector('.user-info');
    if (!userInfo) return;
    
    const notifBtn = document.createElement('button');
    notifBtn.id = 'notification-btn';
    notifBtn.className = 'icon-btn';
    notifBtn.title = notificationEnabled ? 'Notifications: On' : 'Notifications: Off';
    notifBtn.textContent = notificationEnabled ? '🔔' : '🔕';
    notifBtn.onclick = handleNotificationClick; // Use new handler
    
    const downloadBtn = userInfo.querySelector('a[href="/downloads.html"]');
    if (downloadBtn) {
        userInfo.insertBefore(notifBtn, downloadBtn);
    } else {
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            userInfo.insertBefore(notifBtn, adminBtn);
        }
    }
}

function handleNotificationClick() {
    const notifBtn = document.getElementById('notification-btn');
    
    // If bell is glowing (has unread DMs), open the latest DM
    if (notifBtn && notifBtn.classList.contains('has-unread-dm')) {
        openLatestUnreadDM();
    } else {
        // Otherwise, toggle notification sounds
        toggleNotifications();
    }
}

function openLatestUnreadDM() {
    // Find the first user with unread DMs
    let latestUserId = null;
    let latestUser = null;
    
    for (const [userId, count] of unreadDMs.entries()) {
        if (count > 0) {
            latestUserId = userId;
            break;
        }
    }
    
    if (latestUserId) {
        // Find the user object
        latestUser = users.find(u => u.id === latestUserId);
        if (latestUser) {
            // Switch to Users tab
            switchTab('users');
            // Open the DM
            openDM(latestUser);
            
            // On mobile, close sidebar after opening DM
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                if (sidebar) sidebar.classList.remove('open');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                if (mobileMenuBtn) {
                    mobileMenuBtn.textContent = '☰';
                    mobileMenuBtn.classList.remove('back');
                }
            }
        }
    }
}

function toggleNotifications() {
    notificationEnabled = !notificationEnabled;
    localStorage.setItem('notificationSound', notificationEnabled);
    
    const btn = document.getElementById('notification-btn');
    if (btn) {
        btn.textContent = notificationEnabled ? '🔔' : '🔕';
        btn.title = notificationEnabled ? 'Notifications: On' : 'Notifications: Off';
    }
    
    if (notificationEnabled) {
        playNotificationSound();
    }
    
    // Update indicator in case DMs are waiting
    updateNotificationIndicator();
}

// Update notification button to show unread DM indicator (desktop)
function updateNotificationIndicator() {
    const notifBtn = document.getElementById('notification-btn');
    if (!notifBtn) return;
    
    // Count total unread DMs
    let totalUnread = 0;
    unreadDMs.forEach(count => totalUnread += count);
    
    // Add/remove indicator class
    if (totalUnread > 0) {
        notifBtn.classList.add('has-unread-dm');
    } else {
        notifBtn.classList.remove('has-unread-dm');
    }
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nicknameInput = document.getElementById('nickname-input');
const joinBtn = document.getElementById('join-btn');
const currentUserSpan = document.getElementById('current-user');
const roomsList = document.getElementById('rooms-list');
const dmsList = document.getElementById('dms-list');
const usersList = document.getElementById('users-list');
const filesList = document.getElementById('files-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatTitle = document.getElementById('chat-title');
const locationBtn = document.getElementById('location-btn');
const imageBtn = document.getElementById('image-btn');
const imageInput = document.getElementById('image-input');
const fileInput = document.getElementById('file-input');
const uploadFileBtn = document.getElementById('upload-file-btn');
const adminBtn = document.getElementById('admin-btn');
const adminModal = document.getElementById('admin-modal');
const mapModal = document.getElementById('map-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure login screen is visible on load
    if (loginScreen && chatScreen) {
        loginScreen.classList.add('active');
        chatScreen.classList.remove('active');
    }
    setupEventListeners();
    
    // Handle Android back button
    setupBackButtonHandler();
});

function setupBackButtonHandler() {
    // Intercept Android back button
    window.addEventListener('popstate', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        
        // If sidebar is open, close it instead of going back
        if (sidebar && sidebar.classList.contains('open')) {
            e.preventDefault();
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            if (mobileMenuBtn) {
                mobileMenuBtn.textContent = '☰';
                mobileMenuBtn.classList.remove('back');
            }
            // Push state to prevent actual navigation
            window.history.pushState(null, '', window.location.href);
        }
    });
    
    // Push initial state to enable popstate handling
    window.history.pushState(null, '', window.location.href);
}

function setupEventListeners() {
    // Mobile menu toggle with back button
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                // Close sidebar (back button clicked)
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                mobileMenuBtn.textContent = '☰';
                mobileMenuBtn.classList.remove('back');
            } else {
                // Open sidebar
                sidebar.classList.add('open');
                sidebarOverlay.classList.add('active');
                mobileMenuBtn.textContent = '←';
                mobileMenuBtn.classList.add('back');
                // Push history state so Android back button can close it
                window.history.pushState({ sidebarOpen: true }, '', window.location.href);
            }
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            mobileMenuBtn.textContent = '☰';
            mobileMenuBtn.classList.remove('back');
        });
    }

    // Login
    joinBtn.addEventListener('click', handleLogin);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            switchTab(view);
        });
    });

    // Message sending
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Image upload
    imageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);

    // File upload
    uploadFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);

    // Location sharing
    locationBtn.addEventListener('click', openLocationPicker);

    // Admin panel
    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
    });

    document.getElementById('admin-login-btn').addEventListener('click', handleAdminLogin);
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('kick-user-btn').addEventListener('click', kickUser);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
    document.getElementById('send-location-btn').addEventListener('click', sendLocation);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

function switchTab(view) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    document.getElementById(`${view}-view`).classList.add('active');

    if (view === 'files') {
        loadFiles();
    }
}

async function handleLogin() {
    const nickname = nicknameInput.value.trim();
    
    if (nickname.length < 4 || nickname.length > 16) {
        alert('Nickname must be between 4 and 16 characters');
        return;
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(nickname)) {
        alert('Nickname can only contain letters, numbers, spaces, hyphens, and underscores');
        return;
    }

    // Connect to socket server
    // Use current origin for Android app compatibility
    socket = io(window.location.origin);

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('register', { nickname });
    });

    socket.on('registered', (data) => {
        currentUser = data;
        currentUserSpan.textContent = data.nickname;
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        loadRooms();
        setupSocketListeners();
        
        // Add notification controls
        addNotificationControls();
        
        // Auto-join General room
        setTimeout(() => {
            const generalRoom = rooms.find(r => r.name.toLowerCase() === 'general');
            if (generalRoom) {
                joinRoom(generalRoom);
            }
        }, 500); // Small delay to ensure rooms are loaded
        
        // Initialize voice channel
        window.voiceChannel = new VoiceChannel(socket, currentUser);
    });

    socket.on('error', (data) => {
        alert(data.message);
    });

    socket.on('kicked', (data) => {
        alert(data.message);
        location.reload();
    });
}

function setupSocketListeners() {
    socket.on('user_list', (userList) => {
        users = userList.filter(u => u.id !== currentUser.userId);
        renderUsers();
    });

    socket.on('room_created', (room) => {
        rooms.push(room);
        renderRooms();
    });

    socket.on('room_deleted', (data) => {
        rooms = rooms.filter(r => r.id !== data.roomId);
        renderRooms();
        if (currentRoom && currentRoom.id === data.roomId) {
            currentRoom = null;
            clearChat();
        }
    });

    socket.on('new_message', (message) => {
        if (currentRoom && message.room_id === currentRoom.id) {
            appendMessage(message);
        }
    });

    socket.on('new_dm', (message) => {
        // Always play notification for incoming DMs (regardless of current view)
        const isIncoming = message.sender_id !== currentUser.userId;
        if (isIncoming) {
            playNotificationSound(); // Play sound HERE
            
            // Track unread DM
            const senderId = message.sender_id;
            if (!currentDM || currentDM.id !== senderId) {
                // Not currently viewing this DM, mark as unread
                const currentCount = unreadDMs.get(senderId) || 0;
                unreadDMs.set(senderId, currentCount + 1);
            }
        }
        
        // Only show message if viewing this DM conversation
        if (currentDM) {
            const otherUserId = message.sender_id === currentUser.userId ? message.recipient_id : message.sender_id;
            if (otherUserId === currentDM.id) {
                appendMessage(message, true, false); // playSound=false (already played above)
            }
        }
        renderUsers(); // Re-render to show unread badges
        updateDMsList();
        updateMenuButtonIndicator(); // Update menu button (mobile)
        updateNotificationIndicator(); // Update bell icon (desktop)
    });

    socket.on('message_deleted', (data) => {
        const msgElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (msgElement) {
            msgElement.remove();
        }
    });
}

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms');
        rooms = await response.json();
        renderRooms();
    } catch (error) {
        console.error('Failed to load rooms:', error);
    }
}

function renderRooms() {
    roomsList.innerHTML = '';
    rooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (currentRoom && currentRoom.id === room.id) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <h4>${room.name}</h4>
            <p>Created ${new Date(room.created_at).toLocaleDateString()}</p>
        `;
        item.addEventListener('click', () => joinRoom(room));
        roomsList.appendChild(item);
    });
}

function renderUsers() {
    usersList.innerHTML = '';
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (currentDM && currentDM.id === user.id) {
            item.classList.add('active');
        }
        
        const unreadCount = unreadDMs.get(user.id) || 0;
        const unreadBadge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';
        
        item.innerHTML = `
            <h4>${user.nickname} ${unreadBadge}</h4>
            <p>Online</p>
        `;
        item.addEventListener('click', () => openDM(user));
        usersList.appendChild(item);
    });
}

async function joinRoom(room) {
    currentRoom = room;
    currentDM = null;
    
    socket.emit('join_room', { roomId: room.id });
    
    chatTitle.textContent = `# ${room.name}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    
    // Update voice channel room
    if (window.voiceChannel) {
        window.voiceChannel.setCurrentRoom(room.id, room.name);
    }
    
    renderRooms();
    await loadRoomMessages(room.id);
}

async function loadRoomMessages(roomId) {
    try {
        const response = await fetch(`/api/rooms/${roomId}/messages`);
        const messages = await response.json();
        
        messagesContainer.innerHTML = '';
        messages.forEach(msg => appendMessage(msg, false, false)); // Don't play sound for history
        scrollToBottom();
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function openDM(user) {
    currentDM = user;
    currentRoom = null;
    
    chatTitle.textContent = `@ ${user.nickname}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    
    // Clear unread count for this user
    unreadDMs.delete(user.id);
    
    renderUsers();
    updateMenuButtonIndicator(); // Update menu button (mobile)
    updateNotificationIndicator(); // Update bell icon (desktop)
    await loadDMMessages(user.id);
}

async function loadDMMessages(userId) {
    try {
        const response = await fetch(`/api/dms/${currentUser.userId}/${userId}`);
        const messages = await response.json();
        
        messagesContainer.innerHTML = '';
        messages.forEach(msg => appendMessage(msg, true, false)); // Don't play sound for history
        scrollToBottom();
    } catch (error) {
        console.error('Failed to load DMs:', error);
    }
}

function appendMessage(message, isDM = false, playSound = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.dataset.messageId = message.id;
    
    const isOwn = message.sender_id === currentUser.userId;
    if (isOwn) {
        msgDiv.classList.add('own');
    }
    
    // Play notification sound for incoming messages (only for real-time, not history)
    if (!isOwn && playSound) {
        playNotificationSound();
    }

    const time = new Date(message.created_at).toLocaleTimeString();
    
    // Add delete button for admins
    const deleteBtn = adminCredentials ? 
        `<button onclick="deleteMessage(${message.id})" class="msg-delete-btn" title="Delete message">🗑️</button>` : '';
    
    let content = `
        <div class="message-header">
            <span class="message-sender">${message.sender_nickname}</span>
            <span class="message-time">${time}</span>
            ${deleteBtn}
        </div>
    `;

    if (message.message) {
        content += `<div class="message-content">${escapeHtml(message.message)}</div>`;
    }

    if (message.image_url) {
        content += `<img src="${message.image_url}" class="message-image" alt="Shared image">`;
    }

    if (message.location_lat && message.location_lng) {
        content += `
            <div class="message-location">
                📍 Location: ${message.location_lat.toFixed(6)}, ${message.location_lng.toFixed(6)}
                <br><a href="#" onclick="viewLocationOnMap(${message.location_lat}, ${message.location_lng}); return false;">View on local map</a>
            </div>
        `;
    }

    msgDiv.innerHTML = content;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
}

function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    if (!currentRoom && !currentDM) return;

    if (currentRoom) {
        socket.emit('send_message', {
            roomId: currentRoom.id,
            message: message,
            messageType: 'text'
        });
    } else if (currentDM) {
        socket.emit('send_dm', {
            recipientId: currentDM.id,
            message: message,
            messageType: 'text'
        });
    }

    messageInput.value = '';
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentRoom && !currentDM) {
        alert('Select a room or user first');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', currentUser.userId);

    try {
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        console.log('Image uploaded, URL:', data.url);

        if (currentRoom) {
            console.log('Sending image to room', currentRoom.id);
            socket.emit('send_message', {
                roomId: currentRoom.id,
                message: '',
                messageType: 'image',
                imageUrl: data.url
            });
        } else if (currentDM) {
            console.log('Sending image to DM', currentDM.id);
            socket.emit('send_dm', {
                recipientId: currentDM.id,
                message: '',
                messageType: 'image',
                imageUrl: data.url
            });
        }

        imageInput.value = '';
    } catch (error) {
        alert('Failed to upload image');
        console.error(error);
    }
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', currentUser.userId);

    try {
        const response = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        alert('File uploaded successfully');
        loadFiles();
        fileInput.value = '';
    } catch (error) {
        alert('Failed to upload file');
        console.error(error);
    }
}

async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        files = await response.json();
        renderFiles();
    } catch (error) {
        console.error('Failed to load files:', error);
    }
}

function renderFiles() {
    filesList.innerHTML = '';
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        
        const isOwner = file.uploaded_by === currentUser.userId;
        const deleteBtn = isOwner || adminCredentials ? 
            `<button onclick="deleteFile(${file.id})" class="btn-delete" style="margin-left: 10px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️ Delete</button>` : '';
        
        item.innerHTML = `
            <h4>${file.original_name}</h4>
            <p>${formatFileSize(file.file_size)} - ${new Date(file.upload_date).toLocaleString()}</p>
            <a href="/uploads/${file.filename}" download="${file.original_name}">Download</a>
            ${deleteBtn}
        `;
        filesList.appendChild(item);
    });
}

function openLocationPicker() {
    if (!currentRoom && !currentDM) {
        alert('Select a room or user first');
        return;
    }

    // Try to get location immediately
    if (navigator.geolocation) {
        const confirmed = confirm('Share your current location?');
        if (confirmed) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Success - send immediately
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    if (currentRoom) {
                        socket.emit('send_message', {
                            roomId: currentRoom.id,
                            message: 'Shared location',
                            messageType: 'location',
                            location: location
                        });
                    } else if (currentDM) {
                        socket.emit('send_dm', {
                            recipientId: currentDM.id,
                            message: 'Shared location',
                            messageType: 'location',
                            location: location
                        });
                    }
                },
                (error) => {
                    // Failed - open map picker
                    console.log('Geolocation error, falling back to map:', error);
                    openMapPicker();
                }
            );
            return;
        }
    }
    
    // No geolocation or user declined - open map picker
    openMapPicker();
}

function openMapPicker() {
    mapModal.classList.add('active');
    document.getElementById('send-location-btn').style.display = 'block';

    if (!map) {
        // Initialize map
        map = L.map('map').setView([41.8781, -87.6298], 13);

        // Try to use local tiles first, fallback to simple coordinate display
        L.tileLayer('/tiles/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 18,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }).addTo(map);

        map.on('click', (e) => {
            selectedLocation = e.latlng;
            if (window.locationMarker) {
                map.removeLayer(window.locationMarker);
            }
            window.locationMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
        });
    }

    // Try to center map on user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 15);
            selectedLocation = { lat, lng };
            if (window.locationMarker) {
                map.removeLayer(window.locationMarker);
            }
            window.locationMarker = L.marker([lat, lng]).addTo(map);
        });
    }
}

function sendLocation() {
    if (!selectedLocation) {
        alert('Please select a location on the map');
        return;
    }

    if (currentRoom) {
        socket.emit('send_message', {
            roomId: currentRoom.id,
            message: 'Shared location',
            messageType: 'location',
            location: selectedLocation
        });
    } else if (currentDM) {
        socket.emit('send_dm', {
            recipientId: currentDM.id,
            message: 'Shared location',
            messageType: 'location',
            location: selectedLocation
        });
    }

    mapModal.classList.remove('active');
    selectedLocation = null;
}

async function handleAdminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    adminCredentials = { username, password };

    // Test credentials by trying to fetch rooms
    try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
            document.getElementById('admin-controls').style.display = 'block';
            updateKickUserSelect();
            alert('Admin access granted');
        }
    } catch (error) {
        alert('Login failed');
        adminCredentials = null;
    }
}

async function createRoom() {
    if (!adminCredentials) {
        alert('Please login first');
        return;
    }

    const roomName = document.getElementById('new-room-name').value.trim();
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }

    try {
        const response = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...adminCredentials,
                roomName
            })
        });

        if (response.ok) {
            alert('Room created successfully');
            document.getElementById('new-room-name').value = '';
            loadRooms();
        } else {
            alert('Failed to create room');
        }
    } catch (error) {
        alert('Failed to create room');
        console.error(error);
    }
}

async function kickUser() {
    if (!adminCredentials) {
        alert('Please login first');
        return;
    }

    const userId = document.getElementById('kick-user-select').value;
    if (!userId) {
        alert('Please select a user');
        return;
    }

    if (!confirm('Are you sure you want to kick this user?')) {
        return;
    }

    socket.emit('kick_user', {
        ...adminCredentials,
        userId
    });

    alert('User kicked');
}

async function clearAllData() {
    if (!adminCredentials) {
        alert('Please login first');
        return;
    }

    if (!confirm('⚠️ WARNING: This will permanently delete ALL messages, files, and uploads. This cannot be undone!\n\nAre you absolutely sure?')) {
        return;
    }
    
    // Double confirmation
    if (!confirm('Last chance! Type YES in the next prompt to confirm.')) {
        return;
    }
    
    const confirmation = prompt('Type YES in all caps to confirm deletion:');
    if (confirmation !== 'YES') {
        alert('Cancelled - data not deleted');
        return;
    }

    try {
        const response = await fetch('/api/admin/clear-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminCredentials)
        });

        if (response.ok) {
            alert('All data cleared successfully. Refreshing page...');
            location.reload();
        } else {
            alert('Failed to clear data');
        }
    } catch (error) {
        alert('Failed to clear data');
        console.error(error);
    }
}

function updateKickUserSelect() {
    const select = document.getElementById('kick-user-select');
    select.innerHTML = '<option value="">Select user...</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.nickname;
        select.appendChild(option);
    });
}

function updateDMsList() {
    // This would need to track recent DM conversations
    // For simplicity, we're just using the users list
}

function clearChat() {
    messagesContainer.innerHTML = '';
    messageInput.disabled = true;
    sendBtn.disabled = true;
    chatTitle.textContent = 'Select a room or user';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function deleteMessage(messageId) {
    if (!adminCredentials) {
        alert('Admin access required');
        return;
    }
    
    if (!confirm('Delete this message?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminCredentials)
        });
        
        if (response.ok) {
            // Message will be removed via socket event
        } else {
            alert('Failed to delete message');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message');
    }
}

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    
    try {
        const body = {
            userId: currentUser.userId
        };
        
        if (adminCredentials) {
            body.username = adminCredentials.username;
            body.password = adminCredentials.password;
        }
        
        const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            alert('File deleted successfully');
            loadFiles();
        } else {
            const data = await response.json();
            alert('Failed to delete file: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Failed to delete file');
        console.error(error);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function viewLocationOnMap(lat, lng) {
    mapModal.classList.add('active');
    
    if (!map) {
        map = L.map('map').setView([lat, lng], 13);
        L.tileLayer('/tiles/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 18,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }).addTo(map);
    } else {
        map.setView([lat, lng], 13);
    }
    
    if (window.viewLocationMarker) {
        map.removeLayer(window.viewLocationMarker);
    }
    
    window.viewLocationMarker = L.marker([lat, lng]).addTo(map);
    document.getElementById('send-location-btn').style.display = 'none';
}

// Update menu button to show unread DM indicator
function updateMenuButtonIndicator() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (!mobileMenuBtn) return;
    
    // Count total unread DMs
    let totalUnread = 0;
    unreadDMs.forEach(count => totalUnread += count);
    
    // Add/remove indicator class
    if (totalUnread > 0) {
        mobileMenuBtn.classList.add('has-unread');
    } else {
        mobileMenuBtn.classList.remove('has-unread');
    }
}