const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("PUBLIC_KEY=");
console.log(keys.publicKey);

console.log("\nPRIVATE_KEY=");
console.log(keys.privateKey);