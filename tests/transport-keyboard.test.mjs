import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the application's actual keyboard registration with a minimal DOM/transport.
// This isolates routing decisions; browser checks separately exercise real audio.
const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const begin = source.indexOf('function isTransportInput(');
const end = source.indexOf('window.addEventListener("resize"', begin);
assert(begin >= 0 && end > begin);
function harness() {
  class HTMLInputElement {}
  class HTMLSelectElement {}
  class HTMLTextAreaElement {}
  class HTMLButtonElement { blur() { this.blurred = true; } }
  const handlers = {}, calls = [];
  const context = {
    HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement, HTMLButtonElement,
    window: { addEventListener: (type, callback) => { handlers[type] = callback; } },
    document: { activeElement: new HTMLButtonElement() },
    isPlaying: false, playButton: { disabled: false }, renderAbortController: null,
    play() { calls.push('play'); context.isPlaying = true; },
    stop(reset) { calls.push(['stop', reset]); context.isPlaying = false; }
  };
  vm.runInNewContext(source.slice(begin, end), context);
  function send(type = 'keydown', overrides = {}) {
    const event = { code: 'Space', repeat: false, target: context.document.activeElement,
      prevented: false, stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; }, ...overrides };
    handlers[type](event); return event;
  }
  return { context, calls, send };
}
test('one held Space gesture toggles once; release does not retrigger; next press stops from zero', () => {
  const h = harness();
  assert(h.send().prevented);
  for (let i = 0; i < 20; i++) assert(h.send('keydown', {repeat: true}).prevented);
  assert(h.send('keyup').prevented);
  assert.deepEqual(h.calls, ['play']);
  assert(h.context.document.activeElement.blurred);
  h.send(); assert.deepEqual(h.calls, ['play', ['stop', true]]);
});
test('disabled transport and active render block Space even if UI enablement changes', () => {
  for (const playing of [false, true]) {
    const h = harness(); h.context.isPlaying = playing;
    h.context.playButton.disabled = true; h.send();
    h.context.playButton.disabled = false; h.context.renderAbortController = {}; h.send();
    assert.deepEqual(h.calls, []);
    h.context.renderAbortController = null; h.send(); assert.equal(h.calls.length, 1);
  }
});
test('text, range, select and editable targets retain their native Space behavior', () => {
  const h = harness();
  for (const target of [new h.context.HTMLInputElement(), new h.context.HTMLSelectElement(),
    new h.context.HTMLTextAreaElement(), {isContentEditable:true}]) {
    for (const type of ['keydown','keyup']) assert.equal(h.send(type,{target}).prevented,false);
  }
  assert.deepEqual(h.calls, []);
});
test('unrelated keys are not consumed', () => {
  const h = harness();
  assert.equal(h.send('keydown',{code:'Enter'}).prevented,false);
  assert.equal(h.send('keyup',{code:'Enter'}).prevented,false);
  assert.deepEqual(h.calls,[]);
});
