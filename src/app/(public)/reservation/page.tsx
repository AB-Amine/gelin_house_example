import {getCatalog} from '@/lib/catalog';
import {FatuBooking} from '@/components/fatu-booking';
import {FatuHeading} from '@/components/fatu-pages';
export const metadata={title:'Booking · Fatu Makeup Artist',robots:{index:false,follow:false}};
export default async function Page(){const{catalog}=await getCatalog();return <div className="fatu-container"><FatuHeading title="booking.title" body="common.notConfirmed"/><FatuBooking catalog={catalog}/></div>;}
