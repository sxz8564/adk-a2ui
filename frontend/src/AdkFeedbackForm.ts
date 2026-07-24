import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// --- Self-contained UI overrides for horizontal sliders/pickers & input placeholders ---

function overrideChoicePickerStyles(ChoicePickerEl: any) {
  if (!ChoicePickerEl || ChoicePickerEl.prototype.__overrideApplied) return;
  ChoicePickerEl.prototype.__overrideApplied = true;
  const originalFirstUpdated = ChoicePickerEl.prototype.firstUpdated;
  ChoicePickerEl.prototype.firstUpdated = function(changedProperties: any) {
    if (originalFirstUpdated) {
      originalFirstUpdated.call(this, changedProperties);
    }
    if (this.shadowRoot && !this.shadowRoot.querySelector('style[data-custom-align]')) {
      const style = document.createElement('style');
      style.setAttribute('data-custom-align', '');
      style.textContent = `
        .options {
          flex-direction: row !important;
          flex-wrap: wrap !important;
          gap: 16px !important;
          margin-top: 6px !important;
        }
        .options label {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          cursor: pointer !important;
          user-select: none !important;
        }
        .options input[type="radio"] {
          margin: 0 !important;
          cursor: pointer !important;
        }
      `;
      this.shadowRoot.appendChild(style);
    }
  };
}

const ChoicePickerElImmediate = customElements.get('a2ui-choicepicker');
if (ChoicePickerElImmediate) {
  overrideChoicePickerStyles(ChoicePickerElImmediate);
} else {
  customElements.whenDefined('a2ui-choicepicker').then(() => {
    overrideChoicePickerStyles(customElements.get('a2ui-choicepicker'));
  });
}

function overrideTextFieldPlaceholders(TextFieldEl: any) {
  if (!TextFieldEl || TextFieldEl.prototype.__overrideApplied) return;
  TextFieldEl.prototype.__overrideApplied = true;
  const originalFirstUpdated = TextFieldEl.prototype.firstUpdated;
  TextFieldEl.prototype.firstUpdated = function(changedProperties: any) {
    if (originalFirstUpdated) {
      originalFirstUpdated.call(this, changedProperties);
    }
    if (this.shadowRoot) {
      const labelEl = this.shadowRoot.querySelector('label');
      const inputEl = this.shadowRoot.querySelector('textarea, input');
      if (labelEl && inputEl) {
        const labelText = (labelEl.textContent || '').trim();
        const lowerLabel = labelText.toLowerCase();
        
        // Ascend the shadow roots to locate the parent adk-feedback-form element
        let host = this.getRootNode()?.host;
        while (host && host.tagName !== 'ADK-FEEDBACK-FORM') {
          host = host.getRootNode()?.host;
        }
        
        const placeholdersMap = host?.surface?.dataModel?.get('/placeholders') || {};
        let placeholderText = placeholdersMap[lowerLabel];
        
        if (!placeholderText) {
          // Fallback to case-insensitive smart default matching
          if (lowerLabel.includes('question')) {
            placeholderText = 'Copy paste original question you asked to the agent';
          } else if (lowerLabel.includes('expected') || lowerLabel.includes('answer')) {
            placeholderText = 'Enter the expected answer if any';
          } else if (lowerLabel.includes('comments') || lowerLabel.includes('reason') || lowerLabel.includes('feedback')) {
            placeholderText = 'Provide comments or reasoning for the rating';
          }
        }
        
        if (placeholderText) {
          inputEl.setAttribute('placeholder', placeholderText);
        }
      }
    }
  };
}

const TextFieldElImmediate = customElements.get('a2ui-basic-textfield');
if (TextFieldElImmediate) {
  overrideTextFieldPlaceholders(TextFieldElImmediate);
} else {
  customElements.whenDefined('a2ui-basic-textfield').then(() => {
    overrideTextFieldPlaceholders(customElements.get('a2ui-basic-textfield'));
  });
}

// --- Reusable Element Class ---

@customElement('adk-feedback-form')
export class AdkFeedbackForm extends LitElement {
  @property({ type: Object }) surface: any;
  @property({ type: String }) submitUrl = '/api/feedback';

  private subscription: any;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupSubscription();
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('surface')) {
      this.setupSubscription();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.subscription?.unsubscribe();
  }

  private setupSubscription() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.surface) {
      this.subscription = this.surface.onAction.subscribe((action: any) => {
        if (action?.name === 'submit') {
          this.handleFeedbackSubmit();
        }
      });
    }
  }

  private async handleFeedbackSubmit() {
    if (!this.surface) return;

    const score = this.surface.dataModel.get('/score');
    const isScoreValid = typeof score === 'number';

    const mandatoryFields = this.surface.dataModel.get('/mandatoryFields') || [];
    const missingLabels: string[] = [];

    // Query text fields in the DOM to match error feedback with their labels
    const textfields = this.shadowRoot
      ?.querySelector('a2ui-surface')
      ?.shadowRoot?.querySelectorAll('a2ui-basic-textfield');

    if (textfields) {
      for (const tf of Array.from(textfields) as any[]) {
        const path = tf.props?.value?.path;
        if (mandatoryFields.includes(path)) {
          const val = this.surface.dataModel.get(path);
          if (typeof val !== 'string' || val.trim() === '') {
            missingLabels.push(tf.props?.label || 'Required field');
          }
        }
      }
    } else {
      // Fallback if elements are not found in the DOM yet
      for (const path of mandatoryFields) {
        const val = this.surface.dataModel.get(path);
        if (typeof val !== 'string' || val.trim() === '') {
          // clean path name (e.g. "/comments" -> "comments")
          missingLabels.push(path.startsWith('/') ? path.slice(1) : path);
        }
      }
    }

    if (!isScoreValid || missingLabels.length > 0) {
      const errMsg = missingLabels.length > 0
        ? `Submission failed: "${missingLabels.join('", "')}" is mandatory. Please fill it out.`
        : 'Submission failed: Score rating is invalid.';
      
      this.dispatchEvent(new CustomEvent('feedback-error', {
        detail: errMsg,
        bubbles: true,
        composed: true
      }));
      return;
    }

    // Clear error
    this.dispatchEvent(new CustomEvent('feedback-error', {
      detail: '',
      bubbles: true,
      composed: true
    }));

    try {
      const payload: Record<string, any> = {
        timestamp: new Date().toISOString(),
        score,
      };

      // Dynamically extract all configured field paths from the dataModel
      const fieldPaths = this.surface.dataModel.get('/fieldPaths') || [];
      for (const path of fieldPaths) {
        const key = path.startsWith('/') ? path.slice(1) : path;
        const val = this.surface.dataModel.get(path);
        payload[key] = typeof val === 'string' ? val.trim() : val;
      }

      const response = await fetch(this.submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save feedback on the server.');
      }

      this.dispatchEvent(new CustomEvent('feedback-submitted', {
        detail: payload,
        bubbles: true,
        composed: true
      }));
    } catch (err) {
      this.dispatchEvent(new CustomEvent('feedback-error', {
        detail: err instanceof Error ? err.message : String(err),
        bubbles: true,
        composed: true
      }));
    }
  }

  render() {
    if (!this.surface) return nothing;
    return html`
      <a2ui-surface .surface=${this.surface}></a2ui-surface>
    `;
  }
}
