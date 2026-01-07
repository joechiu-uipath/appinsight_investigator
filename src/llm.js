import fetch from 'node-fetch';
import { getLlmApiKey, getLlmBaseUrl, getLlmModel } from './config.js';

export async function chatCompletion(messages, options = {}) {
  const apiKey = getLlmApiKey();
  if (!apiKey) {
    throw new Error('LLM API key not configured. Use "config llm-key <key>" to set it.');
  }

  const baseUrl = getLlmBaseUrl();
  const model = options.model || getLlmModel();
  const url = `${baseUrl}/chat/completions`;

  const requestBody = {
    model,
    messages,
  };

  // Only add optional parameters if explicitly provided
  if (options.maxTokens) {
    // Newer models use max_completion_tokens, older use max_tokens
    const isNewerModel = model.includes('gpt-4o') || model.includes('gpt-5') || model.includes('o1');
    requestBody[isNewerModel ? 'max_completion_tokens' : 'max_tokens'] = options.maxTokens;
  }
  if (options.temperature !== undefined) {
    requestBody.temperature = options.temperature;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.choices && result.choices.length > 0) {
    return result.choices[0].message.content;
  }

  throw new Error('No response from LLM');
}

export class ChatSession {
  constructor(systemPrompt) {
    this.systemPrompt = systemPrompt;
    this.messages = [
      { role: 'system', content: systemPrompt }
    ];
  }

  async send(userMessage) {
    this.messages.push({ role: 'user', content: userMessage });

    const response = await chatCompletion(this.messages);

    this.messages.push({ role: 'assistant', content: response });

    return response;
  }

  addContext(context) {
    this.messages.push({
      role: 'user',
      content: `[Context]: ${context}`
    });
  }

  getHistory() {
    return [...this.messages];
  }

  clearHistory() {
    this.messages = [
      { role: 'system', content: this.systemPrompt }
    ];
  }

  updateSystemPrompt(newPrompt) {
    this.systemPrompt = newPrompt;
    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0].content = newPrompt;
    }
  }
}
