/* =====================================================
   CV Sorter — Frontend Logic
   ===================================================== */

// ---- DOM Elements ----
const uploadForm    = document.getElementById('upload-form');
const candidateInput= document.getElementById('candidate-name');
const cvFileInput   = document.getElementById('cv-file');
const fileDrop      = document.getElementById('file-drop');
const fileDropContent = document.getElementById('file-drop-content');
const fileSelected  = document.getElementById('file-selected');
const fileNameSpan  = document.getElementById('file-name');
const fileRemoveBtn = document.getElementById('file-remove');
const analyzeBtn    = document.getElementById('analyze-btn');
const alertError    = document.getElementById('alert-error');
const alertErrorText= document.getElementById('alert-error-text');

// Result card
const resultCard    = document.getElementById('result-card');
const resultName    = document.getElementById('result-name');
const resultBadge   = document.getElementById('result-badge');
const scoreRingFill = document.getElementById('score-ring-fill');
const scoreValue    = document.getElementById('score-value');
const resultSummary = document.getElementById('result-summary');
const resultExp     = document.getElementById('result-experience');
const resultJustif  = document.getElementById('result-justification');
const resultSkills  = document.getElementById('result-skills');

// Dashboard
const emptyState    = document.getElementById('empty-state');
const tableWrap     = document.getElementById('table-wrap');
const tableBody     = document.getElementById('table-body');
const filterGroup   = document.getElementById('filter-group');
const clearAllBtn   = document.getElementById('clear-all-btn');

// Stats
const statTotal     = document.getElementById('stat-total');
const statRetained  = document.getElementById('stat-retained');
const statReview    = document.getElementById('stat-review');
const statRejected  = document.getElementById('stat-rejected');

// Modal
const detailModal   = document.getElementById('detail-modal');
const modalClose    = document.getElementById('modal-close');
const modalName     = document.getElementById('modal-name');
const modalBadge    = document.getElementById('modal-badge');
const modalBody     = document.getElementById('modal-body');

// ---- State ----
let candidates = JSON.parse(localStorage.getItem('cv_candidates') || '[]');
let activeFilter = 'all';

// ---- Initialize ----
renderDashboard();

// ---- File Drop Zone ----
fileDrop.addEventListener('click', () => cvFileInput.click());

fileDrop.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileDrop.classList.add('drag-over');
});
fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
fileDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  fileDrop.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length && files[0].type === 'application/pdf') {
    cvFileInput.files = files;
    showSelectedFile(files[0].name);
  }
});

cvFileInput.addEventListener('change', () => {
  if (cvFileInput.files.length) {
    showSelectedFile(cvFileInput.files[0].name);
  }
});

fileRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  cvFileInput.value = '';
  fileDropContent.hidden = false;
  fileSelected.hidden = true;
});

function showSelectedFile(name) {
  fileNameSpan.textContent = name;
  fileDropContent.hidden = true;
  fileSelected.hidden = false;
}

// ---- Form Submit ----
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const name = candidateInput.value.trim();
  const jobDesc = document.getElementById('job-desc').value.trim();
  const file = cvFileInput.files[0];

  if (!name) return showError('Veuillez saisir le nom du candidat.');
  if (!jobDesc) return showError('Veuillez décrire le poste visé.');
  if (!file)  return showError('Veuillez sélectionner un fichier PDF.');
  if (file.type !== 'application/pdf') return showError('Le fichier doit être un PDF.');
  if (file.size > 10 * 1024 * 1024)    return showError('Le fichier est trop volumineux (max 10 Mo).');

  setLoading(true);

  try {
    // Read file as base64
    const base64 = await fileToBase64(file);

    // Send to API
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: base64, candidateName: name, jobDesc: jobDesc }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erreur inconnue du serveur.');
    }

    const analysis = data.analysis;
    analysis._id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    analysis._timestamp = new Date().toISOString();

    // Save to localStorage
    candidates.unshift(analysis);
    localStorage.setItem('cv_candidates', JSON.stringify(candidates));

    // Show result card
    showResult(analysis);

    // Update dashboard
    renderDashboard();

    // Reset form
    uploadForm.reset();
    fileDropContent.hidden = false;
    fileSelected.hidden = true;

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

// ---- Helpers ----
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setLoading(loading) {
  const text = analyzeBtn.querySelector('.btn__text');
  const loader = analyzeBtn.querySelector('.btn__loader');
  if (loading) {
    analyzeBtn.disabled = true;
    text.hidden = true;
    loader.hidden = false;
  } else {
    analyzeBtn.disabled = false;
    text.hidden = false;
    loader.hidden = true;
  }
}

function showError(msg) {
  alertErrorText.textContent = msg;
  alertError.hidden = false;
}

function hideError() {
  alertError.hidden = true;
}

// ---- Result Card ----
function showResult(a) {
  resultCard.hidden = false;
  resultName.textContent = a.nom;

  // Badge
  const { badgeClass, label } = getDecisionBadge(a.decision);
  resultBadge.className = `badge ${badgeClass}`;
  resultBadge.textContent = label;

  // Animate score ring
  const score = Math.max(0, Math.min(100, a.score_adequation || 0));
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (score / 100) * circumference;

  scoreRingFill.style.stroke = getScoreColor(score);
  // Reset then animate
  scoreRingFill.style.transition = 'none';
  scoreRingFill.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scoreRingFill.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s';
      scoreRingFill.style.strokeDashoffset = offset;
    });
  });

  // Animate counter
  animateCounter(scoreValue, score);

  // Details
  resultSummary.textContent = a.profil_resume || '';
  resultExp.textContent = a.experience_annees != null ? `${a.experience_annees} an(s)` : 'N/A';
  resultJustif.textContent = a.justification || '';

  // Skills
  resultSkills.innerHTML = '';
  (a.competences_cles || []).forEach(skill => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = skill;
    resultSkills.appendChild(tag);
  });

  // Scroll into view
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function animateCounter(el, target) {
  let current = 0;
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.round(eased * target);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function getScoreColor(score) {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#ea8c00';
  return '#dc2626';
}

function getDecisionBadge(decision) {
  const d = (decision || '').toLowerCase();
  if (d.includes('retenu') && !d.includes('étudier'))
    return { badgeClass: 'badge--green', label: 'Retenu' };
  if (d.includes('étudier'))
    return { badgeClass: 'badge--orange', label: 'À étudier' };
  return { badgeClass: 'badge--red', label: 'Refusé' };
}

function getScoreClass(score) {
  if (score >= 75) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

// ---- Dashboard ----
function renderDashboard() {
  updateStats();

  const filtered = activeFilter === 'all'
    ? candidates
    : candidates.filter(c => normalizeDecision(c.decision) === activeFilter);

  if (candidates.length === 0) {
    emptyState.hidden = false;
    tableWrap.hidden = true;
    return;
  }

  emptyState.hidden = true;
  tableWrap.hidden = false;

  tableBody.innerHTML = '';
  filtered.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.05}s`;

    const score = c.score_adequation || 0;
    const { badgeClass, label } = getDecisionBadge(c.decision);
    const skills = (c.competences_cles || []).slice(0, 4);

    tr.innerHTML = `
      <td class="td-name">${escapeHtml(c.nom)}</td>
      <td class="td-score ${getScoreClass(score)}">${score}</td>
      <td>${c.experience_annees != null ? c.experience_annees + ' an(s)' : 'N/A'}</td>
      <td class="td-skills">${skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join(' ')}</td>
      <td><span class="badge ${badgeClass}">${label}</span></td>
      <td class="td-actions"><button class="btn-detail" data-id="${c._id}">Détails</button></td>
    `;

    // Click row for details
    tr.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-detail') || e.target.closest('.btn-detail')) {
        openModal(c);
      }
    });

    // Also handle click on the detail button directly
    const detailBtn = tr.querySelector('.btn-detail');
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(c);
    });

    tableBody.appendChild(tr);
  });
}

function normalizeDecision(decision) {
  const d = (decision || '').toLowerCase();
  if (d.includes('retenu') && !d.includes('étudier')) return 'Retenu';
  if (d.includes('étudier')) return 'À étudier';
  return 'Refusé';
}

function updateStats() {
  statTotal.textContent = candidates.length;
  statRetained.textContent = candidates.filter(c => normalizeDecision(c.decision) === 'Retenu').length;
  statReview.textContent   = candidates.filter(c => normalizeDecision(c.decision) === 'À étudier').length;
  statRejected.textContent = candidates.filter(c => normalizeDecision(c.decision) === 'Refusé').length;
}

// ---- Filter ----
filterGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
  btn.classList.add('filter-btn--active');

  activeFilter = btn.dataset.filter;
  renderDashboard();
});

// ---- Clear All ----
clearAllBtn.addEventListener('click', () => {
  if (!confirm('Voulez-vous vraiment supprimer tous les CV analysés ?')) return;
  candidates = [];
  localStorage.removeItem('cv_candidates');
  resultCard.hidden = true;
  renderDashboard();
});

// ---- Modal ----
function openModal(c) {
  modalName.textContent = c.nom;
  const { badgeClass, label } = getDecisionBadge(c.decision);
  modalBadge.className = `badge ${badgeClass}`;
  modalBadge.textContent = label;

  const score = c.score_adequation || 0;

  modalBody.innerHTML = `
    <div class="detail-block">
      <div class="detail-block-title">Score analytique</div>
      <div class="detail-block-value" style="font-size:1.8rem;font-weight:900;color:${getScoreColor(score)}">${score} / 100</div>
      <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${escapeHtml(c.justification || 'N/A')}</div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div class="detail-block" style="margin-bottom:0;">
        <div class="detail-block-title">Expérience évaluée</div>
        <div class="detail-block-value" style="font-weight:600;">${c.experience_annees != null ? c.experience_annees + ' an(s)' : 'N/A'}</div>
      </div>
      <div class="detail-block" style="margin-bottom:0;">
        <div class="detail-block-title">Formation / Diplôme</div>
        <div class="detail-block-value" style="font-weight:600;">${escapeHtml(c.education || 'Non précisé')}</div>
      </div>
    </div>

    <div class="detail-block">
      <div class="detail-block-title">Résumé du profil</div>
      <div class="detail-block-value" style="font-style: italic; border-left: 3px solid #cbd5e1; padding-left: 12px;">${escapeHtml(c.profil_resume || 'N/A')}</div>
    </div>

    <div class="detail-block">
      <div class="detail-block-title">Points forts démarquants</div>
      <div class="detail-block-value">
        <ul style="margin: 0; padding-left: 20px; color: #15803d;">
          ${(c.points_forts || []).map(p => `<li>${escapeHtml(p)}</li>`).join('') || '<li>Aucun point fort spécifique détecté</li>'}
        </ul>
      </div>
    </div>

    <div class="detail-block">
      <div class="detail-block-title">Points d'attention / Lacunes</div>
      <div class="detail-block-value">
        <ul style="margin: 0; padding-left: 20px; color: #b91c1c;">
          ${(c.points_faibles || []).map(p => `<li>${escapeHtml(p)}</li>`).join('') || '<li>Aucune lacune majeure détectée</li>'}
        </ul>
      </div>
    </div>

    <div class="detail-block">
      <div class="detail-block-title">Compétences évaluées</div>
      <div class="detail-block-value">${(c.competences_cles || []).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join(' ')}</div>
    </div>

    <div class="detail-block" style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div class="detail-block-title" style="color: #0f172a;">Questions recommandées pour l'entretien</div>
      <div class="detail-block-value">
        <ol style="margin: 0; padding-left: 20px; color: #334155; font-size: 0.9rem;">
          ${(c.questions_entretien || []).map(q => `<li>${escapeHtml(q)}</li>`).join('') || '<li>Aucune question suggérée</li>'}
        </ol>
      </div>
    </div>

    <div class="detail-block" style="margin-top: 24px; text-align: right;">
      <div class="detail-block-value" style="font-size: 0.75rem; color: #94a3b8;">
        Analyse IA générée le ${c._timestamp ? new Date(c._timestamp).toLocaleString('fr-FR') : 'N/A'}
      </div>
    </div>
  `;

  detailModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailModal.hidden = true;
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !detailModal.hidden) closeModal();
});

// ---- Utility ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
