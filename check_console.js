import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log('--- BODY HTML 5173 ---');
    console.log(bodyHtml.substring(0, 1500));
    console.log('-----------------');

    console.log('Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const bodyHtml2 = await page.evaluate(() => document.body.innerHTML);
    console.log('--- BODY HTML 5174 ---');
    console.log(bodyHtml2.substring(0, 1500));
    console.log('-----------------');

    await browser.close();
  } catch (e) {
    console.error('SCRIPT EXCEPTION:', e.message);
  }
})();
