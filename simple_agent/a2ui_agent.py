"""A specialist ADK subagent that emits the score-review A2UI surface using the reusable agent factory."""

from simple_agent.feedback_agent_factory import create_feedback_agent

a2ui_agent = create_feedback_agent(
    name="a2ui_specialist",
    description=(
        "Creates and emits an interactive A2UI review form with question, "
        "optional expected answer, score 0-5, and comments fields."
    ),
    surface_id="score-selector",
    title="Review this answer",
    submit_btn_text="Submit Review",
)
