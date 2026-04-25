
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let inside = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    if (line.includes('const CustomerMenu: React.FC = () => {')) inside = true;
    
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    
    if (line.includes('return') && balance === 0 && !line.includes('export default')) {
        console.log(`SUSPICIOUS RETURN at line ${i + 1}: ${line.trim()}`);
    }
}
