
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (i + 1 >= 393 && i + 1 <= 1174) {
        // Find where balance is higher than expected.
        // Usually, inside CustomerMenu, it should be 1-5.
        if (balance > 10) { // Arbitrary threshold
             console.log(`High balance (${balance}) at line ${i+1}: ${lines[i].trim()}`);
        }
    }
}
