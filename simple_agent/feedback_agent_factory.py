"""Reusable factory for generating A2UI-compatible feedback collection subagents."""

import json
from a2ui.adk.send_a2ui_to_client_toolset import SendA2uiToClientToolset
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.schema.constants import VERSION_0_9
from a2ui.schema.manager import A2uiSchemaManager
from google.adk.agents.llm_agent import Agent

DEFAULT_FIELDS = [
    {
        "id": "original-question",
        "label": "Original question",
        "path": "/originalQuestion",
        "mandatory": True,
        "placeholder": "Copy paste original question you asked to the agent",
    },
    {
        "id": "expected-answer",
        "label": "Expected answer (optional)",
        "path": "/expectedAnswer",
        "mandatory": False,
        "placeholder": "Enter the expected answer if any",
    },
    {
        "id": "comments",
        "label": "Comments",
        "path": "/comments",
        "mandatory": True,
        "placeholder": "Provide comments or reasoning for the rating",
    }
]

def create_feedback_agent(
    name: str = "a2ui_specialist",
    description: str = "Creates and emits an interactive A2UI review form.",
    instruction: str = None,
    surface_id: str = "score-selector",
    title: str = "Review this answer",
    submit_btn_text: str = "Submit Review",
    slider_label: str = "Score",
    min_score: int = 0,
    max_score: int = 5,
    default_score: int = 3,
    fields: list[dict] = None,
) -> Agent:
    """Create and return a configured ADK subagent designed to emit a feedback form.
    
    The 'fields' parameter accepts a list of text field dictionaries:
    [
        {
            "id": "field-id",
            "label": "Field Label Text",
            "path": "/dataPath",
            "mandatory": True/False,
            "placeholder": "Placeholder Text (optional)",
            "variant": "longText"/"shortText" (default: "longText")
        }
    ]
    """
    if fields is None:
        fields = DEFAULT_FIELDS
        
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
                        ] + [f["id"] for f in fields] + [
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
                        "id": "score-options",
                        "component": "Slider",
                        "label": slider_label,
                        "min": min_score,
                        "max": max_score,
                        "value": {"path": "/score"},
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
                ] + [
                    {
                        "id": f["id"],
                        "component": "TextField",
                        "label": f["label"],
                        "value": {"path": f["path"]},
                        "variant": f.get("variant", "longText"),
                    }
                    for f in fields
                ],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/score",
                "value": default_score,
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/mandatoryFields",
                "value": [f["path"] for f in fields if f.get("mandatory", False)],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/fieldPaths",
                "value": [f["path"] for f in fields],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/placeholders",
                "value": {f["label"].lower(): f.get("placeholder", "") for f in fields},
            },
        },
    ]

    for f in fields:
        score_review_messages.append({
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": f["path"],
                "value": "",
            }
        })

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
