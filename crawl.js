// crawl.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sequelize = require('./src/utils/connectDB');
const readCSV = require('./src/crawler/CSVReader');
const ValuationCrawler = require('./src/crawler/ValuationCrawler');

const progressFile = path.join(__dirname, 'progress.json');
const MAX_CONCURRENT = 1;

function getLastIndex() {
    if (fs.existsSync(progressFile)) {
        try {
            return JSON.parse(fs.readFileSync(progressFile, 'utf8')).lastProcessedIndex || 0;
        } catch { /* ignore */ }
    }
    return 0;
}

function updateProgress(i) {
    fs.writeFileSync(progressFile, JSON.stringify({ lastProcessedIndex: i }, null, 2));
}

(async () => {
    // await sequelize.sync();
    const browser = await chromium.launch({
        proxy: {
          server: 'socks5://103.78.3.85:33334',
        //   username: 'brd-customer-hl_6cc46d69-zone-residential_proxy1',
        //   password: '8sn323vq8shq'
        },
        headless: false
      });
    // const context = await browser.newContext();
    // const page = await context.newPage();
    // await page.goto('https://whatismyipaddress.com/');
    // await page.waitForTimeout(5000);
    
    // const records = await readCSV('D:/lay_du_lieu_web/filtered_postcode_data(in).csv');

    const records = await readCSV(path.resolve(__dirname, 'filtered_postcode_data(in).csv'));

    const start = getLastIndex();
    console.log(`Bắt đầu từ record thứ: ${start + 1} / ${records.length}`);

    // chia batch
    for (let i = start; i < records.length; i += MAX_CONCURRENT) {
        const batch = records.slice(i, i + MAX_CONCURRENT);
        await Promise.all(batch.map(async (rec, idx) => {
            const globalIdx = i + idx;
            const formData = {
                index: rec.index,
                postcode: rec.postcode,
                fullAddress: rec.fullAddress,
                bedrooms: rec.bedrooms,
                propertyType: rec.propertyType,
                valuationType: rec.tenure
            };
            // console.log(`Đang xử lý record #${globalIdx + 1}`);
            // console.log(formData)
            const crawler = new ValuationCrawler(formData, browser);
            await crawler.crawl();
            updateProgress(globalIdx + 1);
            console.log(`Đã xử lý record #${globalIdx + 1}`);
        }));
    }

    await browser.close();
    console.log('Hoàn tất tất cả records!');
})();
