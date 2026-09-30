import os
import httpx
from langchain_core.tools import tool
from typing import Annotated
from langchain_core.runnables.config import RunnableConfig
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# We need a way to connect to MongoDB inside tools.
dotenv_path = os.path.join(os.path.dirname(__file__), '../../backend/.env')
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/chat-app")
JINA_API_KEY = os.getenv("JINA_API_KEY")
BACKEND_PORT = os.getenv("PORT", "5001")
BACKEND_URL = os.getenv("BACKEND_INTERNAL_URL", f"http://127.0.0.1:{BACKEND_PORT}")

client = AsyncIOMotorClient(MONGODB_URI)
try:
    db = client.get_default_database()
except Exception:
    db = client.get_database("chat-app")

contents_collection = db["contents"]

@tool
async def search_brain(query: str, config: RunnableConfig) -> str:
    """Searches the user's saved knowledge base (Second Brain) for a specific query. Use this to lookup facts."""
    try:
        user_id = config.get("configurable", {}).get("user_id")
        if not user_id:
            return "Error: user_id not provided."
        from bson import ObjectId

        results = []

        try:
            # Query local in-memory embedding from Node.js (MiniLM-L6-v2, 384 dimensions)
            async with httpx.AsyncClient(timeout=6.0) as http_client:
                embed_res = await http_client.post(
                    f"{BACKEND_URL}/api/v1/internal/embed",
                    json={"text": query}
                )
                if embed_res.status_code == 200:
                    query_embedding = embed_res.json().get("embedding")
                    if query_embedding and len(query_embedding) == 384:
                        pipeline = [
                            {
                                "$vectorSearch": {
                                    "index": "vector_index",
                                    "path": "embedding",
                                    "queryVector": query_embedding,
                                    "filter": { "userId": { "$eq": ObjectId(user_id) } },
                                    "numCandidates": 100,
                                    "limit": 5
                                }
                            },
                            {
                                "$project": {
                                    "title": 1,
                                    "link": 1,
                                    "description": 1,
                                    "topics": 1,
                                    "tags": 1,
                                    "similarity": { "$meta": "vectorSearchScore" }
                                }
                            }
                        ]
                        cursor = contents_collection.aggregate(pipeline)
                        results = await cursor.to_list(length=5)
        except Exception as vec_err:
            print(f"[SEARCH_BRAIN] Vector search unavailable ({vec_err}). Using smart keyword fallback.")

        # Multi-field fallback if vector search yielded no results
        if not results:
            keywords = [w.strip() for w in query.split() if len(w.strip()) > 2]
            regex_pattern = "|".join(keywords) if keywords else query
            cursor = contents_collection.find(
                {
                    "userId": ObjectId(user_id),
                    "$or": [
                        {"title": {"$regex": regex_pattern, "$options": "i"}},
                        {"description": {"$regex": regex_pattern, "$options": "i"}},
                        {"topics": {"$regex": regex_pattern, "$options": "i"}},
                        {"tags": {"$regex": regex_pattern, "$options": "i"}},
                        {"link": {"$regex": regex_pattern, "$options": "i"}},
                    ]
                }
            ).limit(5)
            results = await cursor.to_list(length=5)

        if not results:
            return f"No results found in your Second Brain for '{query}'."

        formatted = []
        for c in results:
            sim = c.get('similarity', 'N/A')
            topics = ", ".join(c.get('topics', [])) if c.get('topics') else "General"
            formatted.append(f"Title: {c.get('title')}\nLink: {c.get('link')}\nTopics: {topics}\nDescription: {c.get('description')}\nSimilarity: {sim}")
        return "\n\n---\n\n".join(formatted)
    except Exception as e:
        return f"Error searching brain: {str(e)}"

@tool
async def get_recent_items(limit: int, config: RunnableConfig) -> str:
    """Fetches the most recently saved items in the user's Second Brain."""
    try:
        user_id = config.get("configurable", {}).get("user_id")
        if not user_id:
            return "Error: user_id not provided."
        from bson import ObjectId
        cursor = contents_collection.find({"userId": ObjectId(user_id)}).sort("createdAt", -1).limit(min(limit, 10))
        results = await cursor.to_list(length=10)

        if not results:
            return "No recent items found."

        formatted = []
        for c in results:
            formatted.append(f"Title: {c.get('title')}\nLink: {c.get('link')}\nType: {c.get('type')}")
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Error fetching recent items: {str(e)}"

@tool
async def read_live_url(url: str) -> str:
    """Reads the text content of a live website URL."""
    try:
        # Issue 2 FIX: Use httpx.AsyncClient instead of blocking requests.get.
        # The old synchronous requests.get blocked the entire event loop for
        # 5-15 seconds, freezing all streaming tokens during that time.
        headers = {}
        if JINA_API_KEY:
            headers["Authorization"] = f"Bearer {JINA_API_KEY}"
        headers["x-respond-with"] = "text"

        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(f"https://r.jina.ai/{url}", headers=headers)
        if response.status_code == 200:
            return response.text[:8000]
        return f"Failed to read URL. Status: {response.status_code}"
    except Exception as e:
        return f"Error reading URL: {str(e)}"
