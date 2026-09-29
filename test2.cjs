const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost" });

// Mock APIs
dom.window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
dom.window.localStorage = { getItem: () => null, setItem: () => {} };
dom.window.AudioContext = class { createOscillator() { return { start:()=>{}, connect:()=>{}, frequency: {value:0} } } };
dom.window.firebase = {
    initializeApp: () => {},
    database: () => ({ ref: () => ({ on: () => {}, update: () => {} }) })
};

dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {}, clearRect: () => {}, beginPath: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    setLineDash: () => {}, createRadialGradient: () => ({ addColorStop: () => {} })
});

try {
    const script = fs.readFileSync('script.js', 'utf-8');
    dom.window.eval(script);
    console.log("Script evaluated successfully.");
} catch (e) {
    console.error("FATAL ERROR DURING EVAL:", e);
}

// Wait a bit to catch async errors
setTimeout(() => {
    console.log("Finished waiting for async tasks.");
}, 500);
