const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost" });

// Mock APIs
dom.window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
dom.window.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.AudioContext = class { createOscillator() { return { start:()=>{}, connect:()=>{}, frequency: {value:0} } } };
dom.window.firebase = {
    initializeApp: () => {},
    database: () => ({ ref: () => ({ 
        on: (event, cb) => {
            // Mock a basic empty response
            setTimeout(() => cb({val: () => ({pragyan: null, koshi: null})}), 10);
        }, 
        update: () => {},
        push: () => ({ set: () => Promise.resolve() })
    }) })
};
dom.window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ latitude: 10, longitude: 20 }) });

dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {}, clearRect: () => {}, beginPath: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    setLineDash: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }),
    fillText: () => {}
});

try {
    const script = fs.readFileSync('script.js', 'utf-8');
    dom.window.eval(script);
    console.log("Script evaluated successfully.");
    
    // Simulate clicking the lock button
    const btn = dom.window.document.getElementById('lock-capsule-btn');
    const input = dom.window.document.getElementById('capsule-input');
    input.value = 'Hello World';
    btn.click();
    console.log("Button clicked!");
    
} catch (e) {
    console.error("FATAL ERROR DURING EVAL:", e);
}

// Wait a bit to catch async errors
setTimeout(() => {
    console.log("Finished waiting for async tasks.");
}, 500);
