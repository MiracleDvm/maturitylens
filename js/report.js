(function () {
  "use strict";

  var SCORING = (typeof module !== "undefined" && module.exports) ? require("./scoring.js") : window.SCORING;

  var FORMAT = "maturitylens";
  var VERSION = 1;
  var TAILLE_MAX_IMPORT = 2 * 1024 * 1024;
  var NOTE_MAX = 2000;
  var AVERTISSEMENT = "Auto-évaluation indicative : ce diagnostic ne constitue ni une certification ni une attestation de conformité ISO/IEC 27001.";

  var NIVEAUX = ["Inexistant", "Initial", "Reproductible", "Défini", "Géré", "Optimisé"];

  function arrondi1(n) {
    return Math.round(n * 10) / 10;
  }

  function ligneMoyenne(libelle, m) {
    if (m.compte === 0) {
      return "- " + libelle + " : non évalué";
    }
    return "- " + libelle + " : " + arrondi1(m.moyenne) + "/5 (" + m.pourcentage + "%, " + NIVEAUX[m.niveau] + ")";
  }

  function genererMarkdown(items, etat) {
    var reponses = etat.reponses || {};
    var cible = etat.cible || 3;
    var org = etat.organisation || {};
    var global = SCORING.maturiteGlobale(items, reponses);
    var clauses = SCORING.maturiteParSection(items, reponses, "CL");
    var annexeA = SCORING.moyenne(items.filter(function (it) { return it.section !== "CL"; }), reponses);
    var ecarts = SCORING.ecartsEtPriorites(items, reponses, cible);
    var planAction = SCORING.plan(ecarts);
    var pret = SCORING.pretPourCertification(items, reponses, cible);

    var lignes = [];
    lignes.push("# Rapport de maturité ISO/IEC 27001:2022 : " + (org.nom || "Organisation"));
    lignes.push("");
    lignes.push("*" + AVERTISSEMENT + "*");
    lignes.push("");
    lignes.push("## Synthèse");
    lignes.push("");
    lignes.push("- Organisation : " + (org.nom || "non renseignée") + " (" + (org.secteur || "non renseigné") + ", " + (org.taille || "non renseigné") + ")");
    lignes.push("- Évaluateur : " + (org.evaluateur || "non renseigné") + ". Date : " + (org.date || "non renseignée"));
    lignes.push("- Niveau cible : " + cible + " (" + NIVEAUX[cible] + ")");
    lignes.push(ligneMoyenne("Maturité globale", global));
    lignes.push("- Préparation à la certification : " + (pret ? "oui" : "non"));
    lignes.push("- Nombre d'écarts identifiés : " + ecarts.length);
    lignes.push("");
    lignes.push("## Domaines");
    lignes.push("");
    lignes.push(ligneMoyenne("Clauses 4-10 (exigences du SMSI)", clauses));
    lignes.push(ligneMoyenne("Annexe A (mesures de sécurité)", annexeA));
    ["A5", "A6", "A7", "A8"].forEach(function (section) {
      var m = SCORING.maturiteParSection(items, reponses, section);
      lignes.push(ligneMoyenne(section, m));
    });
    lignes.push("");
    lignes.push("## Écarts prioritaires");
    lignes.push("");
    if (ecarts.length === 0) {
      lignes.push("Aucun écart sous la cible n'a été identifié.");
    } else {
      ecarts.slice(0, 10).forEach(function (e, i) {
        lignes.push((i + 1) + ". **" + e.cle + "** " + e.titre + " (score " + e.score + "/5, priorité " + e.priorite + ", horizon " + e.horizon + " mois)");
      });
    }
    lignes.push("");
    lignes.push("## Plan d'action");
    lignes.push("");
    ["0-3", "3-6", "6-12"].forEach(function (h) {
      lignes.push("### Horizon " + h + " mois");
      lignes.push("");
      if (planAction[h].length === 0) {
        lignes.push("Aucune action.");
      } else {
        planAction[h].forEach(function (e) {
          lignes.push("- " + e.cle + " : " + e.recommandation);
        });
      }
      lignes.push("");
    });
    lignes.push("## Détail des réponses");
    lignes.push("");
    items.forEach(function (it) {
      var rep = reponses[it.cle];
      var valeur = rep ? (rep.score === "na" ? "N/A" : (rep.score === null || rep.score === undefined ? "sans réponse" : rep.score + "/5")) : "sans réponse";
      lignes.push("- " + it.cle + " " + it.titre + " : " + valeur + (rep && rep.note ? " (" + rep.note + ")" : ""));
    });
    lignes.push("");
    lignes.push("---");
    lignes.push(AVERTISSEMENT);
    return lignes.join("\n");
  }

  function exporterJSON(etat) {
    return {
      format: FORMAT,
      version: VERSION,
      exporteLe: new Date().toISOString(),
      organisation: etat.organisation || {},
      cible: etat.cible || 3,
      reponses: etat.reponses || {},
      preuves: etat.preuves || {}
    };
  }

  function tronquerNote(note) {
    if (typeof note !== "string") {
      return "";
    }
    return note.slice(0, NOTE_MAX);
  }

  function importerSession(brut, clesConnues) {
    var erreur = null;
    var donnees;
    if (typeof brut === "string" && brut.length > TAILLE_MAX_IMPORT) {
      return { ok: false, erreur: "Fichier trop volumineux (2 Mo maximum)." };
    }
    try {
      donnees = typeof brut === "string" ? JSON.parse(brut) : brut;
    } catch (e) {
      return { ok: false, erreur: "Fichier JSON invalide." };
    }
    if (!donnees || donnees.format !== FORMAT) {
      return { ok: false, erreur: "Format non reconnu (attendu : " + FORMAT + ")." };
    }
    var reponses = {};
    if (donnees.reponses) {
      Object.keys(donnees.reponses).forEach(function (cle) {
        if (clesConnues && clesConnues.indexOf(cle) === -1) {
          return;
        }
        var rep = donnees.reponses[cle] || {};
        var score = rep.score;
        if (score !== "na" && score !== null && typeof score !== "number") {
          score = null;
        }
        reponses[cle] = { score: score, note: tronquerNote(rep.note) };
      });
    }
    return {
      ok: true,
      erreur: erreur,
      etat: {
        organisation: donnees.organisation || {},
        cible: typeof donnees.cible === "number" ? donnees.cible : 3,
        reponses: reponses,
        preuves: donnees.preuves || {}
      }
    };
  }

  function normaliserControle(ref) {
    if (typeof ref !== "string") {
      return null;
    }
    var m = ref.trim().match(/^A?\.?(\d+)\.(\d+)$/i);
    if (!m) {
      return null;
    }
    return "A." + m[1] + "." + m[2];
  }

  function importerConstats(brut, clesConnues) {
    var donnees;
    try {
      donnees = typeof brut === "string" ? JSON.parse(brut) : brut;
    } catch (e) {
      return { ok: false, erreur: "Fichier JSON invalide." };
    }
    var liste = donnees.findings || donnees.constats;
    if (!Array.isArray(liste)) {
      return { ok: false, erreur: "Aucun constat trouvé (clé findings/constats attendue)." };
    }
    var preuves = {};
    var ignores = 0;
    liste.forEach(function (c) {
      var controleBrut = c.controle || c.control;
      var controle = normaliserControle(controleBrut);
      if (!controle || (clesConnues && clesConnues.indexOf(controle) === -1)) {
        ignores += 1;
        return;
      }
      if (!preuves[controle]) {
        preuves[controle] = [];
      }
      preuves[controle].push({
        severite: c.severite || c.severity || "INFO",
        titre: c.titre || c.title || "",
        source: donnees.tool || "scanner"
      });
    });
    return { ok: true, preuves: preuves, ignores: ignores };
  }

  var REPORT = {
    FORMAT: FORMAT,
    VERSION: VERSION,
    AVERTISSEMENT: AVERTISSEMENT,
    TAILLE_MAX_IMPORT: TAILLE_MAX_IMPORT,
    NOTE_MAX: NOTE_MAX,
    genererMarkdown: genererMarkdown,
    exporterJSON: exporterJSON,
    importerSession: importerSession,
    importerConstats: importerConstats,
    normaliserControle: normaliserControle
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = REPORT;
  } else {
    window.REPORT = REPORT;
  }
})();
