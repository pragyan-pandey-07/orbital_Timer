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
