"""A Google ADK agent that can render an A2UI score selector."""

import json

from a2ui.adk.send_a2ui_to_client_toolset import SendA2uiToClientToolset
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.schema.constants import VERSION_0_9
from a2ui.schema.manager import A2uiSchemaManager
from google.adk.agents.llm_agent import Agent


SCORE_SELECTOR_MESSAGES = [
    {
        "version": "v0.9",
        "createSurface": {
            "surfaceId": "score-selector",
            "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
        },
    },
    {
        "version": "v0.9",
        "updateComponents": {
            "surfaceId": "score-selector",
            "components": [
                {
                    "id": "root",
                    "component": "Column",
                    "children": [
                        "score-title",
                        "original-question",
                        "expected-answer",
                        "score-options",
                        "comments",
                    ],
                },
                {
                    "id": "score-title",
                    "component": "Text",
                    "text": "Select a score from 0 to 5",
                    "variant": "h2",
                },
                {
                    "id": "original-question",
                    "component": "TextField",
                    "label": "Original question",
                    "value": {"path": "/originalQuestion"},
                    "variant": "longText",
                },
                {
                    "id": "expected-answer",
                    "component": "TextField",
                    "label": "Expected answer (optional)",
                    "value": {"path": "/expectedAnswer"},
                    "variant": "longText",
                },
                {
                    "id": "score-options",
                    "component": "ChoicePicker",
                    "label": "Score",
                    "options": [
                        {"label": str(score), "value": str(score)}
                        for score in range(6)
                    ],
                    "value": {"path": "/score"},
                    "variant": "mutuallyExclusive",
                },
                {
                    "id": "comments",
                    "component": "TextField",
                    "label": "Comments",
                    "value": {"path": "/comments"},
                    "variant": "longText",
                },
            ],
        }
    },
    {
        "version": "v0.9",
        "updateDataModel": {
            "surfaceId": "score-selector",
            "path": "/score",
            "value": [],
        },
    },
    {
        "version": "v0.9",
        "updateDataModel": {
            "surfaceId": "score-selector",
            "path": "/originalQuestion",
            "value": "",
        },
    },
    {
        "version": "v0.9",
        "updateDataModel": {
            "surfaceId": "score-selector",
            "path": "/expectedAnswer",
            "value": "",
        },
    },
    {
        "version": "v0.9",
        "updateDataModel": {
            "surfaceId": "score-selector",
            "path": "/comments",
            "value": "",
        },
    },
]


_schema_manager = A2uiSchemaManager(
    version=VERSION_0_9,
    catalogs=[BasicCatalog.get_config(version=VERSION_0_9)],
)
_catalog = _schema_manager.get_selected_catalog()

# Fail during import if a future SDK update makes this payload invalid.
_catalog.validator.validate(SCORE_SELECTOR_MESSAGES)

_score_selector_example = (
    "When the user asks to rate, score, or see the score selector, call "
    "send_a2ui_json_to_client with this exact JSON payload:\n"
    + json.dumps(SCORE_SELECTOR_MESSAGES, separators=(",", ":"))
)


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
    description="A friendly assistant that can render an A2UI score selector.",
    instruction=(
        "You are a concise, friendly assistant. When the user asks for a "
        "greeting or introduces themselves, call get_greeting. When the user "
        "asks to rate something, choose a score, or show a score selector, you "
        "MUST call send_a2ui_json_to_client using the exact score-selector "
        "payload supplied in that tool's examples. Do not print the A2UI JSON "
        "as text."
    ),
    tools=[
        get_greeting,
        SendA2uiToClientToolset(
            a2ui_enabled=True,
            a2ui_catalog=_catalog,
            a2ui_examples=_score_selector_example,
        ),
    ],
)
