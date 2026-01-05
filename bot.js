const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  const MAX_FOLLOWS_PER_DAY = 150;
  const MAX_FOLLOWS_PER_HOUR = 50;

  let dailyFollowCount = 0;
  let hourlyFollowCount = 0;
  let lastHourReset = new Date().getHours();

  function checkHourlyReset() {
    const currentHour = new Date().getHours();
    if (currentHour !== lastHourReset) {
      hourlyFollowCount = 0;
      lastHourReset = currentHour;
      console.log('New hour started – hourly count reset.');
    }
  }
//mistake2028
//2003207318192614
//benjaminmanjolo
//2003207318192614


  try {
    console.log('Logging in...');
    await page.goto('https://www.instagram.com/accounts/login/');
    await page.waitForSelector('input[name="username"]', { timeout: 60000 });
    await page.fill('input[name="username"]', 'benjaminmanjolo');
    await page.fill('input[name="password"]', '2003207318192614');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(12000);

    const notNowButtons = await page.$$('button:has-text("Not Now")');
    for (const btn of notNowButtons) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    const postUrl = 'https://www.instagram.com/p/DRRVM1CiAko/';
    console.log(`Loading post ${postUrl}...`);
    await page.goto(postUrl, { timeout: 60000 });
    await page.waitForTimeout(10000);

    console.log('Waiting for likes text...');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('like') || document.body.innerText.includes('others');
    }, { timeout: 30000 });

    console.log('Clicking likes to open likers modal...');
    let clicked = false;
    if (await page.getByText(/others$/i).count() > 0) {
      await page.getByText(/others$/i).click({ force: true });
      clicked = true;
    }
    if (!clicked && await page.getByText(/likes$/i).count() > 0) {
      await page.getByText(/likes$/i).last().click({ force: true });
      clicked = true;
    }
    if (!clicked) {
      await page.getByText(/like|others/i).first().click({ force: true });
    }

    console.log('Waiting for likers modal...');
    await page.waitForSelector('div[role="dialog"]', { timeout: 30000 });

    console.log('Likers modal opened! Starting follows...');

    while (dailyFollowCount < MAX_FOLLOWS_PER_DAY) {
      checkHourlyReset();

      if (hourlyFollowCount >= MAX_FOLLOWS_PER_HOUR) {
        console.log(`Hourly limit reached. Waiting...`);
        await page.waitForTimeout(1000 * 60);
        continue;
      }

      // Re-query buttons fresh every time
      const possibleButtons = await page.$$('div[role="dialog"] [role="button"], div[role="dialog"] button');

      let followedThisBatch = false;

      for (const button of possibleButtons) {
        if (dailyFollowCount >= MAX_FOLLOWS_PER_DAY || hourlyFollowCount >= MAX_FOLLOWS_PER_HOUR) break;

        const text = (await button.textContent({ timeout: 5000 })).trim().toLowerCase();
        console.log('Button text:', text);

        if (text.includes('follow') && !text.includes('following') && !text.includes('requested')) {
          await button.click({ force: true });  // No scrollIntoViewIfNeeded
          dailyFollowCount++;
          hourlyFollowCount++;
          followedThisBatch = true;
          console.log(`Followed! Daily: ${dailyFollowCount}/${MAX_FOLLOWS_PER_DAY} | Hourly: ${hourlyFollowCount}/${MAX_FOLLOWS_PER_HOUR}`);
          await page.waitForTimeout(2000);  // Small wait for button update
          await page.waitForTimeout(Math.random() * 2000 + 1000 );  // Main human delay
        }
      }

      if (!followedThisBatch) {
        console.log('No more followable likers in view – scrolling...');
      }

      await page.evaluate(() => {
        const scrollArea = document.querySelector('div[role="dialog"] div[style*="overflow"]') ||
                           document.querySelector('div[role="dialog"]');
        if (scrollArea) scrollArea.scrollTop += 5000;
      });
      await page.waitForTimeout(6000);
    }

    console.log(`Finished! Followed ${dailyFollowCount} likers today.`);
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await browser.close();
  }
})();