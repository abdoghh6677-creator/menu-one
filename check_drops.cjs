
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let inside = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].split('//')[0]; // Simple comment ignored
    if (line.includes('const CustomerMenu: React.FC = () => {')) {
        inside = true;
    }
    if (inside) {
        for (let char of line) {
            if (char === '{') balance++;
            if (char === '}') balance--;
        }
        if (balance <= 0 && inside) {
           console.log(`Balance dropped to ${balance} at line ${i + 1}`);
           console.log(lines[i]);
           if (balance === 0) inside = false;
        }
    }
}
