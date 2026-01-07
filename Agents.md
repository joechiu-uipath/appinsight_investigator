# App Insight Investigator CLI

This is a command line tool for analyzing Azure App Insights telemetry data from services using LLM.

* Settings - create and read config from config.json from program working directory that stores app settings like App Insight PAT token, LLM API key
* Auth for App Insights - read in and store the API key to access Azure App Insight over API
* Auth for LLM - read in user's API key to gain access to an Open AI compatible LLM using OpenAI style API. Will use LLM to compose KQL query and analze app insight data.
* App Insight - use Azure App Insight's public API to issue Kusto (KQL) query and analyze the results
* Agentic investigator - create a Investigator.md file and populate it with system prompt for an agent that would investigate user compaints using app insight query and results. Write the initial version of this file. Users can edit this to add more info.

# The general app flow

The app is both conversational and a CLI. If a known command is entered, it would run the command, otherwise the conversational input it sent to the LLM along with the Investigator.md system prompt and past chat history. The app sits in a loop waiting for the next command or message. The app is stateful that it remembers the chat history and include that in the LLM calls.

# Initial Investigator.md file

This file is app specific and has information about how a particular application organizes its app inishgt telemetry.
Telemetry event types - query for "customEvents" event type
User session - the top level session_Id property is the main session id. Use this to scope query to relevant data.
Most useful fields - timestamp, name, customDimensions, customMeasures

# Investigation flow

 1. use provided session info to scope to fetch all relevant app insight data
 2. combine with user report or complaint like the operation fail or being too slow
 3. review app insight results to see if root cause was apparent
 4. if not - create new Kusto (KQL) query to further root cause problem
 5. share investigation results

# Example commands

`appinsight jarvis-stg-eus-rg` - this uses the appinsight instance inside the resource group jarvis-stg-eus-rg. There are generally only one app insight instance in the resource group
`session +BEDYlOz6f/KD/zyH1SUql` - consult Investigator.md 
`investigate user says the operation takes too long` - investigate command would trigger the LLM-based investigation agent, see "Investigation flow" section

# Reference

C:\repo\athena_log_view is an unrelated CLI tool, and I like how its CLI beahves, so reference this for how the CLI should work.
