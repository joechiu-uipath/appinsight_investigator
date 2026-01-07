import Conf from 'conf';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory where the tool is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolDir = path.resolve(__dirname, '..');

const config = new Conf({
  projectName: 'appinsight-investigator',
  cwd: toolDir,
  configName: 'config',
  schema: {
    appInsightsApiKey: {
      type: 'string',
      default: ''
    },
    llmApiKey: {
      type: 'string',
      default: ''
    },
    llmBaseUrl: {
      type: 'string',
      default: 'https://api.openai.com/v1'
    },
    llmModel: {
      type: 'string',
      default: 'gpt-5.2'
    },
    currentAppId: {
      type: 'string',
      default: ''
    },
    currentResourceGroup: {
      type: 'string',
      default: ''
    },
    lastSessionId: {
      type: 'string',
      default: ''
    }
  }
});

export function getAppInsightsApiKey() {
  return config.get('appInsightsApiKey');
}

export function setAppInsightsApiKey(key) {
  config.set('appInsightsApiKey', key);
}

export function hasAppInsightsApiKey() {
  const key = config.get('appInsightsApiKey');
  return key && key.length > 0;
}

export function getLlmApiKey() {
  return config.get('llmApiKey');
}

export function setLlmApiKey(key) {
  config.set('llmApiKey', key);
}

export function hasLlmApiKey() {
  const key = config.get('llmApiKey');
  return key && key.length > 0;
}

export function getLlmBaseUrl() {
  return config.get('llmBaseUrl');
}

export function setLlmBaseUrl(url) {
  config.set('llmBaseUrl', url);
}

export function getLlmModel() {
  return config.get('llmModel');
}

export function setLlmModel(model) {
  config.set('llmModel', model);
}

export function getCurrentAppId() {
  return config.get('currentAppId');
}

export function setCurrentAppId(appId) {
  config.set('currentAppId', appId);
}

export function getCurrentResourceGroup() {
  return config.get('currentResourceGroup');
}

export function setCurrentResourceGroup(rg) {
  config.set('currentResourceGroup', rg);
}

export function getLastSessionId() {
  return config.get('lastSessionId');
}

export function setLastSessionId(sessionId) {
  config.set('lastSessionId', sessionId);
}

export function clearConfig() {
  config.clear();
}

export default config;
