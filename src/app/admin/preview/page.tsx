import {notFound} from 'next/navigation';
import {FatuPreview} from '@/components/fatu-preview';
export const metadata={title:'Development preview | Fatu Makeup Artist',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{section?:string;date?:string;view?:string}>}){if(process.env.NODE_ENV!=='development')notFound();const p=await searchParams;return <FatuPreview section={p.section??'overview'} date={p.date} view={p.view}/>;}
