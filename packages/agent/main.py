import os
import json
import asyncio
from typing import List
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage

# Load .env from backend folder to share keys
dotenv_path = os.path.join(os.path.dirname(__file__), '../../backend/.env')
load_dotenv(dotenv_path)

from agent import agent_graph

app = FastAPI()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: List[Message] = []
    userId: str

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
            # Issue 4 FIX: Wrap the entire stream in asyncio.wait_for with a 60s timeout.
            # Without this, a hung OpenAI call or slow MongoDB query freezes the agent forever.
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
                        tool_name = event["name"]
                        action_msg = f"Searching your brain for relevant information..."
                        yield f"data: {json.dumps({'type': 'action', 'content': action_msg})}\n\n"

            async for sse_event in stream_events():
                yield sse_event

        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'content': 'The agent timed out. Please try again.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Agent error: {str(e)}'})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_response(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
