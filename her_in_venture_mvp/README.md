# Her In Venture – MVP for AI‑Powered Control Testing Platform

This repository contains a minimal, working proof of concept for an AI‑powered control testing platform.  The goal of the MVP is to demonstrate how prior audit workpapers can be uploaded, parsed, and used to generate draft testing procedures for new controls.  The code here is intentionally simple and is intended as a starting point for further development.

## Features Included

- **Historical workpaper ingestion** – Upload PDFs or plain text files containing prior audit workpapers.  Files are parsed and stored on the server for later reference.
- **Pattern extraction and suggestion** – When you provide a new control description, the server uses a simple similarity algorithm (fuzzy matching) to find the most relevant prior workpaper and returns its text as a draft testing procedure.
- **Workpaper generation** – Compose a basic PDF workpaper containing the control name, description and the suggested testing procedure.
- **Simple web UI** – A lightweight front‑end to upload files, enter control details, view AI suggestions and download the generated workpaper.

## Running the Backend

The backend is built with [FastAPI](https://fastapi.tiangolo.com/).  It exposes endpoints for uploading files, generating procedure suggestions and exporting workpapers.

```bash
cd backend
uvicorn main:app --reload
```

By default the API will be available at `http://localhost:8000`.  CORS is enabled for all origins during development.

### Dependencies

The backend relies on a few additional packages that may not be installed by default.  To handle multipart form uploads you need `python-multipart`:

```bash
pip install python-multipart
```

The fuzzy matching algorithm uses `fuzzywuzzy`.  If you want faster similarity calculations, install `python-Levenshtein` as well:

```bash
pip install python-Levenshtein
```

### API Endpoints

| Method | Endpoint       | Description                                                      |
|--------|----------------|------------------------------------------------------------------|
| POST   | `/upload`      | Upload one or more files (`.pdf` or text).  Returns filenames.   |
| POST   | `/generate`    | Provide `control_description`; returns suggested procedure text. |
| POST   | `/export`      | Provide `control_name`, `control_description` and `suggestion`; generates a PDF workpaper and returns its path. |

## Running the Frontend

Open `frontend/index.html` in your browser.  For development you can simply double‑click the file or serve it with any static file server.  The page assumes the backend is running on `http://localhost:8000` and will call the API endpoints directly.

### Frontend Workflow

1. **Upload** – Select one or more historical workpaper files and click **Upload**.  The files will be sent to the backend for parsing.
2. **Generate** – Enter the name and description of a new control, then click **Generate Suggestion**.  The AI (currently a fuzzy matching algorithm) returns a suggested testing procedure based on the most similar prior workpaper.
3. **Edit** – Review or edit the suggested procedure in the text area.  Adjust the wording as needed.
4. **Export** – Click **Export Workpaper** to create a PDF containing the control details and your final procedure text.  The browser will download `workpaper.pdf` from the server.

## Limitations & Next Steps

This MVP uses a simple fuzzy string matching algorithm to suggest procedures.  To evolve toward the full vision:

- Replace the similarity search with a vector database (e.g. Pinecone, FAISS) and embeddings generated via a large language model.
- Integrate a generative model (e.g. GPT‑4) for more intelligent procedure synthesis based on historical patterns.
- Enhance the document parser to intelligently segment workpapers into individual controls and testing steps.
- Add authentication and tighter CORS settings for production use.
- Improve the PDF layout and include tickmarks, tables and other audit artefacts.

Feel free to build on this foundation and adapt it to your organisation’s requirements.