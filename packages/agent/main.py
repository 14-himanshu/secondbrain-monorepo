import os
import json
import asyncio
from typing import List
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage

# Load .env from backend folder to share keys
dotenv_path = os.path.join(os.path.dirname(__file__), '../../backend/.env')
load_dotenv(dotenv_path)

from agent import agent_graph

app = FastAPI(title="Second Brain AI Agent", version="1.0.0")

# Issue #13 FIX: Add CORS middleware so the agent is safely accessible
# even if called directly (e.g. during testing or future direct-client use).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5001",
        "http://127.0.0.1:5001",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: List[Message] = []
    userId: str

# Issue #14 FIX: Add a health check endpoint so Node backend and load
# balancers can verify the agent is alive before routing traffic to it.
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "llama-3.3-70b-versatile",
        "groq_key_set": bool(os.getenv("GROQ_API_KEY")),
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
    }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    async def generate_response():
        # Convert history to LangChain messages
        messages = []
        for msg in request.history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        messages.append(HumanMessage(content=request.query))

        # Configure the LangGraph run with the user_id
        config = {"configurable": {"user_id": request.userId}}

        try:
            # Issue #4 FIX: Wrap the entire stream in asyncio.wait_for with a 60s timeout.
            # The TimeoutError is now properly caught and reported to the frontend.
            async def stream_events():
                async for event in agent_graph.astream_events(
                    {"messages": messages},
                    config=config,
                    version="v2"
                ):
                    kind = event["event"]
                    if kind == "on_chat_model_stream":
                        chunk = event["data"]["chunk"]
                        if chunk.content:
                            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
                    elif kind == "on_tool_start":
                        # Issue #8 FIX: Show the correct action message based on which tool was called.
                        tool_name = event["name"]
                        tool_messages = {
                            "search_brain":    "🔍 Searching your Second Brain...",
                            "get_recent_items": "📋 Fetching your recent items...",
                            "read_live_url":   "🌐 Reading the live web page...",
                        }
                        action_msg = tool_messages.get(tool_name, f"⚙️ Running {tool_name}...")
                        yield f"data: {json.dumps({'type': 'action', 'content': action_msg})}\n\n"

            # Wrap entire stream with a 60-second timeout
            async def timed_stream():
                try:
                    async for event in asyncio.timeout(60)(stream_events().__aiter__()):
                        yield event
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'error', 'content': 'The agent timed out (60s). Please try a shorter question or try again.'})}\n\n"

            async for sse_event in timed_stream():
                yield sse_event

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Agent error: {str(e)}'})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_response(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
