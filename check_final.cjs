
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) {
        console.log(`EXTRA CLOSING BRACE at line ${i+1}`);
        balance = 0;
    }
}
console.log(`Final balance: ${balance}`);
