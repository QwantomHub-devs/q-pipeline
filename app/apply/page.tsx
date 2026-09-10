'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { submitIntakeAction } from '@/modules/intake/actions';

export default function ApplicationPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stepCardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    country: 'NG',
    cohortWindow: '2026-Q3',
    outreachChannel: 'direct' as const,
    nyscStatus: 'serving' as const,
    university: '',
    yearsOfExperience: 0,
    primaryTrack: 'fullstack_ai',
    bio: '',
    githubHandle: '',
    linkedinUrl: '',
  });

  useGSAP(
    () => {
      if (stepCardRef.current) {
        gsap.fromTo(
          stepCardRef.current,
          { opacity: 0, y: 15, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [step], scope: containerRef }
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleNext = () => {
    if (step === 1 && (!formData.firstName || !formData.lastName || !formData.email)) {
      setErrorMessage('Please fill in your name and email before proceeding.');
      return;
    }
    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitIntakeAction(formData);
      setSubmittedSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred submitting your intake.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="QwantomHub Applicant Intake"
        subtitle="Discover Stage Signup & Cohort Application"
        badge={{ label: 'Intake Portal', variant: 'accent' }}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full mx-auto">
        {submittedSuccess ? (
          <div className="w-full bg-[var(--qh-surface)] rounded-xl p-8 border border-[var(--qh-accent)] shadow-md text-center">
            <div className="w-16 h-16 bg-[var(--qh-accent-deep)] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-[var(--qh-ink)]">
              Application Submitted Successfully!
            </h2>
            <p className="text-[var(--qh-muted)] mb-6 leading-relaxed">
              Your intake profile has been created for cohort window <strong className="text-[var(--qh-ink)]">{formData.cohortWindow}</strong>.
              You are eligible for Stage 0 (Baseline Screen) & Stage 1 (AI Code Review).
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg bg-[var(--qh-ink)] text-white font-semibold hover:bg-[var(--qh-accent-deep)] transition-colors"
            >
              Return to Home
            </Link>
          </div>
        ) : (
          <div ref={stepCardRef} className="w-full bg-[var(--qh-surface)] rounded-xl p-8 border border-[var(--qh-accent)] shadow-md">
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-between mb-8 border-b border-[var(--qh-accent)] pb-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      step === num
                        ? 'bg-[var(--qh-ink)] text-white'
                        : step > num
                        ? 'bg-[var(--qh-accent-deep)] text-white'
                        : 'bg-[var(--qh-bg)] text-[var(--qh-muted)]'
                    }`}
                  >
                    {num}
                  </div>
                  <span className="text-xs font-semibold text-[var(--qh-muted)] hidden sm:inline">
                    {num === 1 ? 'Identity' : num === 2 ? 'Affiliation' : 'Track & Submit'}
                  </span>
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 text-sm font-medium border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Identity */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[var(--qh-ink)] mb-4">
                    Step 1: Personal Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+234..."
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Affiliation & Outreach */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[var(--qh-ink)] mb-4">
                    Step 2: Affiliation & Channel
                  </h2>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      Outreach Referral Channel *
                    </label>
                    <select
                      name="outreachChannel"
                      value={formData.outreachChannel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    >
                      <option value="direct">Direct Application</option>
                      <option value="nysc_camp">NYSC Camp Outreach</option>
                      <option value="university">University Partner</option>
                      <option value="3mtt">3MTT Program</option>
                      <option value="partner_org">Partner Organization</option>
                      <option value="social_media">Social Media</option>
                      <option value="referral">Fellow Referral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      NYSC Status
                    </label>
                    <select
                      name="nyscStatus"
                      value={formData.nyscStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    >
                      <option value="serving">Currently Serving</option>
                      <option value="completed">Completed NYSC</option>
                      <option value="exempt">Exempt</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      University / Institution
                    </label>
                    <input
                      type="text"
                      name="university"
                      value={formData.university}
                      onChange={handleInputChange}
                      placeholder="e.g. University of Lagos"
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Track & Experience */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[var(--qh-ink)] mb-4">
                    Step 3: Track & Background
                  </h2>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      Primary Engineering Track *
                    </label>
                    <select
                      name="primaryTrack"
                      value={formData.primaryTrack}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    >
                      <option value="fullstack_ai">Fullstack AI & Production Engineering</option>
                      <option value="backend_systems">Backend Systems & Cloud Infrastructure</option>
                      <option value="frontend">Frontend Architecture & Mobile</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      Years of Software Experience
                    </label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      min="0"
                      max="30"
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                      GitHub Handle
                    </label>
                    <input
                      type="text"
                      name="githubHandle"
                      value={formData.githubHandle}
                      onChange={handleInputChange}
                      placeholder="e.g. octocat"
                      className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)]"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-[var(--qh-accent)]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink)] font-medium hover:bg-[var(--qh-accent)] transition-colors"
                  >
                    Back
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 rounded-md bg-[var(--qh-ink)] text-white font-medium hover:bg-[var(--qh-accent-deep)] transition-colors"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-md bg-[var(--qh-ink)] text-white font-medium hover:bg-[var(--qh-accent-deep)] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
