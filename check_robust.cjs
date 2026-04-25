
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');

let balance = 0;
let stack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Remove comments and strings to get accurate balance
    let cleanLine = line.replace(/\/\/.*$/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
    
    for (let j = 0; j < cleanLine.length; j++) {
        let char = cleanLine[j];
        if (char === '{') {
            balance++;
            stack.push({ line: i + 1, col: j + 1 });
        } else if (char === '}') {
            balance--;
            stack.pop();
            if (balance < 0) {
                console.log(`Unexpected closing brace at line ${i + 1}, column ${j + 1}`);
                balance = 0;
            }
        }
    }
}

if (balance > 0) {
    console.log(`Unclosed braces: ${balance}`);
    stack.forEach(s => console.log(`  Opened at line ${s.line}, col ${s.col}`));
} else {
    console.log('Braces are balanced.');
}
