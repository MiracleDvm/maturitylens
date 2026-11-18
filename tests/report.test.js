"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var REFERENTIEL = require("../js/referentiel.js");
var REPORT = require("../js/report.js");

var ITEMS = REFERENTIEL.items;
var CLES = ITEMS.map(function (it) { return it.cle; });

function etatExemple() {
  return {
    organisation: { nom: "Association Exemple", secteur: "ONG", taille: "18", evaluateur: "Jean", date: "2026-11-17" },
    cible: 3,
    reponses: {
      "A.5.17": { score: 1, note: "Aucune restauration testée" },
      "A.7.4": { score: "na", note: "" },
      "CL-4.1": { score: 4, note: "" }
    },
    preuves: {}
  };
}

test("l'export JSON puis réimport restaure exactement la session", function () {
  var etat = etatExemple();
  var exporte = REPORT.exporterJSON(etat);
  assert.equal(exporte.format, "maturitylens");
  assert.equal(exporte.version, 1);

  var resultat = REPORT.importerSession(JSON.stringify(exporte), CLES);
  assert.equal(resultat.ok, true);
  assert.deepEqual(resultat.etat.reponses, etat.reponses);
  assert.deepEqual(resultat.etat.organisation, etat.organisation);
  assert.equal(resultat.etat.cible, 3);
});

test("l'import ignore les clés inconnues et tronque les notes à 2000 caractères", function () {
  var brut = {
    format: "maturitylens",
    version: 1,
    cible: 3,
    organisation: {},
    reponses: {
      "CLE-INCONNUE": { score: 5, note: "" },
      "A.5.17": { score: 2, note: "x".repeat(3000) }
    }
  };
  var resultat = REPORT.importerSession(JSON.stringify(brut), CLES);
  assert.equal(resultat.ok, true);
  assert.equal(resultat.etat.reponses["CLE-INCONNUE"], undefined);
  assert.equal(resultat.etat.reponses["A.5.17"].note.length, 2000);
});

test("un fichier non JSON ou de format inconnu renvoie une erreur claire", function () {
  var r1 = REPORT.importerSession("ceci n'est pas du json", CLES);
  assert.equal(r1.ok, false);
  assert.ok(r1.erreur);

  var r2 = REPORT.importerSession(JSON.stringify({ format: "autre-outil" }), CLES);
  assert.equal(r2.ok, false);
  assert.ok(r2.erreur);
});

test("un import de plus de 2 Mo est rejeté", function () {
  var gros = JSON.stringify({ format: "maturitylens", version: 1, reponses: {} }) + "x".repeat(3 * 1024 * 1024);
  var r = REPORT.importerSession(gros, CLES);
  assert.equal(r.ok, false);
});

test("l'import de constats scanner rattache les contrôles connus et accepte les alias", function () {
  var brut = {
    tool: "iso-audit",
    findings: [
      { check_id: "SEC-001", titre: "Mot de passe en clair dans config.php", severite: "HIGH", controle: "A.5.17" },
      { check_id: "SEC-002", title: "CVE non corrigée", severity: "MEDIUM", control: "8.9" },
      { check_id: "SEC-003", titre: "Chiffrement absent", severite: "HIGH", controle: "A8.24" },
      { check_id: "SEC-004", titre: "Correctif manquant", severite: "HIGH", controle: "A.8.8" },
      { check_id: "SEC-005", titre: "Référence invalide", severite: "LOW", controle: "N/A" }
    ]
  };
  var r = REPORT.importerConstats(JSON.stringify(brut), CLES);
  assert.equal(r.ok, true);
  assert.equal(Object.keys(r.preuves).length, 4);
  assert.ok(r.preuves["A.5.17"]);
  assert.ok(r.preuves["A.8.9"]);
  assert.ok(r.preuves["A.8.24"]);
  assert.ok(r.preuves["A.8.8"]);
  assert.equal(r.ignores, 1);
});

test("le constats alias accepte aussi la clé constats au lieu de findings", function () {
  var brut = { tool: "iso-audit", constats: [{ titre: "x", severite: "LOW", controle: "5.1" }] };
  var r = REPORT.importerConstats(JSON.stringify(brut), CLES);
  assert.equal(r.ok, true);
  assert.ok(r.preuves["A.5.1"]);
});

test("le rapport Markdown contient les six sections attendues et l'avertissement", function () {
  var md = REPORT.genererMarkdown(ITEMS, etatExemple());
  ["## Synthèse", "## Domaines", "## Écarts prioritaires", "## Plan d'action", "## Détail des réponses", REPORT.AVERTISSEMENT]
    .forEach(function (section) {
      assert.ok(md.indexOf(section) !== -1, "section manquante : " + section);
    });
});
