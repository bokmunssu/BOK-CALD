import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs/promises';
const svg = await fs.readFile('public/tomo.svg');
const png = await sharp(svg).resize(512,512).png().toBuffer();
await fs.writeFile('public/tomo.png', png);
const sizes = await Promise.all([16,32,48,64,128,256].map(size => sharp(svg).resize(size,size).png().toBuffer()));
await fs.writeFile('public/tomo.ico', await pngToIco(sizes));
const blocks = await Promise.all([[512,'ic09'],[1024,'ic10']].map(async ([size, type]) => {
  const data = await sharp(svg).resize(size,size).png().toBuffer(); const header = Buffer.alloc(8);
  header.write(type); header.writeUInt32BE(data.length + 8,4); return Buffer.concat([header,data]);
}));
const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(8+blocks.reduce((sum,b)=>sum+b.length,0),4);
await fs.writeFile('public/tomo.icns', Buffer.concat([header,...blocks]));
console.log('TOMO application icons generated.');
