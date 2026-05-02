// api/analyze.js — Vercel Serverless Function
// Reçoit un fichier PDF + nom du candidat, extrait le texte, envoie à Groq (primary) ou Gemini (fallback), retourne le JSON

const pdfParse = require('pdf-parse');

function getSystemPrompt(jobDesc) {
  return `Tu es un recruteur expert (Head of HR). Ton objectif est d'analyser le CV suivant avec un œil extrêmement critique, analytique et objectif. 
Le profil recherché (critères du poste) est le suivant :
"""
${jobDesc}
"""

Retourne UNIQUEMENT un objet JSON strictement valide (sans markdown, sans backticks) avec l'exacte structure suivante :
{
  "nom": "string",
  "experience_annees": "number (calcule le total d'années d'expérience professionnelle pertinente)",
  "education": "string (Le plus haut diplôme ou formation pertinente)",
  "competences_cles": ["string", "string"], // max 8 compétences techniques et soft skills
  "points_forts": ["string", "string"], // 2 à 3 points forts démarquants du candidat PAR RAPPORT au poste
  "points_faibles": ["string", "string"], // 1 à 2 points d'attention ou lacunes PAR RAPPORT au poste (sois honnête)
  "questions_entretien": ["string", "string"], // 2 questions pertinentes à poser en entretien basées sur les lacunes ou éléments flous
  "score_adequation": "number", // De 0 à 100. Sois TRÈS sévère. Note l'adéquation EXACTE avec la description du poste.
  "profil_resume": "string", // Un résumé percutant de 2 à 3 phrases maximum.
  "decision": "string", // DOIT ÊTRE EXACTEMENT l'une de ces 3 valeurs : "Retenu", "À étudier", "Refusé"
  "justification": "string" // Explique précisément pourquoi ce score par rapport à la description du poste.
}

Règles d'évaluation rigoureuses (basées SUR LE POSTE VISÉ) :
- Score > 75 → "Retenu" (Correspond parfaitement aux critères du poste, excellente expérience)
- Score entre 50 et 75 → "À étudier" (Il manque quelques critères mais le profil reste très prometteur)
- Score < 50 → "Refusé" (Ne correspond pas du tout aux critères, manque d'expérience clé)

Sois un analyste impitoyable mais juste. Ne donne pas 80+ si le candidat ne coche pas la majorité des critères de l'offre.`;
}

// ---- Groq API (Primary - Free & Fast) ----
async function callGroq(cvText, candidateName, jobDesc) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY non configurée');

  console.log('🔄 Tentative avec Groq...');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: getSystemPrompt(jobDesc) },
        { role: 'user', content: `Nom du candidat fourni : ${candidateName}\n\nCV :\n${cvText.substring(0, 30000)}` },
      ],
      temperature: 0.1,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Groq Error:', JSON.stringify(data, null, 2));
    throw new Error(data?.error?.message || `Erreur Groq API (Status: ${response.status})`);
  }

  let rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) throw new Error('Groq n\'a pas retourné de contenu.');

  // Sanitize markdown
  if (rawContent.startsWith('```json')) {
    rawContent = rawContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (rawContent.startsWith('```')) {
    rawContent = rawContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  console.log('✅ Groq a répondu avec succès.');
  return rawContent;
}

// ---- Gemini API (Fallback - Free) ----
async function callGemini(cvText, candidateName, jobDesc) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurée');

  console.log('🔄 Tentative avec Gemini (fallback)...');
  const model = 'gemini-2.0-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: getSystemPrompt(jobDesc) },
            { text: `Nom du candidat fourni : ${candidateName}\n\nCV :\n${cvText.substring(0, 30000)}` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini Error:', JSON.stringify(data, null, 2));
    throw new Error(data?.error?.message || `Erreur Gemini API`);
  }

  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!rawContent) throw new Error('Gemini n\'a pas retourné de contenu.');

  console.log('✅ Gemini a répondu avec succès.');
  return rawContent;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, candidateName, jobDesc } = req.body;

    if (!pdfBase64 || !candidateName || !jobDesc) {
      return res.status(400).json({ error: 'Le fichier PDF, le nom et la description du poste sont requis.' });
    }

    // Decode base64 PDF and extract text
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfData = await pdfParse(pdfBuffer);
    const cvText = pdfData.text;

    if (!cvText || cvText.trim().length < 20) {
      return res.status(400).json({ error: 'Impossible d\'extraire du texte du PDF. Vérifiez que le fichier n\'est pas scanné (image).' });
    }

    // Try Groq first, then fallback to Gemini
    let rawContent;
    try {
      rawContent = await callGroq(cvText, candidateName, jobDesc);
    } catch (groqErr) {
      console.warn('⚠️ Groq a échoué:', groqErr.message);
      console.log('↪️ Basculement vers Gemini...');
      rawContent = await callGemini(cvText, candidateName, jobDesc);
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(rawContent);
    } catch (parseErr) {
      return res.status(500).json({
        error: 'L\'IA n\'a pas retourné un JSON valide.',
        raw: rawContent,
      });
    }

    // Ensure the candidate name is present
    analysis.nom = analysis.nom || candidateName;

    return res.status(200).json({ success: true, analysis });
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
  }
};
