"""
FastAPI backend for the Her In Venture MVP.

This application allows auditors to upload prior workpapers, generate draft testing
procedures for new controls by looking for the most similar historical
document, and export a simple PDF workpaper containing the control name,
description and suggested procedure.

To run the server locally:

    uvicorn main:app --reload

The front‑end in `../frontend/index.html` assumes the API is available at
`http://localhost:8000`.
"""

import os
import json
import textwrap
from typing import List, Optional

import fitz  # PyMuPDF for PDF parsing and generation
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fuzzywuzzy import fuzz

# -----------------------------------------------------------------------------
# Configuration and data storage
#
# Historical controls are stored in a JSON file under the data directory.  Each
# entry in the JSON list has the shape {"filename": "...", "content": "..."}.
# In a real application you might use a database or vector store instead.
# -----------------------------------------------------------------------------

APP_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.abspath(os.path.join(APP_DIR, "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
CONTROLS_PATH = os.path.join(DATA_DIR, "controls.json")

# Load existing controls if present; otherwise initialise an empty list
try:
    with open(CONTROLS_PATH, "r", encoding="utf-8") as f:
        controls_data: List[dict] = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    controls_data = []


def save_controls() -> None:
    """Persist the in‑memory controls list to disk."""
    with open(CONTROLS_PATH, "w", encoding="utf-8") as f:
        json.dump(controls_data, f, ensure_ascii=False, indent=2)


# -----------------------------------------------------------------------------
# Application setup
# -----------------------------------------------------------------------------

app = FastAPI(title="Her In Venture MVP API")

# Allow all origins during development; restrict this in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF.

    Args:
        file_bytes: The raw bytes of a PDF file.

    Returns:
        A string containing the concatenated text of all pages.
    """
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text


@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)) -> dict:
    """Receive one or more files from the user and parse them.

    Each uploaded file is decoded as follows:
    - PDF files are parsed with PyMuPDF to extract text.
    - Any other file type is decoded as UTF‑8 text directly.

    The resulting content is appended to the global controls_data list and
    persisted on disk.

    Args:
        files: A list of uploaded files from the multipart form.

    Returns:
        A dictionary indicating which files were uploaded.
    """
    uploaded_names = []
    for uploaded_file in files:
        raw = await uploaded_file.read()
        name = uploaded_file.filename
        if name.lower().endswith(".pdf"):
            content = extract_text_from_pdf(raw)
        else:
            # Assume plain text for other formats; ignore binary data
            try:
                content = raw.decode("utf-8", errors="ignore")
            except Exception:
                content = ""
        controls_data.append({"filename": name, "content": content})
        uploaded_names.append(name)
    save_controls()
    return {"message": f"Uploaded files: {uploaded_names}"}


@app.post("/generate")
async def generate(control_description: str = Form(...)) -> dict:
    """Generate a draft testing procedure based on the control description.

    This implementation uses a simple fuzzy string similarity measure to
    compare the input description against the contents of each stored
    workpaper.  The content of the most similar workpaper is returned as
    the suggested procedure.  Only the first 1500 characters are returned
    to avoid overwhelming the UI.

    Args:
        control_description: The description of the control to test.

    Returns:
        A dictionary containing the suggestion and the source filename used.
    """
    if not controls_data:
        return {"suggestion": "No prior data available. Please upload historical workpapers first.", "source_file": None}
    best_match: Optional[dict] = None
    best_score: int = 0
    # Normalise input for comparison
    query = control_description.lower()
    for item in controls_data:
        candidate_text = item["content"].lower()
        # Use token_set_ratio for order‑insensitive comparison
        score = fuzz.token_set_ratio(query, candidate_text)
        if score > best_score:
            best_match = item
            best_score = score
    suggestion = ""
    source_name = None
    if best_match:
        suggestion = best_match["content"]
        source_name = best_match["filename"]
        # Truncate long suggestions for the UI
        if len(suggestion) > 1500:
            suggestion = suggestion[:1500] + "..."
    return {"suggestion": suggestion, "source_file": source_name, "similarity_score": best_score}


def create_workpaper_pdf(control_name: str, control_description: str, suggestion: str, output_path: str) -> None:
    """Write a simple PDF workpaper containing the control and suggested procedure.

    The resulting PDF places the control name, description and suggested
    procedure sequentially on the page.  Long procedure text will wrap and
    continue on subsequent pages as needed.

    Args:
        control_name: The name of the control.
        control_description: A short description of the control.
        suggestion: The suggested testing steps or procedure.
        output_path: The path where the PDF should be saved.
    """
    doc = fitz.open()
    page = doc.new_page()
    y = 50
    # Title
    page.insert_text((50, y), f"Control Name: {control_name}", fontsize=12)
    y += 20
    # Description
    page.insert_text((50, y), "Control Description:", fontsize=12)
    y += 15
    for line in textwrap.wrap(control_description, width=90):
        page.insert_text((50, y), line, fontsize=10)
        y += 12
        if y > 780:
            page = doc.new_page()
            y = 50
    y += 20
    # Suggested procedures
    page.insert_text((50, y), "Suggested Testing Procedures:", fontsize=12)
    y += 15
    for line in textwrap.wrap(suggestion, width=90):
        page.insert_text((50, y), line, fontsize=10)
        y += 12
        if y > 780:
            page = doc.new_page()
            y = 50
    # Save the document
    doc.save(output_path)


@app.post("/export")
async def export(
    control_name: str = Form(...),
    control_description: str = Form(...),
    suggestion: str = Form(...),
) -> dict:
    """Generate a PDF workpaper based on user input and suggested procedure.

    Args:
        control_name: The name of the control.
        control_description: Description of the control.
        suggestion: Finalised testing steps.

    Returns:
        A dictionary with a message and relative path of the generated PDF.
    """
    output_file = os.path.join(DATA_DIR, "workpaper.pdf")
    create_workpaper_pdf(control_name, control_description, suggestion, output_file)
    # Return relative path for ease of use on the front‑end
    return {
        "message": "Workpaper generated successfully.",
        "file_path": "data/workpaper.pdf",
    }


@app.get("/")
async def root() -> dict:
    """Root endpoint to verify the server is running."""
    return {"status": "Her In Venture MVP API is running"}