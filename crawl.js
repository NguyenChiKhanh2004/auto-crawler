// const readCSV = require('./src/crawler/CSVReader');
// const ValuationCrawler = require('./src/crawler/ValuationCrawler');

// (async () => {
//     try {
//         const records = await readCSV('D:/lay_du_lieu_web/filtered_postcode_data(in).csv');
//         console.log(`Đã đọc được ${records.length} record từ file CSV.`);
//         // const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//         // let iterationCount = 0;
//         for (const record of records) {
//             // iterationCount++;
//             const formData = {
//                 index: record.index,
//                 postcode: record.postcode,
//                 fullAddress: record.fullAddress,
//                 bedrooms: record.bedrooms,
//                 propertyType: record.propertyType,
//                 valuationType: record.tenure,
//             };
//             const crawler = new ValuationCrawler(formData);
//             const result = await crawler.crawl();
//             // if (result) {
//             //     iterationCount++;
//             //     console.log(`Đã tăng iterationCount: ${iterationCount}`);
//             // } else {
//             //     console.warn(`Record ${formData.index} không thành công, iterationCount không tăng.`);
//             // }
//             // Khi đạt 10 lần thành công thì nghỉ
//             // if (iterationCount > 0 && iterationCount % 10 === 0) {
//             //     // const randomDelay = Math.floor(Math.random() * (4 * 60 * 1000 - 2 * 60 * 1000 + 1)) + 2 * 60 * 1000;
//             //     const randomDelay = Math.floor(Math.random() * (2 * 60 * 1000 - 1 * 60 * 1000 + 1)) + 1 * 60 * 1000;
//             //     console.log(`Nghỉ ${randomDelay / 1000} giây...`);
//             //     iterationCount = 0; // Reset lại nếu cần
//             //     await delay(randomDelay);
//             // }
//         }
//     } catch (err) {
//         console.error('Lỗi khi xử lý CSV:', err);
//     }
// })();
const fs = require('fs');
const path = require('path');
const readCSV = require('./src/crawler/CSVReader');
const ValuationCrawler = require('./src/crawler/ValuationCrawler');

// Đường dẫn tới file JSON lưu tiến trình
const progressFilePath = path.join(__dirname, 'progress.json');

// Hàm lấy chỉ số dòng đã xử lý từ file JSON
function getLastProcessedIndex() {
    if (fs.existsSync(progressFilePath)) {
        try {
            const data = fs.readFileSync(progressFilePath, 'utf8');
            const obj = JSON.parse(data);
            return obj.lastProcessedIndex || 0;
        } catch (err) {
            console.error('Lỗi khi đọc progress.json:', err);
            return 0;
        }
    }
    return 0;
}

// Hàm cập nhật chỉ số dòng đã xử lý vào file JSON
function updateProgress(index) {
    const obj = { lastProcessedIndex: index };
    fs.writeFileSync(progressFilePath, JSON.stringify(obj, null, 2));
}

(async () => {
    try {
        const records = await readCSV('D:/lay_du_lieu_web/filtered_postcode_data(in).csv');
        console.log(`Đã đọc được ${records.length} record từ file CSV.`);

        // Lấy chỉ số dòng đã xử lý lần trước
        let lastProcessedIndex = getLastProcessedIndex();
        console.log(`Bắt đầu xử lý từ record thứ: ${lastProcessedIndex + 1}`);

        // Vòng lặp từ chỉ số đã lưu cho tới hết file CSV
        for (let i = lastProcessedIndex; i < records.length; i++) {
            const record = records[i];
            const formData = {
                index: record.index,
                postcode: record.postcode,
                fullAddress: record.fullAddress,
                bedrooms: record.bedrooms,
                propertyType: record.propertyType,
                valuationType: record.tenure,
            };

            const crawler = new ValuationCrawler(formData);
            const result = await crawler.crawl();

            // Sau khi xử lý xong record hiện tại thì cập nhật lại tiến trình
            updateProgress(i + 1);
            console.log(`Đã xử lý xong record thứ: ${i + 1}`);

            // Có thể thêm delay nếu cần (đoạn code delay bạn đã comment)
            // await delay(randomDelay);
        }

        console.log('Xử lý hoàn tất!');
    } catch (err) {
        console.error('Lỗi khi xử lý CSV:', err);
    }
})();
