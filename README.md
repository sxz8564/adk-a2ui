# ADK + A2UI Lit agent

This repository contains a minimal Python agent for Google's Agent Development
Kit (ADK). The `simple_agent` directory is the discoverable agent package.

## Demo

![Agent conversation with an inline A2UI review form](docs/agent-conversation.png?v=2)

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

Open <http://localhost:5173>. The client provides a normal multi-turn agent
conversation and renders A2UI surfaces inline when the agent emits them.

The frontend proxies `/adk` requests to the ADK backend on port 8000, so the
browser does not need cross-origin configuration.

You can still test the text agent in ADK Web by selecting `simple_agent` and
trying:

```text
Hi, my name is Ada. Please greet me.
```

To request the A2UI review form, try:

```text
Show me the score review form.
```

The root agent transfers UI requests to its A2UI specialist subagent. The
specialist emits A2UI v0.9, and the Lit renderer displays the question,
optional expected answer, mutually exclusive 0–5 score, and comments fields.

ADK Web is a development and debugging interface, not a production server.
