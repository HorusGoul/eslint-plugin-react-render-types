// Proxy for TypeScript's language service plugin loader, which uses Node10-style
// resolution and does not support package.json "exports" maps.
module.exports = require("./dist/language-service-plugin.js");
