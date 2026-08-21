"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Input, Select, Field } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { useAdminAuth } from "@/components/admin/AdminAuth";

const TABS = ["General", "Organization", "Profile", "Security", "Integrations"] as const;

export default function SettingsPage() {
  const toast = useToast();
  const { admin } = useAdminAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("General");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure the platform. Changes are stored locally in this phase." />
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${tab === t ? "bg-adm-fg text-adm-bg" : "text-adm-muted hover:bg-adm-surface2"}`}>{t}</button>
          ))}
        </nav>

        <Card className="p-6">
          {tab === "General" && (
            <Section title="General" onSave={() => toast.success("General settings saved (local).")}>
              <Field label="Platform name"><Input defaultValue="Kick To Tech Admin" /></Field>
              <Field label="Timezone"><Select defaultValue="IST"><option value="IST">Asia/Kolkata (IST)</option><option>UTC</option></Select></Field>
              <Field label="Default currency"><Input defaultValue="INR (₹)" /></Field>
            </Section>
          )}
          {tab === "Organization" && (
            <Section title="Organization" onSave={() => toast.success("Organization details saved (local).")}>
              <Field label="Legal name"><Input defaultValue="Kick To Tech" /></Field>
              <Field label="Support email"><Input defaultValue="admin@kicktotech.in" /></Field>
              <Field label="Location"><Input defaultValue="Pune, Maharashtra" /></Field>
            </Section>
          )}
          {tab === "Profile" && (
            <Section title="Admin profile" onSave={() => toast.success("Profile updated (local).")}>
              <Field label="Name"><Input defaultValue={admin?.name} /></Field>
              <Field label="Email"><Input defaultValue={admin?.email} /></Field>
              <Field label="Role"><div><Badge tone="purple">{admin?.role.replace("_", " ")}</Badge></div></Field>
            </Section>
          )}
          {tab === "Security" && (
            <Section title="Security" onSave={() => toast.info("Security settings are managed by your authentication provider.")}>
              <Field label="Two-factor authentication"><Badge tone="yellow">Coming soon</Badge></Field>
              <Field label="Session timeout"><Select defaultValue="30"><option value="30">30 minutes</option><option value="60">1 hour</option></Select></Field>
              <p className="text-xs text-adm-muted">Two-factor authentication and configurable session policies are coming soon.</p>
            </Section>
          )}
          {tab === "Integrations" && (
            <div>
              <h3 className="mb-4 text-sm font-bold text-adm-fg">Integrations</h3>
              <ul className="space-y-2">
                {[["Firestore database", "Connected"], ["Email (transactional)", "Not connected"], ["Payments (manual UPI)", "Active"], ["Certificate storage", "Connected"]].map(([name, state]) => (
                  <li key={name} className="flex items-center justify-between rounded-lg border border-adm-border px-4 py-3">
                    <span className="text-sm font-medium text-adm-fg">{name}</span>
                    <Badge tone={state === "Connected" || state === "Active" ? "green" : "red"}>{state}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Section({ title, onSave, children }: { title: string; onSave: () => void; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-adm-fg">{title}</h3>
      <div className="space-y-4">{children}</div>
      <div className="mt-6 border-t border-adm-border pt-4"><Button variant="primary" onClick={onSave}>Save changes</Button></div>
    </div>
  );
}
