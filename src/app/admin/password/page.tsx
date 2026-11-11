import {redirect} from 'next/navigation';
import {getStaff} from '@/lib/auth';
import {FatuAdminAuth} from '@/components/fatu-admin-auth';
import {L} from '@/components/locale-provider';
export default async function Page(){if(!(await getStaff()))redirect('/admin/login');return <main id="main" className="fatu-admin-login"><h1><L text="auth.newPassword"/></h1><FatuAdminAuth configured mode="password"/></main>;}
