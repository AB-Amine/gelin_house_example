import {notFound} from 'next/navigation';
import {getCatalog} from '@/lib/catalog';
import {FatuServiceDetail} from '@/components/fatu-service-detail';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const{catalog}=await getCatalog();const s=catalog.services.find(s=>s.slug===slug);return {title:s?.name??'Fatu Makeup Artist',description:s?.description.slice(0,160),alternates:{canonical:`/services/${slug}`}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const{catalog}=await getCatalog();if(!catalog.services.some(s=>s.slug===slug))notFound();return <FatuServiceDetail initialCatalog={catalog} slug={slug}/>;}
