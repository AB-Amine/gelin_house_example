import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const manifest=JSON.parse((await readFile('public/images/manifest.json','utf8')).replace(/^\uFEFF/,''));
for(const item of manifest){
 const meta=await sharp(item.input).metadata();
 item.width=meta.width;item.height=meta.height;item.variants=[];
 for(const width of [320,720,1400]){const output=`public${item.path}-${width}.webp`;await sharp(item.input).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(output);item.variants.push({width,path:`${item.path}-${width}.webp`});}
 console.log(`Prepared ${item.id}`);
}
await writeFile('public/images/manifest.json',JSON.stringify(manifest,null,2)+'\n');
