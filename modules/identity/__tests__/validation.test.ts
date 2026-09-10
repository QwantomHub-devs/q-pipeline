import { describe, it, expect } from 'vitest';
import { createFellowProfileSchema, updateFellowProfileSchema } from '../validation';

describe('Fellow Profile Validation Schemas (Rule 5)', () => {
  describe('createFellowProfileSchema', () => {
    it('validates a valid create profile input payload', () => {
      const validPayload = {
        clerkUserId: 'user_clerk_123',
        email: 'TEST.FELLOW@EXAMPLE.COM ',
        firstName: 'Chukwuemeka',
        lastName: 'Developer',
        phoneNumber: '+2348000000000',
        country: 'NG',
        skills: ['TypeScript', 'Next.js'],
      };

      const result = createFellowProfileSchema.parse(validPayload);
      expect(result.email).toBe('test.fellow@example.com');
      expect(result.firstName).toBe('Chukwuemeka');
      expect(result.country).toBe('NG');
    });

    it('rejects an invalid email format', () => {
      const invalidPayload = {
        clerkUserId: 'user_clerk_123',
        email: 'not-an-email',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      expect(() => createFellowProfileSchema.parse(invalidPayload)).toThrow();
    });

    it('rejects empty first or last names', () => {
      const invalidPayload = {
        clerkUserId: 'user_clerk_123',
        email: 'test@example.com',
        firstName: '',
        lastName: 'Doe',
      };

      expect(() => createFellowProfileSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('updateFellowProfileSchema', () => {
    it('allows valid partial updates', () => {
      const validUpdate = {
        firstName: 'Emeka',
        bio: 'Senior Software Engineer specializing in AI tooling',
        skills: ['Next.js', 'Python', 'Drizzle'],
      };

      const result = updateFellowProfileSchema.parse(validUpdate);
      expect(result.firstName).toBe('Emeka');
      expect(result.bio).toContain('AI tooling');
    });

    it('rejects attempts to tamper with protected fields like stage or tier', () => {
      const tamperingPayload = {
        firstName: 'Emeka',
        stage: 'fellow', // Forbidden field!
      };

      expect(() => updateFellowProfileSchema.parse(tamperingPayload)).toThrow();
    });

    it('rejects attempts to tamper with clerkUserId or id', () => {
      const tamperingPayload = {
        clerkUserId: 'user_hacked_999', // Forbidden field!
      };

      expect(() => updateFellowProfileSchema.parse(tamperingPayload)).toThrow();
    });
  });
});
