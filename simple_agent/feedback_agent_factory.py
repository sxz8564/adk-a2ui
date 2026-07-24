"""Reusable factory for generating A2UI-compatible feedback collection subagents."""

import json
from a2ui.adk.send_a2ui_to_client_toolset import SendA2uiToClientToolset
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.schema.constants import VERSION_0_9
from a2ui.schema.manager import A2uiSchemaManager
from google.adk.agents.llm_agent import Agent

def create_feedback_agent(
    name: str = "a2ui_specialist",
    description: str = "Creates and emits an interactive A2UI review form.",
    instruction: str = None,
    surface_id: str = "score-selector",
    title: str = "Review this answer",
    submit_btn_text: str = "Submit Review",
) -> Agent:
    """Create and return a configured ADK subagent designed to emit a feedback form."""
    
    score_review_messages = [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": surface_id,
                "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": surface_id,
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
                        "text": title,
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
                        "text": submit_btn_text,
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
                "surfaceId": surface_id,
                "path": "/score",
                "value": 3,
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/originalQuestion",
                "value": "",
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/expectedAnswer",
                "value": "",
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/comments",
                "value": "",
            },
        },
    ]

    schema_manager = A2uiSchemaManager(
        version=VERSION_0_9,
        catalogs=[BasicCatalog.get_config(version=VERSION_0_9)],
    )
    catalog = schema_manager.get_selected_catalog()
    catalog.validator.validate(score_review_messages)

    examples_str = (
        "Call send_a2ui_json_to_client with this exact JSON payload:\n"
        + json.dumps(score_review_messages, separators=(",", ":"))
    )

    default_instruction = (
        "You are the A2UI interface specialist. For every request transferred "
        "to you, MUST call send_a2ui_json_to_client using the exact payload "
        "provided in its examples. Never print the JSON. After emitting it, "
        "briefly tell the user that the review form is ready."
    )

    return Agent(
        model="gemini-flash-latest",
        name=name,
        description=description,
        instruction=instruction or default_instruction,
        tools=[
            SendA2uiToClientToolset(
                a2ui_enabled=True,
                a2ui_catalog=catalog,
                a2ui_examples=examples_str,
            ),
        ],
    )
