import {getCatalog} from '@/lib/catalog';
import {FatuContact} from '@/components/fatu-contact';
import {publicConfig} from '@/lib/supabase';
export const metadata={title:'Contact · Fatu Makeup Artist'};
export default async function Page(){const{catalog}=await getCatalog();return <FatuContact catalog={catalog} configured={!!publicConfig()}/>;}
