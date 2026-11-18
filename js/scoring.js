(function () {
  "use strict";

  var NB_CLAUSES = 24;
  var NB_ITEMS = 117;

  function estNote(score) {
    return typeof score === "number" && score >= 0 && score <= 5;
  }

  function chapitreDe(item) {
    if (item.section === "CL") {
      return item.id.split(".")[0];
    }
    return item.section;
  }

  // moyenne d'un ensemble d'items : N/A et sans réponse exclus
  function moyenne(items, reponses) {
    var somme = 0;
    var compte = 0;
    items.forEach(function (it) {
      var rep = reponses[it.cle];
      if (rep && estNote(rep.score)) {
        somme += rep.score;
        compte += 1;
      }
    });
    if (compte === 0) {
      return { moyenne: null, pourcentage: null, niveau: null, compte: 0 };
    }
    var m = somme / compte;
    return {
      moyenne: m,
      pourcentage: Math.round((m / 5) * 100),
      niveau: Math.floor(m),
      compte: compte
    };
  }

  function ecartsEtPriorites(items, reponses, cible) {
    var liste = [];
    items.forEach(function (it) {
      var rep = reponses[it.cle];
      if (!rep || !estNote(rep.score)) {
        return;
      }
      if (rep.score >= cible) {
        return;
      }
      var ecart = cible - rep.score;
      var priorite = ecart * it.criticite;
      liste.push({
        cle: it.cle,
        titre: it.titre,
        section: it.section,
        score: rep.score,
        criticite: it.criticite,
        ecart: ecart,
        priorite: priorite,
        horizon: horizon(priorite, it.criticite, rep.score),
        recommandation: it.recommandation
      });
    });
    liste.sort(function (a, b) {
      if (b.priorite !== a.priorite) {
        return b.priorite - a.priorite;
      }
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0;
    });
    return liste;
  }

  function horizon(priorite, criticite, score) {
    if (priorite >= 6 || (criticite === 3 && score <= 1)) {
      return "0-3";
    }
    if (priorite >= 3) {
      return "3-6";
    }
    return "6-12";
  }

  function plan(ecarts) {
    var p = { "0-3": [], "3-6": [], "6-12": [] };
    ecarts.forEach(function (e) {
      p[e.horizon].push(e);
    });
    return p;
  }

  // vraie seulement si les 24 exigences de clauses sont toutes notées et >= cible
  function pretPourCertification(items, reponses, cible) {
    var clauses = items.filter(function (it) {
      return it.section === "CL";
    });
    if (clauses.length !== NB_CLAUSES) {
      return false;
    }
    return clauses.every(function (it) {
      var rep = reponses[it.cle];
      return rep && estNote(rep.score) && rep.score >= cible;
    });
  }

  function progression(items, reponses) {
    var compte = 0;
    items.forEach(function (it) {
      var rep = reponses[it.cle];
      if (rep && (estNote(rep.score) || rep.score === "na")) {
        compte += 1;
      }
    });
    return Math.round((compte / items.length) * 100);
  }

  // 11 axes : 7 chapitres de clauses (4 à 10) + 4 thèmes d'Annexe A (A5 à A8)
  function axesRadar(items, reponses) {
    var ordre = ["4", "5", "6", "7", "8", "9", "10", "A5", "A6", "A7", "A8"];
    var libelles = {
      "4": "Contexte", "5": "Leadership", "6": "Planification", "7": "Support",
      "8": "Fonctionnement", "9": "Évaluation", "10": "Amélioration",
      A5: "Organisationnel", A6: "Humain", A7: "Physique", A8: "Technologique"
    };
    var parChapitre = {};
    items.forEach(function (it) {
      var ch = chapitreDe(it);
      if (!parChapitre[ch]) {
        parChapitre[ch] = [];
      }
      parChapitre[ch].push(it);
    });
    return ordre.map(function (ch) {
      var m = moyenne(parChapitre[ch] || [], reponses);
      return {
        axe: ch,
        libelle: m.compte === 0 ? libelles[ch] + " (n.é.)" : libelles[ch],
        valeur: m.moyenne === null ? 0 : m.moyenne
      };
    });
  }

  function maturiteGlobale(items, reponses) {
    return moyenne(items, reponses);
  }

  function maturiteParSection(items, reponses, section) {
    return moyenne(items.filter(function (it) { return it.section === section; }), reponses);
  }

  var SCORING = {
    NB_CLAUSES: NB_CLAUSES,
    NB_ITEMS: NB_ITEMS,
    estNote: estNote,
    chapitreDe: chapitreDe,
    moyenne: moyenne,
    maturiteGlobale: maturiteGlobale,
    maturiteParSection: maturiteParSection,
    ecartsEtPriorites: ecartsEtPriorites,
    horizon: horizon,
    plan: plan,
    pretPourCertification: pretPourCertification,
    progression: progression,
    axesRadar: axesRadar
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SCORING;
  } else {
    window.SCORING = SCORING;
  }
})();
