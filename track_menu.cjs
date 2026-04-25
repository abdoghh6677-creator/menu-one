
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('const CustomerMenu: React.FC = () => {')) {
        started = true;
    }
    if (started) {
        let cleanLine = line.replace(/\/\/.*$/g, '');
        for (let char of cleanLine) {
            if (char === '{') balance++;
            if (char === '}') balance--;
        }
        if (balance === 0) {
            console.log(`CustomerMenu closed at line ${i + 1}`);
            console.log(line);
            started = false;
        }
        if (i + 1 === 772) {
            console.log(`Balance at 772: ${balance}`);
        }
    }
}
