const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting puppeteer tests...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    let logs = [];
    const logHandler = (tag) => (msg) => {
        const text = msg.text();
        if (text.includes("[ROOM CONTEXT]")) {
            console.log(`[${tag}] ${text}`);
        }
    };

    page1.on('console', logHandler('Page1'));
    page2.on('console', logHandler('Page2'));

    try {
        console.log("TEST 1 - WAITING (Player 1 joins)");
        await page1.goto('http://localhost:5173');
        await page1.waitForSelector('#create-room-btn', { timeout: 5000 });
        await page1.$eval('#create-room-btn', btn => btn.click());
        
        await new Promise(r => setTimeout(r, 2000));
        
        const roomCodeText = await page1.evaluate(() => {
            const el = document.querySelector('#lobby-room-id');
            return el ? el.textContent : null;
        });
        
        if (!roomCodeText) throw new Error("Could not find room code");
        const roomCode = roomCodeText.replace('Copy', '').replace('Copied!', '').trim();
        console.log("Room:", roomCode);

        // Verify WAITING state
        const waitingNotice = await page1.evaluate(() => document.body.textContent);
        if (waitingNotice.includes("Waiting for more players")) {
            console.log("✅ TEST 1 PASSED: Lobby waiting state confirmed.");
        } else {
            console.log("❌ TEST 1 FAILED: Lobby waiting state missing.");
        }

        console.log("TEST 2 - ROUND START (Player 2 joins)");
        await page2.goto('http://localhost:5173');
        await page2.waitForSelector('#room-id-input', { timeout: 5000 });
        await page2.type('#room-id-input', roomCode);
        await page2.$eval('button[type="submit"]', btn => btn.click());

        console.log("Waiting 3s for game start and redirect...");
        await new Promise(r => setTimeout(r, 3000));
        
        // Verify Game UI loaded
        const isGameP1 = await page1.evaluate(() => !!document.querySelector('.game-container'));
        const isGameP2 = await page2.evaluate(() => !!document.querySelector('.game-container'));
        
        if (isGameP1 && isGameP2) {
            console.log("✅ TEST 2 PASSED: Both players redirected to Game.jsx");
        } else {
            console.log("❌ TEST 2 FAILED: Redirect didn't happen", {isGameP1, isGameP2});
        }

        console.log("TEST 3 & 4 - TIMER & DRAWER UI");
        // Get text of game header from page1
        const headerP1 = await page1.evaluate(() => document.querySelector('.game-header')?.textContent);
        console.log("Page 1 Header:", headerP1);
        
        const mainP1 = await page1.evaluate(() => document.querySelector('.game-arena')?.textContent);
        const mainP2 = await page2.evaluate(() => document.querySelector('.game-arena')?.textContent);

        console.log("Page 1 Main Area:", mainP1);
        console.log("Page 2 Main Area:", mainP2);

        if (mainP1.includes("Choose a Word") || mainP2.includes("Choose a Word")) {
            console.log("✅ TEST 4 PASSED: One player sees Choose a Word.");
        }
        
        if (mainP1.includes("is choosing") || mainP2.includes("is choosing")) {
            console.log("✅ TEST 4 PASSED: Other player sees waiting for drawer.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await browser.close();
        console.log("Done.");
        process.exit(0);
    }
})();
