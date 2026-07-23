export default function SecurityPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 prose prose-invert">
      <h1 className="text-3xl font-bold text-foreground mb-4">Security Policy</h1>
      <p className="text-muted-foreground mb-6">
        We take security seriously. If you discover a vulnerability,
        please report it responsibly.
      </p>
      <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Reporting</h2>
      <p className="text-muted-foreground mb-6">
        Email:{' '}
        <a href="mailto:security@yourplatform.com" className="text-primary hover:underline font-medium">
          security@yourplatform.com
        </a>
      </p>
      <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">What to Include</h2>
      <ul className="list-disc ps-6 text-muted-foreground space-y-2 mb-6">
        <li>Description of the vulnerability</li>
        <li>Steps to reproduce</li>
        <li>Potential impact</li>
        <li>Any suggested fixes</li>
      </ul>
      <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Our Commitment</h2>
      <p className="text-muted-foreground">
        We will acknowledge your report within 48 hours,
        provide a resolution timeline within 7 days,
        and credit you in our hall of fame (if desired).
      </p>
    </div>
  );
}
