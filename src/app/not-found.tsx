import Link from 'next/link';
import {L} from '@/components/locale-provider';
export default function Page(){return <main id="main" className="fatu-container fatu-section"><span className="fatu-eyebrow">FATU / 404</span><h1 className="fatu-title"><L text="common.notFound"/></h1><Link className="fatu-button" href="/"><L text="nav.home"/> ↗</Link></main>;}
