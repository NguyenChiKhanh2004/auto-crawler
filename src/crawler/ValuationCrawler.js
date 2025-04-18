const axios = require('axios');
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/connectDB');
// const ValuationRecord = require('../models/valuationSchema')(sequelize, DataTypes);
// const ErrorValuationRecord = require('../models/errorValuationSchema')(sequelize, DataTypes);
const { chromium } = require('playwright');
const { parseAddress } = require('../utils/addressUtils');

// Mảng riêng biệt cho tên, email và điện thoại
const NAMES = ['Lan', 'Te', 'Le', 'Hanh', 'Cuong', 'Son', 'Thang', 'Thao', 'Tuan', 'Hai'];
const EMAILS = ['lan@gmail.com', 'ly@gmail.com', 'le@gmail.com', 'h@gmail.com', 'c@gmail.com', 's@gmail.com', 'u@gmail.com', 'p@gmail.com', 'o@gmail.com', 'i@gmail.com'];
const PHONES = ['047386443433', '047386235014', '047386436142', '047386472577', '047386402132', '047386411071', '047979429732', '047386545774', '047386543331', '047386443403'];

const propertyTypeMap = {
    'Flat/Maisonette': 'Flat',
    'Converted Flat': 'Flat',
    'Purpose Built Flat': 'Flat',
    'End Terrace House': 'Terraced House',
    'Mid Terrace House': 'Terraced House',
    'Terrace Property': 'Terraced House',
    'Terraced': 'Terraced House',
    'Semi-Detached House': 'Semi Detached House'
};

function areAddressesEqual(addr1, addr2) {
    const keys = ['flat', 'building', 'street', 'city', 'postcode'];
    return keys.every(key => (addr1[key] || '') === (addr2[key] || ''));
}

async function closeModalIfPresent(page) {
    try {
        if (page.isClosed()) return;
        const modalButtons = page.locator('button', { hasText: '×' });
        const count = await modalButtons.count();
        for (let i = 0; i < count; i++) {
            const btn = modalButtons.nth(i);
            if (await btn.isVisible()) {
                await btn.click({ timeout: 2000 });
                break;
            }
        }
    } catch (error) {
        console.warn('Lỗi khi đóng modal:', error);
    }
}

async function safeAction(page, actionFn) {
    await closeModalIfPresent(page);
    return actionFn();
}

async function selectDropdown(page, selector, value) {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.locator(selector).selectOption(value);
}

async function getCleanText(page, selector) {
    const el = page.locator(selector);
    try {
        await el.waitFor({ timeout: 10000 });
        return (await el.textContent())?.trim() || 'N/A';
    } catch {
        return null;
    }
}

// async function logError(formData, note) {
//     await ErrorValuationRecord.create({
//         index: formData.index,
//         postcode: formData.postcode,
//         fullAddress: formData.fullAddress,
//         bedrooms: formData.bedrooms || 'N/A',
//         propertyType: formData.propertyType,
//         valuationType: formData.valuationType,
//         note
//     });
// }

class ValuationCrawler {
    /**
     * @param {{ index: number, postcode: string, fullAddress: string, bedrooms: string, propertyType: string, valuationType: string }} formData
     * @param {import('playwright').Browser} browser
     */
    constructor(formData, browser) {
        this.formData = formData;
        this.browser = browser;
        this.propertyType = propertyTypeMap[formData.propertyType] || undefined;
    }

    /**
     * Crawl a single valuation using a new page/tab
     * @returns {Promise<boolean>} success flag
     */
    async crawl() {
        const page = await this.browser.newPage();
        let success = false;
        try {
            // Validate bedrooms
            if (!this.formData.bedrooms?.trim()) {
                // await logError(this.formData, 'Số phòng ngủ không hợp lệ');
                return false;
            }

            await page.goto('https://valuation.druce.com/home/4279');
            await this.fillInitialForm(page);
            if (!await this.selectAddress(page)) return false;
            if (!await this.selectBedrooms(page)) return false;

            await this.fillPropertyAndValuation(page);
            await this.fillContactInfo(page);

            const result = await this.extractResults(page);
            // await ValuationRecord.create({ ...this.formData, ...result });

            // Prepare webhook payload
            const payload = {
                index: this.formData.index,
                postcode: this.formData.postcode,
                fullAddress: this.formData.fullAddress,
                bedrooms: this.formData.bedrooms,
                propertyType: this.formData.propertyType,
                valuationType: this.formData.valuationType,
                ...result
            };
            const hasNullField = Object.entries(payload).some(
                ([key, value]) => value === null && !['currentEnergyRating', 'potentialEnergyRating'].includes(key)
            );

            if (!hasNullField) {
                try {
                    const auth = Buffer.from('aurora:epc@4321').toString('base64');
                    await axios.post(
                        'https://n8n-dev.aurora-tech.com/webhook/6e0a4224-4710-4e85-986d-d655b93bcba5',
                        payload,
                        { headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth } }
                    );
                    console.log('✅ Đã gửi dữ liệu thành công đến webhook');
                } catch (error) {
                    console.error(' Lỗi khi gửi dữ liệu tới webhook:', error.message);
                }
            }

            success = true;
        } catch (err) {
            console.error('Lỗi khi xử lý record:', err);
        } finally {
            await page.close();
            return success;
        }
    }

    async fillInitialForm(page) {
        await safeAction(page, () =>
            page.getByRole('textbox', { name: 'Enter your postcode' }).fill(this.formData.postcode)
        );
        await safeAction(page, () =>
            page.getByRole('button', { name: 'Find address' }).click()
        );
    }

    async selectAddress(page) {
        const parsedAddr = parseAddress(this.formData.fullAddress);
        await page.waitForSelector('select[name="property"]', { timeout: 5000 });
        const options = await page.$$eval('select[name="property"] option', opts =>
            opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
        );
        const matched = options.find(opt => areAddressesEqual(parseAddress(opt.text), parsedAddr));
        if (!matched) {
            // await logError(this.formData, 'Không tìm thấy địa chỉ khớp');
            return false;
        }
        await page.locator('select[name="property"]').selectOption(matched.value);
        return true;
    }

    async selectBedrooms(page) {
        await page.waitForSelector('select[name="bedrooms"]', { timeout: 5000 });
        const validOptions = await page.$$eval('select[name="bedrooms"] option', opts =>
            opts.map(o => o.value)
        );
        if (!validOptions.includes(this.formData.bedrooms)) {
            // await logError(this.formData, 'Giá trị bedrooms không khớp với trên web');
            return false;
        }
        await page.locator('select[name="bedrooms"]').selectOption(this.formData.bedrooms);
        return true;
    }

    async fillPropertyAndValuation(page) {
        if (this.propertyType) {
            await selectDropdown(page, 'select[name="propertytype"]', this.propertyType);
        } else {
            console.log(this.formData)
            console.warn(`⚠️ Không xác định được propertyType cho ${this.formData.propertyType}, bỏ qua chọn loại nhà`);
        }

        await selectDropdown(page, '#typeval-show', 'Sales and Lettings Valuation');
        await safeAction(page, () =>
            page.getByRole('button', { name: 'Submit' }).click()
        );
    }


    async fillContactInfo(page) {
        // Random chọn riêng biệt từng trường
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];
        const phone = PHONES[Math.floor(Math.random() * PHONES.length)];
        await page.getByRole('textbox', { name: 'Name Please enter your name' }).fill(name);
        await page.getByRole('textbox', { name: 'Email address Please enter a' }).fill(email);
        await page.getByRole('textbox', { name: 'Phone number' }).fill(phone);
        try {
            const combo = page.getByRole('combobox');
            await combo.waitFor({ timeout: 500 });
            await combo.selectOption('yes');
        } catch { }
        await page.getByRole('textbox', { name: 'Any Additional Info?' }).fill('No');
        await page.getByRole('textbox', { name: '+2=' }).fill('4');
        await page.getByRole('button', { name: 'Get my valuation' }).click();
    }

    async extractResults(page) {
        return {
            minValueSales: await getCleanText(
                page,
                '#kg-sales-result-mobile div.col-sm-4:has(p.kg-label:has-text("Minimum valuation")) p.kg-calculator-value'
            ),
            maxValueSales: await getCleanText(
                page,
                '#kg-sales-result-mobile div.col-sm-4:has(p.kg-label:has-text("Maximum valuation")) p.kg-calculator-value'
            ),
            minValueLettings: await getCleanText(
                page,
                '#kg-lettings-result-mobile div.col-sm-4:has(p.kg-label:has-text("Minimum valuation")) p.kg-calculator-value'
            ),
            maxValueLettings: await getCleanText(
                page,
                '#kg-lettings-result-mobile div.col-sm-4:has(p.kg-label:has-text("Maximum valuation")) p.kg-calculator-value'
            ),
            currentEnergyRating: await getCleanText(page, '#kg-epc-current-result p.kg-epc-val'),
            potentialEnergyRating: await getCleanText(page, '#kg-epc-potential-result p.kg-epc-val')
        };
    }
}

module.exports = ValuationCrawler;

