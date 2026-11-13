import { describe, it, expect } from 'vitest';
import { appointmentRequestSchema } from './appointment-requests';
const input = {
  services: [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
  ],
  date: '2027-01-04',
  time: '14:30',
  name: 'Test client',
  phone: '0612345678',
  consent: true,
};
describe('simple appointment requests', () => {
  it('accepts two services, name and phone without email or account', () => {
    const parsed = appointmentRequestSchema.parse(input);
    expect(parsed.email).toBe('');
    expect(parsed.phone).toBe('+212612345678');
    expect(parsed.services).toHaveLength(2);
  });
  it('rejects invalid times, dates and duplicate services', () => {
    for (const change of [
      { time: '25:99' },
      { date: '2027-02-31' },
      { services: [input.services[0], input.services[0]] },
    ])
      expect(
        appointmentRequestSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
  });
  it('requires valid contact information, consent and an empty honeypot', () => {
    for (const change of [
      { phone: 'abc' },
      { name: 'x' },
      { consent: false },
      { website: 'spam' },
    ])
      expect(
        appointmentRequestSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
  });
});
