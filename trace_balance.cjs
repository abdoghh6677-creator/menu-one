
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('const CustomerMenu: React.FC = () => {')) started = true;
    if (started) {
        let cleanLine = line.split('//')[0];
        for (let char of cleanLine) {
            if (char === '{') balance++;
            if (char === '}') balance--;
        }
        if (i + 1 >= 730 && i + 1 <= 780) {
            console.log(`${i+1}: [${balance}] ${line.trim()}`);
        }
    }
}
