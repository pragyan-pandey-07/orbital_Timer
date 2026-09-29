const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
dom.window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
dom.window.eval(`
  window.firebase = {
    initializeApp: () => {},
    database: () => ({ ref: () => ({ on: () => {}, update: () => {} }) })
  };
  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => ({}),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} })
  });
`);
setTimeout(() => {
    try {
        const script = fs.readFileSync('script.js', 'utf-8');
        dom.window.eval(script);
        console.log("No top-level JS errors!");
    } catch(e) {
        console.error("ERROR:", e);
    }
}, 1000);
