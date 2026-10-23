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
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  MapPin,
  Megaphone,
  Link as LinkIcon,
  Trophy,
  CheckCircle2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export function HackathonDashboardEdit() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<HackathonDashboardConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Editing existing schedule item state
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingScheduleItem, setEditingScheduleItem] = useState<HackathonScheduleItem | null>(null);

  // New schedule item form state
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const [newScheduleDesc, setNewScheduleDesc] = useState("");
  const [newScheduleStatus, setNewScheduleStatus] = useState<"upcoming" | "live" | "completed">("upcoming");

  // Editing existing resource item state
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [editingResItem, setEditingResItem] = useState<HackathonResourceItem | null>(null);

  // New resource item form state
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResDesc, setNewResDesc] = useState("");
  const [newResType, setNewResType] = useState<"link" | "document" | "code" | "community">("link");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await adminHackathonService.getDashboardConfig();
        if (active) {
          setConfig(data);
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        console.error("Failed loading hackathon dashboard config:", err);
        toast.error("Failed to load dashboard configuration.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  // Master save function
  async function handleSave(overrideConfig?: HackathonDashboardConfig, successMessage?: string) {
    const target = overrideConfig || config;
    if (!target) return;
    setSaving(true);
    try {
      const updated = await adminHackathonService.updateDashboardConfig(target);
      setConfig(updated);
      setHasUnsavedChanges(false);
      toast.success(
        successMessage || "Hackathon dashboard updated successfully! Live on participant dashboards.",
      );
      return updated;
    } catch (err) {
      console.error("Save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save changes. Please try again.";
      toast.error(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // --- Schedule Item Handlers ---

  function handleStartEditSchedule(item: HackathonScheduleItem) {
    setEditingScheduleId(item.id);
    setEditingScheduleItem({ ...item });
  }

  function handleCancelEditSchedule() {
    setEditingScheduleId(null);
    setEditingScheduleItem(null);
  }

  async function handleSaveEditSchedule() {
    if (!editingScheduleItem || !config) return;
    const title = editingScheduleItem.title.trim();
    if (!title) {
      toast.error("Milestone title cannot be blank.");
      return;
    }

    const time = editingScheduleItem.time.trim() || "TBD";
    const desc = editingScheduleItem.description?.trim() || undefined;

    const updatedSchedule = config.schedule.map((item) =>
      item.id === editingScheduleItem.id
        ? { ...editingScheduleItem, title, time, description: desc }
        : item,
    );

    const updatedConfig: HackathonDashboardConfig = { ...config, schedule: updatedSchedule };
    setConfig(updatedConfig);
    setEditingScheduleId(null);
    setEditingScheduleItem(null);

    try {
      await handleSave(updatedConfig, `Milestone "${title}" updated and published!`);
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleAddScheduleItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const title = newScheduleTitle.trim();
    if (!title) {
      toast.error("Please enter a Title for the schedule milestone.");
      return;
    }
    if (!config) return;

    const time = newScheduleTime.trim() || "TBD";
    const desc = newScheduleDesc.trim() || undefined;

    const newItem: HackathonScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time,
      title,
      description: desc,
      status: newScheduleStatus,
    };

    const updatedConfig: HackathonDashboardConfig = {
      ...config,
      schedule: [...config.schedule, newItem],
    };

    setConfig(updatedConfig);
    setNewScheduleTime("");
    setNewScheduleTitle("");
    setNewScheduleDesc("");
    setNewScheduleStatus("upcoming");

    try {
      await handleSave(updatedConfig, `Milestone "${title}" added and published live!`);
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleRemoveScheduleItem(id: string) {
    if (!config) return;
    const itemToRemove = config.schedule.find((s) => s.id === id);
    const updatedSchedule = config.schedule.filter((s) => s.id !== id);
    const updatedConfig: HackathonDashboardConfig = {
      ...config,
      schedule: updatedSchedule,
    };
    setConfig(updatedConfig);

    try {
      await handleSave(
        updatedConfig,
        `Milestone "${itemToRemove?.title || "Item"}" removed and published!`,
      );
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleMoveScheduleItem(index: number, direction: "up" | "down") {
    if (!config) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.schedule.length) return;

    const newSchedule = [...config.schedule];
    const [moved] = newSchedule.splice(index, 1);
    newSchedule.splice(targetIndex, 0, moved);

    const updatedConfig: HackathonDashboardConfig = { ...config, schedule: newSchedule };
    setConfig(updatedConfig);

    try {
      await handleSave(updatedConfig, "Milestone order updated and published!");
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleQuickStatusChange(id: string, status: "upcoming" | "live" | "completed") {
    if (!config) return;
    const updatedSchedule = config.schedule.map((s) => (s.id === id ? { ...s, status } : s));
    const updatedConfig: HackathonDashboardConfig = {
      ...config,
      schedule: updatedSchedule,
    };
    setConfig(updatedConfig);

    try {
      await handleSave(updatedConfig, `Milestone status changed to "${status}" and published!`);
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  // --- Resource Item Handlers ---

  function handleStartEditResource(res: HackathonResourceItem) {
    setEditingResId(res.id);
    setEditingResItem({ ...res });
  }

  function handleCancelEditResource() {
    setEditingResId(null);
    setEditingResItem(null);
  }

  async function handleSaveEditResource() {
    if (!editingResItem || !config) return;
    const title = editingResItem.title.trim();
    if (!title) {
      toast.error("Resource title is required.");
      return;
    }

    let url = editingResItem.url.trim();
    if (!url) {
      url = "#";
    } else if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("#")) {
      url = `https://${url}`;
    }

    const desc = editingResItem.description?.trim() || undefined;

    const updatedResources = config.resources.map((item) =>
      item.id === editingResItem.id
        ? { ...editingResItem, title, url, description: desc }
        : item,
    );

    const updatedConfig: HackathonDashboardConfig = { ...config, resources: updatedResources };
    setConfig(updatedConfig);
    setEditingResId(null);
    setEditingResItem(null);

    try {
      await handleSave(updatedConfig, `Resource "${title}" updated and published!`);
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleAddResource(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const title = newResTitle.trim();
    if (!title) {
      toast.error("Please enter a Title for the resource or guideline.");
      return;
    }

    let url = newResUrl.trim();
    if (!url) {
      url = "#";
    } else if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("#")) {
      url = `https://${url}`;
    }

    if (!config) return;

    const desc = newResDesc.trim() || undefined;

    const newRes: HackathonResourceItem = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      url,
      description: desc,
      type: newResType,
    };

    const updatedConfig: HackathonDashboardConfig = {
      ...config,
      resources: [...config.resources, newRes],
    };

    setConfig(updatedConfig);
    setNewResTitle("");
    setNewResUrl("");
    setNewResDesc("");
    setNewResType("link");

    try {
      await handleSave(updatedConfig, `Resource "${title}" added and published live!`);
    } catch {
      setHasUnsavedChanges(true);
    }
  }

  async function handleRemoveResource(id: string) {
    if (!config) return;
    const resToRemove = config.resources.find((r) => r.id === id);
    const updatedResources = config.resources.filter((r) => r.id !== id);
    const updatedConfig: HackathonDashboardConfig = {
      ...config,
      resources: updatedResources,
    };
    setConfig(updatedConfig);

    try {
      await handleSave(
        updatedConfig,
        `Resource "${resToRemove?.title || "Item"}" removed and published!`,
      );
    } catch {
      setHasUnsavedChanges(true);
    }
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
            {hasUnsavedChanges && (
              <Badge tone="yellow" className="animate-pulse">
                Unsaved Edits
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-adm-muted">
            All edits saved here immediately update the Hackathon section on the participant dashboard (
            <code className="text-accent">/internship/dashboard?tab=hackathon</code>).
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
            onClick={() => handleSave()}
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
                onChange={(e) => {
                  setConfig({ ...config, eventName: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. PromptWars × KICK To TECH"
              />
            </Field>

            <Field label="Tagline / Subtitle">
              <Input
                value={config.tagline}
                onChange={(e) => {
                  setConfig({ ...config, tagline: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Where ideas meet AI • Imagine, Innovate, Impact"
              />
            </Field>

            <Field label="Event Description">
              <Textarea
                rows={3}
                value={config.description}
                onChange={(e) => {
                  setConfig({ ...config, description: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Description of the hackathon..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event Date">
                <Input
                  value={config.date}
                  onChange={(e) => {
                    setConfig({ ...config, date: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. 28 October 2026"
                />
              </Field>

              <Field label="Event Time">
                <Input
                  value={config.time}
                  onChange={(e) => {
                    setConfig({ ...config, time: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. 9:00 AM – 6:30 PM IST"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reporting Time">
                <Input
                  value={config.reportingTime}
                  onChange={(e) => {
                    setConfig({ ...config, reportingTime: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. 8:45 AM IST"
                />
              </Field>

              <Field label="Participation Mode">
                <Input
                  value={config.mode}
                  onChange={(e) => {
                    setConfig({ ...config, mode: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Offline / In-person"
                />
              </Field>
            </div>

            <Field label="Venue / Location">
              <Input
                value={config.venue}
                onChange={(e) => {
                  setConfig({ ...config, venue: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Library Building, JSPM University, Pune"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hackathon Theme">
                <Input
                  value={config.theme}
                  onChange={(e) => {
                    setConfig({ ...config, theme: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Build with AI • GenAI & Automation"
                />
              </Field>

              <Field label="Prize Pool">
                <Input
                  value={config.prizePool}
                  onChange={(e) => {
                    setConfig({ ...config, prizePool: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
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
                    <p className="text-xs text-adm-muted">Show this notice at the top of participant dashboards</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.announcementActive ?? true}
                  onChange={(e) => {
                    setConfig({ ...config, announcementActive: e.target.checked });
                    setHasUnsavedChanges(true);
                  }}
                  className="h-4 w-4 rounded border-adm-border text-accent focus:ring-accent cursor-pointer"
                />
              </div>

              <Field label="Announcement Text">
                <Textarea
                  rows={3}
                  value={config.announcement ?? ""}
                  onChange={(e) => {
                    setConfig({ ...config, announcement: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
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
                  onChange={(e) => {
                    setConfig({ ...config, officialPortalUrl: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="https://hack2skill.com/event/..."
                />
              </Field>

              <Field label="Project Submission Portal URL">
                <Input
                  value={config.submissionUrl ?? ""}
                  onChange={(e) => {
                    setConfig({ ...config, submissionUrl: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="https://..."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp Community / Group URL">
                  <Input
                    value={config.whatsappGroupUrl ?? ""}
                    onChange={(e) => {
                      setConfig({ ...config, whatsappGroupUrl: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </Field>

                <Field label="Discord Community URL (optional)">
                  <Input
                    value={config.discordUrl ?? ""}
                    onChange={(e) => {
                      setConfig({ ...config, discordUrl: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="https://discord.gg/..."
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Coordinator Support Email">
                  <Input
                    value={config.contactEmail ?? ""}
                    onChange={(e) => {
                      setConfig({ ...config, contactEmail: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="admin@kicktotech.in"
                  />
                </Field>

                <Field label="Helpdesk Phone Number">
                  <Input
                    value={config.contactPhone ?? ""}
                    onChange={(e) => {
                      setConfig({ ...config, contactPhone: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="+91 91722 83070"
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Card 3: Live Event Schedule & Timeline (With FULL Editing Support) */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-adm-border pb-4">
          <div>
            <h3 className="text-base font-bold text-adm-fg flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" /> Event Schedule & Milestones
            </h3>
            <p className="text-xs text-adm-muted mt-0.5">
              Edit milestone times, titles, descriptions, and statuses. Reorder using the arrow buttons.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={saving}
            onClick={() => handleSave()}
          >
            <Save className="h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {config.schedule.map((item, index) => {
            const isEditing = editingScheduleId === item.id;

            if (isEditing && editingScheduleItem) {
              return (
                <div
                  key={item.id}
                  className="rounded-xl border-2 border-accent bg-accent/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase">
                      Editing Milestone #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="success" disabled={saving} onClick={handleSaveEditSchedule}>
                        <Check className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Apply & Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditSchedule}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Time Range">
                      <Input
                        value={editingScheduleItem.time}
                        onChange={(e) =>
                          setEditingScheduleItem({ ...editingScheduleItem, time: e.target.value })
                        }
                        placeholder="09:00 AM – 10:00 AM"
                      />
                    </Field>
                    <Field label="Title" className="sm:col-span-2">
                      <Input
                        value={editingScheduleItem.title}
                        onChange={(e) =>
                          setEditingScheduleItem({ ...editingScheduleItem, title: e.target.value })
                        }
                        placeholder="Milestone Title"
                      />
                    </Field>
                    <Field label="Status">
                      <Select
                        value={editingScheduleItem.status ?? "upcoming"}
                        onChange={(e) =>
                          setEditingScheduleItem({
                            ...editingScheduleItem,
                            status: e.target.value as "upcoming" | "live" | "completed",
                          })
                        }
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live Now</option>
                        <option value="completed">Completed</option>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Description (optional details / deliverables)">
                    <Input
                      value={editingScheduleItem.description ?? ""}
                      onChange={(e) =>
                        setEditingScheduleItem({ ...editingScheduleItem, description: e.target.value })
                      }
                      placeholder="Instructions, guidelines, or what happens during this round..."
                    />
                  </Field>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-adm-border bg-adm-surface2 p-4 transition-all hover:border-adm-fg/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-adm-surface font-mono text-xs font-bold text-adm-muted">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveScheduleItem(index, "up")}
                        className="text-adm-muted hover:text-adm-fg disabled:opacity-20 p-0.5"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === config.schedule.length - 1}
                        onClick={() => handleMoveScheduleItem(index, "down")}
                        className="text-adm-muted hover:text-adm-fg disabled:opacity-20 p-0.5"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

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
                      handleQuickStatusChange(
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
                    variant="secondary"
                    onClick={() => handleStartEditSchedule(item)}
                    title="Edit Milestone"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleRemoveScheduleItem(item.id)}
                    title="Delete Milestone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {config.schedule.length === 0 && (
            <p className="py-6 text-center text-sm text-adm-muted">
              No schedule items added yet. Add your first milestone below.
            </p>
          )}
        </div>

        {/* Add New Schedule Item */}
        <form
          onSubmit={handleAddScheduleItem}
          className="mt-6 rounded-xl border border-dashed border-adm-border bg-adm-surface/60 p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-adm-fg flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-accent" /> Add New Schedule Milestone
            </h4>
            <span className="text-[11px] text-adm-muted">
              Auto-saves and publishes live to participant dashboards
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Time Range">
              <Input
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
                placeholder="e.g. 02:00 PM (or leave blank for TBD)"
              />
            </Field>
            <Field label="Milestone Title *" className="sm:col-span-2">
              <Input
                value={newScheduleTitle}
                onChange={(e) => setNewScheduleTitle(e.target.value)}
                placeholder="e.g. Mentorship Review Round 2"
                required
              />
            </Field>
            <Field label="Initial Status">
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
            </Field>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <Field label="Description / Instructions (Optional)" className="flex-1">
              <Input
                value={newScheduleDesc}
                onChange={(e) => setNewScheduleDesc(e.target.value)}
                placeholder="Details, guidelines, or what happens during this round..."
              />
            </Field>
            <div className="sm:self-end">
              <Button
                type="submit"
                variant="info"
                disabled={saving}
                className="w-full sm:w-auto h-10 px-4"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Adding & Saving..." : "Add & Publish Milestone"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Card 4: Resources & Guidelines (With FULL Editing Support) */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-adm-border pb-4">
          <div>
            <h3 className="text-base font-bold text-adm-fg flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-accent" /> Participant Resources & Guidelines
            </h3>
            <p className="text-xs text-adm-muted mt-0.5">
              Add problem statements, PPT templates, submission guidelines, Discord/WhatsApp links.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={saving}
            onClick={() => handleSave()}
          >
            <Save className="h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {config.resources.map((res) => {
            const isEditing = editingResId === res.id;

            if (isEditing && editingResItem) {
              return (
                <div
                  key={res.id}
                  className="rounded-xl border-2 border-accent bg-accent/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase">
                      Editing Resource
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="success" disabled={saving} onClick={handleSaveEditResource}>
                        <Check className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Apply & Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditResource}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>

                  <Field label="Title">
                    <Input
                      value={editingResItem.title}
                      onChange={(e) =>
                        setEditingResItem({ ...editingResItem, title: e.target.value })
                      }
                      placeholder="Resource Title"
                    />
                  </Field>

                  <Field label="URL / Link">
                    <Input
                      value={editingResItem.url}
                      onChange={(e) =>
                        setEditingResItem({ ...editingResItem, url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Category / Type">
                      <Select
                        value={editingResItem.type ?? "link"}
                        onChange={(e) =>
                          setEditingResItem({
                            ...editingResItem,
                            type: e.target.value as "link" | "document" | "code" | "community",
                          })
                        }
                      >
                        <option value="link">General Link</option>
                        <option value="document">Document / Presentation</option>
                        <option value="code">Code / Repository</option>
                        <option value="community">Community / Group</option>
                      </Select>
                    </Field>
                    <Field label="Description">
                      <Input
                        value={editingResItem.description ?? ""}
                        onChange={(e) =>
                          setEditingResItem({ ...editingResItem, description: e.target.value })
                        }
                        placeholder="Brief description..."
                      />
                    </Field>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={res.id}
                className="flex flex-col justify-between rounded-xl border border-adm-border bg-adm-surface2 p-4 transition-all hover:border-adm-fg/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-adm-fg">{res.title}</h4>
                      <Badge tone="neutral" className="mt-1 text-[10px]">
                        {res.type || "link"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleStartEditResource(res)}
                        title="Edit Resource"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2 text-xs"
                        onClick={() => handleRemoveResource(res.id)}
                        title="Delete Resource"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {res.description && (
                    <p className="mt-2 text-xs text-adm-muted leading-relaxed">{res.description}</p>
                  )}

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline break-all"
                  >
                    <LinkIcon className="h-3 w-3 flex-shrink-0" />
                    {res.url}
                  </a>
                </div>
              </div>
            );
          })}

          {config.resources.length === 0 && (
            <p className="py-6 text-center text-sm text-adm-muted sm:col-span-2">
              No resources added yet. Add guidelines or problem statements below.
            </p>
          )}
        </div>

        {/* Add Resource */}
        <form
          onSubmit={handleAddResource}
          className="mt-6 rounded-xl border border-dashed border-adm-border bg-adm-surface/60 p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-adm-fg flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-accent" /> Add Resource or Guideline Link
            </h4>
            <span className="text-[11px] text-adm-muted">
              Auto-saves and publishes live to participant dashboards
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Resource Title *">
              <Input
                value={newResTitle}
                onChange={(e) => setNewResTitle(e.target.value)}
                placeholder="e.g. Problem Statements & Tracks"
                required
              />
            </Field>
            <Field label="URL / Link">
              <Input
                value={newResUrl}
                onChange={(e) => setNewResUrl(e.target.value)}
                placeholder="e.g. drive.google.com/... or https://..."
              />
            </Field>
            <Field label="Resource Category">
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
            </Field>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <Field label="Description (Optional Notes for Participants)" className="flex-1">
              <Input
                value={newResDesc}
                onChange={(e) => setNewResDesc(e.target.value)}
                placeholder="Description (optional notes for participants)"
              />
            </Field>
            <div className="sm:self-end">
              <Button
                type="submit"
                variant="info"
                disabled={saving}
                className="w-full sm:w-auto h-10 px-4"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Adding & Saving..." : "Add & Publish Resource"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Floating Bottom Save Bar */}
      <div className="sticky bottom-6 z-20 flex items-center justify-between rounded-xl border border-adm-border bg-adm-surface/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
              <AlertCircle className="h-4 w-4" /> You have unsaved changes. Click save to publish.
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-adm-muted hidden sm:inline-flex">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> All changes are saved and live.
            </span>
          )}
        </div>
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
            onClick={() => handleSave()}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Dashboard Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
