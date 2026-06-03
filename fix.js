const fs = require('fs');
let c = fs.readFileSync('backend/routes/promotions.js', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\${/g, '${');
fs.writeFileSync('backend/routes/promotions.js', c);
console.log('Fixed promotions.js');
