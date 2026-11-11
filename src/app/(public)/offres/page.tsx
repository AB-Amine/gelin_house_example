import {getCatalog} from '@/lib/catalog';
import {FatuOffers} from '@/components/fatu-offers';
export default async function Page(){const{catalog}=await getCatalog();return <FatuOffers initialCatalog={catalog}/>;}
