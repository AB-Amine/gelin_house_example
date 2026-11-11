import { z } from 'zod';
import { selectionSchema, contactSchema } from './domain';
export const citySelection = selectionSchema.extend({
  city: z.uuid(),
  code: z.string().trim().max(60).default(''),
});
export const citySlot = citySelection.extend({
  start: z.iso.datetime({ offset: true }),
});
export const cityAvailability = citySelection.extend({ date: z.iso.date() });
export const fatuBookingSchema = citySlot.extend({
  address: z.string().trim().min(5).max(500),
  details: z.string().max(2000).default(''),
  contact: contactSchema,
  key: z.uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().max(30).default(''),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
  website: z.literal('').default(''),
});
