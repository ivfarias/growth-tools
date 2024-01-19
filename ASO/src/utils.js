// utils.js
import fs from 'fs';
import path from 'path';

export function saveToJsonFile(data, filename, directory, languageCode) {
    const filePath = path.join(directory, filename);
    const dataWithLanguage = { language: languageCode, ...data };
    fs.writeFileSync(filePath, JSON.stringify(dataWithLanguage, null, 2));
    console.log(`Data saved to ${filename}`);
}
