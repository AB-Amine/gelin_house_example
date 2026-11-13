import {getCatalog} from '@/lib/catalog';
import {FatuAbout} from '@/components/fatu-pages';
export const metadata={title:'Notre maison'};
export default async function Page(){const{catalog}=await getCatalog();return <FatuAbout catalog={catalog}/>;}
