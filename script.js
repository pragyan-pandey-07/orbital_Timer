// --- GLOBAL STATE (declared first so all functions can safely reference them) ---
const CLIENT_ID = Math.random().toString(36).substr(2, 9);
let activeTab = 'orbital';
let earthDistanceStr = 'Waiting for partner...';
let myLat = null, myLon = null, partnerLat = null, partnerLon = null;
let lastPartnerHeartbeat = 0;
let sendingHeartbeat = false;

// --- HOME SCREEN LOGIC ---
const homeScreen = document.getElementById('home-screen');
const mainApp = document.getElementById('main-app');
const homeCanvas = document.getElementById('homeCanvas');
const homeCtx = homeCanvas.getContext('2d');
const homeTimerEl = document.getElementById('home-timer');
const homeDateEl = document.getElementById('home-date');
const homeTogetherEl = document.getElementById('home-together');
const homeElapsedEl = document.getElementById('home-elapsed');
const homeDistanceEl = document.getElementById('home-distance');
const homeMyInitEl = document.getElementById('home-my-initial');
const homeHerInitEl = document.getElementById('home-her-initial');
const enterBtn = document.getElementById('enter-btn');

const LAST_MET_DATE = new Date('2026-05-22T00:00:00').getTime();

// Seeded RNG for the May 22 Star Map
function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const starMapRng = mulberry32(20260522); // Seed: May 22 2026

// Raigarh, Chhattisgarh - Latitude 21.9° N, May 22 night sky.
// Coordinates normalized 0.0 to 1.0 mapping the visible dome
const raigarhConstellations = [
    // Ursa Major (Big Dipper) - Northern Sky
    [{ x: 0.15, y: 0.20 }, { x: 0.20, y: 0.22 }, { x: 0.24, y: 0.25 }, { x: 0.28, y: 0.32 }, { x: 0.26, y: 0.38 }, { x: 0.33, y: 0.40 }, { x: 0.35, y: 0.34 }, { x: 0.28, y: 0.32 }],
    // Boötes (Arcturus) - Near Zenith
    [{ x: 0.45, y: 0.30 }, { x: 0.40, y: 0.40 }, { x: 0.35, y: 0.50 }, { x: 0.45, y: 0.55 }, { x: 0.52, y: 0.47 }, { x: 0.50, y: 0.40 }, { x: 0.45, y: 0.30 }],
    // Leo - Western Sky
    [{ x: 0.75, y: 0.50 }, { x: 0.80, y: 0.43 }, { x: 0.87, y: 0.45 }, { x: 0.93, y: 0.53 }, { x: 0.85, y: 0.57 }, { x: 0.75, y: 0.50 }],
    // Scorpius - Rising South-East
    [{ x: 0.20, y: 0.80 }, { x: 0.25, y: 0.75 }, { x: 0.22, y: 0.70 }, { x: 0.18, y: 0.67 }, { x: 0.12, y: 0.70 }],
    // Virgo (Spica) - Southern Sky
    [{ x: 0.60, y: 0.65 }, { x: 0.65, y: 0.60 }, { x: 0.70, y: 0.70 }, { x: 0.75, y: 0.80 }]
];

const MAP_SIZE = 2500;
const homeStars = [];

// Add constellation stars
raigarhConstellations.forEach(constellation => {
    constellation.forEach((pt, i) => {
        const star = {
            x: pt.x * MAP_SIZE,
            y: pt.y * MAP_SIZE,
            size: i === 0 ? 2.5 : 1.5,
            twinkle: starMapRng() * Math.PI * 2,
            speed: 0.01 + starMapRng() * 0.01,
            isConstellation: true
        };
        homeStars.push(star);
        pt.starRef = star; // Save reference for drawing exact lines
    });
});

// Add background stars (seeded so it doesn't change on refresh)
for (let i = 0; i < 250; i++) {
    homeStars.push({
        x: starMapRng() * MAP_SIZE,
        y: starMapRng() * MAP_SIZE,
        size: starMapRng() * 1.5 + 0.2,
        twinkle: starMapRng() * Math.PI * 2,
        speed: starMapRng() * 0.01 + 0.005,
        isConstellation: false
    });
}

function resizeHome() {
    homeCanvas.width = window.innerWidth;
    homeCanvas.height = window.innerHeight;
}
resizeHome();

function drawHomeStars() {
    homeCtx.fillStyle = '#010306';
    homeCtx.fillRect(0, 0, homeCanvas.width, homeCanvas.height);

    // Slowly pan the star map
    const timeOffset = Date.now() * 0.005;

    // Draw constellation lines first
    homeCtx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
    homeCtx.lineWidth = 1;
    homeCtx.beginPath();

    raigarhConstellations.forEach(constellation => {
        for (let i = 0; i < constellation.length - 1; i++) {
            const s1 = constellation[i].starRef;
            const s2 = constellation[i + 1].starRef;

            let drawX1 = (s1.x - timeOffset) % MAP_SIZE;
            if (drawX1 < 0) drawX1 += MAP_SIZE;
            let drawY1 = s1.y % MAP_SIZE;

            let drawX2 = (s2.x - timeOffset) % MAP_SIZE;
            if (drawX2 < 0) drawX2 += MAP_SIZE;
            let drawY2 = s2.y % MAP_SIZE;

            // Prevent drawing lines that wrap across the entire screen
            if (Math.abs(drawX1 - drawX2) < 400 && Math.abs(drawY1 - drawY2) < 400) {
                homeCtx.moveTo(drawX1, drawY1);
                homeCtx.lineTo(drawX2, drawY2);
            }
        }
    });
    homeCtx.stroke();

    // Draw stars
    homeStars.forEach(s => {
        s.twinkle += s.speed;
        const alpha = 0.2 + Math.sin(s.twinkle) * (s.isConstellation ? 0.8 : 0.4);
        homeCtx.globalAlpha = Math.max(0, alpha);
        homeCtx.fillStyle = s.isConstellation ? '#aaffff' : '#ffffff';
        homeCtx.beginPath();

        let drawX = (s.x - timeOffset) % MAP_SIZE;
        if (drawX < 0) drawX += MAP_SIZE;
        let drawY = s.y % MAP_SIZE;

        // Render only if within visible viewport to save performance
        if (drawX < homeCanvas.width + 10 && drawY < homeCanvas.height + 10) {
            homeCtx.arc(drawX, drawY, s.isConstellation ? s.size * 1.5 : s.size, 0, Math.PI * 2);
            homeCtx.fill();
        }
    });
    homeCtx.globalAlpha = 1;
}

// --- HOME SCREEN ANIMATION LOOP ---
// This loop always keeps running (even after transition) so star canvas stays alive
function updateHomeScreen() {
    drawHomeStars();

    // Date display
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    homeDateEl.textContent = dayNames[now.getDay()] + ' ' + now.getDate();

    // Days together since May 22, 2026
    const elapsedMs = Date.now() - LAST_MET_DATE;
    const daysTogether = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    homeTogetherEl.textContent = '❤️ ' + daysTogether + ' days together';

    // Elapsed breakdown
    const eDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const eHrs = Math.floor((elapsedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const eMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    const eSecs = Math.floor((elapsedMs % (1000 * 60)) / 1000);
    const pad = n => n.toString().padStart(2, '0');
    homeElapsedEl.textContent = eDays + ':' + pad(eHrs) + ':' + pad(eMins) + ':' + pad(eSecs);

    // Load saved initials
    const myI = localStorage.getItem('myInitial') || 'P';
    const herI = localStorage.getItem('herInitial') || 'K';
    homeMyInitEl.textContent = myI;
    homeHerInitEl.textContent = herI;

    requestAnimationFrame(updateHomeScreen);
}
requestAnimationFrame(updateHomeScreen);

// --- HOME SCREEN COUNTDOWN (ticks every second) ---
function updateHomeCountdown() {
    const tgt = parseInt(localStorage.getItem('orbitalTargetDate')) || (Date.now() + 22 * 24 * 60 * 60 * 1000);
    const rem = Math.max(0, tgt - Date.now());
    const d = Math.floor(rem / (1000 * 60 * 60 * 24));
    const h = Math.floor((rem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((rem % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((rem % (1000 * 60)) / 1000);
    const pad = n => n.toString().padStart(2, '0');
    homeTimerEl.textContent = pad(d) + ':' + pad(h) + ':' + pad(m) + ':' + pad(s);
}
setInterval(updateHomeCountdown, 1000);
updateHomeCountdown(); // Run immediately so it shows a real value, not 00:00:00:00

// GPS distance on home screen
setInterval(() => {
    if (typeof earthDistanceStr !== 'undefined') {
        homeDistanceEl.textContent = earthDistanceStr;
    }
}, 2000);

// --- ENTER BUTTON → TRANSITION ---
enterBtn.addEventListener('click', () => {
    homeScreen.style.transition = 'opacity 0.6s ease';
    homeScreen.style.opacity = '0';
    setTimeout(() => {
        homeScreen.style.display = 'none';
        mainApp.classList.remove('hidden');
    }, 600);
});

window.addEventListener('resize', resizeHome);

// --- FIREBASE SETUP ---
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyArbKfNeMyuGJgheGSSD4SQeySVUs3yYxc",
    authDomain: "pokomeetsoon.firebaseapp.com",
    projectId: "pokomeetsoon",
    storageBucket: "pokomeetsoon.firebasestorage.app",
    messagingSenderId: "435959832018",
    appId: "1:435959832018:web:2d1241ba4c55ff19cb7c0b",
    measurementId: "G-B2XLGPHHTX",
    // NOTE: The databaseURL depends on the region you picked when creating the Realtime Database.
    databaseURL: "https://pokomeetsoon-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase safely
let database = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

// --- COMPASS & HEARTBEAT (Home Screen) ---
const compassArrow = document.getElementById('compass-arrow');
const heartbeatBtn = document.getElementById('heartbeat-btn');
const distanceWidget = document.querySelector('.distance-widget');

function sendFirebaseHeartbeat() {
    if (database && myLat !== null) {
        database.ref('users/' + CLIENT_ID).update({
            heartbeat: Date.now(),
            timestamp: Date.now()
        });
    }
}

// Heartbeat interaction
heartbeatBtn.addEventListener('mousedown', () => {
    sendingHeartbeat = true;
    sendFirebaseHeartbeat();
});
heartbeatBtn.addEventListener('touchstart', () => {
    sendingHeartbeat = true;
    sendFirebaseHeartbeat();
});
window.addEventListener('mouseup', () => sendingHeartbeat = false);
window.addEventListener('touchend', () => sendingHeartbeat = false);

// Compass bearing calc
function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = deg => deg * Math.PI / 180;
    const toDeg = rad => rad * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
        if (!partnerLat || !myLat) return;
        // Use webkitCompassHeading if available (iOS), else calculate from alpha
        let heading = e.webkitCompassHeading || (360 - e.alpha);
        if (heading) {
            const bearing = getBearing(myLat, myLon, partnerLat, partnerLon);
            const arrowRotation = bearing - heading;
            compassArrow.style.transform = `rotate(${arrowRotation}deg)`;
            distanceWidget.classList.add('compass-active');
        }
    });
}

// iOS permission for device orientation
distanceWidget.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(console.error);
    }
}, { once: true });

// --- TIME CAPSULE LOGIC ---
const capsuleComposeView = document.getElementById('capsule-compose-view');
const capsuleLockedView = document.getElementById('capsule-locked-view');
const capsuleRevealedView = document.getElementById('capsule-revealed-view');
const capsuleInput = document.getElementById('capsule-input');
const lockCapsuleBtn = document.getElementById('lock-capsule-btn');
const capsuleAuthor = document.getElementById('capsule-author');

const statusPragyan = document.getElementById('status-pragyan');
const statusKoshi = document.getElementById('status-koshi');

let globalCapsules = { pragyan: null, koshi: null };

// Auto-select author based on saved initial (P or K)
if (localStorage.getItem('myInitial') === 'K') {
    capsuleAuthor.value = 'koshi';
} else {
    capsuleAuthor.value = 'pragyan';
}

// Fetch any locally saved draft to prepopulate
let myCapsuleDraft = localStorage.getItem('myCapsuleDraft') || '';
capsuleInput.value = myCapsuleDraft;

// Save draft as they type
capsuleInput.addEventListener('input', () => {
    localStorage.setItem('myCapsuleDraft', capsuleInput.value);
});

// Sync capsules from Firebase in realtime
if (database) {
    database.ref('capsules').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            globalCapsules.pragyan = data.pragyan || null;
            globalCapsules.koshi = data.koshi || null;
            if (activeTab === 'capsule') updateCapsuleView();
        }
    });
}

lockCapsuleBtn.addEventListener('click', () => {
    const msg = capsuleInput.value.trim();
    if (msg) {
        if (database) {
            const author = capsuleAuthor.value; // 'pragyan' or 'koshi'
            
            // Push as a new message to support multiple messages
            const newMsgRef = database.ref('capsules/' + author).push();
            newMsgRef.set({
                text: msg,
                timestamp: Date.now()
            }).then(() => {
                // Clear input so they can type another
                capsuleInput.value = '';
                localStorage.removeItem('myCapsuleDraft');
                
                lockCapsuleBtn.textContent = "Message Added! ✔️";
                setTimeout(() => { lockCapsuleBtn.textContent = "Lock Another Message"; }, 2000);
            }).catch(err => {
                console.error("Failed to save capsule:", err);
                lockCapsuleBtn.textContent = "Error saving";
            });
        }
    }
});

// Helper to extract messages safely (handles legacy string format if they used it already)
function getMessages(capsuleData) {
    if (!capsuleData) return [];
    if (typeof capsuleData === 'string') return [{text: capsuleData, timestamp: null}];
    // Object with push keys
    return Object.values(capsuleData).sort((a, b) => a.timestamp - b.timestamp);
}

function renderMessages(msgs, containerId, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return; // safety
    if (msgs.length === 0) {
        container.innerHTML = `<div style="color: white; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.5;">${emptyText}</div>`;
        return;
    }
    container.innerHTML = msgs.map(m => {
        const dateStr = m.timestamp ? `<div style="font-size:0.7rem; color:var(--text-dim); margin-bottom:5px;">${new Date(m.timestamp).toLocaleString()}</div>` : '';
        return `<div style="color: white; padding: 15px; margin-bottom: 10px; background: rgba(0,243,255,0.1); border-radius: 8px; font-style: italic; white-space: pre-wrap; font-size: 0.9rem;">${dateStr}${m.text}</div>`;
    }).join('');
}

function renderMessagesKoshi(msgs, containerId, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (msgs.length === 0) {
        container.innerHTML = `<div style="color: white; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; font-style: italic; opacity: 0.5;">${emptyText}</div>`;
        return;
    }
    container.innerHTML = msgs.map(m => {
        const dateStr = m.timestamp ? `<div style="font-size:0.7rem; color:var(--text-dim); margin-bottom:5px;">${new Date(m.timestamp).toLocaleString()}</div>` : '';
        return `<div style="color: white; padding: 15px; margin-bottom: 10px; background: rgba(255,100,50,0.1); border-radius: 8px; font-style: italic; white-space: pre-wrap; font-size: 0.9rem;">${dateStr}${m.text}</div>`;
    }).join('');
}

function updateCapsuleView() {
    if (activeTab !== 'capsule') return;
    const remainingMs = Math.max(0, parseInt(localStorage.getItem('orbitalTargetDate')) || Date.now() - Date.now());

    const pMsgs = getMessages(globalCapsules.pragyan);
    const kMsgs = getMessages(globalCapsules.koshi);

    // Update Top Status Panel
    statusPragyan.textContent = pMsgs.length > 0 ? `Pragyan: 🔒 ${pMsgs.length} Msg${pMsgs.length>1?'s':''}` : "Pragyan: ⏳ Waiting...";
    statusKoshi.textContent = kMsgs.length > 0 ? `Koshi: 🔒 ${kMsgs.length} Msg${kMsgs.length>1?'s':''}` : "Koshi: ⏳ Waiting...";
    
    statusPragyan.style.color = pMsgs.length > 0 ? "#aaffff" : "var(--text-dim)";
    statusKoshi.style.color = kMsgs.length > 0 ? "#ffccaa" : "var(--text-dim)"; // Fixed color for Koshi status

    capsuleComposeView.classList.add('hidden');
    capsuleLockedView.classList.add('hidden');
    capsuleRevealedView.classList.add('hidden');

    if (remainingMs > 0) {
        // Still counting down: Show locked view + Compose view
        capsuleLockedView.classList.remove('hidden');
        capsuleComposeView.classList.remove('hidden');
    } else {
        // Merged! Reveal messages
        capsuleRevealedView.classList.remove('hidden');
        
        renderMessages(pMsgs, 'msg-pragyan-container', '[No messages left]');
        renderMessagesKoshi(kMsgs, 'msg-koshi-container', '[No messages left]');
    }
}
setInterval(updateCapsuleView, 1000);

// --- MAIN APP ---
const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');
const qkdCanvas = document.getElementById('qkdCanvas');
const qkdCtx = qkdCanvas.getContext('2d');
const lorenzCanvas = document.getElementById('lorenzCanvas');
const lorenzCtx = lorenzCanvas.getContext('2d');
const entropyCanvas = document.getElementById('entropyCanvas');
const entropyCtx = entropyCanvas.getContext('2d');
const fCanvas = document.getElementById('fourierCanvas');
const fCtx = fCanvas.getContext('2d');
const capsuleCanvas = document.getElementById('capsuleCanvas');
const capsuleCtx = capsuleCanvas.getContext('2d');

let width, height;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    qkdCanvas.width = width;
    qkdCanvas.height = height;
    lorenzCanvas.width = width;
    lorenzCanvas.height = height;
    entropyCanvas.width = width;
    entropyCanvas.height = height;
    fCanvas.width = width;
    fCanvas.height = height;
    capsuleCanvas.width = width;
    capsuleCanvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// --- Configuration & Constants ---
// Setup Target Date in localStorage
let targetDate = localStorage.getItem('orbitalTargetDate');
let startDate = localStorage.getItem('orbitalStartDate');

// Default is 22 days from first load
const DEFAULT_DAYS = 22;
if (!targetDate || !startDate) {
    startDate = Date.now();
    targetDate = startDate + DEFAULT_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem('orbitalStartDate', startDate);
    localStorage.setItem('orbitalTargetDate', targetDate);
} else {
    targetDate = parseInt(targetDate);
    startDate = parseInt(startDate);
}

// Calculate total duration based on start and target
let TOTAL_MS = targetDate - startDate;
if (TOTAL_MS <= 0) TOTAL_MS = 1; // Prevent division by zero

// Physics & Real-world Constants
const G = 6.67430e-11; // Gravitational constant
const M1 = 5.972e24;   // Earth mass approx in kg
const M2 = 5.972e24;   // Equal mass for symmetry
const MAX_R_REAL = 384400000; // 384.4 Mm (Moon distance)
const MIN_R_REAL = 10000; // 10 km (Arbitrary minimum to prevent division by zero before merge)

// Visual parameters
const STARS_COUNT = 400;
const stars = [];
for (let i = 0; i < STARS_COUNT; i++) {
    stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.05
    });
}

let angle = 0;
let lastTime = performance.now();

// UI Elements
const countdownEl = document.getElementById('countdown');
const distanceVal = document.getElementById('distanceVal');
const velocityVal = document.getElementById('velocityVal');
const forceVal = document.getElementById('forceVal');
const earthDisplacementVal = document.getElementById('earthDisplacementVal');

// --- HYBRID GEOLOCATION TRACKING ---
function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function broadcastLocation(lat, lon) {
    myLat = lat;
    myLon = lon;
    if (database) {
        database.ref('users/' + CLIENT_ID).update({
            lat: lat,
            lon: lon,
            timestamp: Date.now()
        });
    }
}

// 1. IP Geolocation Fallback (Instant, no permission required, city-level accuracy)
fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
        // Only use IP if precise GPS hasn't locked on yet
        if (data.latitude && data.longitude && myLat === null) {
            broadcastLocation(data.latitude, data.longitude);
        }
    })
    .catch(err => console.log("IP Geo fallback failed:", err));

// 2. Precise GPS Tracking (Requires permission, high accuracy)
if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition((position) => {
        broadcastLocation(position.coords.latitude, position.coords.longitude);
    }, (err) => {
        console.warn("GPS Error:", err.message);
        if (myLat === null) {
            earthDistanceStr = "GPS Denied. Using IP Location...";
        }
    }, {
        enableHighAccuracy: true,
        maximumAge: 60000, 
        timeout: 27000 // Much more relaxed timeout for mobile
    });
} else {
    if (myLat === null) earthDistanceStr = "GPS Not Supported";
}

// --- FIREBASE REALTIME LISTENER (Replaces 2-second polling) ---
if (database) {
    database.ref('users').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const users = Object.keys(data);
        if (users.length >= 2) {
            let myLoc = data[CLIENT_ID];
            let partnerLoc = null;

            for (let id of users) {
                // Keep partner data alive for 30 days instead of 10 minutes, so it works even if they haven't opened the app recently
                if (id !== CLIENT_ID && data[id] && data[id].timestamp && (Date.now() - data[id].timestamp < 30 * 24 * 60 * 60 * 1000)) {
                    partnerLoc = data[id];
                    break;
                }
            }

            if (myLoc && partnerLoc) {
                partnerLat = partnerLoc.lat;
                partnerLon = partnerLoc.lon;



                // Handle Partner Heartbeat
                if (partnerLoc.heartbeat) {
                    if (partnerLoc.heartbeat > lastPartnerHeartbeat && (Date.now() - partnerLoc.heartbeat < 3000)) {
                        heartbeatBtn.classList.add('heart-pulse');
                        if (navigator.vibrate) navigator.vibrate([100, 100, 100]);
                    }
                    lastPartnerHeartbeat = partnerLoc.heartbeat;
                } else {
                    heartbeatBtn.classList.remove('heart-pulse');
                }

                const distKm = calculateHaversine(myLoc.lat, myLoc.lon, partnerLoc.lat, partnerLoc.lon);
                const distMi = distKm * 0.621371;
                if (distMi < 0.1) {
                    earthDistanceStr = "0 mi (MERGED)";
                } else {
                    earthDistanceStr = distMi.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " mi";
                }
            }
        } else if (users.length === 1 && users[0] === CLIENT_ID) {
            // Only overwrite if we didn't already set a GPS error
            if (earthDistanceStr === "Waiting for partner...") {
                earthDistanceStr = "Waiting for partner to open app...";
            }
        }
    });
}

function drawGlow(x, y, radius, innerColor, outerColor) {
    const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
}

function updateHUD(days, hours, mins, secs, r_real, v_real, f_real, merged) {
    const pad = n => n.toString().padStart(2, '0');

    if (merged) {
        countdownEl.textContent = "00:00:00:00";
        countdownEl.style.color = "#ff3333";
        distanceVal.textContent = "0.00 Mm";
        velocityVal.textContent = "MERGED";
        forceVal.textContent = "MAXIMUM";
    } else {
        countdownEl.textContent = `${pad(days)}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
        distanceVal.textContent = (r_real / 1e6).toFixed(2) + ' Mm';
        velocityVal.textContent = (v_real / 1000).toFixed(2) + ' km/s';
        forceVal.textContent = f_real.toExponential(2) + ' N';
    }

    // Update real-world distance based on GPS
    earthDisplacementVal.textContent = earthDistanceStr;
}

function loop(time) {
    if (activeTab === 'orbital') {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        const now = Date.now();
        const remainingMs = Math.max(0, targetDate - now);
        const merged = remainingMs === 0;

        // Time variables
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

        // Progress 1.0 (start) down to 0.0 (end)
        const progress = remainingMs / TOTAL_MS;

        // Smooth easing for the radius to simulate drag increasing as they get closer
        // progress^2 makes it stay wider longer, then collapse faster
        const r_progress = Math.pow(progress, 1.5);

        // Visual scale
        const MAX_R_PX = Math.min(width, height) * 0.35;
        const r_px = merged ? 0 : Math.max(0, MAX_R_PX * r_progress);

        // Real-world values mapped from progress
        const r_real = merged ? MIN_R_REAL : MIN_R_REAL + (MAX_R_REAL - MIN_R_REAL) * r_progress;

        // Physics derivations
        // F = G * m1 * m2 / r^2
        const F = G * (M1 * M2) / (r_real * r_real);
        // V = sqrt(G * M / (2r)) for equal masses orbiting barycenter
        const V = Math.sqrt(G * M1 / (2 * r_real));

        // Angular velocity for the simulation
        // v = omega * r -> omega = v / r
        // We scale omega visually so it looks pleasing on screen
        let visualOmega = (V / r_real) * 1.5e6;
        if (visualOmega > 10) visualOmega = 10; // cap rotation speed

        if (!merged) {
            angle += visualOmega * dt;
        }

        // --- DRAWING ---
        // Deep space background
        ctx.fillStyle = '#010306';
        ctx.fillRect(0, 0, width, height);

        // Draw Stars
        stars.forEach(star => {
            star.twinkle += star.twinkleSpeed;
            const alpha = 0.3 + Math.sin(star.twinkle) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            // Wrap stars if window resizes
            const sx = star.x % width;
            const sy = star.y % height;
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        const cx = width / 2;
        const cy = height / 2;

        if (!merged) {
            const x1 = cx + (r_px / 2) * Math.cos(angle);
            const y1 = cy + (r_px / 2) * Math.sin(angle);

            const x2 = cx - (r_px / 2) * Math.cos(angle);
            const y2 = cy - (r_px / 2) * Math.sin(angle);

            // Draw Gravity connection / Grid distortion effect
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.1 + (1 - progress) * 0.3})`;
            ctx.lineWidth = 1 + (1 - progress) * 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Barycenter
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fill();

            // Mass 1 (Cyan/Blue)
            drawGlow(x1, y1, 18, '#ffffff', 'transparent');
            drawGlow(x1, y1, 12, 'rgba(0, 243, 255, 0.8)', 'transparent');
            ctx.fillStyle = '#aaffff';
            ctx.beginPath(); ctx.arc(x1, y1, 6, 0, Math.PI * 2); ctx.fill();

            // Mass 2 (Orange/Red)
            drawGlow(x2, y2, 18, '#ffffff', 'transparent');
            drawGlow(x2, y2, 12, 'rgba(255, 100, 50, 0.8)', 'transparent');
            ctx.fillStyle = '#ffccaa';
            ctx.beginPath(); ctx.arc(x2, y2, 6, 0, Math.PI * 2); ctx.fill();

        } else {
            // Merged state (Supernova/Blackhole effect)
            drawGlow(cx, cy, 80, 'rgba(255, 255, 255, 0.9)', 'transparent');
            drawGlow(cx, cy, 40, 'rgba(150, 50, 255, 0.8)', 'transparent');
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();

            // Accretion disk lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 120, 40, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        updateHUD(days, hours, mins, secs, r_real, V, F, merged);
        updateChirp(progress, merged);
    }
    requestAnimationFrame(loop);
}

// Helper to fast-forward the simulation from the console
window.forceMergeIn = function (seconds) {
    targetDate = Date.now() + seconds * 1000;
    localStorage.setItem('orbitalTargetDate', targetDate);
    console.log(`Simulation will merge in ${seconds} seconds.`);
};

// --- LIGO GRAVITATIONAL WAVE CHIRP ---
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let chirpEnabled = false;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 35; // Start at 35 Hz (LIGO lower band)

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;

    // Subtle distortion for a "spacey" feel
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 5;

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}

function updateChirp(progress, merged) {
    if (!audioCtx || !chirpEnabled) return;

    if (merged) {
        // Dramatic sweep up and fade out
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
        return;
    }

    // progress: 1.0 (far apart) → 0.0 (about to merge)
    // Frequency: 35 Hz → 250 Hz (matches real LIGO inspiral chirp range)
    const closeness = 1 - progress;
    const freq = 35 + closeness * closeness * 215; // Quadratic sweep
    oscillator.frequency.value = freq;

    // Volume: very quiet when far, louder as they approach
    // Pulsate at 2x the orbital frequency for that "wub wub" inspiral feel
    const baseVol = 0.02 + closeness * 0.08;
    const pulse = Math.sin(Date.now() / 1000 * freq * 0.1) * 0.02;
    gainNode.gain.value = baseVol + pulse;
}

const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
    if (!audioCtx) initAudio();

    chirpEnabled = !chirpEnabled;
    soundBtn.textContent = chirpEnabled ? '🔊' : '🔇';

    if (chirpEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        gainNode.gain.value = 0.02;
    } else {
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    }
});

// --- TABS LOGIC ---
document.querySelectorAll('.tab-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-nav .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        document.getElementById(activeTab).classList.add('active');
    });
});



// --- SETTINGS MODAL LOGIC ---
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveDateBtn = document.getElementById('save-date-btn');
const datetimeInput = document.getElementById('target-datetime');
const myInitInput = document.getElementById('my-init-input');
const herInitInput = document.getElementById('her-init-input');

const myInitialEl = document.getElementById('my-initial');
const herInitialEl = document.getElementById('her-initial');

// Load Initials from local storage
let savedMyInit = localStorage.getItem('myInitial') || 'P';
let savedHerInit = localStorage.getItem('herInitial') || 'K';
myInitialEl.textContent = savedMyInit;
herInitialEl.textContent = savedHerInit;

settingsBtn.addEventListener('click', () => {
    // Pre-fill input with current targetDate
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(targetDate - tzOffset)).toISOString().slice(0, 16);
    datetimeInput.value = localISOTime;

    myInitInput.value = savedMyInit;
    herInitInput.value = savedHerInit;

    settingsModal.classList.add('active');
});

closeModalBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

saveDateBtn.addEventListener('click', () => {
    const selectedDate = new Date(datetimeInput.value).getTime();
    if (!isNaN(selectedDate)) {
        targetDate = selectedDate;
        startDate = Date.now(); // Reset start date to now so progress scales smoothly from here
        TOTAL_MS = targetDate - startDate;
        if (TOTAL_MS <= 0) TOTAL_MS = 1;

        localStorage.setItem('orbitalTargetDate', targetDate);
        localStorage.setItem('orbitalStartDate', startDate);
    }

    if (myInitInput.value.trim()) {
        savedMyInit = myInitInput.value.trim().toUpperCase();
        myInitialEl.textContent = savedMyInit;
        localStorage.setItem('myInitial', savedMyInit);
    }

    if (herInitInput.value.trim()) {
        savedHerInit = herInitInput.value.trim().toUpperCase();
        herInitialEl.textContent = savedHerInit;
        localStorage.setItem('herInitial', savedHerInit);
    }

    settingsModal.classList.remove('active');
});


// --- FOURIER EPICYCLES LOGIC ---
let fourierY = [];
let fourierTime = 0;
let fourierPath = [];
let fourierMaxTerms = 362;

// --- CAPSULE BLACK HOLE LOGIC ---
let capsuleAngle = 0;

function drawBlackHole() {
    if (activeTab !== 'capsule') {
        requestAnimationFrame(drawBlackHole);
        return;
    }
    const cw = capsuleCanvas.width;
    const ch = capsuleCanvas.height;

    capsuleCtx.fillStyle = '#010306';
    capsuleCtx.fillRect(0, 0, cw, ch);

    const cx = cw / 2;
    const cy = ch / 2;

    capsuleAngle += 0.02;

    // Accretion disk
    capsuleCtx.save();
    capsuleCtx.translate(cx, cy);
    capsuleCtx.rotate(capsuleAngle);

    for (let i = 0; i < 50; i++) {
        const r = 80 + Math.random() * 60;
        const a = Math.random() * Math.PI * 2;
        capsuleCtx.fillStyle = `rgba(255, 100, 50, ${Math.random() * 0.3})`;
        capsuleCtx.beginPath();
        capsuleCtx.arc(Math.cos(a) * r, Math.sin(a) * r, Math.random() * 2, 0, Math.PI * 2);
        capsuleCtx.fill();
    }

    capsuleCtx.restore();

    // Event Horizon (Black center)
    capsuleCtx.fillStyle = 'black';
    capsuleCtx.beginPath();
    capsuleCtx.arc(cx, cy, 75, 0, Math.PI * 2);
    capsuleCtx.fill();

    // Glow around event horizon
    capsuleCtx.shadowBlur = 40;
    capsuleCtx.shadowColor = 'rgba(255, 50, 150, 0.8)';
    capsuleCtx.strokeStyle = 'rgba(255, 50, 150, 0.5)';
    capsuleCtx.lineWidth = 4;
    capsuleCtx.beginPath();
    capsuleCtx.arc(cx, cy, 75, 0, Math.PI * 2);
    capsuleCtx.stroke();
    capsuleCtx.shadowBlur = 0; // reset

    requestAnimationFrame(drawBlackHole);
}

// Ensure the loop runs when switching tabs
document.querySelectorAll('.tab-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.getAttribute('data-tab') === 'capsule') {
            requestAnimationFrame(drawBlackHole);
        }
    });
});

function dftComplex(points) {
    const N = points.length;
    let X = [];
    for (let k = 0; k < N; k++) {
        let re = 0;
        let im = 0;
        for (let n = 0; n < N; n++) {
            const phi = (Math.PI * 2 * k * n) / N;
            const p = points[n];
            re += p.x * Math.cos(phi) + p.y * Math.sin(phi);
            im += -p.x * Math.sin(phi) + p.y * Math.cos(phi);
        }
        re = re / N;
        im = im / N;
        X.push({ freq: k, amp: Math.sqrt(re * re + im * im), phase: Math.atan2(im, re) });
    }
    return X.sort((a, b) => b.amp - a.amp);
}

function generatePath(nameText) {
    const points = [];
    // 1. Heart Path
    for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push({ x: x * 10, y: y * 10 - 80 });
    }

    // 2. Name Path via Offscreen Canvas and TSP approximation
    if (nameText && nameText.trim() !== '') {
        const off = document.createElement('canvas');
        off.width = 600;
        off.height = 200;
        const octx = off.getContext('2d');
        octx.fillStyle = 'black';
        octx.fillRect(0, 0, 600, 200);
        octx.fillStyle = 'white';
        octx.font = 'bold 70px Courier New';
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText(nameText, 300, 100);

        const imgData = octx.getImageData(0, 0, 600, 200).data;
        let textPts = [];
        for (let y = 0; y < 200; y += 4) {
            for (let x = 0; x < 600; x += 4) {
                const i = (y * 600 + x) * 4;
                if (imgData[i] > 128) {
                    textPts.push({ x: x - 300, y: y - 100 + 130 }); // Offset below heart
                }
            }
        }

        const sortedText = [];
        if (textPts.length > 0) {
            let curr = textPts.shift();
            sortedText.push(curr);
            while (textPts.length > 0) {
                let nearestIdx = 0;
                let minDist = Infinity;
                for (let i = 0; i < textPts.length; i++) {
                    const dx = textPts[i].x - curr.x;
                    const dy = textPts[i].y - curr.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        nearestIdx = i;
                    }
                }
                curr = textPts.splice(nearestIdx, 1)[0];
                sortedText.push(curr);
            }
        }
        points.push(...sortedText);
    }
    return points;
}

const fourierBtn = document.getElementById('generate-fourier-btn');
if (fourierBtn) {
    fourierBtn.addEventListener('click', () => {
        const name = document.getElementById('her-name-input').value;
        const path = generatePath(name);

        // Temporarily change button text while computing DFT
        const originalText = fourierBtn.textContent;
        fourierBtn.textContent = "Computing DFT...";
        fourierBtn.style.opacity = '0.5';

        // Use setTimeout to allow UI to render "Computing..." before heavy JS locks the thread
        setTimeout(() => {
            fourierY = dftComplex(path);

            const slider = document.getElementById('fourier-slider');
            slider.max = fourierY.length;
            slider.value = Math.min(362, fourierY.length);
            fourierMaxTerms = parseInt(slider.value);
            document.getElementById('fourier-terms-val').textContent = fourierMaxTerms;

            fourierTime = 0;
            fourierPath = [];

            fourierBtn.textContent = originalText;
            fourierBtn.style.opacity = '1';
        }, 50);
    });
}

const fourierSlider = document.getElementById('fourier-slider');
if (fourierSlider) {
    fourierSlider.addEventListener('input', (e) => {
        fourierMaxTerms = parseInt(e.target.value);
        document.getElementById('fourier-terms-val').textContent = fourierMaxTerms;
        fourierTime = 0;
        fourierPath = [];
    });
}

function epicycle(x, y, rotation, fourier) {
    for (let i = 0; i < fourierMaxTerms; i++) {
        if (!fourier[i]) continue;
        let prevx = x;
        let prevy = y;
        let freq = fourier[i].freq;
        let radius = fourier[i].amp;
        let phase = fourier[i].phase;

        x += radius * Math.cos(freq * fourierTime + phase + rotation);
        y += radius * Math.sin(freq * fourierTime + phase + rotation);

        fCtx.beginPath();
        fCtx.arc(prevx, prevy, radius, 0, Math.PI * 2);
        fCtx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        fCtx.stroke();

        fCtx.beginPath();
        fCtx.moveTo(prevx, prevy);
        fCtx.lineTo(x, y);
        fCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        fCtx.stroke();
    }
    return { x, y };
}

function fourierLoop() {
    if (activeTab === 'epicycle') {
        fCtx.fillStyle = '#010306';
        fCtx.fillRect(0, 0, width, height);

        // Draw Stars
        fCtx.fillStyle = '#ffffff';
        stars.forEach(star => {
            star.twinkle += star.twinkleSpeed;
            const alpha = 0.3 + Math.sin(star.twinkle) * 0.5;
            fCtx.globalAlpha = alpha;
            fCtx.beginPath();
            // Wrap stars
            const sx = star.x % width;
            const sy = star.y % height;
            fCtx.arc(sx, sy, star.size, 0, Math.PI * 2);
            fCtx.fill();
        });
        fCtx.globalAlpha = 1.0;

        if (fourierY.length > 0) {
            const v = epicycle(width / 2, height / 2, 0, fourierY);
            fourierPath.unshift(v);

            fCtx.beginPath();
            for (let i = 0; i < fourierPath.length; i++) {
                if (i === 0) fCtx.moveTo(fourierPath[i].x, fourierPath[i].y);
                else fCtx.lineTo(fourierPath[i].x, fourierPath[i].y);
            }
            fCtx.strokeStyle = '#ff3296';
            fCtx.lineWidth = 2.5;
            fCtx.stroke();

            // Glow effect on trace
            fCtx.shadowBlur = 10;
            fCtx.shadowColor = '#ff3296';
            fCtx.stroke();
            fCtx.shadowBlur = 0;

            const dt = (Math.PI * 2) / fourierY.length;
            fourierTime += dt;

            // Reset trace when loop is done
            if (fourierTime > Math.PI * 2) {
                fourierTime = 0;
                fourierPath = [];
            }
        }
    }
    requestAnimationFrame(fourierLoop);
}

// Start Fourier loop
requestAnimationFrame(fourierLoop);

// Auto-generate the heart initially
setTimeout(() => {
    if (fourierBtn) fourierBtn.click();
}, 1000);

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
}

// --- MILESTONE NOTIFICATIONS ---
const MILESTONES = [30, 14, 7, 3, 1, 0]; // days
let notifiedMilestones = JSON.parse(localStorage.getItem('notifiedMilestones') || '[]');

function checkMilestones() {
    const rem = Math.max(0, targetDate - Date.now());
    const daysLeft = Math.floor(rem / (1000 * 60 * 60 * 24));

    MILESTONES.forEach(m => {
        if (daysLeft === m && !notifiedMilestones.includes(m)) {
            notifiedMilestones.push(m);
            localStorage.setItem('notifiedMilestones', JSON.stringify(notifiedMilestones));

            let msg;
            if (m === 0) msg = "🎉 Today is the day! The orbits have merged.";
            else if (m === 1) msg = "💫 1 day remaining. The gravitational pull is immense.";
            else msg = `🔔 ${m} days remaining until orbital merger.`;

            if (Notification.permission === 'granted') {
                new Notification('Orbital Decay', { body: msg, icon: '/icon-192.png' });
            }
        }
    });
}

// Ask for notification permission on first interaction
document.addEventListener('click', function requestNotif() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    document.removeEventListener('click', requestNotif);
}, { once: true });

setInterval(checkMilestones, 60000); // Check every minute
checkMilestones();

// --- QUANTUM KEY DISTRIBUTION (BB84) ---
const qkdGenerateBtn = document.getElementById('qkd-generate-btn');
const qkdMeasureBtn = document.getElementById('qkd-measure-btn');
const qkdStatus = document.getElementById('qkd-status');
const qkdGrid = document.getElementById('qkd-grid');

let myPhotons = [];
let partnerPhotons = [];
let qkdInitialized = false;

qkdGenerateBtn.addEventListener('click', () => {
    myPhotons = [];
    qkdGrid.innerHTML = '';
    const bases = ['+', 'x'];
    const bits = [0, 1];
    for(let i=0; i<16; i++) {
        const base = bases[Math.floor(Math.random()*2)];
        const bit = bits[Math.floor(Math.random()*2)];
        let symbol = '';
        if (base === '+') symbol = bit === 0 ? '↑' : '→';
        if (base === 'x') symbol = bit === 0 ? '↗' : '↘';
        
        myPhotons.push({ base, bit, symbol });
        const pEl = document.createElement('div');
        pEl.style.cssText = 'color: #00f3ff; font-size: 1.2rem; font-weight: bold; background: rgba(0,243,255,0.1); border-radius: 4px; padding: 5px;';
        pEl.textContent = symbol;
        qkdGrid.appendChild(pEl);
    }
    
    if (database) {
        const author = localStorage.getItem('myInitial') === 'K' ? 'koshi' : 'pragyan';
        database.ref('qkd/' + author).set({
            photons: myPhotons,
            timestamp: Date.now()
        }).then(() => {
            qkdStatus.textContent = "Quantum Key generated and sent!";
        });
    }
});

if (database) {
    database.ref('qkd').on('value', snap => {
        const data = snap.val();
        if (data) {
            const myAuthor = localStorage.getItem('myInitial') === 'K' ? 'koshi' : 'pragyan';
            const partnerAuthor = myAuthor === 'pragyan' ? 'koshi' : 'pragyan';
            if (data[partnerAuthor]) {
                partnerPhotons = data[partnerAuthor].photons || [];
                qkdStatus.textContent = "Incoming Quantum Key detected. Ready to measure.";
                qkdMeasureBtn.style.background = 'rgba(255, 100, 50, 0.4)';
            }
        }
    });
}

qkdMeasureBtn.addEventListener('click', () => {
    if (partnerPhotons.length === 0) {
        qkdStatus.textContent = "No incoming key to measure!";
        return;
    }
    qkdGrid.innerHTML = '';
    let matchCount = 0;
    const bases = ['+', 'x'];
    
    partnerPhotons.forEach(p => {
        const myBase = bases[Math.floor(Math.random()*2)];
        const match = myBase === p.base;
        if (match) matchCount++;
        
        const symbol = match ? p.symbol : (Math.random()>0.5 ? '?' : '*');
        
        const pEl = document.createElement('div');
        pEl.style.cssText = `color: ${match ? '#ff6432' : '#555'}; font-size: 1.2rem; font-weight: bold; background: rgba(255,100,50,0.1); border-radius: 4px; padding: 5px;`;
        pEl.textContent = symbol;
        qkdGrid.appendChild(pEl);
    });
    
    qkdStatus.textContent = `Measured ${matchCount}/16 photons correctly!`;
    qkdMeasureBtn.style.background = 'rgba(255, 100, 50, 0.1)';
});

function qkdLoop() {
    if (activeTab === 'qkd') {
        qkdCtx.fillStyle = '#010306';
        qkdCtx.fillRect(0, 0, width, height);
        
        // Draw some floating quantum particles
        const t = Date.now() / 1000;
        for(let i=0; i<20; i++) {
            const x = (width/2) + Math.sin(t + i) * 150 * Math.sin(i*123);
            const y = (height/2) + Math.cos(t * 1.5 + i) * 150 * Math.cos(i*321);
            
            qkdCtx.beginPath();
            qkdCtx.arc(x, y, 2, 0, Math.PI*2);
            qkdCtx.fillStyle = `rgba(0, 243, 255, ${0.5 + Math.sin(t*3+i)*0.5})`;
            qkdCtx.fill();
        }
    }
    requestAnimationFrame(qkdLoop);
}

// --- LORENZ ATTRACTOR (FATE) ---
let lX = 0.1, lY = 0, lZ = 0;
let lX2 = 0.11, lY2 = 0, lZ2 = 0;
const sigma = 10, rho = 28, beta = 8/3;
const lorenzPoints1 = [];
const lorenzPoints2 = [];

function lorenzLoop() {
    if (activeTab === 'lorenz') {
        lorenzCtx.fillStyle = '#010306';
        lorenzCtx.fillRect(0, 0, width, height);
        
        // Integrate
        const dt = 0.01;
        const dx = (sigma * (lY - lX)) * dt;
        const dy = (lX * (rho - lZ) - lY) * dt;
        const dz = (lX * lY - beta * lZ) * dt;
        lX += dx; lY += dy; lZ += dz;
        
        const dx2 = (sigma * (lY2 - lX2)) * dt;
        const dy2 = (lX2 * (rho - lZ2) - lY2) * dt;
        const dz2 = (lX2 * lY2 - beta * lZ2) * dt;
        lX2 += dx2; lY2 += dy2; lZ2 += dz2;
        
        lorenzPoints1.push({x: lX, y: lY, z: lZ});
        lorenzPoints2.push({x: lX2, y: lY2, z: lZ2});
        if (lorenzPoints1.length > 500) lorenzPoints1.shift();
        if (lorenzPoints2.length > 500) lorenzPoints2.shift();
        
        // Draw
        lorenzCtx.save();
        lorenzCtx.translate(width/2, height/2 + 50);
        const scale = 8;
        
        lorenzCtx.beginPath();
        for(let i=0; i<lorenzPoints1.length; i++) {
            const p = lorenzPoints1[i];
            const px = p.x * scale;
            const py = -p.z * scale;
            if(i===0) lorenzCtx.moveTo(px, py);
            else lorenzCtx.lineTo(px, py);
        }
        lorenzCtx.strokeStyle = 'rgba(0, 243, 255, 0.8)';
        lorenzCtx.lineWidth = 2;
        lorenzCtx.stroke();
        
        lorenzCtx.beginPath();
        for(let i=0; i<lorenzPoints2.length; i++) {
            const p = lorenzPoints2[i];
            const px = p.x * scale;
            const py = -p.z * scale;
            if(i===0) lorenzCtx.moveTo(px, py);
            else lorenzCtx.lineTo(px, py);
        }
        lorenzCtx.strokeStyle = 'rgba(255, 100, 50, 0.8)';
        lorenzCtx.lineWidth = 2;
        lorenzCtx.stroke();
        lorenzCtx.restore();
        
        document.getElementById('lorenz-p-pos').textContent = `P: (${lX.toFixed(1)}, ${lY.toFixed(1)}, ${lZ.toFixed(1)})`;
        document.getElementById('lorenz-k-pos').textContent = `K: (${lX2.toFixed(1)}, ${lY2.toFixed(1)}, ${lZ2.toFixed(1)})`;
    }
    requestAnimationFrame(lorenzLoop);
}

// --- ENTROPY (THERMODYNAMICS) ---
const particlesEnt = [];
for(let i=0; i<200; i++) {
    particlesEnt.push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        vx: (Math.random()-0.5)*10,
        vy: (Math.random()-0.5)*10,
        targetX: 0, targetY: 0,
        color: Math.random() > 0.5 ? '#00f3ff' : '#ff6432'
    });
}
// Generate target heart shape
for(let i=0; i<200; i++) {
    const t = Math.PI * 2 * (i/200);
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    particlesEnt[i].targetX = hx * 8;
    particlesEnt[i].targetY = -hy * 8; // inverted Y for canvas
}

function entropyLoop() {
    if (activeTab === 'entropy') {
        entropyCtx.fillStyle = '#010306';
        entropyCtx.fillRect(0, 0, width, height);
        
        const remainingMs = Math.max(0, targetDate - Date.now());
        const days = remainingMs / (1000 * 60 * 60 * 24);
        
        // Temp scales from 0 to 300 based on remaining days (max 30 days = 300K)
        const temp = Math.min(300, Math.max(0, (days / 30) * 300));
        
        document.getElementById('entropy-temp').textContent = `${temp.toFixed(1)} K`;
        document.getElementById('entropy-s').textContent = temp > 50 ? 'High (Chaos)' : 'Low (Order)';
        
        const chaos = temp / 300; // 0 to 1
        
        entropyCtx.save();
        entropyCtx.translate(width/2, height/2 - 50);
        
        for(let i=0; i<200; i++) {
            const p = particlesEnt[i];
            
            // Random brownian motion based on temp
            p.vx += (Math.random() - 0.5) * chaos * 5;
            p.vy += (Math.random() - 0.5) * chaos * 5;
            
            // Pull towards target based on lack of temp (order)
            const order = 1 - chaos;
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            p.vx += dx * order * 0.05;
            p.vy += dy * order * 0.05;
            
            // Damping
            p.vx *= 0.9;
            p.vy *= 0.9;
            
            p.x += p.vx;
            p.y += p.vy;
            
            entropyCtx.beginPath();
            entropyCtx.arc(p.x, p.y, 2, 0, Math.PI*2);
            entropyCtx.fillStyle = p.color;
            entropyCtx.fill();
        }
        entropyCtx.restore();
    }
    requestAnimationFrame(entropyLoop);
}

requestAnimationFrame(qkdLoop);
requestAnimationFrame(lorenzLoop);
requestAnimationFrame(entropyLoop);
