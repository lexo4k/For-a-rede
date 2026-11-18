'use strict';
// Explicit Vercel route avoids catch-all routing misses for nested approval requests.
module.exports = require('../../server').handler;
