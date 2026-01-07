#!/usr/bin/env node

import inquirer from 'inquirer';
import {
  hasAppInsightsApiKey, setAppInsightsApiKey,
  hasLlmApiKey, setLlmApiKey, setLlmBaseUrl, setLlmModel,
  getCurrentAppId, setCurrentAppId,
  getLastSessionId, setLastSessionId,
  getLlmBaseUrl, getLlmModel,
  clearConfig
} from './config.js';
import { executeQuery, formatQueryResults, getRowCount } from './appinsights.js';
import { InvestigatorAgent } from './investigator.js';

class AppInsightInvestigator {
  constructor() {
    this.agent = new InvestigatorAgent();
    this.appId = null;
  }

  printHeader() {
    console.log('\n' + '═'.repeat(60));
    console.log('  App Insight Investigator - LLM-Powered Telemetry Analysis');
    console.log('═'.repeat(60) + '\n');
  }

  printHelp() {
    console.log(`
Available Commands:
  appinsight <id>, ai <id>  - Set App Insights application ID
  session <id>, s <id>      - Load session for investigation
  investigate <text>, inv   - Start investigation with complaint
  query <kql>, q <kql>      - Execute custom KQL query
  config api-key <key>      - Set App Insights API key
  config llm-key <key>      - Set LLM API key
  config llm-url <url>      - Set LLM base URL (default: OpenAI)
  config llm-model <model>  - Set LLM model (default: gpt-4)
  status, st                - Show current configuration
  clear, c                  - Clear conversation context
  help, h, ?                - Show this help
  quit, q, exit             - Exit the application

For conversational queries, just type your message.
`);
  }

  printStatus() {
    const sessionId = this.agent.getCurrentSessionId();
    const eventCount = this.agent.getEventCount();
    const appId = getCurrentAppId();

    let status = '\n';
    if (appId) {
      status += `[App: ${appId.substring(0, 15)}${appId.length > 15 ? '...' : ''}]`;
    } else {
      status += '[App: not set]';
    }

    if (sessionId) {
      status += ` [Session: ${sessionId.substring(0, 12)}${sessionId.length > 12 ? '...' : ''}]`;
      status += ` [Events: ${eventCount}]`;
    }

    console.log(status);
  }

  printConfigStatus() {
    console.log('\nConfiguration Status:');
    console.log('─'.repeat(50));
    console.log(`  App Insights API Key: ${hasAppInsightsApiKey() ? '[configured]' : '[not set]'}`);
    console.log(`  LLM API Key:      ${hasLlmApiKey() ? '[configured]' : '[not set]'}`);
    console.log(`  LLM Base URL:     ${getLlmBaseUrl()}`);
    console.log(`  LLM Model:        ${getLlmModel()}`);
    console.log(`  Current App ID:   ${getCurrentAppId() || '[not set]'}`);
    console.log(`  Active Session:   ${this.agent.getCurrentSessionId() || '[none]'}`);
    console.log('─'.repeat(50));
  }

  parseCommand(input) {
    const trimmed = input.trim();
    const spaceIndex = trimmed.indexOf(' ');

    if (spaceIndex === -1) {
      return { command: trimmed.toLowerCase(), args: '' };
    }

    return {
      command: trimmed.substring(0, spaceIndex).toLowerCase(),
      args: trimmed.substring(spaceIndex + 1).trim()
    };
  }

  async handleCommand(input) {
    const { command, args } = this.parseCommand(input);

    switch (command) {
      case '':
        return true;

      case 'appinsight':
      case 'ai':
        if (!args) {
          console.log('\nUsage: appinsight <app-id>');
          console.log('Example: appinsight 12345678-abcd-efgh-ijkl-mnopqrstuvwx');
        } else {
          setCurrentAppId(args);
          console.log(`\nApp Insights application set: ${args}`);
        }
        break;

      case 'session':
      case 's':
        if (!args) {
          console.log('\nUsage: session <session-id>');
          console.log('Example: session +BEDYlOz6f/KD/zyH1SUql');
        } else {
          console.log(`\nLoading session ${args}...`);
          const result = await this.agent.setSession(args);
          if (result.success) {
            setLastSessionId(args);
            console.log(`Session loaded with ${result.eventCount} event(s).`);
          } else {
            console.log(`Failed to load session: ${result.error}`);
          }
        }
        break;

      case 'investigate':
      case 'inv':
        if (!args) {
          const answers = await inquirer.prompt([{
            type: 'input',
            name: 'complaint',
            message: 'Enter user complaint:',
            validate: (input) => input.trim().length > 0 || 'Please enter a complaint'
          }]);
          console.log('\nInvestigating...\n');
          const response = await this.agent.investigate(answers.complaint);
          console.log(response);
        } else {
          console.log('\nInvestigating...\n');
          const response = await this.agent.investigate(args);
          console.log(response);
        }
        break;

      case 'query':
      case 'q':
        if (!args) {
          console.log('\nUsage: query <kql-query>');
          console.log('Example: query customEvents | take 10');
        } else {
          console.log('\nExecuting query...\n');
          try {
            const result = await executeQuery(args);
            console.log(formatQueryResults(result));
          } catch (error) {
            console.log(`Query failed: ${error.message}`);
          }
        }
        break;

      case 'config':
        await this.handleConfig(args);
        break;

      case 'status':
      case 'st':
        this.printConfigStatus();
        break;

      case 'clear':
      case 'c':
        this.agent.clearContext();
        console.log('\nConversation context cleared.');
        break;

      case 'help':
      case 'h':
      case '?':
        this.printHelp();
        break;

      case 'quit':
      case 'exit':
        console.log('\nGoodbye!');
        return false;

      default:
        // Not a command, treat as conversational input
        if (input.trim()) {
          console.log('\nThinking...\n');
          try {
            const response = await this.agent.chat(input.trim());
            console.log(response);
          } catch (error) {
            console.log(`Error: ${error.message}`);
          }
        }
    }

    return true;
  }

  async handleConfig(args) {
    if (!args) {
      console.log('\nUsage: config <setting> <value>');
      console.log('Settings: api-key, llm-key, llm-url, llm-model');
      return;
    }

    const parts = args.split(' ');
    const setting = parts[0].toLowerCase();
    const value = parts.slice(1).join(' ');

    if (!value) {
      console.log(`\nUsage: config ${setting} <value>`);
      return;
    }

    switch (setting) {
      case 'api-key':
        setAppInsightsApiKey(value);
        console.log('\nApp Insights API key configured.');
        break;
      case 'llm-key':
        setLlmApiKey(value);
        console.log('\nLLM API key configured.');
        break;
      case 'llm-url':
        setLlmBaseUrl(value);
        console.log(`\nLLM base URL set to: ${value}`);
        break;
      case 'llm-model':
        setLlmModel(value);
        console.log(`\nLLM model set to: ${value}`);
        break;
      default:
        console.log(`\nUnknown setting: ${setting}`);
        console.log('Available: api-key, llm-key, llm-url, llm-model');
    }
  }

  async ensureAuthentication() {
    if (!hasAppInsightsApiKey()) {
      console.log('App Insights API key not configured.');
      const answers = await inquirer.prompt([{
        type: 'password',
        name: 'apiKey',
        message: 'Enter your App Insights API key:',
        mask: '*',
        validate: (input) => input.trim().length > 0 || 'API key is required'
      }]);
      setAppInsightsApiKey(answers.apiKey);
      console.log('App Insights API key saved.\n');
    }

    if (!hasLlmApiKey()) {
      console.log('LLM API key not configured.');
      const answers = await inquirer.prompt([{
        type: 'password',
        name: 'apiKey',
        message: 'Enter your LLM API key (OpenAI or compatible):',
        mask: '*',
        validate: (input) => input.trim().length > 0 || 'API key is required'
      }]);
      setLlmApiKey(answers.apiKey);
      console.log('LLM API key saved.\n');
    }
  }

  async promptForAppId() {
    const currentAppId = getCurrentAppId();
    if (currentAppId) {
      const answers = await inquirer.prompt([{
        type: 'confirm',
        name: 'useCurrent',
        message: `Use previous App Insights ID (${currentAppId})?`,
        default: true
      }]);
      if (answers.useCurrent) {
        return currentAppId;
      }
    }

    const answers = await inquirer.prompt([{
      type: 'input',
      name: 'appId',
      message: 'Enter App Insights Application ID:',
      validate: (input) => input.trim().length > 0 || 'Application ID is required'
    }]);

    setCurrentAppId(answers.appId);
    return answers.appId;
  }

  async run() {
    this.printHeader();

    // Ensure authentication
    await this.ensureAuthentication();

    // Get App Insights ID
    this.appId = await this.promptForAppId();
    console.log(`\nUsing App Insights: ${this.appId}`);

    // Restore last session if available
    const lastSession = getLastSessionId();
    if (lastSession) {
      const answers = await inquirer.prompt([{
        type: 'confirm',
        name: 'restoreSession',
        message: `Restore previous session (${lastSession.substring(0, 20)}...)?`,
        default: false
      }]);
      if (answers.restoreSession) {
        console.log('\nLoading session...');
        const result = await this.agent.setSession(lastSession);
        if (result.success) {
          console.log(`Session loaded with ${result.eventCount} event(s).`);
        } else {
          console.log(`Failed to load session: ${result.error}`);
        }
      }
    }

    this.printHelp();

    // Interactive command loop
    let running = true;
    while (running) {
      this.printStatus();

      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'command',
        message: '>',
        prefix: ''
      }]);

      try {
        running = await this.handleCommand(answers.command);
      } catch (error) {
        console.log(`\nError: ${error.message}`);
      }
    }
  }
}

// Main entry point
const app = new AppInsightInvestigator();
app.run().catch((error) => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
