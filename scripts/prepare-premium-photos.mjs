// Licensed editorial assets only; never inserted into the salon's authentic portfolio.
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const photos=[
 {id:'hair',pexels:20046793,source:'https://www.pexels.com/photo/woman-posing-at-in-a-hair-salon-20046793/',author:'TONI&GUY PONDICHERRY',alt:'Chevelure ondulée — photographie d’inspiration'},
 {id:'nails',pexels:6135696,source:'https://www.pexels.com/photo/a-person-applying-nail-polish-on-a-fingernail-6135696/',author:'Gabriel Puyén',alt:'Application de vernis rouge — photographie d’inspiration'},
 {id:'facial',pexels:7446659,source:'https://www.pexels.com/photo/woman-getting-a-facial-treatment-7446659/',author:'Gustavo Fring',alt:'Soin du visage — photographie d’inspiration'},
 {id:'caftan',pexels:30457749,source:'https://www.pexels.com/fr-fr/photo/mode-elegante-du-caftan-marocain-traditionnel-30457749/',author:'MAG Photography',alt:'Caftan marocain brodé — photographie d’inspiration, modèle non contractuel'},
 {id:'bridal',pexels:17259708,source:'https://www.pexels.com/photo/bride-getting-her-makeup-done-before-the-wedding-17259708/',author:'Thanh Nhan',alt:'Préparation beauté d’une mariée — photographie d’inspiration'},
 {id:'interior',pexels:7750125,source:'https://www.pexels.com/photo/cozy-beauty-salon-7750125/',author:'Max Vakhtbovych',alt:'Ambiance de salon — photographie d’inspiration, pas les locaux GELIN HOUSE'},
];
await mkdir('public/images/premium',{recursive:true});
const manifest=await Promise.all(photos.map(async(photo)=>{
 const download=`https://images.pexels.com/photos/${photo.pexels}/pexels-photo-${photo.pexels}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
 const response=await fetch(download,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`${photo.id}: HTTP ${response.status}`);
 const buffer=Buffer.from(await response.arrayBuffer());const metadata=await sharp(buffer).metadata();const variants=[];
 for(const width of [320,720,1400]){const filename=`public/images/premium/${photo.id}-${width}.webp`;const bytes=await sharp(buffer).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer();await writeFile(filename,bytes);variants.push({width,path:filename.replace('public',''),bytes:bytes.length});}
 console.log(`Prepared ${photo.id}`);
 return {...photo,license:'https://www.pexels.com/license/',verified:'2026-11-12',download,sha256:createHash('sha256').update(buffer).digest('hex'),width:metadata.width,height:metadata.height,illustrative:true,variants};
}));
await writeFile('public/images/premium/credits.json',JSON.stringify(manifest,null,2)+'\n');
