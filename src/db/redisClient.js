const Redis = require('ioredis');
const redis = new Redis(); // connects to 127.0.0.1:6379
module.exports = redis;
