import {getCatalog} from '@/lib/catalog';
import {FatuAbout} from '@/components/fatu-pages';
export const metadata={title:'Fatu · Makeup Artist'};
export default async function Page(){const{catalog}=await getCatalog();return <FatuAbout catalog={catalog}/>;}
