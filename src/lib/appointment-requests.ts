import { z } from 'zod';
import { phoneSchema } from './domain';
export const appointmentRequestSchema = z.object({
  services: z
    .array(z.uuid())
    .min(1)
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.union([z.email().max(254), z.literal('')]).default(''),
  notes: z.string().trim().max(500).default(''),
  consent: z.literal(true),
  website: z.literal('').default(''),
});
export type AppointmentRequestRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  message: string;
  created_at: string;
  handled: boolean;
  service_ids: string[];
  preferred_date: string | null;
  preferred_time: string | null;
  request_status: 'pending' | 'confirmed' | 'rejected';
  appointment_id: string | null;
  appointments?: {
    reference: string;
    starts_at: string;
    status: string;
  } | null;
};
