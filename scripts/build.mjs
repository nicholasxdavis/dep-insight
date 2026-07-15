import fs from 'fs';
import path from 'path';

const libDir = path.join(process.cwd(), 'lib');

// Ensure lib directory exists
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

console.log('Build complete');
console.log('lib directory:', libDir);
