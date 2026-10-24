"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/admin/overlays";
import { Button } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import {
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import {
  adminHackathonService,
  type GoogleSheetsSyncStatus,
} from "@/services/admin";

interface GoogleSheetsSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (syncedCount: number) => void;
}

const APPS_SCRIPT_CODE = `/**
 * KICK TO TECH — Confirmed Registrations Google Sheet Real-time Sync Webhook
 * Target Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1jeMYVFs4l_cx8-pkfgfSI1vUd4fYTWnwMyV0u0Ksuvw/edit?usp=sharing
 */

var HEADERS = [
  "Unique ID",
  "Application ID",
  "Participant Name",
  "Email",
  "Phone",
  "College",
  "Course",
  "Year",
  "Team Name",
  "Fee (INR)",
  "Payment ID",
  "Order ID",
  "Registration Date"
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data payload received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss && payload.spreadsheetId) {
      try { ss = SpreadsheetApp.openById(payload.spreadsheetId); } catch (e) {}
    }
    var sheet = ss ? ss.getActiveSheet() : SpreadsheetApp.getActiveSheet();

    // 1. Full Synchronization (Sync All / Update Current Data)
    if (payload.action === "sync_all" && payload.rows) {
      sheet.clearContents();
      var allData = [HEADERS].concat(payload.rows);
      if (allData.length > 0) {
        var range = sheet.getRange(1, 1, allData.length, HEADERS.length);
        range.setValues(allData);

        var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#e8f0fe");
        headerRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);

        for (var col = 1; col <= HEADERS.length; col++) {
          sheet.autoResizeColumn(col);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "sync_all", synced: payload.rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Real-Time Single Participant Append / Update
    if (payload.action === "append" && payload.row) {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      var targetAppId = payload.row[1];
      var existingRowIndex = -1;
      var lastRow = sheet.getLastRow();

      if (lastRow > 1 && targetAppId) {
        var appIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var i = 0; i < appIds.length; i++) {
          if (String(appIds[i][0]).trim() === String(targetAppId).trim()) {
            existingRowIndex = i + 2;
            break;
          }
        }
      }

      if (existingRowIndex > 0) {
        sheet.getRange(existingRowIndex, 1, 1, payload.row.length).setValues([payload.row]);
      } else {
        sheet.appendRow(payload.row);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: existingRowIndex > 0 ? "updated" : "appended",
        rowNumber: existingRowIndex > 0 ? existingRowIndex : lastRow + 1
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored", reason: "unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "KICK TO TECH Confirmed Registrations Sync Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export function GoogleSheetsSyncModal({
  open,
  onClose,
  onSuccess,
}: GoogleSheetsSyncModalProps) {
  const toast = useToast();
  const [status, setStatus] = useState<GoogleSheetsSyncStatus | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    if (open) {
      adminHackathonService.getGoogleSheetsStatus().then((s) => {
        setStatus(s);
        if (s.webhookUrl) {
          setWebhookUrl(s.webhookUrl);
        }
      }).catch(() => {});
    }
  }, [open]);

  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setIsCopied(true);
      toast.success("Apps Script code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Failed to copy script to clipboard.");
    }
  }

  async function handleSaveAndSync(e: React.FormEvent) {
    e.preventDefault();
    const cleanUrl = webhookUrl.trim();

    if (!cleanUrl) {
      toast.error("Please enter the Google Apps Script Web App URL.");
      return;
    }

    if (!cleanUrl.startsWith("https://script.google.com/macros/s/")) {
      toast.error("Invalid Web App URL. It must start with https://script.google.com/macros/s/");
      return;
    }

    setIsSaving(true);
    try {
      const res = await adminHackathonService.syncGoogleSheets({ webhookUrl: cleanUrl });
      if (res.success) {
        toast.success(`Successfully synced ${res.syncedCount} participants to Google Sheet!`);
        onSuccess?.(res.syncedCount);
        onClose();
      } else {
        toast.error(res.error || "Sync failed. Please check the Web App permissions.");
      }
    } catch {
      toast.error("Failed to communicate with sync endpoint.");
    } finally {
      setIsSaving(false);
    }
  }

  const spreadsheetUrl = status?.spreadsheetUrl || "https://docs.google.com/spreadsheets/d/1jeMYVFs4l_cx8-pkfgfSI1vUd4fYTWnwMyV0u0Ksuvw/edit?usp=sharing";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Google Sheet Real-Time Sync Setup"
      size="lg"
    >
      <div className="space-y-5 text-sm">
        {/* Status banner */}
        <div className="flex items-start gap-3 rounded-xl border border-adm-border bg-adm-surface2 p-4">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-adm-fg">Target Google Spreadsheet</p>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-adm-primary hover:underline"
              >
                Open Sheet <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-adm-muted break-all">{spreadsheetUrl}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {status?.isConfigured ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Webhook Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Webhook Not Configured
                </span>
              )}
              {status?.confirmedCount !== undefined && (
                <span className="text-adm-muted">
                  • {status.confirmedCount} verified participant{status.confirmedCount === 1 ? "" : "s"} ready to sync
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3-Step Setup Instructions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-adm-muted">
            1-Minute Setup Instructions
          </h3>
          <ol className="space-y-2.5 text-xs text-adm-fg/90">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-adm-primary/10 font-bold text-adm-primary">
                1
              </span>
              <div>
                Open the{" "}
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-adm-primary underline"
                >
                  Google Sheet
                </a>
                . In top menu, click <strong>Extensions &gt; Apps Script</strong>.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-adm-primary/10 font-bold text-adm-primary">
                2
              </span>
              <div className="flex-1">
                <div>
                  Delete default code, paste the sync script, and save (<strong>Ctrl+S</strong> / <strong>Cmd+S</strong>):
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyScript}
                    className="gap-1.5 text-xs"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? "Copied Script!" : "Copy Apps Script Code"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowScript(!showScript)}
                    className="text-xs text-adm-muted"
                  >
                    {showScript ? "Hide Code" : "Preview Code"}
                  </Button>
                </div>
                {showScript && (
                  <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-adm-border bg-adm-bg p-3 font-mono text-[11px] text-adm-fg">
                    {APPS_SCRIPT_CODE}
                  </pre>
                )}
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-adm-primary/10 font-bold text-adm-primary">
                3
              </span>
              <div>
                Click the blue <strong>Deploy &gt; New deployment</strong> button (top right):
                <ul className="mt-1 list-disc pl-4 text-adm-muted space-y-0.5">
                  <li>Click gear icon next to &quot;Select type&quot; &gt; <strong>Web app</strong></li>
                  <li>Execute as: <strong>Me</strong> (your Google account)</li>
                  <li>Who has access: <strong>Anyone</strong> (crucial for webhook sync)</li>
                  <li>Click <strong>Deploy</strong> &gt; Authorize access &gt; Copy <strong>Web app URL</strong></li>
                </ul>
              </div>
            </li>
          </ol>
        </div>

        {/* Form to submit Web App URL */}
        <form onSubmit={handleSaveAndSync} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-adm-fg">
              Web App URL (from Step 3)
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              required
              className="mt-1.5 w-full rounded-xl border border-adm-border bg-adm-bg px-3.5 py-2 text-xs text-adm-fg placeholder:text-adm-muted focus:border-adm-primary focus:outline-none focus:ring-1 focus:ring-adm-primary"
            />
            <p className="mt-1 text-[11px] text-adm-muted">
              Saving this URL will store it in the database and immediately sync all confirmed participants.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-adm-border">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              <RefreshCw className={isSaving ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"} />
              {isSaving ? "Saving & Syncing..." : "Save & Sync Now"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
