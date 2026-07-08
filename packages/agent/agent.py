import os
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from tools import search_brain, get_recent_items, read_live_url

# Issue 14: Validate critical env vars at startup
_GROQ_KEY = os.getenv("GROQ_API_KEY")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not _GROQ_KEY:
    raise EnvironmentError("FATAL: GROQ_API_KEY is not set. Agent cannot start.")
if not _OPENAI_KEY:
    print("WARNING: OPENAI_API_KEY is not set. Semantic vector search will fall back to regex.")

# Define the state
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: str

# Define the system prompt
SYSTEM_PROMPT = """You are a highly capable autonomous Second Brain Assistant. 
Your strict directive is to provide factual, helpful answers to the user based on their saved knowledge base.

CRITICAL RULES TO PREVENT HALLUCINATIONS:
1. ALWAYS use the `search_brain` tool to look up information before answering, UNLESS the answer is already explicitly in the chat history.
2. If the user asks about recently saved items, ALWAYS use the `get_recent_items` tool.
3. If the user asks about a specific website link, ALWAYS use the `read_live_url` tool to read it.
4. NEVER invent or hallucinate information that you did not retrieve from a tool. If the tools do not return the answer, explicitly state: "I couldn't find that in your Second Brain."
5. Cite your sources implicitly or explicitly based on what the tool returns.
6. FORMATTING: Structure your response beautifully using Markdown. ALWAYS use clear paragraphs (separated by double newlines), bulleted or numbered lists for multiple points, and bold text for emphasis. Never return a single giant wall of text.
"""

def create_agent():
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=_GROQ_KEY,
        temperature=0,
        streaming=True
    )

    # Bind tools to LLM
    tools = [search_brain, get_recent_items, read_live_url]
    llm_with_tools = llm.bind_tools(tools)

    # Issue 1 FIX: async def + ainvoke so the event loop is NEVER blocked.
    # The old `def chatbot` + `llm_with_tools.invoke()` was synchronous and
    # froze the entire asyncio event loop while waiting for Groq to respond.
    async def chatbot(state: AgentState):
        messages = list(state["messages"])
        # Ensure system prompt is always the first message
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

        # ainvoke (async) — does NOT block the event loop
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    # Build the graph
    graph_builder = StateGraph(AgentState)
    graph_builder.add_node("chatbot", chatbot)

    # Add tools node
    tool_node = ToolNode(tools=tools)
    graph_builder.add_node("tools", tool_node)

    # Add routing
    graph_builder.add_conditional_edges(
        "chatbot",
        tools_condition,
    )
    graph_builder.add_edge("tools", "chatbot")
    graph_builder.add_edge(START, "chatbot")

    return graph_builder.compile()

agent_graph = create_agent()
