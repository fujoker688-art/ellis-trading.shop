const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Go to beauty category
  console.log('Loading SpeedMalls beauty page...');
  await page.goto('https://www.speedmalls.com/BEAUTY?lang=zh_tw&cId=1', { 
    waitUntil: 'networkidle0', 
    timeout: 30000 
  });
  await wait(5000);
  
  // Scroll to load all products
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await wait(1000);
  }
  
  // Extract products
  const products = await page.evaluate(() => {
    const items = [];
    // Try different selectors for product cards
    const cards = document.querySelectorAll('.product-card, .product-item, [class*="product"], .goods-item, .item-card');
    
    cards.forEach(card => {
      const nameEl = card.querySelector('h3, h4, .product-name, .goods-name, [class*="name"], [class*="title"]');
      const priceEl = card.querySelector('.price, .product-price, [class*="price"]');
      const imgEl = card.querySelector('img');
      const linkEl = card.querySelector('a');
      
      if (nameEl && priceEl) {
        items.push({
          name: nameEl.textContent.trim(),
          price: priceEl.textContent.trim(),
          img: imgEl ? imgEl.src : '',
          link: linkEl ? linkEl.href : ''
        });
      }
    });
    
    return items;
  });
  
  console.log(`Found ${products.length} products`);
  
  // Also get page text for debugging
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('\n--- Page text (first 3000 chars) ---');
  console.log(pageText.substring(0, 3000));
  
  // Get all images
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      alt: img.alt,
      src: img.src,
      class: img.className
    })).filter(i => i.src && !i.src.includes('icon') && !i.src.includes('logo'));
  });
  
  console.log(`\nFound ${images.length} images`);
  
  // Save results
  fs.writeFileSync('/tmp/scrape/beauty_products.json', JSON.stringify({products, images, pageText: pageText.substring(0, 5000)}, null, 2));
  console.log('\nSaved to /tmp/scrape/beauty_products.json');
  
  await browser.close();
})();
