import {getCatalog} from '@/lib/catalog';
import {FatuPolicy} from '@/components/fatu-policy';
export default async function Page(){const{catalog}=await getCatalog();return <FatuPolicy initialCatalog={catalog}/>;}
