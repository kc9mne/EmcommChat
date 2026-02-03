// WebRTC Voice Channel Manager
class VoiceChannel {
    constructor(socket, currentUser) {
        this.socket = socket;
        this.currentUser = currentUser;
        this.currentRoomId = null;
        this.isInVoice = false;
        this.isTalking = false;
        this.localStream = null;
        this.peers = new Map(); // userId -> RTCPeerConnection
        this.remoteStreams = new Map(); // userId -> MediaStream
        this.audioContext = null;
        this.audioElements = new Map(); // userId -> HTMLAudioElement
        this.activeSpeakers = new Set(); // Track who's currently talking
        this.participants = []; // Store participants data
        
        this.setupSocketListeners();
        this.setupPTTControls();
    }

    setupSocketListeners() {
        // Someone joined voice
        this.socket.on('voice_user_joined', (data) => {
            console.log('User joined voice:', data.userId, data.nickname);
            this.addVoiceParticipant(data.userId, data.nickname);
            
            // If we're already in voice, create peer connection for new user
            if (this.isInVoice && data.userId !== this.currentUser.userId) {
                this.createPeerConnection(data.userId, true); // We initiate
            }
        });

        // Someone left voice
        this.socket.on('voice_user_left', (data) => {
            console.log('User left voice:', data.userId);
            this.removeVoiceParticipant(data.userId);
            this.closePeerConnection(data.userId);
        });

        // WebRTC signaling
        this.socket.on('voice_offer', async (data) => {
            console.log('Received offer from:', data.from);
            await this.handleOffer(data.from, data.offer);
        });

        this.socket.on('voice_answer', async (data) => {
            console.log('Received answer from:', data.from);
            await this.handleAnswer(data.from, data.answer);
        });

        this.socket.on('voice_ice_candidate', async (data) => {
            await this.handleIceCandidate(data.from, data.candidate);
        });

        // Someone started/stopped talking
        this.socket.on('voice_talking_update', (data) => {
            // Track active speakers
            if (data.talking) {
                this.activeSpeakers.add(data.userId);
            } else {
                this.activeSpeakers.delete(data.userId);
            }
            
            this.updateTalkingStatus(data.userId, data.talking);
            this.updatePTTButton(); // Update button state based on channel status
        });

        // Voice participants list
        this.socket.on('voice_participants', (participants) => {
            console.log('📋 voice_participants event received');
            console.log('Participants array:', participants);
            console.log('Participants count:', participants.length);
            
            // Store participants for later reference
            this.participants = participants;
            
            this.renderParticipants(participants);
        });
    }

    setupPTTControls() {
        const pttBtn = document.getElementById('ptt-btn'); // Sidebar (desktop)
        const pttBtnMobile = document.getElementById('ptt-btn-mobile'); // Mobile header
        const voiceBtn = document.getElementById('voice-btn');
        const voiceBtnSidebar = document.getElementById('voice-btn-sidebar');
        const leaveVoiceBtn = document.getElementById('leave-voice-btn');
        const leaveVoiceBtnMobile = document.getElementById('leave-voice-btn-mobile');

        // PTT button - SIDEBAR (desktop)
        if (pttBtn) {
            pttBtn.addEventListener('mousedown', () => this.startTalking());
            pttBtn.addEventListener('mouseup', () => this.stopTalking());
            pttBtn.addEventListener('mouseleave', () => this.stopTalking());
            pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.startTalking(); });
            pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.stopTalking(); });
        }

        // PTT button - MOBILE (header bar)
        if (pttBtnMobile) {
            pttBtnMobile.addEventListener('mousedown', () => this.startTalking());
            pttBtnMobile.addEventListener('mouseup', () => this.stopTalking());
            pttBtnMobile.addEventListener('mouseleave', () => this.stopTalking());
            pttBtnMobile.addEventListener('touchstart', (e) => { e.preventDefault(); this.startTalking(); });
            pttBtnMobile.addEventListener('touchend', (e) => { e.preventDefault(); this.stopTalking(); });
        }

        // Spacebar for PTT
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isInVoice && !e.repeat) {
                // Don't trigger if typing in a text field
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                this.startTalking();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isInVoice) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                this.stopTalking();
            }
        });

        // Join voice buttons (header + sidebar)
        if (voiceBtn) voiceBtn.addEventListener('click', () => this.joinVoice());
        if (voiceBtnSidebar) voiceBtnSidebar.addEventListener('click', () => this.joinVoice());
        
        // Leave voice buttons (mobile + sidebar)
        if (leaveVoiceBtn) leaveVoiceBtn.addEventListener('click', () => this.leaveVoice());
        if (leaveVoiceBtnMobile) leaveVoiceBtnMobile.addEventListener('click', () => this.leaveVoice());
    }

    async joinVoice() {
        if (!this.currentRoomId) {
            alert('Please select a room first');
            return;
        }

        try {
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Mute by default (PTT)
            this.localStream.getAudioTracks()[0].enabled = false;

            // Tell server we're joining voice
            this.socket.emit('join_voice', {
                roomId: this.currentRoomId
            });

            this.isInVoice = true;
            
            // Update header voice button
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.textContent = '🎤';
                voiceBtn.style.background = '#4CAF50';
            }
            
            // Show sidebar voice status, hide join button
            const voiceJoinSection = document.getElementById('voice-join-section');
            const voiceStatusSidebar = document.getElementById('voice-status-sidebar');
            if (voiceJoinSection) voiceJoinSection.style.display = 'none';
            if (voiceStatusSidebar) voiceStatusSidebar.style.display = 'block';
            
            // Legacy: Show old voice status if it exists
            const voiceStatus = document.getElementById('voice-status');
            if (voiceStatus) voiceStatus.style.display = 'block';

            console.log('Joined voice channel');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    leaveVoice() {
        if (!this.isInVoice) return;

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close all peer connections
        this.peers.forEach((pc, userId) => this.closePeerConnection(userId));
        this.peers.clear();

        // Tell server we're leaving
        this.socket.emit('leave_voice', {
            roomId: this.currentRoomId
        });

        this.isInVoice = false;
        this.isTalking = false;
        
        // Update header voice button
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.textContent = '🎤';
            voiceBtn.style.background = '';
        }
        
        // Hide sidebar voice status, show join button
        const voiceJoinSection = document.getElementById('voice-join-section');
        const voiceStatusSidebar = document.getElementById('voice-status-sidebar');
        if (voiceJoinSection) voiceJoinSection.style.display = 'block';
        if (voiceStatusSidebar) voiceStatusSidebar.style.display = 'none';
        
        // Legacy: Hide old voice status if it exists
        const voiceStatus = document.getElementById('voice-status');
        if (voiceStatus) voiceStatus.style.display = 'none';
        
        console.log('Left voice channel');
    }

    startTalking() {
        if (!this.isInVoice || this.isTalking) return;

        // Check if someone else is talking (collision detection)
        const channelBusy = Array.from(this.activeSpeakers).some(
            userId => userId !== this.currentUser.userId
        );
        
        if (channelBusy) {
            console.log('Channel busy - cannot transmit');
            this.playBusyTone();
            return;
        }

        this.isTalking = true;
        this.activeSpeakers.add(this.currentUser.userId);
        
        // Enable microphone
        if (this.localStream) {
            this.localStream.getAudioTracks()[0].enabled = true;
        }

        // Visual feedback
        document.getElementById('ptt-btn').classList.add('talking');

        // Tell server we're talking
        this.socket.emit('voice_talking', {
            roomId: this.currentRoomId,
            talking: true
        });
        
        this.updatePTTButton();

        console.log('Started talking');
    }

    stopTalking() {
        if (!this.isInVoice || !this.isTalking) return;

        this.isTalking = false;
        this.activeSpeakers.delete(this.currentUser.userId);

        // Disable microphone
        if (this.localStream) {
            this.localStream.getAudioTracks()[0].enabled = false;
        }

        // Visual feedback
        document.getElementById('ptt-btn').classList.remove('talking');

        // Tell server we stopped talking
        this.socket.emit('voice_talking', {
            roomId: this.currentRoomId,
            talking: false
        });
        
        this.updatePTTButton();

        console.log('Stopped talking');
    }

    async createPeerConnection(userId, createOffer) {
        // Safety check: Don't create peer connection to yourself!
        if (userId === this.currentUser.userId) {
            console.warn('⚠️ Attempted to create peer connection to self - ignoring');
            return null;
        }
        
        console.log('Creating peer connection to:', userId, 'Initiator:', createOffer);
        
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        this.peers.set(userId, pc);

        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Handle incoming stream
        pc.ontrack = (event) => {
            console.log('Received remote track from:', userId);
            const remoteStream = event.streams[0];
            this.remoteStreams.set(userId, remoteStream);
            this.playRemoteAudio(userId, remoteStream);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('voice_ice_candidate', {
                    to: userId,
                    candidate: event.candidate
                });
            }
        };

        // Create offer if we're the initiator
        if (createOffer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.socket.emit('voice_offer', {
                to: userId,
                offer: offer
            });
        }

        return pc;
    }

    async handleOffer(fromUserId, offer) {
        const pc = await this.createPeerConnection(fromUserId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.socket.emit('voice_answer', {
            to: fromUserId,
            answer: answer
        });
    }

    async handleAnswer(fromUserId, answer) {
        const pc = this.peers.get(fromUserId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleIceCandidate(fromUserId, candidate) {
        const pc = this.peers.get(fromUserId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    closePeerConnection(userId) {
        const pc = this.peers.get(userId);
        if (pc) {
            pc.close();
            this.peers.delete(userId);
        }

        // Stop playing audio
        const audioElement = this.audioElements.get(userId);
        if (audioElement) {
            audioElement.srcObject = null;
            audioElement.remove();
            this.audioElements.delete(userId);
        }

        this.remoteStreams.delete(userId);
    }

    playRemoteAudio(userId, stream) {
        // Debug logging
        console.log('playRemoteAudio called:');
        console.log('  Remote userId:', userId, typeof userId);
        console.log('  Current userId:', this.currentUser.userId, typeof this.currentUser.userId);
        console.log('  Match?', userId === this.currentUser.userId);
        
        // FIX: Don't play your own audio back to yourself!
        if (userId === this.currentUser.userId) {
            console.log('✅ Skipping own audio (preventing loopback)');
            return;
        }
        
        console.log('▶️ Playing remote audio from:', userId);
        
        let audio = this.audioElements.get(userId);
        
        if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            document.body.appendChild(audio);
            this.audioElements.set(userId, audio);
        }

        audio.srcObject = stream;
    }

    addVoiceParticipant(userId, nickname) {
        // Will be rendered via renderParticipants
    }

    removeVoiceParticipant(userId) {
        // Will be rendered via renderParticipants
    }

    updateTalkingStatus(userId, talking) {
        const participant = document.querySelector(`[data-voice-user="${userId}"]`);
        if (participant) {
            if (talking) {
                participant.classList.add('talking');
            } else {
                participant.classList.remove('talking');
            }
        }
    }

    renderParticipants(participants) {
        console.log('🎨 renderParticipants called');
        console.log('Participants to render:', participants);
        
        // Desktop sidebar participants
        const containerSidebar = document.getElementById('voice-participants');
        // Mobile header participants  
        const containerMobile = document.getElementById('voice-participants-mobile');
        
        console.log('Container sidebar:', containerSidebar ? 'EXISTS' : 'NULL');
        console.log('Container mobile:', containerMobile ? 'EXISTS' : 'NULL');
        
        const count = participants.length;
        const countText = `${count} user${count !== 1 ? 's' : ''}`;
        
        console.log('Count text:', countText);
        
        // Update user counts
        const voiceUserCount = document.getElementById('voice-user-count');
        const voiceUserCountSidebar = document.getElementById('voice-user-count-sidebar');
        
        console.log('voiceUserCount element:', voiceUserCount ? 'EXISTS' : 'NULL');
        console.log('voiceUserCountSidebar element:', voiceUserCountSidebar ? 'EXISTS' : 'NULL');
        
        if (voiceUserCount) voiceUserCount.textContent = countText;
        if (voiceUserCountSidebar) voiceUserCountSidebar.textContent = countText;

        // Render to sidebar (desktop)
        if (containerSidebar) {
            containerSidebar.innerHTML = '';
            console.log('Rendering to sidebar...');
            participants.forEach(p => {
                console.log('Adding participant:', p.nickname);
                const div = document.createElement('div');
                div.className = 'voice-participant';
                div.dataset.voiceUser = p.userId;
                
                const isTalking = this.activeSpeakers.has(p.userId);
                
                if (isTalking) {
                    div.classList.add('talking');
                    div.innerHTML = `<span class="talking-icon">🔊</span> ${p.nickname}`;
                } else {
                    div.textContent = p.nickname;
                }
                
                containerSidebar.appendChild(div);
            });
            console.log('✅ Sidebar rendering complete');
        }

        // Render to mobile header
        if (containerMobile) {
            containerMobile.innerHTML = '';
            console.log('Rendering to mobile...');
            participants.forEach(p => {
                const div = document.createElement('div');
                div.className = 'voice-participant';
                div.dataset.voiceUser = p.userId;
                
                const isTalking = this.activeSpeakers.has(p.userId);
                
                if (isTalking) {
                    div.classList.add('talking');
                    div.innerHTML = `<span class="talking-icon">🔊</span> ${p.nickname}`;
                } else {
                    div.textContent = p.nickname;
                }
                
                containerMobile.appendChild(div);
            });
            console.log('✅ Mobile rendering complete');
        }
    }

    updatePTTButton() {
        const pttBtn = document.getElementById('ptt-btn'); // Sidebar
        const pttBtnMobile = document.getElementById('ptt-btn-mobile'); // Mobile
        
        if (!this.isInVoice) return;
        
        // Check if someone else is talking
        const othersTalking = Array.from(this.activeSpeakers).filter(
            userId => userId !== this.currentUser.userId
        );
        
        const updateButton = (btn, indicatorClass) => {
            if (!btn) return;
            
            const pttIndicator = btn.querySelector(indicatorClass);
            if (pttIndicator) {
                if (this.isTalking) {
                    pttIndicator.textContent = '🔴 TRANSMITTING';
                } else if (othersTalking.length > 0) {
                    // Show who's talking
                    const talkerNames = othersTalking.map(userId => {
                        const user = this.getUserByIdFromParticipants(userId);
                        return user ? user.nickname : 'Unknown';
                    }).join(', ');
                    pttIndicator.textContent = `🔊 ${talkerNames}`;
                } else {
                    pttIndicator.textContent = '🎤 Push to Talk';
                }
            }
            
            if (othersTalking.length > 0 && !this.isTalking) {
                // Channel busy - disable PTT
                btn.disabled = true;
                btn.classList.add('busy');
                btn.title = `Channel busy - ${othersTalking.length} user(s) transmitting`;
            } else {
                // Channel clear - enable PTT
                btn.disabled = false;
                btn.classList.remove('busy');
                btn.title = 'Push to Talk (Hold or Press Spacebar)';
            }
        };
        
        // Update both buttons
        updateButton(pttBtn, '.ptt-indicator');
        updateButton(pttBtnMobile, '.ptt-indicator-mobile');
    }
    
    getUserByIdFromParticipants(userId) {
        console.log('🔍 Looking up user:', userId);
        
        // First, try stored participants array
        if (this.participants && Array.isArray(this.participants)) {
            const participant = this.participants.find(p => p.userId === userId);
            if (participant) {
                console.log('✅ Found in participants array:', participant.nickname);
                return participant;
            }
        }
        
        // Try to get from voice participants DOM
        const participantDiv = document.querySelector(`[data-voice-user="${userId}"]`);
        if (participantDiv) {
            const nickname = participantDiv.textContent.trim().replace('🔊 ', '');
            console.log('✅ Found in DOM:', nickname);
            return { nickname };
        }
        
        // Fallback to global users array if available
        if (window.users) {
            const user = window.users.find(u => u.id === userId);
            if (user) {
                console.log('✅ Found in window.users:', user.nickname);
                return user;
            }
        }
        
        console.log('❌ User not found:', userId);
        return null;
    }

    playBusyTone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Busy tone: 480Hz (standard busy signal)
            oscillator.frequency.value = 480;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.error('Error playing busy tone:', error);
        }
    }

    setCurrentRoom(roomId, roomName) {
        // Leave voice if changing rooms
        if (this.isInVoice && this.currentRoomId !== roomId) {
            this.leaveVoice();
        }
        
        this.currentRoomId = roomId;
        
        // Update both voice room name displays
        const voiceRoomName = document.getElementById('voice-room-name');
        const voiceRoomNameSidebar = document.getElementById('voice-room-name-sidebar');
        
        if (voiceRoomName) voiceRoomName.textContent = `Voice: ${roomName}`;
        if (voiceRoomNameSidebar) voiceRoomNameSidebar.textContent = roomName;
    }
}

// Export for use in main app
window.VoiceChannel = VoiceChannel;