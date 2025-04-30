# Financial Risk Chatbot with Ollama Llama 3

This application includes an AI-powered chatbot that uses the Llama 3 model via Ollama to answer questions about financial risk analysis. The chatbot integrates with the Neo4j database to provide context-aware responses based on your actual financial risk data.

## Setup Instructions

### 1. Install Ollama

First, you need to install Ollama on your system. Ollama is a tool that lets you run large language models locally.

Visit the official website to download and install: [https://ollama.ai/](https://ollama.ai/)

### 2. Pull the Llama 3 Model

After installing Ollama, pull the Llama 3 model:

```bash
ollama pull llama3
```

For better performance with instructions, you can also pull the instruct variant:

```bash
ollama pull llama3:instruct
```

### 3. Start Ollama Server

Make sure the Ollama server is running:

```bash
ollama serve
```

By default, Ollama runs on port 11434. You can verify it's running by visiting `http://localhost:11434`.

### 4. Install Required Python Packages

Install the required Python packages:

```bash
pip install -r financial_risk/requirements.txt
```

### 5. Configure the Chatbot

The chatbot configuration is in `financial_risk/config/ollama_config.yaml`. You can customize:

- API URL
- Model parameters
- Logging settings
- Context templates

### 6. Start the Application

Start the backend:

```bash
cd financial_risk
uvicorn api.main:app --reload
```

Start the frontend:

```bash
npm start
```

## Using the Chatbot

1. The chatbot appears as a chat bubble in the bottom right corner of the application.
2. Click the chat bubble to open the chatbot interface.
3. Type your questions about financial risk analysis, transaction patterns, customer behavior, etc.
4. The chatbot will respond with insights based on your financial data in Neo4j.

## Example Questions

Here are some example questions you can ask:

- "What is the overall risk score for the system?"
- "How many high-risk transactions do we have?"
- "What are the most common risk factors?"
- "Can you explain what factors contribute to customer risk scores?"
- "Which merchant categories have the highest risk?"
- "How is risk calculated in the system?"
- "What actions should I take for high-risk customers?"
- "Explain the difference between anomaly detection and risk scoring"
- "What transaction patterns indicate potential fraud?"

## Technical Details

- The chatbot uses the Llama 3 model via Ollama's API
- Queries to Neo4j provide real-time data for context-aware responses
- The system dynamically fetches relevant data based on the query type
- All conversations are logged for audit purposes
- The interface is built with React and Material-UI components

## Troubleshooting

- If the chatbot doesn't respond, check if Ollama is running
- For "model not found" errors, make sure you've pulled the model
- Check the logs at `chatbot_logs.txt` for more detailed error information
- Ensure Neo4j is running for data-enriched responses 