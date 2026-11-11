import {getCatalog} from '@/lib/catalog';
import {FatuHeading,FatuFaq} from '@/components/fatu-pages';
export default async function Page(){const{catalog}=await getCatalog();return <div className="fatu-container"><FatuHeading title="nav.faq"/><section className="fatu-section"><FatuFaq catalog={catalog}/></section></div>;}
