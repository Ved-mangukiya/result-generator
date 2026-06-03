const fs = require('fs');
let c = fs.readFileSync('backend/routes/batches.js', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\${/g, '${');
fs.writeFileSync('backend/routes/batches.js', c);
console.log('Fixed batches.js');
