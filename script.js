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

let myLat = null, myLon = null, partnerLat = null, partnerLon = null;
let lastPartnerHeartbeat = 0;
let sendingHeartbeat = false;

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
const capsuleMessageDisplay = document.getElementById('capsule-message');

let myCapsule = localStorage.getItem('myCapsule');

lockCapsuleBtn.addEventListener('click', () => {
    if (capsuleInput.value.trim()) {
        myCapsule = capsuleInput.value.trim();
        localStorage.setItem('myCapsule', myCapsule);
        updateCapsuleView();

        if (database && myLat !== null) {
            database.ref('users/' + CLIENT_ID).update({
                capsule: myCapsule,
                timestamp: Date.now()
            });
        }
    }
});

function updateCapsuleView() {
    if (activeTab !== 'capsule') return;
    const remainingMs = Math.max(0, parseInt(localStorage.getItem('orbitalTargetDate')) || Date.now() - Date.now());
    const hasCapsule = !!myCapsule; // Or partner's capsule if we fetched it

    capsuleComposeView.classList.add('hidden');
    capsuleLockedView.classList.add('hidden');
    capsuleRevealedView.classList.add('hidden');

    if (!hasCapsule) {
        capsuleComposeView.classList.remove('hidden');
    } else if (remainingMs > 0) {
        capsuleLockedView.classList.remove('hidden');
    } else {
        capsuleRevealedView.classList.remove('hidden');
        capsuleMessageDisplay.textContent = myCapsule; // Displaying own for now
    }
}
setInterval(updateCapsuleView, 1000);

// --- MAIN APP ---
const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');
const qCanvas = document.getElementById('quantumCanvas');
const qCtx = qCanvas.getContext('2d');
const fCanvas = document.getElementById('fourierCanvas');
const fCtx = fCanvas.getContext('2d');

let width, height;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    qCanvas.width = width;
    qCanvas.height = height;
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

// --- Geolocation Tracking ---
const CLIENT_ID = Math.random().toString(36).substr(2, 9);
let earthDistanceStr = "Waiting for partner...";

function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        // Update global coords for compass
        myLat = latitude;
        myLon = longitude;

        // Push to Firebase instantly
        if (database) {
            database.ref('users/' + CLIENT_ID).update({
                lat: latitude,
                lon: longitude,
                capsule: myCapsule,
                timestamp: Date.now()
            });
        }
    }, (err) => {
        earthDistanceStr = "GPS Error: " + err.message;
    }, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
    });
} else {
    earthDistanceStr = "GPS Not Supported";
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
                if (id !== CLIENT_ID && (Date.now() - data[id].timestamp < 10 * 60 * 1000)) {
                    partnerLoc = data[id];
                    break;
                }
            }

            if (myLoc && partnerLoc) {
                partnerLat = partnerLoc.lat;
                partnerLon = partnerLoc.lon;

                // Handle Partner Capsule
                if (partnerLoc.capsule && activeTab === 'capsule') {
                    const remainingMs = Math.max(0, parseInt(localStorage.getItem('orbitalTargetDate')) || Date.now() - Date.now());
                    if (remainingMs <= 0) {
                        capsuleMessageDisplay.textContent = partnerLoc.capsule;
                    }
                }

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
            earthDistanceStr = "Waiting for partner...";
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
let activeTab = 'orbital';
document.querySelectorAll('.tab-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-nav .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        document.getElementById(activeTab).classList.add('active');
    });
});

// --- QUANTUM ENTANGLEMENT LOGIC ---
let qPos = { x: 0, y: 0 }; // Offset from center for left particle
let isDragging = false;

qCanvas.addEventListener('mousedown', (e) => {
    if (activeTab !== 'quantum') return;
    isDragging = true;
    updateQPos(e.clientX, e.clientY);
});

qCanvas.addEventListener('mousemove', (e) => {
    if (activeTab !== 'quantum' || !isDragging) return;
    updateQPos(e.clientX, e.clientY);
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch support
qCanvas.addEventListener('touchstart', (e) => {
    if (activeTab !== 'quantum') return;
    isDragging = true;
    updateQPos(e.touches[0].clientX, e.touches[0].clientY);
});
qCanvas.addEventListener('touchmove', (e) => {
    if (activeTab !== 'quantum' || !isDragging) return;
    updateQPos(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', () => isDragging = false);

function updateQPos(mouseX, mouseY) {
    const cx = width / 2;
    const cy = height / 2;
    // Left particle base position is cx - 300. We want to find offset from there.
    // Actually, just let the mouse drive the left particle's absolute position, 
    // and the right particle mirrors it across the center.
    // Wait, if they click anywhere on the left side, it becomes the left particle.
    if (mouseX < cx) {
        qPos.x = mouseX - (cx - 200); // Base is cx-200
        qPos.y = mouseY - cy;
    } else {
        // If they drag the right particle, the left mirrors it!
        qPos.x = -(mouseX - (cx + 200));
        qPos.y = -(mouseY - cy);
    }
}

function drawQuantumGlow(x, y, radius, color) {
    const gradient = qCtx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    qCtx.fillStyle = gradient;
    qCtx.beginPath();
    qCtx.arc(x, y, radius * 2, 0, Math.PI * 2);
    qCtx.fill();
}

const qCountdownEl = document.getElementById('quantum-countdown');
const qElapsedEl = document.getElementById('quantum-elapsed');
const qRemainingEl = document.getElementById('quantum-remaining');
const lastMetDate = LAST_MET_DATE;

function quantumLoop() {
    if (activeTab === 'quantum') {
        const remainingMs = Math.max(0, targetDate - Date.now());
        const merged = remainingMs === 0;

        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        const pad = n => n.toString().padStart(2, '0');

        qCountdownEl.textContent = merged ? "00:00:00:00" : `${pad(days)}:${pad(hours)}:${pad(mins)}:${pad(secs)}`;

        // Dynamic texts
        qRemainingEl.textContent = merged ? "DISTANCE REMAINING: 0 DAYS." : `DISTANCE REMAINING: ${days} DAYS.`;

        const start = new Date(lastMetDate);
        const nowObj = new Date();
        let eMonths = (nowObj.getFullYear() - start.getFullYear()) * 12 + (nowObj.getMonth() - start.getMonth());
        let eDays = nowObj.getDate() - start.getDate();
        if (eDays < 0) {
            eMonths--;
            const temp = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            eDays += temp.getDate();
        }
        let elapsedText = `${eMonths} months`;
        if (eDays > 0) elapsedText += ` and ${eDays} days`;

        qElapsedEl.textContent = `SPOOKY ACTION AT A DISTANCE: ${elapsedText.toUpperCase()}.`;

        qCtx.fillStyle = '#010306';
        qCtx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;

        if (!merged) {
            // Draw grid or connection
            qCtx.beginPath();
            qCtx.moveTo(0, cy);
            qCtx.lineTo(width, cy);
            qCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            qCtx.stroke();

            // Left Particle
            const lx = cx - 200 + qPos.x;
            const ly = cy + qPos.y;
            // Right Particle (Mirrored)
            const rx = cx + 200 - qPos.x;
            const ry = cy - qPos.y;

            // Connection line
            qCtx.beginPath();
            qCtx.moveTo(lx, ly);
            qCtx.lineTo(rx, ry);
            qCtx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
            qCtx.setLineDash([5, 10]);
            qCtx.stroke();
            qCtx.setLineDash([]);

            // Left Glow & Core
            drawQuantumGlow(lx, ly, 40, 'rgba(0, 243, 255, 0.6)');
            qCtx.fillStyle = '#fff';
            qCtx.beginPath(); qCtx.arc(lx, ly, 10, 0, Math.PI * 2); qCtx.fill();

            // Right Glow & Core
            drawQuantumGlow(rx, ry, 40, 'rgba(255, 50, 150, 0.6)');
            qCtx.fillStyle = '#fff';
            qCtx.beginPath(); qCtx.arc(rx, ry, 10, 0, Math.PI * 2); qCtx.fill();

            // Add some jitter to make them look like quantum states
            if (!isDragging) {
                qPos.x += (Math.random() - 0.5) * 2;
                qPos.y += (Math.random() - 0.5) * 2;
                qPos.x *= 0.95; // Return to center
                qPos.y *= 0.95;
            }
        } else {
            // Collapsed Waveform
            drawQuantumGlow(cx, cy, 100, 'rgba(150, 50, 255, 0.8)');
            qCtx.fillStyle = '#fff';
            qCtx.beginPath(); qCtx.arc(cx, cy, 20, 0, Math.PI * 2); qCtx.fill();

            // Waveform rings
            const t = Date.now() / 500;
            for (let i = 1; i <= 3; i++) {
                qCtx.beginPath();
                qCtx.arc(cx, cy, 20 + i * 40 + Math.sin(t + i) * 10, 0, Math.PI * 2);
                qCtx.strokeStyle = `rgba(0, 243, 255, ${0.5 / i})`;
                qCtx.lineWidth = 2;
                qCtx.stroke();
            }
        }
    }
    requestAnimationFrame(quantumLoop);
}

requestAnimationFrame(loop);
requestAnimationFrame(quantumLoop);

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
let savedMyInit = localStorage.getItem('myInitial') || 'Y';
let savedHerInit = localStorage.getItem('herInitial') || 'H';
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

// --- BLOCH SPHERE LOGIC ---
const threeContainer = document.getElementById('three-container');
let scene, camera, renderer, sphere, arrow, particles;
let isMeasured = false;

function initBlochSphere() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    threeContainer.appendChild(renderer.domElement);

    // Wireframe Sphere
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Axes
    const axesHelper = new THREE.AxesHelper(1.8);
    scene.add(axesHelper);

    // State Arrow
    const dir = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 1.5;
    const hex = 0xff3296;
    arrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.2, 0.1);
    scene.add(arrow);

    // Particles for dramatic measure effect
    const pGeo = new THREE.BufferGeometry();
    const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true });
    const pPos = new Float32Array(500 * 3);
    for (let i = 0; i < 1500; i++) pPos[i] = (Math.random() - 0.5) * 0.1;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    particles = new THREE.Points(pGeo, pMat);
    particles.visible = false;
    scene.add(particles);
}

const alphaValEl = document.getElementById('alphaVal');
const betaValEl = document.getElementById('betaVal');
const measureBtn = document.getElementById('measure-btn');
const katexStateEl = document.getElementById('katex-state');

measureBtn.addEventListener('click', () => {
    isMeasured = true;
    measureBtn.style.display = 'none';

    // Snap to |Together> (South Pole)
    arrow.setDirection(new THREE.Vector3(0, -1, 0));

    // Explosion effect
    particles.visible = true;
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < 1500; i += 3) {
        pos[i] = 0; pos[i + 1] = -1.5; pos[i + 2] = 0;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    // Update math
    alphaValEl.textContent = "0.000";
    betaValEl.textContent = "1.000";
    if (typeof katex !== 'undefined') {
        katex.render("|\\psi\\rangle = |\\text{Together}\\rangle", katexStateEl);
    }
});

function updateBlochState(theta, phi) {
    if (isMeasured) {
        // Expand particles
        const pos = particles.geometry.attributes.position.array;
        for (let i = 0; i < 1500; i += 3) {
            pos[i] += (Math.random() - 0.5) * 0.2;
            pos[i + 1] += (Math.random() - 0.5) * 0.2;
            pos[i + 2] += (Math.random() - 0.5) * 0.2;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.material.opacity *= 0.92;
        return;
    }

    const dir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
    );
    arrow.setDirection(dir);

    // Calculate probabilities
    const alphaSq = Math.cos(theta / 2) ** 2;
    const betaSq = Math.sin(theta / 2) ** 2;

    alphaValEl.textContent = alphaSq.toFixed(3);
    betaValEl.textContent = betaSq.toFixed(3);

    // Update KaTeX
    const alphaStr = Math.cos(theta / 2).toFixed(2);
    const betaStr = Math.sin(theta / 2).toFixed(2);
    const katexString = `|\\psi\\rangle = ${alphaStr}|\\text{Apart}\\rangle + e^{i\\phi} ${betaStr}|\\text{Together}\\rangle`;
    if (typeof katex !== 'undefined') katex.render(katexString, katexStateEl);
}

let blochInitialized = false;

function blochLoop() {
    if (activeTab === 'bloch') {
        if (!blochInitialized && typeof THREE !== 'undefined') {
            initBlochSphere();
            blochInitialized = true;
        }
        if (!blochInitialized) { requestAnimationFrame(blochLoop); return; }

        const remainingMs = Math.max(0, targetDate - Date.now());
        const days = remainingMs / (1000 * 60 * 60 * 24);

        if (days <= 1 && !isMeasured && remainingMs > 0) {
            measureBtn.style.display = 'block';
        } else if (remainingMs === 0 && !isMeasured) {
            measureBtn.click();
        }

        if (!isMeasured) {
            const progress = Math.min(1, Math.max(0, 1 - (remainingMs / TOTAL_MS)));
            const theta = progress * Math.PI;
            const phi = (Date.now() / 1000) * 2;
            updateBlochState(theta, phi);
        } else {
            updateBlochState(Math.PI, 0);
        }

        sphere.rotation.y += 0.002;
        sphere.rotation.x += 0.001;
        renderer.render(scene, camera);
    }
    requestAnimationFrame(blochLoop);
}

requestAnimationFrame(blochLoop);

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// --- FOURIER EPICYCLES LOGIC ---
let fourierY = [];
let fourierTime = 0;
let fourierPath = [];
let fourierMaxTerms = 362;

// --- CAPSULE BLACK HOLE LOGIC ---
const capsuleCanvas = document.getElementById('capsuleCanvas');
const capsuleCtx = capsuleCanvas.getContext('2d');
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

