import {getCatalog} from '@/lib/catalog';
import {FatuPortfolio} from '@/components/fatu-pages';
export const metadata={title:'Portfolio · GELIN HOUSE'};
export default async function Page(){const{catalog}=await getCatalog();return <FatuPortfolio catalog={catalog}/>;}
