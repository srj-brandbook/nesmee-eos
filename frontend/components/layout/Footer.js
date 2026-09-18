import { appName } from "@/config/env";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-display font-semibold">{appName}</p>
          <p className="mt-2 text-sm text-muted">A reusable production foundation for future SaaS products.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <a href="#features" className="block">Features</a>
            <a href="#pricing" className="block">Pricing</a>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <a href="#faq" className="block">FAQ</a>
            <a href="mailto:support@example.com" className="block">Support</a>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Legal</p>
          <p className="mt-3 text-sm text-muted">Privacy and terms can be added per product.</p>
        </div>
      </div>
    </footer>
  );
}
