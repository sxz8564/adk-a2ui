"""Reusable FastAPI router for handling and storing user feedback payloads."""

import json
import os
import time
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api")

@router.post("/feedback")
async def save_feedback(data: dict):
    """Validate and store feedback JSON payload locally in the workspace."""
    score = data.get("score")
    original_question = data.get("originalQuestion")
    comments = data.get("comments")

    # Validation
    is_score_valid = isinstance(score, (int, float)) and 0 <= score <= 5
    is_question_valid = isinstance(original_question, str) and original_question.strip() != ""
    is_comments_valid = isinstance(comments, str) and comments.strip() != ""

    if not is_score_valid or not is_question_valid or not is_comments_valid:
        raise HTTPException(
            status_code=400,
            detail='Validation failed: "score", "originalQuestion", and "comments" are all required fields.'
        )

    try:
        # Create a directory in the workspace root to store feedback files
        # The parent directory of 'simple_agent/' is the workspace root.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        feedback_dir = os.path.join(base_dir, "feedback")
        os.makedirs(feedback_dir, exist_ok=True)

        filename = f"feedback-{int(time.time() * 1000)}-{os.urandom(3).hex()}.json"
        filepath = os.path.join(feedback_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return {"status": "success", "message": "Feedback saved successfully."}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(err)}")
