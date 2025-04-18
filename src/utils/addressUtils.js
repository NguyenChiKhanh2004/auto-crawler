function parseAddress(rawAddress) {
    const address = rawAddress.trim().toUpperCase();
    const postcodeMatch = address.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/);
    const postcode = postcodeMatch ? postcodeMatch[0] : '';
    const addressWithoutPostcode = postcode
        ? address.replace(postcode, '').trim().replace(/,+$/, '')
        : address;
    const parts = addressWithoutPostcode
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
    let flat = '', building = '', street = '', city = '';

    for (const part of parts) {
        if (!flat && /(FLAT|APARTMENT)\s*\d+/.test(part)) {
            flat = part;
        } else if (!building && /HOUSE|MANSION|BUILDING/.test(part)) {
            building = part;
        } else if (!street && /(STREET|ROAD|AVENUE|LANE|CRESCENT|PLACE|GARDENS)/.test(part)) {
            street = part;
        } else if (!city && /\bLONDON|MANCHESTER|BIRMINGHAM|LEEDS|BRISTOL\b/.test(part)) {
            city = part;
        } else if (!street) {
            street = part; // nếu không match gì, coi như street
        }
    }
    return { flat, building, street, city, postcode };
}
module.exports = {
    parseAddress
};