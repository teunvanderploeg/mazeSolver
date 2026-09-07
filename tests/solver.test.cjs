const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

// Keep the solver exercised without requiring a browser or third-party packages.
function app() {
  const elements = new Map();
  const noop = () => {};
  const context = new Proxy({}, { get: () => noop, set: () => true });
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: id === 'algorithm' ? 'astar' : id === 'preset' ? 'corridors' : '5',
      selectedOptions: [{ textContent: 'Winding corridors' }],
      getContext: () => context, addEventListener: noop,
      width: 1170, height: 690, textContent: '', innerHTML: '',
    });
    return elements.get(id);
  };
  const sandbox = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [], addEventListener: noop },
    matchMedia: () => ({ matches: false }), performance, setTimeout, clearTimeout,
  });
  vm.runInContext(fs.readFileSync(require.resolve('../maze.js'), 'utf8'), sandbox);
  return code => vm.runInContext(code, sandbox);
}

test('Shortest-path algorithms find the Manhattan shortest route on an empty grid', () => {
  const run = app();
  for (const algorithm of ['astar', 'bfs', 'dijkstra', 'bidirectional']) {
    assert.equal(run(`$('preset').value='blank'; generate(); $('algorithm').value='${algorithm}'; initialize(); while(!search.done) step(); path.length-1;`), 56);
  }
});

test('generated mazes are solvable, routes are valid, and shortest-path algorithms match breadth-first', () => {
  const run = app();
  for (let sample = 0; sample < 30; sample++) {
    run(`$('preset').value='${sample % 2 ? 'scatter' : 'corridors'}'; generate();`);
    const lengths = [];
    for (const algorithm of ['astar', 'bfs', 'dijkstra', 'bidirectional', 'dfs', 'greedy']) {
      lengths.push(run(`$('algorithm').value='${algorithm}'; clearPath(); initialize(); let budget${sample}${algorithm}=TOTAL+2; while(!search.done && budget${sample}${algorithm}-->0)step(); path.length-1;`));
      assert.ok(lengths.at(-1) > 0);
      assert.ok(run('path[0]===start && path.at(-1)===finish && path.every((n,i)=>!walls.has(n) && (!i || distance(n,path[i-1])===1))'));
    }
    for (const length of lengths.slice(1, 4)) assert.equal(lengths[0], length);
  }
});

test('blocked endpoints terminate and clear resets search state', () => {
  const run = app();
  run(`$('preset').value='blank'; generate(); for(const n of neighbors(start))walls.add(n); initialize(); while(!search.done)step();`);
  assert.equal(run('path.length'), 0);
  assert.equal(run("$('outcome').textContent"), 'No path found');
  run('clearPath()');
  assert.ok(run('search===null && explored.size===0 && path.length===0 && !running'));
});

for (const algorithm of ['astar', 'bfs', 'dijkstra', 'bidirectional', 'dfs', 'greedy']) {
  test(`${algorithm} handles moved, adjacent, and disconnected endpoints`, () => {
    const run = app();
    run(`$('algorithm').value='${algorithm}'; $('preset').value='blank'; generate(); start=400; finish=401; initialize(); while(!search.done)step();`);
    assert.equal(run('path.length-1'), 1);
    run('clearPath(); start=100; finish=700; initialize(); while(!search.done)step();');
    assert.equal(run('path[0]'), 100);
    assert.equal(run('path.at(-1)'), 700);
    run('clearPath(); for(let x=0;x<COLS;x++)walls.add(10*COLS+x); initialize();');
    assert.ok(run('let budget=TOTAL*2; while(!search.done && budget-->0)step(); search.done && path.length===0;'));
  });
}
