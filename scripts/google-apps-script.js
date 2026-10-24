/**
 * KICK TO TECH — Confirmed Registrations Google Sheet Real-time Sync Webhook
 *
 * Target Sheet:
 * https://docs.google.com/spreadsheets/d/1jeMYVFs4l_cx8-pkfgfSI1vUd4fYTWnwMyV0u0Ksuvw/edit?usp=sharing
 *
 * Setup Instructions (takes 1 minute):
 * 1. Open the Google Spreadsheet above.
 * 2. In the top menu, click: Extensions > Apps Script
 * 3. Delete any default code inside the editor (e.g. myFunction).
 * 4. Paste this entire code block into the editor and press Ctrl+S (or Cmd+S) to save.
 * 5. Click the blue "Deploy" button at the top right > select "New deployment".
 * 6. Click the gear icon next to "Select type" and select "Web app".
 * 7. Configure:
 *    - Description: "Confirmed Registrations Realtime Sync"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (crucial so the server can push updates)
 * 8. Click "Deploy".
 *    (If prompted with "Authorization required", click "Authorize access", choose your Google account,
 *     click "Advanced" > "Go to Untitled project (unsafe)" > "Allow").
 * 9. Copy the "Web app URL" (starts with https://script.google.com/macros/s/.../exec).
 * 10. Add it to Vercel Environment Variables as:
 *     GOOGLE_SHEETS_WEBHOOK_URL
 *
 * That's it! Every time a student's payment is confirmed (via Razorpay Checkout, Webhook,
 * or Admin verification), their record will immediately appear in this Google Sheet in real time.
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

        // Header styling
        var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#e8f0fe");
        headerRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);

        // Auto-fit column widths
        for (var col = 1; col <= HEADERS.length; col++) {
          sheet.autoResizeColumn(col);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "sync_all", synced: payload.rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Real-Time Single Participant Append / Update
    if (payload.action === "append" && payload.row) {
      // If sheet is empty, write header first
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      // Check if student with this Application ID already exists in the sheet
      var targetAppId = payload.row[1]; // Application ID is at column index 1
      var existingRowIndex = -1;
      var lastRow = sheet.getLastRow();

      if (lastRow > 1 && targetAppId) {
        var appIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var i = 0; i < appIds.length; i++) {
          if (String(appIds[i][0]).trim() === String(targetAppId).trim()) {
            existingRowIndex = i + 2; // +2 for 1-based indexing and header row
            break;
          }
        }
      }

      if (existingRowIndex > 0) {
        // Update existing row
        sheet.getRange(existingRowIndex, 1, 1, payload.row.length).setValues([payload.row]);
      } else {
        // Append new row
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
}
