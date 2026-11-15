import fs from 'node:fs/promises';
import QRCode from 'qrcode';
import sharp from 'sharp';
export const launchUrl='https://rezasoroush28.github.io/Ar-Mvp/?ar=1';
const options={errorCorrectionLevel:'M',margin:4};
const qr=await QRCode.toString(launchUrl,{...options,type:'svg'});
await fs.writeFile('public/open-joy.svg',qr);
await QRCode.toFile('public/open-joy.png',launchUrl,{...options,width:656});
const marker=await fs.readFile('public/marker.svg','utf8');
const card=`<svg xmlns="http://www.w3.org/2000/svg" width="180mm" height="210mm" viewBox="0 0 180 210" role="img" aria-label="Joy Web AR card. Scan the small QR to open the website, then point the browser camera at the large square marker.">
<rect width="180" height="210" fill="white"/>
<g fill="#151b22" font-family="Arial, sans-serif" text-anchor="middle"><text x="90" y="12" font-size="7" font-weight="bold">JOY IN YOUR WORLD</text><text x="90" y="21" font-size="3.7">Web AR · No installation · Works in your browser</text></g>
${marker.replace('<svg ','<svg x="30" y="24" ').replace('width="120mm" height="120mm"','width="120" height="120"')}
<g fill="#151b22" font-family="Arial, sans-serif" text-anchor="middle"><text x="90" y="150" font-size="3.5">Joy appears on this large square ↑</text></g>
${qr.replace('<svg ','<svg x="119" y="153" width="45" height="45" ')}
<g fill="#151b22" font-family="Arial, sans-serif"><text x="12" y="163" font-size="4.5" font-weight="bold">1. Scan the small QR →</text><text x="12" y="174" font-size="4">2. Tap Start AR and allow Camera.</text><text x="12" y="185" font-size="4">3. Point at the large square above.</text><text x="12" y="202" font-size="3.1">Print at 100%. The outside black square must measure 80 × 80 mm.</text></g></svg>`;
await fs.writeFile('public/ar-card.svg',card);
await sharp(Buffer.from(card),{density:200}).png().toFile('public/ar-card.png');
console.log(`Created printable Web AR card and QR: ${launchUrl}`);
