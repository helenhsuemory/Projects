// Simple front‑end logic for the Her In Venture MVP.

const API_BASE = 'http://localhost:8000';

// Elements
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');

const controlNameInput = document.getElementById('control-name');
const controlDescInput = document.getElementById('control-description');
const generateBtn = document.getElementById('generate-btn');
const generateStatus = document.getElementById('generate-status');

const suggestionText = document.getElementById('suggestion-text');

const exportBtn = document.getElementById('export-btn');
const exportStatus = document.getElementById('export-status');

// Helper: upload files to the backend
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files || files.length === 0) {
    uploadStatus.textContent = 'Please select one or more files.';
    return;
  }
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  uploadStatus.textContent = 'Uploading...';
  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    uploadStatus.textContent = data.message || 'Upload complete.';
  } catch (err) {
    uploadStatus.textContent = 'Upload failed. See console for details.';
    console.error(err);
  }
});

// Helper: generate procedure suggestion
generateBtn.addEventListener('click', async () => {
  const description = controlDescInput.value.trim();
  if (!description) {
    generateStatus.textContent = 'Please enter a control description.';
    return;
  }
  generateStatus.textContent = 'Generating suggestion...';
  const formData = new FormData();
  formData.append('control_description', description);
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    suggestionText.value = data.suggestion || '';
    generateStatus.textContent = data.source_file
      ? `Suggested from: ${data.source_file} (score ${data.similarity_score})`
      : data.suggestion;
  } catch (err) {
    generateStatus.textContent = 'Failed to generate suggestion.';
    console.error(err);
  }
});

// Helper: export PDF workpaper
exportBtn.addEventListener('click', async () => {
  const controlName = controlNameInput.value.trim();
  const description = controlDescInput.value.trim();
  const suggestion = suggestionText.value.trim();
  if (!controlName || !description || !suggestion) {
    exportStatus.textContent = 'Please fill in the control name, description and suggestion before exporting.';
    return;
  }
  exportStatus.textContent = 'Generating PDF...';
  const formData = new FormData();
  formData.append('control_name', controlName);
  formData.append('control_description', description);
  formData.append('suggestion', suggestion);
  try {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    // Fetch the generated PDF file and trigger download
    const filePath = data.file_path;
    const fileResp = await fetch(`${API_BASE}/${filePath}`);
    const blob = await fileResp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'workpaper.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    exportStatus.textContent = 'Workpaper downloaded.';
  } catch (err) {
    exportStatus.textContent = 'Failed to generate workpaper.';
    console.error(err);
  }
});