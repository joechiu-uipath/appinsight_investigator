import fetch from 'node-fetch';
import { getAppInsightsApiKey, getCurrentAppId } from './config.js';

export async function executeQuery(query, appId = null) {
  const apiKey = getAppInsightsApiKey();
  if (!apiKey) {
    throw new Error('App Insights API key not configured. Use "config api-key <key>" to set it.');
  }

  const targetAppId = appId || getCurrentAppId();
  if (!targetAppId) {
    throw new Error('No App Insights application selected. Use "appinsight <app-id>" first.');
  }

  const url = `https://api.applicationinsights.io/v1/apps/${targetAppId}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function getSessionData(sessionId, timeRange = '7d') {
  const query = `customEvents
| where timestamp > ago(${timeRange})
| where session_Id == "${sessionId}"
| project timestamp, name, session_Id, customDimensions, customMeasurements
| order by timestamp asc`;

  return executeQuery(query);
}

export async function getRecentEvents(limit = 50, timeRange = '1d') {
  const query = `customEvents
| where timestamp > ago(${timeRange})
| project timestamp, name, session_Id, customDimensions
| order by timestamp desc
| take ${limit}`;

  return executeQuery(query);
}

export function formatQueryResults(result) {
  if (!result.tables || result.tables.length === 0) {
    return 'No results found.';
  }

  const table = result.tables[0];
  const columns = table.columns.map((c) => c.name);
  const rows = table.rows;

  if (rows.length === 0) {
    return 'Query returned no rows.';
  }

  let output = `Found ${rows.length} row(s)\n`;
  output += '─'.repeat(60) + '\n';

  for (const row of rows) {
    const record = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    output += JSON.stringify(record, null, 2) + '\n';
    output += '─'.repeat(40) + '\n';
  }

  return output;
}

export function formatQueryResultsCompact(result) {
  if (!result.tables || result.tables.length === 0) {
    return 'No results found.';
  }

  const table = result.tables[0];
  const columns = table.columns.map((c) => c.name);
  const rows = table.rows;

  if (rows.length === 0) {
    return 'Query returned no rows.';
  }

  const records = rows.map((row) => {
    const record = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return JSON.stringify(records, null, 2);
}

export function getRowCount(result) {
  if (!result.tables || result.tables.length === 0) {
    return 0;
  }
  return result.tables[0].rows?.length || 0;
}
