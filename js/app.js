(function () {
  "use strict";

  var ITEMS = window.REFERENTIEL.items;
  var SCORING = window.SCORING;
  var REPORT = window.REPORT;
  var APERCU = !!window.MATURITYLENS_APERCU;
  var CLE_STOCKAGE = "maturitylens_v1";

  var ITEM_PAR_CLE = {};
  ITEMS.forEach(function (it) { ITEM_PAR_CLE[it.cle] = it; });

  var ECRANS = ["org", "CL", "A5", "A6", "A7", "A8", "resultats"];
  var LIBELLES_ECRAN = {
    org: "Organisation", CL: "Clauses 4-10", A5: "A.5 Organisationnel",
    A6: "A.6 Humain", A7: "A.7 Physique", A8: "A.8 Technologique", resultats: "Résultats"
  };
  var DESCRIPTIONS_ECRAN = {
    CL: "Les exigences de management qui structurent le système de sécurité de l'information : comprendre le contexte, engager la direction, apprécier et traiter les risques, allouer les ressources, surveiller la performance et s'améliorer en continu. Ces 24 exigences sont obligatoires pour toute certification.",
    A5: "Les règles qui organisent la sécurité au niveau de l'entreprise : politiques, inventaire des actifs, contrôle d'accès, relation avec les fournisseurs, gestion des incidents, continuité d'activité et conformité réglementaire.",
    A6: "Les mesures qui concernent le personnel : vérifications à l'embauche, sensibilisation et formation, télétravail, et signalement des événements de sécurité suspects.",
    A7: "La protection des locaux et des équipements physiques : périmètres de sécurité, contrôle des accès, protection contre les menaces environnementales et gestion des supports de stockage.",
    A8: "Les mesures techniques appliquées aux systèmes d'information : postes de travail, comptes à privilèges, authentification forte, gestion des vulnérabilités, sauvegardes, journalisation, sécurité réseau, chiffrement et développement sécurisé."
  };
  var NIVEAUX = ["Inexistant", "Initial", "Reproductible", "Défini", "Géré", "Optimisé"];
  var BADGES_CRITICITE = { 1: "Standard", 2: "Importante", 3: "Critique" };

  var ETAT = { organisation: {}, cible: 3, reponses: {}, preuves: {} };
  var ECRAN_ACTUEL = "accueil";
  var FILTRE = "tous";
  var MESSAGE = "";

  function esc(s) {
    if (s === null || s === undefined) { return ""; }
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function itemsDeSection(section) {
    return ITEMS.filter(function (it) { return it.section === section; });
  }

  function sauvegarder() {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(REPORT.exporterJSON(ETAT)));
    } catch (e) { /* stockage indisponible : on continue sans persistance */ }
  }

  function charger() {
    var cles = ITEMS.map(function (it) { return it.cle; });
    try {
      var brut = localStorage.getItem(CLE_STOCKAGE);
      if (!brut) { return; }
      var resultat = REPORT.importerSession(brut, cles);
      if (resultat.ok) { ETAT = resultat.etat; }
    } catch (e) { /* stockage indisponible : on démarre à vide */ }
  }

  function telechargerOuCopier(texte, nomFichier, typeMime) {
    if (APERCU) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texte);
      }
      MESSAGE = "Mode aperçu : contenu copié dans le presse-papiers (" + nomFichier + ").";
      rendre();
      return;
    }
    var blob = new Blob([texte], { type: typeMime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Générateur de données d'exemple (PRNG à graine fixe, démo reproductible) ----
  function mulberry32(graine) {
    return function () {
      graine |= 0;
      graine = (graine + 0x6D2B79F5) | 0;
      var t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function chargerExemple() {
    var rng = mulberry32(27001);
    var reponses = {};
    ITEMS.forEach(function (it) {
      if (rng() < 0.04) {
        reponses[it.cle] = { score: "na", note: "" };
        return;
      }
      var biais = it.criticite === 3 ? 0.6 : 1;
      var v = Math.floor(rng() * 6 * biais);
      if (v > 5) { v = 5; }
      reponses[it.cle] = { score: v, note: "" };
    });
    reponses["A.8.13"] = { score: 1, note: "Aucune restauration de sauvegarde testée au cours des 12 derniers mois." };
    reponses["A.7.4"] = { score: "na", note: "" };

    ETAT = {
      organisation: {
        nom: "Association Exemple (données fictives)",
        secteur: "ONG",
        taille: "18",
        perimetre: "Siège et antenne locale",
        evaluateur: "Démonstration",
        date: new Date().toISOString().slice(0, 10)
      },
      cible: 3,
      reponses: reponses,
      preuves: {
        "A.5.17": [{ severite: "HIGH", titre: "Mot de passe administrateur trouvé en clair dans un fichier de configuration", source: "iso-audit" }],
        "A.8.8": [{ severite: "MEDIUM", titre: "Composant logiciel avec vulnérabilité connue non corrigée", source: "iso-audit" }]
      }
    };
    ECRAN_ACTUEL = "org";
    sauvegarder();
    rendre();
  }

  function reinitialiser() {
    var ok = APERCU || window.confirm("Réinitialiser toutes les réponses ? Cette action est irréversible.");
    if (!ok) { return; }
    ETAT = { organisation: {}, cible: 3, reponses: {}, preuves: {} };
    ECRAN_ACTUEL = "org";
    sauvegarder();
    rendre();
  }

  // ---- Rendu : écran d'accueil ----
  function rendreAccueil() {
    return [
      '<div class="accueil">',
      '<p class="accueil-fil">Auto-évaluation ISO/IEC 27001:2022</p>',
      "<h1>MaturityLens</h1>",
      '<p class="accueil-lead">Un diagnostic de la maturité de votre sécurité de l\'information, mené en une trentaine de minutes, sans compte ni serveur : tout reste sur votre poste.</p>',
      "<p>L'outil parcourt les 24 exigences des clauses 4 à 10 et les 93 mesures de l'Annexe A d'ISO/IEC 27001:2022. Chaque réponse sur une échelle de 0 à 5 alimente un calcul transparent : maturité par domaine, écarts classés par priorité et plan d'action réparti sur trois horizons.</p>",
      '<ul class="accueil-points">',
      "<li>Aucune donnée ne quitte votre navigateur : pas de requête réseau, pas de compte à créer.</li>",
      "<li>Rapport exportable en Markdown, imprimable en PDF, et session réimportable en JSON.</li>",
      "<li>Des constats techniques d'un scanner peuvent venir confronter vos réponses aux faits.</li>",
      "</ul>",
      '<p class="avertissement">' + esc(REPORT.AVERTISSEMENT) + "</p>",
      '<button type="button" class="suivant" data-action="aller" data-ecran="org">Commencer l\'auto-évaluation</button>',
      "</div>"
    ].join("");
  }

  // ---- Rendu : écran Organisation ----
  function champ(id, libelle, valeur, type) {
    return '<label class="champ">' + esc(libelle) +
      '<input type="' + (type || "text") + '" data-champ="' + id + '" value="' + esc(valeur || "") + '"></label>';
  }

  function rendreOrganisation() {
    var org = ETAT.organisation || {};
    var options = [2, 3, 4, 5].map(function (v) {
      return '<option value="' + v + '"' + (ETAT.cible === v ? " selected" : "") + '>' + v + " " + esc(NIVEAUX[v]) + "</option>";
    }).join("");
    var legende = NIVEAUX.map(function (n, v) {
      return '<li><span class="pastille" data-score-niveau="' + v + '"></span>' + v + " " + esc(n) + "</li>";
    }).join("");
    return [
      '<section class="ecran">',
      "<h2>Organisation</h2>",
      '<p class="avertissement">' + esc(REPORT.AVERTISSEMENT) + "</p>",
      '<form class="formulaire-org">',
      champ("nom", "Nom de l'organisation", org.nom),
      champ("secteur", "Secteur d'activité", org.secteur),
      champ("taille", "Effectif", org.taille),
      champ("perimetre", "Périmètre évalué", org.perimetre),
      champ("evaluateur", "Évaluateur", org.evaluateur),
      champ("date", "Date", org.date, "date"),
      '<label class="champ">Niveau cible<select data-champ="cible">' + options + "</select></label>",
      "</form>",
      '<ul class="legende-echelle">' + legende + "</ul>",
      '<div class="actions-org">',
      '<button type="button" data-action="exemple">Charger un exemple</button>',
      '<button type="button" data-action="declencher-import">Importer un JSON</button>',
      '<input type="file" id="fichier-import" accept="application/json" hidden>',
      '<button type="button" data-action="reinitialiser">Réinitialiser</button>',
      "</div>",
      '<button type="button" class="suivant" data-action="aller" data-ecran="CL">Commencer le questionnaire</button>',
      "</section>"
    ].join("");
  }

  // ---- Rendu : carte d'item ----
  function rendreCarte(item) {
    var rep = ETAT.reponses[item.cle] || {};
    var sansReponse = rep.score === undefined || rep.score === null;
    if (FILTRE === "sans-reponse" && !sansReponse) { return ""; }
    var boutonsScore = [0, 1, 2, 3, 4, 5].map(function (v) {
      var actif = rep.score === v;
      return '<button type="button" class="echelle-bouton" data-score-niveau="' + v + '" data-action="noter" data-cle="' +
        esc(item.cle) + '" data-score="' + v + '" aria-pressed="' + (actif ? "true" : "false") + '">' + v + "</button>";
    }).join("");
    var naActif = rep.score === "na";
    var boutonNA = '<button type="button" class="echelle-bouton echelle-na" data-action="noter-na" data-cle="' +
      esc(item.cle) + '" aria-pressed="' + (naActif ? "true" : "false") + '">N/A</button>';
    var constats = (ETAT.preuves[item.cle] || []).map(function (c) {
      return '<li class="constat constat-' + esc((c.severite || "info").toLowerCase()) + '">' +
        "<strong>" + esc(c.severite) + "</strong> : " + esc(c.titre) + ' <span class="constat-source">(' + esc(c.source) + ")</span></li>";
    }).join("");
    return [
      '<article class="carte" data-carte="' + esc(item.cle) + '">',
      '<header class="carte-entete">',
      '<span class="carte-ref">' + esc(item.cle) + "</span>",
      '<span class="badge badge-' + item.criticite + '">' + esc(BADGES_CRITICITE[item.criticite]) + "</span>",
      "</header>",
      '<h3 class="carte-titre">' + esc(item.titre) + "</h3>",
      '<p class="carte-question">' + esc(item.question) + "</p>",
      '<div class="echelle" role="group" aria-label="Échelle de maturité pour ' + esc(item.cle) + '">' + boutonsScore + boutonNA + "</div>",
      constats ? '<ul class="constats">' + constats + "</ul>" : "",
      '<div class="carte-actions">',
      '<button type="button" class="lien" data-action="voir-recommandation" data-cle="' + esc(item.cle) + '">Voir la recommandation</button>',
      '<button type="button" class="lien" data-action="ajouter-note" data-cle="' + esc(item.cle) + '">' + (rep.note ? "Modifier la note" : "Ajouter une note") + "</button>",
      "</div>",
      '<p class="carte-recommandation masque" data-recommandation="' + esc(item.cle) + '">' + esc(item.recommandation) + "</p>",
      '<textarea class="carte-note masque" data-note="' + esc(item.cle) + '" maxlength="2000" placeholder="Note libre (2000 caractères max)">' + esc(rep.note || "") + "</textarea>",
      "</article>"
    ].join("");
  }

  function compterReponses(section) {
    var items = itemsDeSection(section);
    var n = 0;
    items.forEach(function (it) {
      var rep = ETAT.reponses[it.cle];
      if (rep && (SCORING.estNote(rep.score) || rep.score === "na")) { n += 1; }
    });
    return { n: n, total: items.length };
  }

  function rendreQuestionnaire(section) {
    var items = itemsDeSection(section);
    var cartes = items.map(rendreCarte).join("");
    var compte = compterReponses(section);
    var suivant = ECRANS[ECRANS.indexOf(section) + 1];
    var precedent = ECRANS[ECRANS.indexOf(section) - 1];
    return [
      '<section class="ecran">',
      "<h2>" + esc(LIBELLES_ECRAN[section]) + " <small>(" + compte.n + "/" + compte.total + ")</small></h2>",
      '<p class="ecran-description">' + esc(DESCRIPTIONS_ECRAN[section]) + "</p>",
      '<div class="filtre" role="group" aria-label="Filtrer les items">',
      '<button type="button" data-action="filtrer" data-filtre="tous" aria-pressed="' + (FILTRE === "tous" ? "true" : "false") + '">Toutes</button>',
      '<button type="button" data-action="filtrer" data-filtre="sans-reponse" aria-pressed="' + (FILTRE === "sans-reponse" ? "true" : "false") + '">Sans réponse</button>',
      "</div>",
      '<div class="liste-cartes">' + (cartes || '<p class="vide">Tous les items de cette partie ont une réponse.</p>') + "</div>",
      '<div class="navigation-ecran">',
      precedent ? '<button type="button" data-action="aller" data-ecran="' + precedent + '">Revenir</button>' : "",
      '<button type="button" class="suivant" data-action="aller" data-ecran="' + suivant + '">Continuer</button>',
      "</div>",
      "</section>"
    ].join("");
  }

  // ---- Rendu : radar SVG ----
  function polaire(cx, cy, r, angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function rendreRadar(axes) {
    // Marge large autour du cercle : les libellés les plus longs
    // ("Organisationnel (n.é.)") doivent rester dans le viewBox, jamais
    // rognés par le cadre de l'SVG.
    var cx = 280, cy = 190, rMax = 90;
    var n = axes.length;
    var pointsDonnees = axes.map(function (a, i) {
      var p = polaire(cx, cy, (a.valeur / 5) * rMax, i * (360 / n));
      return p.x.toFixed(1) + "," + p.y.toFixed(1);
    }).join(" ");
    var axesSvg = axes.map(function (a, i) {
      var angle = i * (360 / n);
      var fin = polaire(cx, cy, rMax, angle);
      var label = polaire(cx, cy, rMax + 22, angle);
      var ancre = label.x < cx - 5 ? "end" : label.x > cx + 5 ? "start" : "middle";
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + fin.x.toFixed(1) + '" y2="' + fin.y.toFixed(1) + '" class="radar-axe"></line>' +
        '<text x="' + label.x.toFixed(1) + '" y="' + label.y.toFixed(1) + '" text-anchor="' + ancre + '" class="radar-libelle">' + esc(a.libelle) + "</text>";
    }).join("");
    return '<svg viewBox="0 0 560 380" role="img" aria-label="Radar de maturité par domaine, 11 axes" class="radar">' +
      axesSvg +
      '<polygon points="' + pointsDonnees + '" class="radar-forme"></polygon>' +
      "</svg>";
  }

  // ---- Rendu : écran Résultats ----
  function rendreResultats() {
    var reponses = ETAT.reponses, cible = ETAT.cible;
    var global = SCORING.maturiteGlobale(ITEMS, reponses);
    var clauses = SCORING.maturiteParSection(ITEMS, reponses, "CL");
    var annexeA = SCORING.moyenne(ITEMS.filter(function (it) { return it.section !== "CL"; }), reponses);
    var ecarts = SCORING.ecartsEtPriorites(ITEMS, reponses, cible);
    var planAction = SCORING.plan(ecarts);
    var pret = SCORING.pretPourCertification(ITEMS, reponses, cible);
    var axes = SCORING.axesRadar(ITEMS, reponses);

    function indicateur(libelle, m) {
      var valeur = m.compte === 0 ? "N/D" : m.moyenne.toFixed(1) + "/5";
      return '<div class="indicateur"><span class="indicateur-valeur">' + valeur + '</span><span class="indicateur-libelle">' + esc(libelle) + "</span></div>";
    }

    var barres = ["CL", "A5", "A6", "A7", "A8"].map(function (section) {
      var m = SCORING.maturiteParSection(ITEMS, reponses, section);
      var pct = m.compte === 0 ? 0 : m.pourcentage;
      return '<div class="barre-domaine"><span class="barre-nom">' + esc(section) + '</span>' +
        '<div class="barre-fond"><div class="barre-valeur" data-largeur="' + pct + '"></div></div>' +
        '<span class="barre-pct">' + pct + "%</span></div>";
    }).join("");

    var topEcarts = ecarts.slice(0, 10).map(function (e) {
      return "<li><strong>" + esc(e.cle) + "</strong> " + esc(e.titre) +
        " (score " + e.score + "/5, priorité " + e.priorite + ", horizon " + e.horizon + " mois)</li>";
    }).join("");

    var planHtml = ["0-3", "3-6", "6-12"].map(function (h) {
      var lignes = planAction[h].map(function (e) { return "<li>" + esc(e.cle) + " : " + esc(e.recommandation) + "</li>"; }).join("");
      return '<div class="plan-horizon"><h4>' + h + " mois</h4><ul>" + (lignes || "<li>Aucune action.</li>") + "</ul></div>";
    }).join("");

    return [
      '<section class="ecran ecran-resultats">',
      "<h2>Résultats</h2>",
      '<p class="avertissement">' + esc(REPORT.AVERTISSEMENT) + "</p>",
      '<div class="indicateurs">',
      indicateur("Maturité globale", global),
      indicateur("Clauses 4-10", clauses),
      indicateur("Annexe A", annexeA),
      '<div class="indicateur"><span class="indicateur-valeur">' + ecarts.length + '</span><span class="indicateur-libelle">Écarts identifiés</span></div>',
      "</div>",
      '<div class="radar-et-barres">' + rendreRadar(axes) + '<div class="barres-domaines">' + barres + "</div></div>",
      "<h3>Dix écarts prioritaires</h3>",
      "<ol class=\"top-ecarts\">" + (topEcarts || "<li>Aucun écart sous la cible.</li>") + "</ol>",
      "<h3>Plan d'action</h3>",
      "<p class=\"note-certification\">" +
        (pret
          ? "Les 24 exigences des clauses 4 à 10 sont toutes au niveau cible : rien n'empêche plus une certification de ce côté."
          : "Avant d'envisager une certification, traiter en priorité les écarts sur les clauses 4 à 10 ci-dessous : elles doivent toutes atteindre le niveau cible.") +
      "</p>",
      '<div class="plan">' + planHtml + "</div>",
      '<div class="actions-resultats">',
      '<button type="button" data-action="export-md">Exporter le rapport (Markdown)</button>',
      '<button type="button" data-action="export-json">Exporter la session (JSON)</button>',
      APERCU ? "" : '<button type="button" data-action="imprimer">Imprimer / PDF</button>',
      "</div>",
      '<button type="button" data-action="aller" data-ecran="A8">Revenir au questionnaire</button>',
      "</section>"
    ].join("");
  }

  // ---- Rendu global : navigation + écran + barre de progression ----
  function rendreNav() {
    return ECRANS.map(function (e, i) {
      var actif = e === ECRAN_ACTUEL;
      var compte = e !== "org" && e !== "resultats" ? compterReponses(e) : null;
      var fait = compte && compte.n === compte.total;
      return '<button type="button" class="nav-item' + (actif ? " nav-actif" : "") + (fait ? " nav-fait" : "") + '" data-action="aller" data-ecran="' + e + '" aria-current="' +
        (actif ? "true" : "false") + '"><span class="nav-etape">' + (i + 1) + "</span>" + esc(LIBELLES_ECRAN[e]) + "</button>";
    }).join("");
  }

  function rendre() {
    if (ECRAN_ACTUEL === "accueil") {
      document.getElementById("app").innerHTML = rendreAccueil();
      return;
    }
    var progression = SCORING.progression(ITEMS, ETAT.reponses);
    var org = ETAT.organisation || {};
    document.getElementById("app").innerHTML = [
      '<header class="entete">',
      "<h1>MaturityLens</h1>",
      '<div class="progression-globale"><div class="progression-barre" data-largeur="' + progression + '"></div></div>',
      MESSAGE ? '<p class="message" role="status">' + esc(MESSAGE) + "</p>" : "",
      "</header>",
      '<div class="bandeau-impression">' +
        "<p>" + esc(org.nom || "Organisation non renseignée") + (org.date ? ", évalué le " + esc(org.date) : "") + ".</p>" +
        "<p>" + esc(REPORT.AVERTISSEMENT) + "</p>" +
      "</div>",
      '<nav class="nav" aria-label="Étapes du diagnostic">' + rendreNav() + "</nav>",
      '<main id="contenu"></main>'
    ].join("");
    MESSAGE = "";

    var html;
    if (ECRAN_ACTUEL === "org") { html = rendreOrganisation(); }
    else if (ECRAN_ACTUEL === "resultats") { html = rendreResultats(); }
    else { html = rendreQuestionnaire(ECRAN_ACTUEL); }
    document.getElementById("contenu").innerHTML = html;

    document.querySelectorAll("[data-largeur]").forEach(function (el) {
      el.style.width = el.getAttribute("data-largeur") + "%";
    });
    var navActif = document.querySelector(".nav-actif");
    if (navActif && navActif.scrollIntoView) {
      navActif.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }

  function majCarte(cle) {
    var carteEl = document.querySelector('[data-carte="' + cle + '"]');
    if (!carteEl) { return; }
    var rep = ETAT.reponses[cle] || {};
    var aReponse = rep.score !== undefined && rep.score !== null;
    if (FILTRE === "sans-reponse" && aReponse) {
      carteEl.remove();
      majEntetes();
      return;
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = rendreCarte(ITEM_PAR_CLE[cle]);
    carteEl.replaceWith(tmp.firstElementChild);
    majEntetes();
  }

  function majEntetes() {
    var progression = SCORING.progression(ITEMS, ETAT.reponses);
    var barre = document.querySelector(".progression-barre");
    if (barre) { barre.style.width = progression + "%"; }
    var nav = document.querySelector(".nav");
    if (nav) { nav.innerHTML = rendreNav(); }
    var titre = document.querySelector("#contenu h2 small");
    if (titre && ECRAN_ACTUEL !== "org" && ECRAN_ACTUEL !== "resultats") {
      var compte = compterReponses(ECRAN_ACTUEL);
      titre.textContent = "(" + compte.n + "/" + compte.total + ")";
    }
  }

  // ---- Import JSON (session ou constats) ----
  function lireFichier(fichier, callback) {
    if (!fichier) { return; }
    if (fichier.size > REPORT.TAILLE_MAX_IMPORT) {
      MESSAGE = "Fichier trop volumineux (2 Mo maximum).";
      rendre();
      return;
    }
    var lecteur = new FileReader();
    lecteur.onload = function () { callback(lecteur.result); };
    lecteur.onerror = function () { MESSAGE = "Impossible de lire le fichier."; rendre(); };
    lecteur.readAsText(fichier);
  }

  function traiterImport(texte) {
    var cles = ITEMS.map(function (it) { return it.cle; });
    var sessionTentative = REPORT.importerSession(texte, cles);
    if (sessionTentative.ok) {
      ETAT = sessionTentative.etat;
      MESSAGE = "Session importée avec succès.";
      sauvegarder();
      rendre();
      return;
    }
    var constatsTentative = REPORT.importerConstats(texte, cles);
    if (constatsTentative.ok) {
      Object.keys(constatsTentative.preuves).forEach(function (cle) {
        ETAT.preuves[cle] = (ETAT.preuves[cle] || []).concat(constatsTentative.preuves[cle]);
      });
      MESSAGE = "Constats importés : " + Object.keys(constatsTentative.preuves).length + " mesure(s) renseignée(s)" +
        (constatsTentative.ignores ? ", " + constatsTentative.ignores + " ignoré(s)" : "") + ".";
      sauvegarder();
      rendre();
      return;
    }
    MESSAGE = "Import impossible : " + (sessionTentative.erreur || constatsTentative.erreur || "format inconnu") + ".";
    rendre();
  }

  // ---- Délégation d'événements ----
  document.addEventListener("click", function (ev) {
    var cible = ev.target.closest("[data-action]");
    if (!cible) { return; }
    var action = cible.getAttribute("data-action");

    if (action === "aller") { ECRAN_ACTUEL = cible.getAttribute("data-ecran"); rendre(); return; }
    if (action === "exemple") { chargerExemple(); return; }
    if (action === "reinitialiser") { reinitialiser(); return; }
    if (action === "declencher-import") { document.getElementById("fichier-import").click(); return; }
    if (action === "filtrer") { FILTRE = cible.getAttribute("data-filtre"); rendre(); return; }

    if (action === "noter" || action === "noter-na") {
      var cle = cible.getAttribute("data-cle");
      var nouvelleValeur = action === "noter" ? parseInt(cible.getAttribute("data-score"), 10) : "na";
      var rep = ETAT.reponses[cle] || {};
      var note = rep.note || "";
      if (rep.score === nouvelleValeur) {
        ETAT.reponses[cle] = { score: null, note: note };
      } else {
        ETAT.reponses[cle] = { score: nouvelleValeur, note: note };
      }
      sauvegarder();
      majCarte(cle);
      return;
    }

    if (action === "voir-recommandation") {
      var r = document.querySelector('[data-recommandation="' + cible.getAttribute("data-cle") + '"]');
      if (r) { r.classList.toggle("masque"); }
      return;
    }
    if (action === "ajouter-note") {
      var n = document.querySelector('[data-note="' + cible.getAttribute("data-cle") + '"]');
      if (n) { n.classList.toggle("masque"); if (!n.classList.contains("masque")) { n.focus(); } }
      return;
    }
    if (action === "export-md") {
      var md = REPORT.genererMarkdown(ITEMS, ETAT);
      telechargerOuCopier(md, "rapport-maturitylens.md", "text/markdown");
      return;
    }
    if (action === "export-json") {
      var json = JSON.stringify(REPORT.exporterJSON(ETAT), null, 2);
      telechargerOuCopier(json, "session-maturitylens.json", "application/json");
      return;
    }
    if (action === "imprimer") { window.print(); return; }
  });

  document.addEventListener("change", function (ev) {
    if (ev.target.matches("[data-champ]")) {
      var champNom = ev.target.getAttribute("data-champ");
      if (champNom === "cible") {
        ETAT.cible = parseInt(ev.target.value, 10);
      } else {
        ETAT.organisation[champNom] = ev.target.value;
      }
      sauvegarder();
      if (champNom === "cible") { rendre(); }
      return;
    }
    if (ev.target.id === "fichier-import") {
      lireFichier(ev.target.files[0], traiterImport);
      ev.target.value = "";
    }
  });

  document.addEventListener("input", function (ev) {
    if (ev.target.matches("[data-note]")) {
      var cle = ev.target.getAttribute("data-note");
      var rep = ETAT.reponses[cle] || { score: null };
      rep.note = ev.target.value.slice(0, REPORT.NOTE_MAX);
      ETAT.reponses[cle] = rep;
      sauvegarder();
    }
  });

  charger();
  rendre();
})();
