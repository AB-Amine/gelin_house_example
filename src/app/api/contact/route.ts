import {NextRequest} from 'next/server';
import {enquirySchema} from '@/lib/fatu-schemas';
import {body,failure,ok,rateLimit,sameOrigin} from '@/lib/http';
import {privileged} from '@/lib/supabase';
export async function POST(req:NextRequest){try{sameOrigin(req);await rateLimit(req,'contact',5);const v=enquirySchema.parse(await body(req));const{error}=await privileged().from('contact_messages').insert({name:v.name,email:v.email,phone:v.phone,subject:v.subject,message:v.message});if(error)throw error;return ok({saved:true});}catch(e){return failure(e);}}
