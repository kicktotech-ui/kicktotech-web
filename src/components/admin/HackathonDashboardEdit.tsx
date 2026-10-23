"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Input,
  Textarea,
  Field,
  Select,
  Skeleton,
} from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { adminHackathonService } from "@/services/admin";
import type {
  HackathonDashboardConfig,
  HackathonScheduleItem,
  HackathonResourceItem,
} from "@/types";
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  CalendarDays,
  MapPin,
  Megaphone,
  Link as LinkIcon,
  HelpCircle,
  Trophy,
  CheckCircle2,
} from "lucide-react";

export function HackathonDashboardEdit() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<HackathonDashboardConfig | null>(null);

  // New schedule item modal/inline state
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const [newScheduleDesc, setNewScheduleDesc] = useState("");
  const [newScheduleStatus, setNewScheduleStatus] = useState<"upcoming" | "live" | "completed">("upcoming");

  // New resource item state
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResDesc, setNewResDesc] = useState("");
  const [newResType, setNewResType] = useState<"link" | "document" | "code" | "community">("link");

  useEffect(() => {
    (async () => {
      try {
        const data = await adminHackathonService.getDashboardConfig();
        setConfig(data);
      } catch (err) {
        console.error("Failed loading hackathon dashboard config:", err);
        toast.error("Failed to load dashboard configuration.");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await adminHackathonService.updateDashboardConfig(config);
      setConfig(updated);
      toast.success("Hackathon dashboard details updated successfully! Changes reflect directly on participant dashboards.");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddScheduleItem() {
    if (!newScheduleTime.trim() || !newScheduleTitle.trim()) {
      toast.error("Please enter both Time and Title for the schedule milestone.");
      return;
    }
    if (!config) return;

    const newItem: HackathonScheduleItem = {
      id: `sch-${Date.now()}`,
      time: newScheduleTime.trim(),
      title: newScheduleTitle.trim(),
      description: newScheduleDesc.trim() || undefined,
      status: newScheduleStatus,
    };

    setConfig({
      ...config,
      schedule: [...config.schedule, newItem],
    });

    setNewScheduleTime("");
    setNewScheduleTitle("");
    setNewScheduleDesc("");
    setNewScheduleStatus("upcoming");
    toast.success("Schedule item added.");
  }

  function handleRemoveScheduleItem(id: string) {
    if (!config) return;
    setConfig({
      ...config,
      schedule: config.schedule.filter((s) => s.id !== id),
    });
  }

  function handleUpdateScheduleStatus(id: string, status: "upcoming" | "live" | "completed") {
    if (!config) return;
    setConfig({
      ...config,
      schedule: config.schedule.map((s) => (s.id === id ? { ...s, status } : s)),
    });
  }

  function handleAddResource() {
    if (!newResTitle.trim() || !newResUrl.trim()) {
      toast.error("Please enter a Title and a valid URL for the resource.");
      return;
    }
    if (!config) return;

    const newRes: HackathonResourceItem = {
      id: `res-${Date.now()}`,
      title: newResTitle.trim(),
      url: newResUrl.trim(),
      description: newResDesc.trim() || undefined,
      type: newResType,
    };

    setConfig({
      ...config,
      resources: [...config.resources, newRes],
    });

    setNewResTitle("");
    setNewResUrl("");
    setNewResDesc("");
    setNewResType("link");
    toast.success("Resource added.");
  }

  function handleRemoveResource(id: string) {
    if (!config) return;
    setConfig({
      ...config,
      resources: config.resources.filter((r) => r.id !== id),
    });
  }

  if (loading || !config) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-adm-border bg-adm-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
              <Trophy className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-adm-fg">Hackathon Dashboard Editor</h2>
            <Badge tone="green">Live Sync</Badge>
          </div>
          <p className="mt-1 text-xs text-adm-muted">
            All edits saved here immediately update the Hackathon section on the participant dashboard (<code className="text-accent">/internship/dashboard?tab=hackathon</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open("/internship/dashboard?tab=hackathon", "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Preview Dashboard
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Dashboard Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Event Core Details */}
        <Card className="p-6">
          <CardHeader
            title="Event Overview & Details"
            subtitle="Core event details displayed on the participant dashboard"
          />
          <div className="mt-4 space-y-4">
            <Field label="Event Title">
              <Input
                value={config.eventName}
                onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                placeholder="e.g. PromptWars × KICK To TECH"
              />
            </Field>

            <Field label="Tagline / Subtitle">
              <Input
                value={config.tagline}
                onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                placeholder="e.g. Where ideas meet AI • Imagine, Innovate, Impact"
              />
            </Field>

            <Field label="Event Description">
              <Textarea
                rows={3}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Description of the hackathon..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event Date">
                <Input
                  value={config.date}
                  onChange={(e) => setConfig({ ...config, date: e.target.value })}
                  placeholder="e.g. 28 October 2026"
                />
              </Field>

              <Field label="Event Time">
                <Input
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                  placeholder="e.g. 9:00 AM – 6:30 PM IST"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reporting Time">
                <Input
                  value={config.reportingTime}
                  onChange={(e) => setConfig({ ...config, reportingTime: e.target.value })}
                  placeholder="e.g. 8:45 AM IST"
                />
              </Field>

              <Field label="Participation Mode">
                <Input
                  value={config.mode}
                  onChange={(e) => setConfig({ ...config, mode: e.target.value })}
                  placeholder="e.g. Offline / In-person"
                />
              </Field>
            </div>

            <Field label="Venue / Location">
              <Input
                value={config.venue}
                onChange={(e) => setConfig({ ...config, venue: e.target.value })}
                placeholder="e.g. Library Building, JSPM University, Pune"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hackathon Theme">
                <Input
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                  placeholder="e.g. Build with AI • GenAI & Automation"
                />
              </Field>

              <Field label="Prize Pool">
                <Input
                  value={config.prizePool}
                  onChange={(e) => setConfig({ ...config, prizePool: e.target.value })}
                  placeholder="e.g. ₹30,000 Prize Pool + Goodies"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Card 2: Live Announcements & Official Links */}
        <div className="space-y-6">
          <Card className="p-6">
            <CardHeader
              title="Live Announcement Banner"
              subtitle="Broadcast critical alerts or reporting instructions directly to participants"
            />
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-adm-border p-3 bg-adm-surface2">
                <div className="flex items-center gap-2.5">
                  <Megaphone className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-adm-fg">Display Announcement Banner</p>
                    <p className="text-xs text-adm-muted">Show this high-priority notice at the top of participant dashboards</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.announcementActive ?? true}
                  onChange={(e) => setConfig({ ...config, announcementActive: e.target.checked })}
                  className="h-4 w-4 rounded border-adm-border text-accent focus:ring-accent"
                />
              </div>

              <Field label="Announcement Text">
                <Textarea
                  rows={3}
                  value={config.announcement ?? ""}
                  onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                  placeholder="e.g. Reporting begins at 8:45 AM. Bring your college ID card, laptop, and chargers..."
                />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader
              title="Official Portals & Communication Links"
              subtitle="Destination URLs for participants to submit projects, access problem statements, and join groups"
            />
            <div className="mt-4 space-y-4">
              <Field label="Official Hack2Skill Portal URL">
                <Input
                  value={config.officialPortalUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, officialPortalUrl: e.target.value })}
                  placeholder="https://hack2skill.com/event/..."
                />
              </Field>

              <Field label="Project Submission Portal URL">
                <Input
                  value={config.submissionUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, submissionUrl: e.target.value })}
                  placeholder="https://..."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp Community / Group URL">
                  <Input
                    value={config.whatsappGroupUrl ?? ""}
                    onChange={(e) => setConfig({ ...config, whatsappGroupUrl: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </Field>

                <Field label="Discord Community URL (optional)">
                  <Input
                    value={config.discordUrl ?? ""}
                    onChange={(e) => setConfig({ ...config, discordUrl: e.target.value })}
                    placeholder="https://discord.gg/..."
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Coordinator Support Email">
                  <Input
                    value={config.contactEmail ?? ""}
                    onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                    placeholder="admin@kicktotech.in"
                  />
                </Field>

                <Field label="Helpdesk Phone Number">
                  <Input
                    value={config.contactPhone ?? ""}
                    onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                    placeholder="+91 91722 83070"
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Card 3: Live Event Schedule & Timeline */}
      <Card className="p-6">
        <CardHeader
          title="Event Schedule & Timeline"
          subtitle="Define milestones, rounds, check-in, and judging schedules displayed interactively to participants"
        />

        <div className="mt-6 space-y-3">
          {config.schedule.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-adm-border bg-adm-surface2 p-4 transition-all hover:border-adm-fg/20 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-adm-surface font-mono text-xs font-bold text-adm-muted">
                  {index + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">
                      {item.time}
                    </span>
                    <span className="text-sm font-bold text-adm-fg">{item.title}</span>
                    <Badge
                      tone={
                        item.status === "completed"
                          ? "neutral"
                          : item.status === "live"
                          ? "green"
                          : "blue"
                      }
                    >
                      {item.status === "live" ? "● Live Now" : item.status}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-adm-muted">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Select
                  value={item.status ?? "upcoming"}
                  onChange={(e) =>
                    handleUpdateScheduleStatus(
                      item.id,
                      e.target.value as "upcoming" | "live" | "completed",
                    )
                  }
                  className="h-8 text-xs w-32"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live Now</option>
                  <option value="completed">Completed</option>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => handleRemoveScheduleItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {config.schedule.length === 0 && (
            <p className="py-6 text-center text-sm text-adm-muted">
              No schedule items added yet. Add your first milestone below.
            </p>
          )}
        </div>

        {/* Add New Schedule Item */}
        <div className="mt-6 rounded-xl border border-dashed border-adm-border bg-adm-surface/60 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-adm-muted">
            Add New Schedule Milestone
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Input
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
              placeholder="Time (e.g. 02:00 PM)"
            />
            <Input
              className="sm:col-span-2"
              value={newScheduleTitle}
              onChange={(e) => setNewScheduleTitle(e.target.value)}
              placeholder="Milestone Title (e.g. Mentorship Review Round 2)"
            />
            <Select
              value={newScheduleStatus}
              onChange={(e) =>
                setNewScheduleStatus(e.target.value as "upcoming" | "live" | "completed")
              }
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live Now</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="mt-3 flex gap-3">
            <Input
              className="flex-1"
              value={newScheduleDesc}
              onChange={(e) => setNewScheduleDesc(e.target.value)}
              placeholder="Description (optional details, instructions, or deliverables)"
            />
            <Button variant="info" size="sm" onClick={handleAddScheduleItem}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>
      </Card>

      {/* Card 4: Resources & Guidelines */}
      <Card className="p-6">
        <CardHeader
          title="Participant Resources & Guidelines"
          subtitle="Links to problem statements, PPT templates, submission rules, and guides"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {config.resources.map((res) => (
            <div
              key={res.id}
              className="flex flex-col justify-between rounded-xl border border-adm-border bg-adm-surface2 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-adm-fg">{res.title}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 p-1 h-auto"
                    onClick={() => handleRemoveResource(res.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {res.description && (
                  <p className="mt-1 text-xs text-adm-muted">{res.description}</p>
                )}
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline break-all"
                >
                  <LinkIcon className="h-3 w-3 flex-shrink-0" />
                  {res.url}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Add Resource */}
        <div className="mt-6 rounded-xl border border-dashed border-adm-border bg-adm-surface/60 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-adm-muted">
            Add Resource or Guideline Link
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              placeholder="Title (e.g. Pitch Deck Template)"
            />
            <Input
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              placeholder="URL (e.g. https://...)"
            />
            <Select
              value={newResType}
              onChange={(e) =>
                setNewResType(e.target.value as "link" | "document" | "code" | "community")
              }
            >
              <option value="link">General Link</option>
              <option value="document">Document / Presentation</option>
              <option value="code">Code / Repository</option>
              <option value="community">Community / Group</option>
            </Select>
          </div>
          <div className="mt-3 flex gap-3">
            <Input
              className="flex-1"
              value={newResDesc}
              onChange={(e) => setNewResDesc(e.target.value)}
              placeholder="Description (optional notes for participants)"
            />
            <Button variant="info" size="sm" onClick={handleAddResource}>
              <Plus className="h-4 w-4" /> Add Resource
            </Button>
          </div>
        </div>
      </Card>

      {/* Floating / Bottom Save Bar */}
      <div className="sticky bottom-6 z-20 flex items-center justify-between rounded-xl border border-adm-border bg-adm-surface/95 p-4 shadow-xl backdrop-blur-md">
        <p className="text-xs text-adm-muted hidden sm:block">
          Remember to save changes to publish your edits to all participants.
        </p>
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => window.open("/internship/dashboard?tab=hackathon", "_blank")}
          >
            <ExternalLink className="h-4 w-4" /> Preview Live
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Dashboard Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
