import {SignalWatcher} from '@lit-labs/signals';
import {basicCatalog, Context} from '@a2ui/lit/v0_9';
import {ContextProvider} from '@lit/context';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {LitElement, css, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import './styles.css';
import './AdkFeedbackForm';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;
type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  surfaces?: unknown[];
};

function findA2uiPayload(value: unknown): unknown[] | null {
  if (!value || typeof value !== 'object') return null;
  if (!Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.validated_a2ui_json)) return record.validated_a2ui_json;
    for (const child of Object.values(record)) {
      const found = findA2uiPayload(child);
      if (found) return found;
    }
    return null;
  }
  for (const child of value) {
    const found = findA2uiPayload(child);
    if (found) return found;
  }
  return null;
}

function findAgentText(events: JsonValue[]): string {
  const replies: string[] = [];
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
    const content = (event as Record<string, unknown>).content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue;
    const record = content as Record<string, unknown>;
    if (record.role !== 'model' || !Array.isArray(record.parts)) continue;
    for (const part of record.parts) {
      if (!part || typeof part !== 'object' || Array.isArray(part)) continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) replies.push(text.trim());
    }
  }
  return [...new Set(replies)].join('\n\n');
}

async function readSse(response: Response): Promise<JsonValue[]> {
  if (!response.ok) throw new Error(`ADK request failed (${response.status})`);
  const text = await response.text();
  return text
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => JSON.parse(line.slice(5).trim()) as JsonValue);
}



@customElement('score-selector-app')
class ScoreSelectorApp extends SignalWatcher(LitElement) {
  private markdownProvider = new ContextProvider(this, {
    context: Context.markdown,
    initialValue: async (text: string) => {
      let htmlText = text;
      // Headings
      if (htmlText.startsWith('##### ')) htmlText = `<h5>${htmlText.slice(6)}</h5>`;
      else if (htmlText.startsWith('#### ')) htmlText = `<h4>${htmlText.slice(5)}</h4>`;
      else if (htmlText.startsWith('### ')) htmlText = `<h3>${htmlText.slice(4)}</h3>`;
      else if (htmlText.startsWith('## ')) htmlText = `<h2>${htmlText.slice(3)}</h2>`;
      else if (htmlText.startsWith('# ')) htmlText = `<h1>${htmlText.slice(2)}</h1>`;
      else htmlText = `<p>${htmlText}</p>`;
      
      // Inline formatting like bold/italics
      htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return htmlText;
    }
  });

  @state() private loading = false;
  @state() private error = '';
  @state() private draft = '';
  @state() private messages: ChatMessage[] = [];

  private readonly userId = 'lit-client';
  private readonly sessionId = crypto.randomUUID();
  private sessionReady = false;

  static styles = css`
    :host { display: block; }
    .shell { width: min(820px, calc(100% - 32px)); margin: 0 auto; padding: 42px 0; }
    header { margin-bottom: 24px; }
    .eyebrow { color: #6d5dfc; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 8px 0 10px; font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1; letter-spacing: -0.05em; }
    .lead { margin: 0; color: #667085; font-size: 1rem; line-height: 1.6; }
    .panel { background: rgba(255,255,255,0.9); border: 1px solid rgba(17,24,39,0.09); border-radius: 24px; box-shadow: 0 24px 70px rgba(52,46,110,0.12); overflow: hidden; }
    .conversation { min-height: 360px; max-height: 66vh; overflow-y: auto; padding: 26px; display: flex; flex-direction: column; gap: 18px; }
    .welcome { margin: auto; max-width: 420px; text-align: center; color: #667085; line-height: 1.65; }
    .message { display: flex; flex-direction: column; gap: 10px; }
    .message.user { align-items: flex-end; }
    .message.agent { align-items: flex-start; }
    .bubble { max-width: min(620px, 88%); padding: 12px 16px; border-radius: 18px; line-height: 1.55; white-space: pre-wrap; }
    .user .bubble { color: white; background: #5b4cf0; border-bottom-right-radius: 6px; }
    .agent .bubble { color: #27243e; background: #f0eff7; border-bottom-left-radius: 6px; }
    .surface { width: min(660px, 100%); box-sizing: border-box; padding: 18px; border: 1px solid #e2e0ec; border-radius: 18px; background: #fff; }
    .thinking { color: #77728c; font-size: 0.92rem; padding-left: 4px; }
    .error { color: #b42318; background: #fef3f2; padding: 11px 14px; border-radius: 12px; }
    form { display: flex; align-items: flex-end; gap: 10px; padding: 16px; border-top: 1px solid #e8e7ef; background: rgba(250,250,253,0.92); }
    textarea { flex: 1; min-height: 24px; max-height: 130px; resize: vertical; border: 1px solid #d8d5e5; border-radius: 15px; padding: 12px 14px; font: inherit; line-height: 1.45; color: #17162a; background: white; }
    textarea:focus { outline: 3px solid rgba(91,76,240,0.15); border-color: #6d5dfc; }
    button { border: 0; border-radius: 999px; padding: 12px 19px; font: inherit; font-weight: 750; color: white; background: #5b4cf0; cursor: pointer; box-shadow: 0 8px 20px rgba(91,76,240,0.22); }
    button:hover { background: #493bd4; }
    button:disabled { cursor: wait; opacity: 0.55; }
    @media (max-width: 600px) { .shell { padding: 24px 0; } .conversation { padding: 18px; } form { padding: 12px; } }

    @media (prefers-color-scheme: dark) {
      .eyebrow { color: #818cf8; }
      .lead { color: #94a3b8; }
      .panel { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 24px 70px rgba(0,0,0,0.4); }
      .welcome { color: #94a3b8; }
      .agent .bubble { color: #f1f5f9; background: #334155; border-bottom-left-radius: 6px; }
      .user .bubble { background: #6366f1; }
      .surface { background: #1e293b; border: 1px solid #334155; }
      .thinking { color: #94a3b8; }
      .error { color: #fca5a5; background: #7f1d1d; }
      form { border-top: 1px solid #334155; background: rgba(15, 23, 42, 0.92); }
      textarea { color: #f1f5f9; background: #0f172a; border: 1px solid #334155; }
      textarea:focus { outline: 3px solid rgba(99,102,241,0.25); border-color: #6366f1; }
      button { background: #6366f1; box-shadow: 0 8px 20px rgba(99,102,241,0.25); }
      button:hover { background: #4f46e5; }
    }
  `;

  private async ensureSession() {
    if (this.sessionReady) return;
    const response = await fetch(
      `/adk/apps/simple_agent/users/${this.userId}/sessions/${this.sessionId}`,
      {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'},
    );
    if (!response.ok) throw new Error('Could not create an ADK session.');
    this.sessionReady = true;
  }

  private async sendMessage(event?: Event) {
    event?.preventDefault();
    const text = this.draft.trim();
    if (!text || this.loading) return;

    this.messages = [...this.messages, {id: crypto.randomUUID(), role: 'user', text}];
    this.draft = '';
    this.loading = true;
    this.error = '';

    try {
      await this.ensureSession();
      const response = await fetch('/adk/run_sse', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          app_name: 'simple_agent',
          user_id: this.userId,
          session_id: this.sessionId,
          new_message: {role: 'user', parts: [{text}]},
          streaming: false,
        }),
      });
      const events = await readSse(response);
      const a2uiMessages = findA2uiPayload(events);
      const agentText = findAgentText(events);
      let surfaces: unknown[] | undefined;

      if (a2uiMessages) {
        const processor = new MessageProcessor([basicCatalog]);
        processor.processMessages(a2uiMessages as never[]);
        surfaces = Array.from(processor.model.surfacesMap.values());
      }

      this.messages = [...this.messages, {
        id: crypto.randomUUID(),
        role: 'agent',
        text: agentText || (surfaces?.length ? 'Here is the requested interface.' : 'The agent returned an empty response.'),
        surfaces,
      }];
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.loading = false;
      await this.updateComplete;
      this.renderRoot.querySelector('.conversation')?.scrollTo({top: 999999, behavior: 'smooth'});
    }
  }

  private handleFeedbackSubmitted(payload: any) {
    this.messages = [...this.messages, {
      id: crypto.randomUUID(),
      role: 'agent',
      text: `✅ Feedback submitted successfully!\n\n• Score: ${payload.score}/5\n• Original Question: "${payload.originalQuestion}"\n• Comments: "${payload.comments}"\n\nYour response has been saved to the database.`
    }];
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  render() {
    return html`
      <main class="shell">
        <header>
          <div class="eyebrow">Google ADK · A2UI · Lit</div>
          <h1>Agent conversation</h1>
          <p class="lead">Chat normally. When a request calls for an interface, the agent renders it directly in its response.</p>
        </header>
        <section class="panel">
          <div class="conversation" aria-live="polite">
            ${this.messages.length === 0
              ? html`<p class="welcome">Ask the agent a question, or try “Show me the score selector.”</p>`
              : this.messages.map(message => html`
                  <article class="message ${message.role}">
                    ${message.text ? html`<div class="bubble">${message.text}</div>` : nothing}
                    ${message.surfaces?.map(surface => html`
                      <div class="surface">
                        ${(surface as any).id === 'score-selector'
                          ? html`<adk-feedback-form .surface=${surface} @feedback-submitted=${(e: CustomEvent) => this.handleFeedbackSubmitted(e.detail)} @feedback-error=${(e: CustomEvent) => this.error = e.detail}></adk-feedback-form>`
                          : html`<a2ui-surface .surface=${surface}></a2ui-surface>`
                        }
                      </div>
                    `)}
                  </article>
                `)}
            ${this.loading ? html`<div class="thinking">Agent is thinking…</div>` : nothing}
            ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
          </div>
          <form @submit=${this.sendMessage}>
            <textarea
              rows="1"
              aria-label="Message the agent"
              placeholder="Message the agent…"
              .value=${this.draft}
              @input=${(event: InputEvent) => { this.draft = (event.target as HTMLTextAreaElement).value; }}
              @keydown=${this.handleKeydown}
              ?disabled=${this.loading}
            ></textarea>
            <button type="submit" ?disabled=${this.loading || !this.draft.trim()}>Send</button>
          </form>
        </section>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'score-selector-app': ScoreSelectorApp;
  }
}
