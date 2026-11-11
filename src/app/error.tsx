'use client';
import {useI18n} from '@/components/locale-provider';
export default function ErrorPage({reset}:{reset:()=>void}){const{t}=useI18n();return <main id="main" className="fatu-container fatu-section"><h1 className="fatu-title">{t('common.error')}</h1><button className="fatu-button" onClick={reset}>{t('common.retry')}</button></main>;}
