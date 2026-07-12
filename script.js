/* ============================================================
   MA BIBLE DES MOTS — CRPE 2027
   script.js — Logique principale
   ============================================================ */

/* --- Configuration --- */
const OBJECTIF_TOTAL  = 10000;
const FICHIER_MOTS    = 'mots.json';
const FICHIER_MAITRISE = 'maitrise.json';

/* --- État global --- */
let tousLesMots     = [];   // uniquement les vrais mots (sans headers)
let maitrise        = {};   // { "mot": true/false, ... }
let filtreTexte     = '';
let filtreCategorie = '';
let filtreStatut    = '';

/* ============================================================
   INITIALISATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await chargerDonnees();
  construireFiltreCategories();
  rendrePage();
  bindEvenements();
});

/* ============================================================
   CHARGEMENT DES DONNÉES
   ============================================================ */
async function chargerDonnees() {
  try {
    const resMots = await fetch(FICHIER_MOTS);
    if (!resMots.ok) throw new Error('mots.json introuvable');
    const brut = await resMots.json();

    // ✅ On ignore les entrées "header" (type: categorie / sous_categorie)
    // On garde uniquement les entrées qui ont un champ "mot"
    tousLesMots = brut.filter(entry => entry.mot !== undefined && entry.mot !== null);

  } catch (e) {
    console.error('Erreur chargement mots.json :', e);
    tousLesMots = [];
  }

  try {
    const resMaitrise = await fetch(FICHIER_MAITRISE);
    if (!resMaitrise.ok) throw new Error('maitrise.json introuvable');
    maitrise = await resMaitrise.json();
  } catch (e) {
    // Fichier absent au départ — on commence avec un objet vide
    maitrise = {};
  }
}

/* ============================================================
   SAUVEGARDE LOCALE (localStorage)
   Puisque GitHub Pages ne permet pas d'écrire un fichier,
   on sauvegarde les coches dans localStorage.
   À chaque session, l'état est conservé dans le navigateur.
   ============================================================ */
function sauvegarderMaitrise() {
  localStorage.setItem('maitrise_crpe', JSON.stringify(maitrise));
}

function chargerMaitriseLocale() {
  const data = localStorage.getItem('maitrise_crpe');
  if (data) {
    try {
      maitrise = JSON.parse(data);
    } catch (e) {
      maitrise = {};
    }
  }
}

/* ============================================================
   STATISTIQUES
   ============================================================ */
function calculerStats() {
  const total     = tousLesMots.length;
  const maitrisés = tousLesMots.filter(m => maitrise[m.mot]).length;
  const restants  = total - maitrisés;
  const pourcent  = OBJECTIF_TOTAL > 0
    ? Math.round((maitrisés / OBJECTIF_TOTAL) * 100)
    : 0;
  return { total, maitrisés, restants, pourcent };
}

function mettreAJourStats() {
  const { total, maitrisés, restants, pourcent } = calculerStats();

  document.getElementById('statTotal').textContent    = total.toLocaleString('fr-FR');
  document.getElementById('statMaitrise').textContent = maitrisés.toLocaleString('fr-FR');
  document.getElementById('statRestant').textContent  = restants.toLocaleString('fr-FR');
  document.getElementById('statPourcent').textContent = pourcent + '%';

  document.getElementById('progressFill').style.width  = Math.min(pourcent, 100) + '%';
  document.getElementById('progressLabel').textContent = maitrisés + ' / ' + OBJECTIF_TOTAL.toLocaleString('fr-FR');
}

/* ============================================================
   FILTRE CATÉGORIES (select dynamique)
   ============================================================ */
function construireFiltreCategories() {
  const select = document.getElementById('filterCategorie');
  // ✅ tousLesMots ne contient déjà que de vrais mots — pas de risque de pollution
  const categories = [...new Set(tousLesMots.map(m => m.categorie))].sort();
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/* ============================================================
   FILTRAGE DES MOTS
   ============================================================ */
function motsFiltres() {
  return tousLesMots.filter(m => {
    const matchTexte = filtreTexte === ''
      || m.mot.toLowerCase().includes(filtreTexte.toLowerCase());
    const matchCat = filtreCategorie === ''
      || m.categorie === filtreCategorie;
    const matchStatut = filtreStatut === ''
      || (filtreStatut === 'maitrise'     &&  maitrise[m.mot])
      || (filtreStatut === 'non_maitrise' && !maitrise[m.mot]);
    return matchTexte && matchCat && matchStatut;
  });
}

/* ============================================================
   RENDU DE LA PAGE
   ============================================================ */
function rendrePage() {
  mettreAJourStats();

  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  const mots = motsFiltres();

  if (mots.length === 0) {
    container.innerHTML = '<p class="message-vide">Aucun mot trouvé.</p>';
    return;
  }

  // Grouper par catégorie puis sous-catégorie
  const parCategorie = {};
  mots.forEach(m => {
    if (!parCategorie[m.categorie]) parCategorie[m.categorie] = {};
    const scat = m.sous_categorie || 'Général';
    if (!parCategorie[m.categorie][scat]) parCategorie[m.categorie][scat] = [];
    parCategorie[m.categorie][scat].push(m);
  });

  Object.keys(parCategorie).sort().forEach(cat => {
    const blocCat = document.createElement('div');
    blocCat.className = 'categorie-bloc';

    const titreCat = document.createElement('h2');
    titreCat.className = 'categorie-titre';
    titreCat.textContent = cat;
    blocCat.appendChild(titreCat);

    Object.keys(parCategorie[cat]).sort().forEach(scat => {
      const blocScat = document.createElement('div');
      blocScat.className = 'sous-categorie-bloc';

      const titreScat = document.createElement('h3');
      titreScat.className = 'sous-categorie-titre';
      titreScat.textContent = scat;
      blocScat.appendChild(titreScat);

      const grille = document.createElement('div');
      grille.className = 'mots-grille';

      parCategorie[cat][scat].forEach(m => {
        grille.appendChild(creerCarteMot(m));
      });

      blocScat.appendChild(grille);
      blocCat.appendChild(blocScat);
    });

    container.appendChild(blocCat);
  });
}

/* ============================================================
   CRÉATION D'UNE CARTE MOT
   ============================================================ */
function creerCarteMot(m) {
  const carte = document.createElement('div');
  carte.className = 'mot-carte' + (maitrise[m.mot] ? ' maitrise' : '');
  carte.dataset.mot = m.mot;

  const check = document.createElement('div');
  check.className = 'mot-check';

  const texte = document.createElement('span');
  texte.className = 'mot-texte';
  texte.textContent = m.mot;

  carte.appendChild(check);
  carte.appendChild(texte);

  carte.addEventListener('click', () => basculerMot(m.mot, carte));

  return carte;
}

/* ============================================================
   BASCULER L'ÉTAT D'UN MOT (coché / non coché)
   ============================================================ */
function basculerMot(mot, carte) {
  maitrise[mot] = !maitrise[mot];
  if (!maitrise[mot]) delete maitrise[mot];

  carte.classList.toggle('maitrise', !!maitrise[mot]);
  sauvegarderMaitrise();
  mettreAJourStats();
}

/* ============================================================
   ÉVÉNEMENTS — FILTRES
   ============================================================ */
function bindEvenements() {
  // Charger l'état local au démarrage (priorité sur maitrise.json)
  chargerMaitriseLocale();
  mettreAJourStats();

  document.getElementById('searchInput').addEventListener('input', e => {
    filtreTexte = e.target.value.trim();
    rendrePage();
  });

  document.getElementById('filterCategorie').addEventListener('change', e => {
    filtreCategorie = e.target.value;
    rendrePage();
  });

  document.getElementById('filterStatut').addEventListener('change', e => {
    filtreStatut = e.target.value;
    rendrePage();
  });
}

/* ============================================================
   EXPORT DE L'ÉTAT (pour partager avec Claude)
   Appelle exporterEtat() dans la console pour obtenir
   un résumé lisible de ce qui est maîtrisé.
   ============================================================ */
function exporterEtat() {
  const motsMaitrise = Object.keys(maitrise).filter(m => maitrise[m]);
  console.log('=== MOTS MAÎTRISÉS (' + motsMaitrise.length + ') ===');
  console.log(motsMaitrise.join(', '));
  return motsMaitrise;
}

window.exporterEtat = exporterEtat;