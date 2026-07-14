"""Root Google ADK conversational agent with an A2UI specialist subagent."""

from google.adk.agents.llm_agent import Agent

from .a2ui_agent import a2ui_agent


def get_greeting(name: str) -> dict[str, str]:
    """Return a friendly greeting for the supplied name."""
    cleaned_name = name.strip() or "friend"
    return {
        "status": "success",
        "greeting": f"Hello, {cleaned_name}! Welcome to Google ADK with A2UI.",
    }


root_agent = Agent(
    model="gemini-flash-latest",
    name="root_agent",
    description="A helpful conversational assistant that delegates UI requests.",
    instruction=(
        "You are a concise, friendly general assistant. Handle normal "
        "conversation yourself. When the user asks to see, open, create, or "
        "show the score selector, review form, rating form, or any A2UI user "
        "interface, MUST transfer control to a2ui_specialist. Do not create or "
        "print A2UI JSON yourself."
    ),
    tools=[get_greeting],
    sub_agents=[a2ui_agent],
)
