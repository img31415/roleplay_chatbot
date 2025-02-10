# Role-Playing Chatbot

This project implements a role-playing chatbot using Llama 2, Chroma, and other open-source tools.

## Prerequisites

*   Node.js and npm (or yarn)
*   Python 3.9+
*   Docker and Docker Compose
*   Ollama (installed locally)
*   Llama 2 model files (downloaded separately and placed in the `llama2` directory)

## Setup

1.  **Clone the repository:** `git clone <repository_url>`
2.  **Navigate to the project directory:** `cd role-playing-chatbot`
3.  **Backend:**
    *   Navigate to backend directory: `cd backend`
    *   Install dependencies: `npm install`
4.  **Frontend:**
    *   Navigate to frontend directory: `cd frontend`
    *   Install dependencies: `npm install`
5.  **Python APIs:**
    *   Navigate to python_apis directory: `cd python_apis`
    *   For each API (vision_api, embedding_api, llm_api), navigate to directory and install dependencies: `pip install -r requirements.txt`
6.  **Llama 2:**
    *   Place your Llama 2 model files in the `llama2` directory.
7.  **.env file:** Create a `.env` file in the root directory and add the following environment variables:
    ```
    #Backend
    CHROMA_HOST=db
    CHROMA_PORT=8000
    OLLAMA_BASE_URL=[http://host.docker.internal:11434](http://host.docker.internal:11434) #If you run ollama locally.
    #OLLAMA_BASE_URL=http://ollama:11434 #If you run ollama in docker as well.
    ```

## Running the Project

1.  **Start Chroma:** `docker-compose up -d db` (from the root of the project).
2.  **Start Python APIs:** `docker-compose up -d vision_api embedding_api llm_api` (from the root of the project).
3.  **Start Ollama (locally):** Follow the Ollama instructions to run it on your machine. Ensure it's serving the Llama 2 model.
4.  **Start Backend:** `docker-compose up -d web` (from the root of the project).
5.  **Start Frontend:** `docker-compose up -d frontend` (from the root of the project).

## Accessing the Chatbot

Open your web browser and go to `http://localhost:80` (or the appropriate port if you changed it).

## Stopping the Project

`docker-compose down` (from the root of the project).