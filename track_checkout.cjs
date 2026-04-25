
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('const CheckoutModal = ({')) started = true;
    if (started) {
        let cleanLine = line.split('//')[0];
        for (let char of line) {
            if (char === '{') balance++;
            if (char === '}') balance--;
        }
        if (balance === 0) {
            console.log(`CheckoutModal closed at line ${i + 1}`);
            started = false;
        }
    }
}
