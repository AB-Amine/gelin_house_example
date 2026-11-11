'use client';
import type {Catalog} from '@/lib/domain';
import {localizedCatalog} from '@/lib/localization';
import {useI18n} from './locale-provider';
export function useWebsiteCopy(catalog:Catalog){const i18n=useI18n();const localized=localizedCatalog(catalog,i18n.locale);return {...i18n,catalog:localized,t:(key:string,values?:Record<string,string|number>)=>{const entry=localized.content.find(c=>c.key===key);return entry?(entry.body||entry.title):i18n.t(key,values);}};}
