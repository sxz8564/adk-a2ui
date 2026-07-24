"""A specialist ADK subagent that emits the score-review A2UI surface."""

import json

from a2ui.adk.send_a2ui_to_client_toolset import SendA2uiToClientToolset
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.schema.constants import VERSION_0_9
from a2ui.schema.manager import A2uiSchemaManager
from google.adk.agents.llm_agent import Agent


SCORE_REVIEW_MESSAGES = [
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
                        "score-options",
                        "original-question",
                        "expected-answer",
                        "comments",
                        "submit-btn",
                    ],
                },
                {
                    "id": "score-title",
                    "component": "Text",
                    "text": "Review this answer",
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
                    "component": "Slider",
                    "label": "Score",
                    "min": 0,
                    "max": 5,
                    "value": {"path": "/score"},
                },
                {
                    "id": "comments",
                    "component": "TextField",
                    "label": "Comments",
                    "value": {"path": "/comments"},
                    "variant": "longText",
                },
                {
                    "id": "submit-btn-text",
                    "component": "Text",
                    "text": "Submit Review",
                },
                {
                    "id": "submit-btn",
                    "component": "Button",
                    "child": "submit-btn-text",
                    "action": {
                        "event": {
                            "name": "submit",
                            "context": {},
                        }
                    },
                    "variant": "primary",
                },
            ],
        },
    },
    {
        "version": "v0.9",
        "updateDataModel": {
            "surfaceId": "score-selector",
            "path": "/score",
            "value": 3,
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

# Fail during import if an SDK update makes this specialist's payload invalid.
_catalog.validator.validate(SCORE_REVIEW_MESSAGES)

_score_review_example = (
    "Call send_a2ui_json_to_client with this exact JSON payload:\n"
    + json.dumps(SCORE_REVIEW_MESSAGES, separators=(",", ":"))
)


a2ui_agent = Agent(
    model="gemini-flash-latest",
    name="a2ui_specialist",
    description=(
        "Creates and emits an interactive A2UI review form with question, "
        "optional expected answer, score 0-5, and comments fields."
    ),
    instruction=(
        "You are the A2UI interface specialist. For every request transferred "
        "to you, MUST call send_a2ui_json_to_client using the exact payload "
        "provided in its examples. Never print the JSON. After emitting it, "
        "briefly tell the user that the review form is ready."
    ),
    tools=[
        SendA2uiToClientToolset(
            a2ui_enabled=True,
            a2ui_catalog=_catalog,
            a2ui_examples=_score_review_example,
        ),
    ],
)
