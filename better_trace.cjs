
const fs = require('fs');
const content = fs.readFileSync('src/pages/customer/CustomerMenu.tsx', 'utf8');

let pos = 0;
let balance = 0;
let line = 1;
let col = 1;

while (pos < content.length) {
    let char = content[pos];
    if (char === '\n') { line++; col = 1; } else { col++; }

    // Skip comments
    if (char === '/' && content[pos+1] === '/') {
        while (pos < content.length && content[pos] !== '\n') pos++;
        continue;
    }
    if (char === '/' && content[pos+1] === '*') {
        while (pos < content.length && !(content[pos] === '*' && content[pos+1] === '/')) pos++;
        pos += 2;
        continue;
    }

    // Skip strings
    if (char === '"' || char === "'" || char === "`") {
        let quote = char;
        pos++;
        while (pos < content.length && (content[pos] !== quote || (content[pos-1] === '\\' && content[pos-2] !== '\\'))) {
            if (content[pos] === '\n') line++;
            pos++;
        }
        pos++;
        continue;
    }

    if (char === '{') {
        balance++;
        if (line >= 393 && line <= 1180) {
            // console.log(`{ Open at ${line}:${col} - Balance: ${balance}`);
        }
    }
    if (char === '}') {
        balance--;
        if (line >= 393 && line <= 1180 && balance <= 1) {
             console.log(`} Close at ${line}:${col} - Balance: ${balance}`);
        }
    }
    pos++;
}
console.log(`Final Balance: ${balance}`);
