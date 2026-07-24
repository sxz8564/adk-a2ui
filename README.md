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

## Modular Assets & Reuse Guide

This repository packages the feedback form into highly modular backend and frontend assets that can be easily plugged into future ADK projects.

### 1. Reusable Sub-Agent (Backend Factory)
The backend sub-agent is generated using the factory function `create_feedback_agent` in [feedback_agent_factory.py](file:///c:/Users/zhu_s/projects/adk-a2ui/simple_agent/feedback_agent_factory.py).

To reuse it:
1. Copy [feedback_agent_factory.py](file:///c:/Users/zhu_s/projects/adk-a2ui/simple_agent/feedback_agent_factory.py) into your agent package.
2. Instantiate and attach the agent to your root agent (you can customize the list of text fields dynamically):
   ```python
   from simple_agent.feedback_agent_factory import create_feedback_agent

   feedback_agent = create_feedback_agent(
       name="feedback_specialist",
       title="Rate the Assistant's Response",
       submit_btn_text="Submit My Review",
       min_score=1,
       max_score=10,
       default_score=5,
       fields=[
           {
               "id": "user-query",
               "label": "Original Query",
               "path": "/originalQuery",
               "mandatory": True,
               "placeholder": "What was the original question?",
           },
           {
               "id": "comments",
               "label": "Improvement Suggestions",
               "path": "/comments",
               "mandatory": True,
               "placeholder": "How can we improve this answer?",
           }
       ]
   )
   
   root_agent = Agent(
       ...,
       sub_agents=[feedback_agent]
   )
   ```

### 2. Standalone Storage API (FastAPI Router)
The backend storage route is defined in [feedback_router.py](file:///c:/Users/zhu_s/projects/adk-a2ui/simple_agent/feedback_router.py).

To reuse it in a production FastAPI backend:
1. Copy [feedback_router.py](file:///c:/Users/zhu_s/projects/adk-a2ui/simple_agent/feedback_router.py) to your backend source code.
2. Import and mount it onto your FastAPI application:
   ```python
   from fastapi import FastAPI
   from simple_agent.feedback_router import router as feedback_router

   app = FastAPI()
   app.include_router(feedback_router)
   ```

### 3. Reusable Web Component (Frontend Element)
The frontend UI renders using the custom `<adk-feedback-form>` Lit element defined in [AdkFeedbackForm.ts](file:///c:/Users/zhu_s/projects/adk-a2ui/frontend/src/AdkFeedbackForm.ts). It encapsulates choice-picker alignment styles, gray input placeholders, action listeners, and submit validations.

To reuse it:
1. Copy [AdkFeedbackForm.ts](file:///c:/Users/zhu_s/projects/adk-a2ui/frontend/src/AdkFeedbackForm.ts) into your frontend source directory.
2. Import it in your entry application file:
   ```typescript
   import './AdkFeedbackForm';
   ```
3. Render the feedback form in your template when the surface matches the `score-selector` surface ID:
   ```typescript
   html`
     ${surface.id === 'score-selector'
       ? html`
           <adk-feedback-form
             .surface=${surface}
             submitUrl="/api/feedback"
             @feedback-submitted=${(e: CustomEvent) => handleSuccess(e.detail)}
             @feedback-error=${(e: CustomEvent) => handleError(e.detail)}>
           </adk-feedback-form>
         `
       : html`<a2ui-surface .surface=${surface}></a2ui-surface>`
     }
   `
   ```
