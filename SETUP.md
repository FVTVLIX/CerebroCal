# Google Calendar Setup

Follow these steps to connect Cerebrocal to your Google Calendar.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Library**
4. Search for **Google Calendar API** and click **Enable**

## 2. Create a Service Account

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Give it a name (e.g. `cerebrocal-calendar`)
4. Click **Done** (no special roles needed at this step)
5. Click the service account you just created
6. Go to the **Keys** tab → **Add Key → Create new key → JSON**
7. Download the JSON key file

## 3. Share Your Calendar with the Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want to use in the left sidebar
3. Click the three dots → **Settings and sharing**
4. Scroll to **Share with specific people or groups**
5. Add the `client_email` from your JSON key file (e.g. `my-sa@my-project.iam.gserviceaccount.com`)
6. Set permission to **Make changes to events** (Editor)
7. Click **Send**

## 4. Set Environment Variables

Stringify the JSON key to a single line:

```bash
python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json
```

Copy the output. After copying the output, delete or securely store the downloaded JSON key file — do not commit it to your repository.

Then:

**For local development** — add to `.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_JSON=<paste stringified output here>
GOOGLE_CALENDAR_ID=primary
```

**Note:** `primary` refers to the service account's own calendar, which is separate from your personal Google Calendar. If you want events to appear on your personal calendar, see section 5 and share your calendar with the service account first.

**For Vercel** — go to your project → Settings → Environment Variables:
- `GOOGLE_SERVICE_ACCOUNT_JSON` = paste stringified output
- `GOOGLE_CALENDAR_ID` = `primary` (or your specific calendar ID)

> ⚠️ Do NOT manually replace `\\n` with real newlines. The stringified JSON handles this correctly.

## 5. Find Your Calendar ID (optional)

If you want to write to a specific calendar (not `primary`):
1. Go to Google Calendar → click the calendar name → **Settings and sharing**
2. Scroll to **Integrate calendar**
3. Copy the **Calendar ID** (looks like `abc123@group.calendar.google.com`)
4. Set `GOOGLE_CALENDAR_ID` to that value
