import {getCatalog} from '@/lib/catalog';
import {ServiceCatalog} from '@/components/catalog';
import {FatuHeading} from '@/components/fatu-pages';
export const metadata={title:'Services · GELIN HOUSE'};
export default async function Page({searchParams}:{searchParams:Promise<{categorie?:string}>}){const{catalog}=await getCatalog();return <div className="fatu-container"><FatuHeading title="nav.services" body="services.body"/><ServiceCatalog catalog={catalog} initialCategory={(await searchParams).categorie}/></div>;}
