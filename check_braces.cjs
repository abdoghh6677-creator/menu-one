
const fs = require('fs');
const content = fs.readFileSync('h:\\menu-food-master-fixed\\menu-food-fixed\\src\\pages\\customer\\CustomerMenu.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) {
        console.log(`Imbalance at line ${i + 1}: ${balance}`);
        console.log(line);
        balance = 0; // Reset
    }
}
console.log(`Final balance: ${balance}`);
