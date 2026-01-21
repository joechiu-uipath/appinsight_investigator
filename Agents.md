# App Insight Investigator CLI

This is a command line tool for analyzing Azure App Insights telemetry data from services using LLM.

* Settings - create and read config from config.json from program working directory that stores app settings like App Insight PAT token, LLM API key
* Auth for App Insights - read in and store the API key to access Azure App Insight over API
* Auth for LLM - read in user's API key to gain access to an Open AI compatible LLM using OpenAI style API. Will use LLM to compose KQL query and analze app insight data. Read in info from OPENAI_API_KEY and OPENAI_ENDPOINT environment variables if they are present. Use gpt-5.2 as default model. Make full use of the model's context window, do not set a small context window limit.
* App Insight - use Azure App Insight's public API to issue Kusto (KQL) query and analyze the results
* Agentic investigator - create a Investigator.md file and populate it with system prompt for an agent that would investigate user compaints using app insight query and results. Write the initial version of this file. Users can edit this to add more info.
* develop using javascript and node.js. Consider using readline to make the interactive shell and chalk library for colored command line UI for extra polish

# The general app flow

The app is both conversational and a TUI (Termincal User Interface). If a known command is entered, it would run the command, otherwise the conversational input it sent to the LLM along with the Investigator.md system prompt and past chat history. The app sits in a loop waiting for the next command or message. The app is stateful that it remembers the chat history and include that in the LLM calls.

# Initial Investigator.md file

This file is app specific and has information about how a particular application organizes its app inishgt telemetry.
Telemetry event types - query for "customEvents" event type
User session - the top level session_Id property is the main session id. Use this to scope query to relevant data.
Most useful fields - timestamp, name, customDimensions, customMeasures
Time scope - sometimes we get request for sessions that are several days old. Use past 30 days as the default KQL query time time scope.

# Investigation flow

 1. use provided session info to scope to fetch all relevant app insight data
 2. combine with user report or complaint like the operation fail or being too slow
 3. review app insight results to see if root cause was apparent
 4. if not - create new Kusto (KQL) query to further root cause problem
 5. share investigation results - share evidence but keep your conclusion concise and to the point. User can always ask for clarification and more info. There is no need to be verbose.

# Example commands

`appinsight e6891848-e4c4-48d2-95f5-4a10c9f4fc61` - this access appinsight instance with app id = e6891848-e4c4-48d2-95f5-4a10c9f4fc61. In Azure Portal, we can crete API keys against app id to allow for programmatic telemetry access.
`session +BEDYlOz6f/KD/zyH1SUql` - consult Investigator.md 
`investigate user says the operation takes too long` - investigate command would trigger the LLM-based investigation agent, see "Investigation flow" section
