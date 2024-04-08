const crypto = require('crypto');

exports.generateETag = (data) => {
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `"${hash}"`;
};

exports.checkETagMatch = (req, etag) => {
    return req.headers['if-none-match'] === etag;
};
