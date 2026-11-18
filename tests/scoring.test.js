"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var REFERENTIEL = require("../js/referentiel.js");
var SCORING = require("../js/scoring.js");

var ITEMS = REFERENTIEL.items;

test("le référentiel compte 117 items dont 93 en Annexe A", function () {
  assert.equal(ITEMS.length, 117);
  var annexeA = ITEMS.filter(function (it) { return it.section !== "CL"; });
  assert.equal(annexeA.length, 93);
});

test("répartition par thème de l'Annexe A : 37/8/14/34", function () {
  var parSection = {};
  ITEMS.forEach(function (it) {
    parSection[it.section] = (parSection[it.section] || 0) + 1;
  });
  assert.equal(parSection.CL, 24);
  assert.equal(parSection.A5, 37);
  assert.equal(parSection.A6, 8);
  assert.equal(parSection.A7, 14);
  assert.equal(parSection.A8, 34);
});

test("toutes les clés du référentiel sont uniques", function () {
  var vues = {};
  ITEMS.forEach(function (it) {
    assert.equal(vues[it.cle], undefined, "clé dupliquée : " + it.cle);
    vues[it.cle] = true;
  });
});

test("un diagnostic vide donne une moyenne nulle et zéro écart", function () {
  var m = SCORING.maturiteGlobale(ITEMS, {});
  assert.equal(m.moyenne, null);
  assert.equal(m.compte, 0);
  var ecarts = SCORING.ecartsEtPriorites(ITEMS, {}, 3);
  assert.equal(ecarts.length, 0);
});

test("les réponses N/A et sans réponse sont exclues de la moyenne", function () {
  var reponses = {
    "A.7.1": { score: 4, note: "" },
    "A.7.2": { score: "na", note: "" },
    "A.7.3": { score: null, note: "" }
  };
  var sousEnsemble = ITEMS.filter(function (it) {
    return it.cle === "A.7.1" || it.cle === "A.7.2" || it.cle === "A.7.3";
  });
  var m = SCORING.moyenne(sousEnsemble, reponses);
  assert.equal(m.compte, 1);
  assert.equal(m.moyenne, 4);
});

test("les écarts sont triés par priorité décroissante puis score croissant puis clé", function () {
  var reponses = {
    "A.8.13": { score: 1, note: "" }, // criticité 3, écart 2 -> priorité 6
    "A.8.17": { score: 1, note: "" }, // criticité 1, écart 2 -> priorité 2
    "A.5.6": { score: 1, note: "" }   // criticité 1, écart 2 -> priorité 2
  };
  var ecarts = SCORING.ecartsEtPriorites(ITEMS, reponses, 3);
  assert.equal(ecarts[0].cle, "A.8.13");
  assert.equal(ecarts[1].cle, "A.5.6");
  assert.equal(ecarts[2].cle, "A.8.17");
});

test("l'horizon suit les seuils de priorité et de criticité", function () {
  assert.equal(SCORING.horizon(6, 3, 0), "0-3");
  assert.equal(SCORING.horizon(2, 3, 1), "0-3");
  assert.equal(SCORING.horizon(3, 1, 3), "3-6");
  assert.equal(SCORING.horizon(1, 1, 4), "6-12");
});

test("la préparation à la certification exige les 24 clauses notées >= cible", function () {
  var clauses = ITEMS.filter(function (it) { return it.section === "CL"; });
  var reponses = {};
  clauses.forEach(function (it) {
    reponses[it.cle] = { score: 3, note: "" };
  });
  assert.equal(SCORING.pretPourCertification(ITEMS, reponses, 3), true);

  reponses[clauses[0].cle] = { score: 2, note: "" };
  assert.equal(SCORING.pretPourCertification(ITEMS, reponses, 3), false);

  delete reponses[clauses[1].cle];
  assert.equal(SCORING.pretPourCertification(ITEMS, reponses, 3), false);
});

test("la progression compte les items notés et N/A sur 117", function () {
  var reponses = {
    "CL-4.1": { score: 3, note: "" },
    "CL-4.2": { score: "na", note: "" }
  };
  assert.equal(SCORING.progression(ITEMS, reponses), Math.round((2 / 117) * 100));
});

test("un axe radar sans réponse est à 0 et libellé (n.é.)", function () {
  var axes = SCORING.axesRadar(ITEMS, {});
  assert.equal(axes.length, 11);
  axes.forEach(function (axe) {
    assert.equal(axe.valeur, 0);
    assert.match(axe.libelle, /\(n\.é\.\)$/);
  });
});

test("un axe radar renseigné reflète la moyenne de son chapitre", function () {
  var reponses = { "CL-10.1": { score: 5, note: "" }, "CL-10.2": { score: 5, note: "" } };
  var axes = SCORING.axesRadar(ITEMS, reponses);
  var amelioration = axes.filter(function (a) { return a.axe === "10"; })[0];
  assert.equal(amelioration.valeur, 5);
  assert.equal(amelioration.libelle, "Amélioration");
});
