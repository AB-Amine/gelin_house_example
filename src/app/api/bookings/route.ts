import {NextRequest} from 'next/server';
import {fatuBookingSchema} from '@/lib/fatu-schemas';
import {body,failure,ok,rateLimit,sameOrigin,tokenHash} from '@/lib/http';
import {privileged} from '@/lib/supabase';
import {clientSession} from '@/lib/client-auth';
export async function POST(req:NextRequest){try{sameOrigin(req);await rateLimit(req,'booking',8);const v=fatuBookingSchema.parse(await body(req));const session=await clientSession();const{data,error}=await privileged().rpc('create_fatu_booking',{p_services:v.services,p_start:v.start,p_city:v.city,p_address:v.address,p_details:v.details,p_code:v.code,p_name:v.contact.name,p_phone:v.contact.phone,p_email:v.contact.email,p_notes:v.contact.notes,p_key:v.key,p_token_hash:tokenHash(v.token),p_fingerprint:v.fingerprint,p_user:session?.user.id??null});if(error)throw error;return ok(data);}catch(e){return failure(e);}}
