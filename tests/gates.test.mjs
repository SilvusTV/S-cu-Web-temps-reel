import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../scripts/security-gate.mjs';
test('Chaque famille : vert à zéro, rouge sur finding et sur scanner en erreur', () => {
  const fixtures = [
    ['sarif', {version:'2.1.0',runs:[{results:[]}]}, {version:'2.1.0',runs:[{results:[{level:'error'}]}]}],
    ['npm', {metadata:{vulnerabilities:{high:0,critical:0}},vulnerabilities:{}}, {metadata:{vulnerabilities:{high:1,critical:0}},vulnerabilities:{}}],
    ['osv', {results:[]}, {results:[{packages:[{vulnerabilities:[{id:'TEST'}]}]}]}],
    ['trivy', {SchemaVersion:2,Results:[]}, {SchemaVersion:2,Results:[{Vulnerabilities:[{Severity:'HIGH'}]}]}],
    ['zap', {site:[{alerts:[]}]}, {site:[{alerts:[{riskcode:'2'}]}]}],
  ];
  for (const [kind, green, red] of fixtures) {
    assert.equal(evaluate(kind,green).blocking,0);
    assert.throws(()=>evaluate(kind,red), /dépassent/);
    assert.throws(()=>evaluate(kind,green,42), /échoué/);
    assert.throws(()=>evaluate(kind,{}));
  }
});
test('Seuil SAST warning, faible risque ZAP toléré, CSP bloquante',()=>{
  assert.throws(()=>evaluate('sarif',{version:'2.1.0',runs:[{results:[{level:'warning'}]}]}));
  assert.equal(evaluate('zap',{site:[{alerts:[{riskcode:'1',pluginid:'10096'}]}]},2).blocking,0);
  assert.throws(()=>evaluate('zap',{site:[{alerts:[{riskcode:'1',pluginid:'10038'}]}]},2));
});


test('Une panne OSV ne devient jamais un scan vert', () => { assert.throws(() => evaluate('osv', { results: [] }, 1)); });
