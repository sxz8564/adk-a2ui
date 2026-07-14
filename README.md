# ADK Web sample

This repository contains a minimal Python agent for Google's Agent Development
Kit (ADK). The `simple_agent` directory is the discoverable agent package.

## Set up on Windows PowerShell

From `C:\Users\zhu_s\projects\adk-a2ui`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item simple_agent\.env.example simple_agent\.env
```

Edit `simple_agent\.env` and replace `YOUR_GOOGLE_API_KEY` with a Gemini API
key from Google AI Studio.

## Run the ADK backend

Run this command from the repository root (the parent of `simple_agent`):

```powershell
adk web --port 8000
```

ADK Web provides the agent API and remains available for event inspection at
<http://localhost:8000>. Its chat view displays A2UI tool results as JSON; the
Lit client below performs the visual rendering.

## Run the Lit A2UI client

In a second PowerShell window:

```powershell
cd C:\Users\zhu_s\projects\adk-a2ui\frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The client asks the agent for a selector and
renders the returned A2UI `ChoicePicker` as radio buttons for scores 0–5.

The frontend proxies `/adk` requests to the ADK backend on port 8000, so the
browser does not need cross-origin configuration.

You can still test the text agent in ADK Web by selecting `simple_agent` and
trying:

```text
Hi, my name is Ada. Please greet me.
```

To request the A2UI score selector, try:

```text
Show me a score selector so I can rate this from 0 to 5.
```

The agent emits A2UI v0.9 and the Lit renderer displays its `ChoicePicker` with
the `mutuallyExclusive` variant as native radio inputs.

ADK Web is a development and debugging interface, not a production server.
