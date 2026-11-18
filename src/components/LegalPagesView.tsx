import { ArrowLeft } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms';

interface LegalPagesViewProps {
  docType: LegalDocType;
  onBackHome: () => void;
  onSwitchDoc: (next: LegalDocType) => void;
}

export function LegalPagesView({
  docType,
  onBackHome,
  onSwitchDoc,
}: LegalPagesViewProps) {
  return (
    <article className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0369A1] hover:text-[#075985] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1] rounded"
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4" />
          <span>Back to ClearAir Winter</span>
        </button>

        <div className="flex items-center gap-4 text-xs font-medium">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              onSwitchDoc('privacy');
            }}
            aria-current={docType === 'privacy' ? 'page' : undefined}
            className={`pb-1 border-b-2 transition-colors ${
              docType === 'privacy'
                ? 'text-[#0369A1] border-[#0369A1]'
                : 'text-[#64748B] border-transparent hover:text-[#0F172A]'
            }`}
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              onSwitchDoc('terms');
            }}
            aria-current={docType === 'terms' ? 'page' : undefined}
            className={`pb-1 border-b-2 transition-colors ${
              docType === 'terms'
                ? 'text-[#0369A1] border-[#0369A1]'
                : 'text-[#64748B] border-transparent hover:text-[#0F172A]'
            }`}
          >
            Terms of Service
          </a>
        </div>
      </div>

      {docType === 'privacy' ? (
        <div className="space-y-5 text-sm leading-relaxed text-[#334155]">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Privacy Policy — ClearAir Winter
            </h1>
            <p className="text-xs text-[#64748B]">
              Effective Date: November 18, 2026 · Contact: siddhant23012002@gmail.com
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              1. Information We Collect
            </h2>
            <p>
              ClearAir Winter helps households and neighborhoods monitor winter smog
              and adopt lower-emission daily routines. Depending on the features you
              use, we process:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Location &amp; Air Quality Queries:</strong> City names or
                approximate latitude/longitude coordinates you enter or share via
                browser geolocation to retrieve real-time air quality and weather
                forecasts from Open-Meteo.
              </li>
              <li>
                <strong>Household Profile Preferences (Optional Sign-In):</strong>{' '}
                Home type, heating/cooking fuel choices, commute mode, indoor air
                gear, and sensitive-group indicators saved in Firebase Firestore when
                you choose to sync your profile.
              </li>
              <li>
                <strong>Google Account &amp; Google Tasks Data (Optional):</strong>{' '}
                If you sign in with Google, we receive your basic profile (name,
                email, user ID) via Firebase Authentication. If you grant Google
                Tasks access (<code className="font-mono text-xs">https://www.googleapis.com/auth/tasks</code>),
                we access your task lists solely to view, create, update, or remove
                your chosen ClearAir action items upon your explicit click.
              </li>
              <li>
                <strong>Community Board Posts:</strong> Pledges and neighborhood smog
                reports you explicitly publish to the public Community Board using
                your chosen display alias.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              2. How We Use Your Data
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Deliver location-specific winter smog telemetry and 7-day trend comparisons.</li>
              <li>Generate tailored low-emission routines, indoor air quality hacks, and answers via server-side AI processing.</li>
              <li>Sync your private household routines across devices in Firebase Firestore.</li>
              <li>Export selected mitigation steps to your personal Google Tasks list when requested by you.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              3. Google API Services User Data Policy &amp; Token Security
            </h2>
            <p>
              ClearAir Winter&apos;s use and transfer of information received from
              Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0369A1] underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Google OAuth access tokens
              are kept strictly in browser memory during your active session and are
              never stored in persistent browser storage, sold, or used for
              advertising.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              4. Data Sharing, Retention &amp; Deletion
            </h2>
            <p>
              We do not sell personal data or share it with advertisers. Private
              household profiles and saved routines are accessible only to your
              authenticated account under Firebase Firestore security rules. You can
              delete your saved routines, community pledges, smog reports, or Google
              Tasks items directly within the app at any time, or request account
              data deletion by emailing{' '}
              <a
                href="mailto:siddhant23012002@gmail.com"
                className="text-[#0369A1] underline"
              >
                siddhant23012002@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-5 text-sm leading-relaxed text-[#334155]">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Terms of Service — ClearAir Winter
            </h1>
            <p className="text-xs text-[#64748B]">
              Effective Date: November 18, 2026 · Contact: siddhant23012002@gmail.com
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ClearAir Winter, you agree to these Terms of
              Service and our{' '}
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchDoc('privacy');
                }}
                className="text-[#0369A1] underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              2. Informational &amp; Educational Guidance Only
            </h2>
            <p>
              ClearAir Winter provides air quality telemetry (via Open-Meteo),
              estimated indoor exposure modeling, and AI-assisted lifestyle
              suggestions for informational and community planning purposes only. It
              is not medical, clinical, or emergency-response advice. Always follow
              local public health advisories and consult qualified healthcare
              professionals for respiratory or medical conditions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              3. User Accounts, Google Tasks &amp; Community Content
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Optional Sign-In:</strong> Core air quality lookup, plan
                generation, and impact simulation work without signing in. Sign-in is
                only required for cloud sync, community posting, and Google Tasks
                export.
              </li>
              <li>
                <strong>Community Conduct:</strong> When posting neighborhood pledges
                or smog observations, do not include personal contact details,
                misleading emergency claims, or abusive content.
              </li>
              <li>
                <strong>Third-Party Integrations:</strong> Use of Google Sign-In and
                Google Tasks is optional and remains subject to Google&apos;s Terms of
                Service; you may revoke app permissions at any time from your Google
                Account security settings.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">
              4. Availability &amp; Limitation of Liability
            </h2>
            <p>
              ClearAir Winter is provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis without warranties of uninterrupted telemetry
              accuracy or fitness for a particular purpose. To the fullest extent
              permitted by law, the maintainers are not liable for indirect or
              consequential damages arising from use of the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#0F172A]">5. Contact</h2>
            <p>
              Questions regarding these Terms may be sent to{' '}
              <a
                href="mailto:siddhant23012002@gmail.com"
                className="text-[#0369A1] underline"
              >
                siddhant23012002@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
