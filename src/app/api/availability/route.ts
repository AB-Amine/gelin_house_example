import {NextRequest} from 'next/server';
import {cityAvailability} from '@/lib/fatu-schemas';
import {body,failure,ok,rateLimit,sameOrigin} from '@/lib/http';
import {privileged} from '@/lib/supabase';
export async function POST(req:NextRequest){try{sameOrigin(req);await rateLimit(req,'availability',60);const v=cityAvailability.parse(await body(req));const{data,error}=await privileged().rpc('fatu_slots',{p_services:v.services,p_date:v.date,p_city:v.city,p_code:v.code});if(error)throw error;return ok(data);}catch(e){return failure(e);}}
