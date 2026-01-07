import fs from 'fs';
import path from 'path';
import { ChatSession } from './llm.js';
import { executeQuery, getSessionData, formatQueryResultsCompact, getRowCount } from './appinsights.js';

const INVESTIGATOR_FILE = path.join(process.cwd(), 'Investigator.md');

function loadInvestigatorPrompt() {
  try {
    if (fs.existsSync(INVESTIGATOR_FILE)) {
      return fs.readFileSync(INVESTIGATOR_FILE, 'utf-8');
    }
  } catch (error) {
    console.error('Error loading Investigator.md:', error.message);
  }
  return getDefaultInvestigatorPrompt();
}

function getDefaultInvestigatorPrompt() {
  return `You are an App Insights investigator agent. You analyze Azure Application Insights telemetry data to help diagnose issues.

When given session data and a user complaint, analyze the events to identify:
1. The sequence of operations
2. Any errors or failures
3. Performance issues (slow operations)
4. Missing or unexpected events

Provide clear, actionable insights based on the telemetry data.`;
}

export class InvestigatorAgent {
  constructor() {
    const systemPrompt = loadInvestigatorPrompt();
    this.chatSession = new ChatSession(systemPrompt);
    this.currentSessionId = null;
    this.sessionData = null;
    this.eventCount = 0;
  }

  async setSession(sessionId) {
    this.currentSessionId = sessionId;
    try {
      this.sessionData = await getSessionData(sessionId);
      const dataStr = formatQueryResultsCompact(this.sessionData);
      this.eventCount = getRowCount(this.sessionData);

      this.chatSession.addContext(
        `Session ID: ${sessionId}\nSession Data (${this.eventCount} events):\n${dataStr}`
      );

      return { success: true, eventCount: this.eventCount };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async investigate(complaint) {
    if (!this.currentSessionId) {
      return 'No session loaded. Use "session <id>" to load a session first.';
    }

    const prompt = `User complaint: "${complaint}"

Based on the session data provided, investigate this issue. Analyze the events, look for errors, timing issues, or anything that might explain the user's complaint.

If you need to run additional queries, provide the KQL query in a code block and I will execute it for you.`;

    try {
      const response = await this.chatSession.send(prompt);
      return await this.processResponse(response);
    } catch (error) {
      return `Error during investigation: ${error.message}`;
    }
  }

  async chat(message) {
    try {
      const response = await this.chatSession.send(message);
      return await this.processResponse(response);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async processResponse(response) {
    // Check if the LLM wants to execute a query
    const kqlMatch = response.match(/```(?:kql|kusto)?\s*([\s\S]*?)```/);
    if (kqlMatch && (response.toLowerCase().includes('execute') || response.toLowerCase().includes('run') || response.toLowerCase().includes('let me query'))) {
      const query = kqlMatch[1].trim();
      if (query.toLowerCase().includes('customevents') || query.toLowerCase().includes('where') || query.toLowerCase().includes('project')) {
        console.log('\n[Agent executing query...]');
        console.log('─'.repeat(40));
        console.log(query);
        console.log('─'.repeat(40));

        try {
          const result = await executeQuery(query);
          const dataStr = formatQueryResultsCompact(result);
          const rowCount = getRowCount(result);
          this.chatSession.addContext(`Query result (${rowCount} rows):\n${dataStr}`);

          console.log(`\n[Query returned ${rowCount} row(s)]\n`);

          // Get follow-up analysis
          const followUp = await this.chatSession.send(
            'Here are the query results. Please analyze them and continue the investigation.'
          );
          return `${response}\n\n${'─'.repeat(60)}\n[Query Results: ${rowCount} row(s)]\n${'─'.repeat(60)}\n\n${followUp}`;
        } catch (error) {
          return `${response}\n\n[Query execution failed: ${error.message}]`;
        }
      }
    }

    return response;
  }

  async executeCustomQuery(query) {
    try {
      const result = await executeQuery(query);
      const dataStr = formatQueryResultsCompact(result);
      const rowCount = getRowCount(result);
      this.chatSession.addContext(`Custom query result (${rowCount} rows):\n${dataStr}`);
      return { success: true, data: dataStr, rowCount };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  clearContext() {
    const systemPrompt = loadInvestigatorPrompt();
    this.chatSession = new ChatSession(systemPrompt);
    this.currentSessionId = null;
    this.sessionData = null;
    this.eventCount = 0;
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  getEventCount() {
    return this.eventCount;
  }
}
