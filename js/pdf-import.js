// ============================
// PDF & Image Import Engine (Gemini Text API)
// ============================
// PDF.js extracts text with coordinate-awareness (preserving table rows),
// then Gemini text API intelligently parses it into structured entries.
// Images use Tesseract.js OCR first, then Gemini for parsing.

let pdfImportMode = 'exam';
let pdfExtractedEntries = [];
let pdfDetectedDepartments = [];

const GEMINI_API_KEY_STORAGE = 'gbd_gemini_api_key';

function getGeminiApiKey() {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
}
function setGeminiApiKey(key) {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
}

// ============================
// Open Import Modal
// ============================
function openPdfImportModal(mode) {
  pdfImportMode = mode;
  pdfExtractedEntries = [];
  pdfDetectedDepartments = [];
  const savedKey = getGeminiApiKey();

  const modal = document.createElement('div');
  modal.className = 'transaction-modal-overlay';
  modal.id = 'pdf-import-modal';
  modal.innerHTML = `
    <div class="pdf-import-modal">
      <div class="pdf-import-header">
        <h2>📄 Import ${mode === 'exam' ? 'Exam' : 'Class'} Routine</h2>
        <button class="icon-btn" onclick="closeModal('pdf-import-modal')" style="color:var(--text-muted)">✕</button>
      </div>

      <!-- API Key Step -->
      <div id="pdf-step-apikey" class="pdf-step" style="display:${savedKey ? 'none' : 'block'}">
        <div style="padding:8px 0 16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:1.5rem">🔑</span>
            <div>
              <div style="font-weight:600">Gemini API Key Required</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">For AI-powered table extraction. Stored locally only.</div>
            </div>
          </div>
          <input type="password" id="gemini-api-key-input" class="input-simple"
            placeholder="Paste your Gemini API key here..." value="${savedKey}" style="width:100%;margin-bottom:12px">
          <p style="font-size:0.7rem;color:var(--text-muted);margin-bottom:16px">
            Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent)">Google AI Studio</a>
          </p>
          <div style="display:flex;gap:12px">
            <button class="btn-outline" style="flex:1" onclick="skipApiKeyAndContinue()">Skip AI</button>
            <button class="btn-green" style="flex:2" onclick="saveApiKeyAndContinue()">Continue →</button>
          </div>
        </div>
      </div>

      <!-- Upload Step -->
      <div id="pdf-step-upload" class="pdf-step" style="display:${savedKey ? 'block' : 'none'}">
        <div class="pdf-upload-zone" id="pdf-drop-zone" onclick="document.getElementById('pdf-file-input').click()">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15l3-3 3 3"/>
          </svg>
          <p style="font-weight:600;margin-top:12px">Drop file here or click to browse</p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Supports <strong>Image</strong> files (JPG, PNG, WebP)</p>
          <div style="display:flex;gap:8px;margin-top:16px;justify-content:center">
            <span class="dept-badge" style="background:rgba(59,130,246,0.15);color:#60a5fa">🖼️ JPG</span>
            <span class="dept-badge" style="background:rgba(236,72,153,0.15);color:#f472b6">🖼️ PNG</span>
          </div>
        </div>
        <input type="file" id="pdf-file-input" accept="image/jpeg,image/png,image/webp,image/bmp" style="display:none" onchange="handleFileUpload(event)">
        <p style="font-size:0.7rem;color:var(--text-muted);margin-top:12px;text-align:center">
          ✨ Powered by Gemini AI · <a href="#" onclick="resetApiKey();return false" style="color:var(--accent)">Change API Key</a>
        </p>
      </div>

      <!-- Processing Step -->
      <div id="pdf-step-processing" class="pdf-step" style="display:none">
        <div style="text-align:center;padding:40px 0">
          <div class="pdf-spinner"></div>
          <p id="pdf-status-text" style="font-weight:500;margin-top:16px">Processing...</p>
          <div class="pdf-progress-bar">
            <div class="pdf-progress-fill" id="pdf-progress-fill" style="width:0%"></div>
          </div>
          <p id="pdf-progress-text" style="font-size:0.75rem;color:var(--text-muted);margin-top:8px"></p>
        </div>
      </div>

      <!-- Preview Step -->
      <div id="pdf-step-preview" class="pdf-step" style="display:none">
        <div class="pdf-dept-filter" id="pdf-dept-filter" style="display:none">
          <label style="font-weight:600;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:8px">
            Filter by Department
          </label>
          <div class="pdf-dept-chips" id="pdf-dept-chips"></div>
          <p style="font-size:0.7rem;color:var(--text-muted);margin-top:8px">
            💡 Merge courses from other depts are included. Review and edit below.
          </p>
        </div>
        <div style="margin:16px 0 8px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:600;font-size:0.85rem" id="pdf-entry-count">0 entries found</span>
          <label style="font-size:0.75rem;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" checked onchange="toggleAllPdfEntries(this.checked)"> Select All
          </label>
        </div>
        <div class="pdf-preview-table" id="pdf-preview-table"></div>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button class="btn-outline" style="flex:1" onclick="closeModal('pdf-import-modal')">Cancel</button>
          <button class="btn-green" style="flex:1" onclick="confirmPdfImport()">Import Selected</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const dropZone = document.getElementById('pdf-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) processUploadedFile(e.dataTransfer.files[0]);
    });
  }
}

function saveApiKeyAndContinue() {
  const key = document.getElementById('gemini-api-key-input').value.trim();
  if (!key) { alert('Please enter your Gemini API key'); return; }
  setGeminiApiKey(key);
  document.getElementById('pdf-step-apikey').style.display = 'none';
  document.getElementById('pdf-step-upload').style.display = 'block';
}

function skipApiKeyAndContinue() {
  document.getElementById('gemini-api-key-input').value = '';
  document.getElementById('pdf-step-apikey').style.display = 'none';
  document.getElementById('pdf-step-upload').style.display = 'block';
}

function resetApiKey() {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  document.getElementById('pdf-step-upload').style.display = 'none';
  document.getElementById('pdf-step-apikey').style.display = 'block';
  document.getElementById('gemini-api-key-input').value = '';
}

// ============================
// File Upload Handler
// ============================
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) processUploadedFile(file);
}

function processUploadedFile(file) {
  const isImage = file.type.startsWith('image/');
  if (!isImage) { alert('Please upload an image file (JPG, PNG, WebP)'); return; }

  document.getElementById('pdf-step-upload').style.display = 'none';
  document.getElementById('pdf-step-processing').style.display = 'block';

  extractTextFromImage(file);
}


// Image OCR (Tesseract.js)
// ============================
async function extractTextFromImage(file) {
  try {
    updatePdfStatus('Preparing image for AI...', 0, 1);

    // Convert image to Base64 for Gemini
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });

    const mimeType = file.type;

    updatePdfStatus('Running fallback OCR...', 0, 1);
    const url = URL.createObjectURL(file);
    const result = await Tesseract.recognize(url, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          document.getElementById('pdf-progress-fill').style.width = pct + '%';
          document.getElementById('pdf-progress-text').textContent = pct + '% complete';
        }
      }
    });

    URL.revokeObjectURL(url);
    await sendToGemini(result.data.text, base64Data, mimeType);
  } catch (err) {
    console.error('OCR error:', err);
    alert('Error processing image: ' + err.message);
    closeModal('pdf-import-modal');
  }
}

// ============================
// Send Extracted Text to Gemini
// ============================
async function sendToGemini(extractedText, base64Image, mimeType) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    updatePdfStatus('Extracting basic text...', 100, 100);
    const lines = extractedText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    pdfExtractedEntries = lines.map((line, i) => ({
      selected: true,
      day: 'monday',
      startTime: '09:00',
      endTime: '10:30',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      courseCode: 'TXT-' + (i + 1),
      courseName: line.substring(0, 50),
      room: 'TBA',
      department: 'OCR'
    }));
    pdfDetectedDepartments = ['OCR'];
    showPdfPreview();
    return;
  }

  updatePdfStatus('Gemini AI is analyzing the routine...', 100, 100);

  const prompt = pdfImportMode === 'routine'
    ? `You are an expert class routine data extractor. Below is raw, unstructured text from an image OCR (Optical Character Recognition) of a university class routine.

The OCR text contains TWO distinct tables that got mashed together by the OCR process:
TABLE 1: The actual schedule grid (Days and Times). Contains Course Codes (e.g. CSE-122).
TABLE 2: A list mapping Course Codes to Course Titles, Credit Hours, and Course Teachers.

You must merge this information into a single array of scheduled classes.

Follow these strict rules:
1. Identify the Days (FRIDAY, SATURDAY, etc.) and the Time Slots (9:30AM-10:10AM, etc.) from Table 1.
2. For each course scheduled in Table 1, find its full "Course Title" and "Course Teacher" in Table 2.
3. Extract EVERY SINGLE class from EVERY SINGLE day.
4. "courseName": The Teacher's name/initials AND the Course Title from Table 2 (e.g. "Structured Programming (MNH)"). If not found in Table 2, use whatever is in Table 1.
5. "room": The Room or Venue (e.g. "Room: D6", "Room: Online"). Strip "Room:" prefix.
6. "department": The prefix of the course code (e.g., "CSE" from "CSE-122").
7. Look for "(Merge Course)" in Table 2. If a course is a "(Merge Course)", ensure it is still included in the final output.
8. If a cell in Table 1 has "(Even Week)" or "(Odd Week)", append it to the courseName (e.g. "Chemistry (NS) (Even Week)").

Extracted OCR text:
${extractedText}`
    : `You are an expert exam schedule data extractor. Below is raw, unstructured text from an image OCR of a university exam routine.

The OCR text might be messy and table lines are lost. Reconstruct the valid exam schedule from this text.

Extract ALL exam entries and return a JSON array. Each entry must have:
- "date": exam date (e.g. "06-03-2026")
- "time": exam time (e.g. "02:00pm-03:30pm" or "03:00pm-04:30pm")
- "courseCode": course code (e.g. "CSE-121", "HUM-123")
- "courseName": the subject/course name ONLY (e.g. "Engineering Economics"). DO NOT include the teacher's name here.
- "teacher": the teacher's name or initials (e.g. "Dr. John Doe"). Provide empty string "" if not found.
- "department": department prefix extracted from the course code (e.g. "CSE", "HUM")
- "room": room/venue. If missing from the text, use an empty string "".

Follow these strict rules:
1. Map each course to its correct Date and Time based on proximity in the text.
2. Ensure courseName ONLY contains the subject, and teacher ONLY contains the teacher.
3. Extract EVERY SINGLE exam. Do not skip any.

Extracted OCR text:
${extractedText}`;

  const models = [
    { api: 'v1beta', model: 'gemini-2.5-flash' },
    { api: 'v1beta', model: 'gemini-1.5-flash' }
  ];

  let lastError = '';

  for (const m of models) {
    try {
      updatePdfStatus(`Trying ${m.model}...`, 100, 100);
      const schema = pdfImportMode === 'routine'
        ? {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              day: { type: "STRING" },
              startTime: { type: "STRING" },
              endTime: { type: "STRING" },
              courseCode: { type: "STRING" },
              courseName: { type: "STRING" },
              room: { type: "STRING" },
              department: { type: "STRING" }
            },
            required: ["day", "startTime", "endTime"]
          }
        }
        : {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING" },
              time: { type: "STRING" },
              courseCode: { type: "STRING" },
              courseName: { type: "STRING" },
              teacher: { type: "STRING" },
              room: { type: "STRING" },
              department: { type: "STRING" }
            },
            required: ["date", "time", "courseCode"]
          }
        };

      const payloadParts = [
        { text: prompt }
      ];

      if (base64Image && mimeType) {
        payloadParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        });
      }

      const url = `https://generativelanguage.googleapis.com/${m.api}/models/${m.model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: payloadParts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      });

      let rawText = '';
      try {
        rawText = await resp.text();
      } catch (e) {
        lastError = 'Failed to read response: ' + e.message;
        continue;
      }

      if (!resp.ok) {
        try {
          const err = JSON.parse(rawText);
          lastError = err?.error?.message || resp.statusText;
        } catch {
          lastError = `HTTP ${resp.status}: ${rawText.substring(0, 100)}`;
        }
        alert(`Model ${m.model} failed internally:\n\n${lastError}`);
        console.warn(`Model ${m.model} failed:`, lastError);
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        lastError = 'Invalid JSON response from Google API';
        console.warn(`Model ${m.model} returned non-JSON:`, rawText.substring(0, 100));
        continue;
      }

      var responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!responseText) { lastError = 'Empty response content'; continue; }
      break; // success!
    } catch (e) {
      lastError = e.message;
      console.warn(`Model ${m.model} error:`, e);
      continue;
    }
  }

  if (!responseText) {
    if (lastError.includes('API key')) resetApiKey();
    alert("CRITICAL API ERROR DUMP:\n\n" + lastError);
    throw new Error('All models failed. Last error: ' + lastError);
  }

  try {
    let text = responseText.trim();

    // Clean JSON from markdown fences
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('Malformed JSON from Gemini:', text);
      throw new Error('AI returned malformed JSON data. The routine format might be too complex or unusual.');
    }

    if (!Array.isArray(parsed)) throw new Error('Response is not an array');

    pdfExtractedEntries = parsed.map(e => ({
      selected: true,
      day: (e.day || '').toLowerCase(),
      startTime: e.startTime || e.start_time || '',
      endTime: e.endTime || e.end_time || '',
      date: e.date || '',
      time: e.time || '',
      courseCode: e.courseCode || e.course_code || '',
      courseName: e.courseName || e.course_name || '',
      room: e.room || '',
      department: e.department || e.dept || (e.courseCode || '').replace(/[\d\-\s]/g, '')
    }));

    // Detect departments
    const depts = new Set();
    pdfExtractedEntries.forEach(e => { if (e.department) depts.add(e.department.toUpperCase()); });
    pdfDetectedDepartments = Array.from(depts).sort();

    showPdfPreview();
  } catch (err) {
    console.error('Gemini parsing error:', err);
    alert('Error: ' + err.message);
    closeModal('pdf-import-modal');
  }
}

// ============================
// Preview UI
// ============================
function showPdfPreview() {
  document.getElementById('pdf-step-processing').style.display = 'none';
  document.getElementById('pdf-step-preview').style.display = 'block';

  if (pdfDetectedDepartments.length > 1) {
    document.getElementById('pdf-dept-filter').style.display = 'block';
    document.getElementById('pdf-dept-chips').innerHTML = `
      <button class="dept-chip active" onclick="filterByDepartment('ALL', this)">ALL</button>
      ${pdfDetectedDepartments.map(d =>
      `<button class="dept-chip" onclick="filterByDepartment('${d}', this)">${d}</button>`
    ).join('')}
    `;
  }
  renderPdfPreviewTable();
}

function filterByDepartment(dept, btn) {
  document.querySelectorAll('.dept-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  pdfExtractedEntries.forEach(e => {
    e.selected = dept === 'ALL' || e.department.toUpperCase() === dept;
  });
  renderPdfPreviewTable();
}

function renderPdfPreviewTable() {
  const container = document.getElementById('pdf-preview-table');
  const sel = pdfExtractedEntries.filter(e => e.selected).length;
  document.getElementById('pdf-entry-count').textContent = `${sel} of ${pdfExtractedEntries.length} entries selected`;

  if (pdfExtractedEntries.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <p>No entries could be extracted.</p>
      <p style="font-size:0.75rem;margin-top:8px">Try a different file or add entries manually.</p>
    </div>`;
    return;
  }

  const isExam = pdfImportMode === 'exam';
  const headers = isExam
    ? '<th style="width:30px"></th><th>Date</th><th>Time</th><th>Code</th><th>Course Name</th><th>Teacher</th><th>Room</th><th>Dept</th>'
    : '<th style="width:30px"></th><th>Day</th><th>Start</th><th>End</th><th>Code</th><th>Course / Teacher</th><th>Room</th><th>Dept</th>';

  const rows = pdfExtractedEntries.map((e, i) => {
    const cls = e.selected ? '' : ' class="row-disabled"';
    const chk = e.selected ? 'checked' : '';
    if (isExam) {
      return `<tr${cls}>
        <td><input type="checkbox" ${chk} onchange="togglePdfEntry(${i},this.checked)"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.date)}" onchange="updatePdfEntry(${i},'date',this.value)"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.time)}" onchange="updatePdfEntry(${i},'time',this.value)"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.courseCode)}" onchange="updatePdfEntry(${i},'courseCode',this.value)" style="width:70px"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.courseName)}" onchange="updatePdfEntry(${i},'courseName',this.value)"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.teacher || '')}" onchange="updatePdfEntry(${i},'teacher',this.value)" placeholder="Teacher"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.room)}" onchange="updatePdfEntry(${i},'room',this.value)" style="width:60px"></td>
        <td><span class="dept-badge">${esc(e.department)}</span></td>
      </tr>`;
    } else {
      const dayOpts = ['friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
        .map(d => `<option value="${d}" ${e.day === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1, 3)}</option>`).join('');
      return `<tr${cls}>
        <td><input type="checkbox" ${chk} onchange="togglePdfEntry(${i},this.checked)"></td>
        <td><select class="pdf-cell-input" onchange="updatePdfEntry(${i},'day',this.value)">${dayOpts}</select></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.startTime)}" onchange="updatePdfEntry(${i},'startTime',this.value)" style="width:70px"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.endTime)}" onchange="updatePdfEntry(${i},'endTime',this.value)" style="width:70px"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.courseCode)}" onchange="updatePdfEntry(${i},'courseCode',this.value)" style="width:80px"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.courseName)}" onchange="updatePdfEntry(${i},'courseName',this.value)"></td>
        <td><input type="text" class="pdf-cell-input" value="${esc(e.room)}" onchange="updatePdfEntry(${i},'room',this.value)" style="width:70px"></td>
        <td><span class="dept-badge">${esc(e.department)}</span></td>
      </tr>`;
    }
  }).join('');

  container.innerHTML = `<div class="pdf-table-scroll"><table class="pdf-table">
    <thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// ============================
// Entry Controls
// ============================
function togglePdfEntry(i, c) { pdfExtractedEntries[i].selected = c; renderPdfPreviewTable(); }
function toggleAllPdfEntries(c) { pdfExtractedEntries.forEach(e => e.selected = c); renderPdfPreviewTable(); }
function updatePdfEntry(i, f, v) { pdfExtractedEntries[i][f] = v; }

// ============================
// Confirm Import
// ============================
function confirmPdfImport() {
  const selected = pdfExtractedEntries.filter(e => e.selected);
  if (selected.length === 0) { alert('No entries selected.'); return; }

  if (pdfImportMode === 'exam') {
    selected.forEach(e => {
      // Format date to YYYY-MM-DD
      let d = e.date || '';
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) d = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (d.includes('-') && d.split('-')[0].length === 2) {
        const parts = d.split('-');
        if (parts.length === 3) d = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Format time to HH:mm
      let t = e.time || '09:00';
      if (t.toLowerCase().includes('pm') || t.toLowerCase().includes('am')) {
        const firstTime = t.split('-')[0].trim();
        let [hours, minutes] = firstTime.replace(/[^\d:]/g, '').split(':');
        hours = parseInt(hours || 0);
        if (firstTime.toLowerCase().includes('pm') && hours < 12) hours += 12;
        if (firstTime.toLowerCase().includes('am') && hours === 12) hours = 0;
        t = `${String(hours).padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
      }

      Storage.addExam({
        subject: e.courseName || e.courseCode,
        courseCode: e.courseCode,
        date: d, time: t, room: e.room || '', teacher: e.teacher || '',
        type: 'exams', grade: 'A+', credits: 3, reminder: '2'
      });
    });
  } else {
    // Exact mapping required for Storage.routine keys
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    selected.forEach(e => {
      let safeDay = (e.day || '').toLowerCase().trim();
      let finalDay = 'monday'; // fallback

      // Strict match first
      if (validDays.includes(safeDay)) {
        finalDay = safeDay;
      } else if (safeDay.length > 0) {
        // Less strict match: find the first day that starts with the string (e.g. "thu" -> "thursday") or contains it
        finalDay = validDays.find(d => d.startsWith(safeDay) || d.includes(safeDay)) || 'monday';
      }

      Storage.addPeriod(finalDay, {
        subject: e.courseCode + (e.courseName ? ' - ' + e.courseName : ''),
        startTime: e.startTime || '09:00 AM',
        endTime: e.endTime || '10:00 AM',
        room: e.room || 'TBA'
      });
    });
  }

  Storage.addXP(selected.length * 5);
  closeModal('pdf-import-modal');
  navigateTo(pdfImportMode === 'exam' ? 'exams' : 'routine');
}

// ============================
// Utility
// ============================
function updatePdfStatus(t, c, n) {
  const el = document.getElementById('pdf-status-text');
  if (el) el.textContent = t;
  updatePdfProgress(c, n);
}
function updatePdfProgress(c, n) {
  const f = document.getElementById('pdf-progress-fill');
  const t = document.getElementById('pdf-progress-text');
  if (f) f.style.width = ((c / Math.max(n, 1)) * 100) + '%';
  if (t && n > 0) t.textContent = `Page ${c} of ${n}`;
}
