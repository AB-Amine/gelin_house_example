import {getCatalog} from '@/lib/catalog';
import {FatuContact} from '@/components/fatu-contact';
import {publicConfig} from '@/lib/supabase';
export const metadata={title:'Contact · GELIN HOUSE'};
export default async function Page(){const{catalog}=await getCatalog();return <FatuContact catalog={catalog} configured={!!publicConfig()}/>;}
