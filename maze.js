'use strict';
const COLS = 39, ROWS = 23, CELL = 30, TOTAL = COLS * ROWS;
const $ = id => document.getElementById(id);
const canvas = $('myCanvas'), ctx = canvas.getContext('2d');
const colors = {wall:'#343a40', empty:'#8c969c', grid:'#79848b', visited:'#405e4a', path:'#4caf50', start:'#00ff00', finish:'#d48c5f', background:'#171a18', text:'#dfe5df', muted:'#98a49b'};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let animationFrame = null, pathAnimationStart = 0, currentCell = null;
const revealedAt = new Map();
let walls = new Set(), start = COLS + 1, finish = TOTAL - COLS - 2;
let tool = 'wall', search = null, running = false, timer = null, path = [], explored = new Set(), elapsed = 0, drawing = false, lastCell = null, cursor = start;
const descriptions = {
  dijkstra: ['Expands the lowest-cost route first.', 'All steps cost the same here, so Dijkstra finds the same shortest distance as breadth-first search.'],
  greedy: ['Heads toward the finish using distance alone.', 'Greedy best-first search prioritizes cells closest to the finish. It finds a route, but does not guarantee the shortest one.'],
  bidirectional: ['Searches from both endpoints.', 'Two breadth-first searches expand in alternating layers until they meet, then join their routes into a shortest path.'],
  astar: ['Uses distance to the finish to guide the search. Finds the shortest path.', 'A* balances the journey so far with the distance still to go. The green cells show where it looked. The line shows the shortest way home.'],
  bfs: ['Explores one layer at a time. Finds the shortest path on this grid.', 'Breadth-first search spreads out from the start, one layer at a time. It visits every nearer cell before moving farther away, so its first route to the finish is a shortest path.'],
  dfs: ['Follows each branch before turning back. The route may be longer.', 'Depth-first search follows a branch as far as it can, then backtracks. It finds a way through, but that route may be longer than the shortest path.']
};
function neighbors(id) { const x=id%COLS,y=Math.floor(id/COLS); return [x<COLS-1?id+1:-1,y<ROWS-1?id+COLS:-1,x>0?id-1:-1,y>0?id-COLS:-1].filter(n=>n>=0&&!walls.has(n)); }
function distance(a,b) {return Math.abs(a%COLS-b%COLS)+Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS));}
function draw() {
  const now = performance.now();
  const animate = !reducedMotion.matches && Number($('speed').value) < 5;
  let settling = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.empty;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let id = 0; id < TOTAL; id++) {
    const x = id % COLS * CELL, y = Math.floor(id / COLS) * CELL;
    ctx.fillStyle = walls.has(id) ? colors.wall : colors.empty;
    ctx.fillRect(x, y, CELL, CELL);
    if (walls.has(id)) continue;
    if (explored.has(id)) {
      const age = now - (revealedAt.get(id) ?? 0);
      const progress = animate ? Math.min(1, age / 240) : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      const size = CELL * (0.25 + 0.75 * eased);
      const inset = (CELL - size) / 2;
      ctx.fillStyle = colors.visited;
      ctx.fillRect(x + inset, y + inset, size, size);
      if (progress < 1) {
        settling = true;
        ctx.fillStyle = `rgba(76, 175, 80, ${(1 - progress) * 0.45})`;
        ctx.fillRect(x + inset, y + inset, size, size);
      }
    }
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 0.4, y + 0.4, CELL - 0.8, CELL - 0.8);
  }
  // A fading trail marks the most recent search steps without hiding the grid.
  if (animate && !path.length) {
    ctx.save();
    for (const [id, time] of revealedAt) {
      const life = Math.max(0, 1 - (now - time) / 420);
      if (!life) continue;
      settling = true;
      ctx.fillStyle = `rgba(112, 235, 121, ${life * 0.65})`;
      ctx.beginPath();
      ctx.arc(id % COLS * CELL + 15, Math.floor(id / COLS) * CELL + 15, 3 * life + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (path.length) {
    const duration = Math.min(1800, Math.max(600, path.length * 9));
    const progress = animate ? Math.min(1, (now - pathAnimationStart) / duration) : 1;
    const distanceAlong = (path.length - 1) * progress;
    const whole = Math.floor(distanceAlong);
    const point = id => [id % COLS * CELL + 15, Math.floor(id / COLS) * CELL + 15];
    const origin = point(path[0]);
    ctx.beginPath();
    ctx.moveTo(...origin);
    for (let i = 1; i <= whole; i++) ctx.lineTo(...point(path[i]));
    let tip = point(path[whole]);
    if (whole < path.length - 1) {
      const next = point(path[whole + 1]), fraction = distanceAlong - whole;
      tip = [tip[0] + (next[0] - tip[0]) * fraction, tip[1] + (next[1] - tip[1]) * fraction];
      ctx.lineTo(...tip);
    }
    ctx.save();
    ctx.strokeStyle = colors.path;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = colors.path;
    ctx.shadowBlur = 12;
    ctx.stroke();
    if (progress < 1) {
      settling = true;
      ctx.fillStyle = '#a1ffab';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(...tip, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (running && currentCell !== null && animate) {
    ctx.save();
    ctx.fillStyle = '#a1ffab';
    ctx.shadowColor = colors.path;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(currentCell % COLS * CELL + 15, Math.floor(currentCell / COLS) * CELL + 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const [id, color, label] of [[start, colors.start, 'S'], [finish, colors.finish, 'F']]) {
    const x = id % COLS * CELL + 15, y = Math.floor(id / COLS) * CELL + 15;
    ctx.fillStyle = colors.background;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
  }
  if (document.activeElement === canvas) {
    ctx.strokeStyle = colors.path;
    ctx.lineWidth = 2;
    ctx.strokeRect(cursor % COLS * CELL + 2, Math.floor(cursor / COLS) * CELL + 2, CELL - 4, CELL - 4);
  }
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  if (animate && (running || settling)) animationFrame = requestAnimationFrame(draw);
}
function status(title,detail){$('outcome').textContent=title;$('status-detail').textContent=detail;}
function metrics(){ $('visited-count').innerHTML=`${explored.size} <small>/ ${TOTAL}</small>`;$('path-count').innerHTML=`${path.length?path.length-1:'—'} <small>steps</small>`;$('time-count').innerHTML=`${search?elapsed.toFixed(1):'—'} <small>ms</small>`; }
function pause(){running=false;clearTimeout(timer);$('solve').innerHTML='<span>▶</span> '+(search&&!search.done?'Resume':'Find path');}
function clearPath(){pause();search=null;path=[];explored.clear();revealedAt.clear();currentCell=null;pathAnimationStart=0;elapsed=0;status('Ready','');metrics();draw();}
function initialize() {
  search = {
    open: [start], g: new Map([[start, 0]]), parent: new Map(),
    seen: new Set([start]), done: false, algorithm: $('algorithm').value,
    reverseOpen: [finish], reverseParent: new Map(), reverseSeen: new Set([finish]),
    reverse: false, layerRemaining: 1,
  };
  elapsed = 0; path = []; explored.clear(); revealedAt.clear(); currentCell = null;
}
function visit(current) {
  explored.add(current);
  currentCell = current;
  revealedAt.set(current, performance.now());
}
function finishSearch(meeting = finish) {
  let node = meeting;
  path = [node];
  while (node !== start) {
    node = search.parent.get(node);
    path.push(node);
  }
  path.reverse();
  if (search.algorithm === 'bidirectional') {
    node = meeting;
    while (node !== finish) {
      node = search.reverseParent.get(node);
      path.push(node);
    }
  }
  pathAnimationStart = performance.now();
  search.done = true;
  pause();
  const shortest = !['dfs', 'greedy'].includes(search.algorithm);
  status('Path found', shortest ? 'Shortest path found.' : 'Path found. Try A* to find the shortest route.');
}
function noPath() {
  search.done = true;
  pause();
  status('No path found', 'Try erasing a wall or moving an endpoint.');
}
function bidirectionalStep() {
  if (!search.open.length || !search.reverseOpen.length) { noPath(); return; }
  const open = search.reverse ? search.reverseOpen : search.open;
  const seen = search.reverse ? search.reverseSeen : search.seen;
  const otherSeen = search.reverse ? search.seen : search.reverseSeen;
  const parent = search.reverse ? search.reverseParent : search.parent;
  const current = open.shift();
  visit(current);
  if (otherSeen.has(current)) { finishSearch(current); return; }
  for (const next of neighbors(current)) {
    if (seen.has(next)) continue;
    seen.add(next);
    parent.set(next, current);
    open.push(next);
    if (otherSeen.has(next)) { finishSearch(next); return; }
  }
  // Finish the entire depth layer before switching ends to preserve shortest paths.
  if (--search.layerRemaining === 0) {
    search.reverse = !search.reverse;
    search.layerRemaining = (search.reverse ? search.reverseOpen : search.open).length;
  }
}
function step() {
  if (!search) initialize();
  if (search.done) return;
  const before = performance.now();
  if (search.algorithm === 'bidirectional') {
    bidirectionalStep();
  } else if (!search.open.length) {
    noPath();
  } else {
    let current;
    if (['astar', 'dijkstra', 'greedy'].includes(search.algorithm)) {
      const priority = id => search.algorithm === 'greedy' ? distance(id, finish)
        : search.g.get(id) + (search.algorithm === 'astar' ? distance(id, finish) : 0);
      let best = 0;
      for (let i = 1; i < search.open.length; i++) {
        if (priority(search.open[i]) < priority(search.open[best])) best = i;
      }
      current = search.open.splice(best, 1)[0];
    } else {
      current = search.algorithm === 'dfs' ? search.open.pop() : search.open.shift();
    }
    visit(current);
    if (current === finish) {
      finishSearch();
    } else {
      for (const next of neighbors(current)) {
        const cost = search.g.get(current) + 1;
        const relax = ['astar', 'dijkstra'].includes(search.algorithm) && cost < search.g.get(next);
        if (!search.seen.has(next) || relax) {
          search.g.set(next, cost);
          search.parent.set(next, current);
          if (!search.seen.has(next)) { search.seen.add(next); search.open.push(next); }
        }
      }
    }
  }
  elapsed += performance.now() - before;
}
function tick(){if(!running)return;const speed=Number($('speed').value),count=[0,1,3,8,20,TOTAL][speed];for(let i=0;i<count&&!search?.done;i++)step();metrics();draw();if(running)timer=setTimeout(tick,[0,110,65,28,16,0][speed]);}
function solve(){if(running){pause();status('Search paused','Take a step, or resume when you are ready.');return;}if(search?.done)clearPath();if(!search)initialize();running=true;$('solve').innerHTML='<span>Ⅱ</span> Pause';status('Searching…','Exploring the maze, one cell at a time.');tick();}
function generate(){
  clearPath();walls.clear();start=COLS+1;finish=TOTAL-COLS-2;const preset=$('preset').value;
  if(preset==='corridors'){
    for(let i=0;i<TOTAL;i++)walls.add(i);
    const stack=[start],visited=new Set([start]);walls.delete(start);
    while(stack.length){const id=stack[stack.length-1],x=id%COLS,y=Math.floor(id/COLS);const choices=[[2,0],[0,2],[-2,0],[0,-2]].map(([dx,dy])=>[x+dx,y+dy]).filter(([nx,ny])=>nx>0&&ny>0&&nx<COLS-1&&ny<ROWS-1&&!visited.has(ny*COLS+nx));if(!choices.length){stack.pop();continue;}const [nx,ny]=choices[Math.floor(Math.random()*choices.length)],next=ny*COLS+nx;walls.delete(next);walls.delete((id+next)/2);visited.add(next);stack.push(next);}
    // Open a few connections so different search strategies have routes to choose from.
    for(let i=0;i<55;i++){const x=2+Math.floor(Math.random()*(COLS-4)),y=2+Math.floor(Math.random()*(ROWS-4)),id=y*COLS+x;if(walls.has(id)&&((!walls.has(id-1)&&!walls.has(id+1))||(!walls.has(id-COLS)&&!walls.has(id+COLS))))walls.delete(id);}
  }else if(preset==='scatter'){for(let i=0;i<TOTAL;i++)if(Math.random()<.26)walls.add(i);let id=start;while(id!==finish){walls.delete(id);id=id%COLS<finish%COLS&&(Math.random()<.6||Math.floor(id/COLS)===Math.floor(finish/COLS))?id+1:id+COLS;} }
  walls.delete(start);walls.delete(finish);$('maze-name').textContent=$('preset').selectedOptions[0].textContent;draw();
}
function selectTool(value){tool=value;document.querySelectorAll('[data-tool]').forEach(button=>{const active=button.dataset.tool===tool;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}
function edit(id){if(id===lastCell)return;lastCell=id;clearPath();if(tool==='start'&&id!==finish){start=id;walls.delete(id);}else if(tool==='finish'&&id!==start){finish=id;walls.delete(id);}else if(id!==start&&id!==finish){if(tool==='wall')walls.add(id);if(tool==='erase')walls.delete(id);}$('maze-name').textContent='Custom maze';draw();}
function eventCell(event){const rect=canvas.getBoundingClientRect();const x=Math.min(COLS-1,Math.max(0,Math.floor((event.clientX-rect.left)/rect.width*COLS))),y=Math.min(ROWS-1,Math.max(0,Math.floor((event.clientY-rect.top)/rect.height*ROWS)));return y*COLS+x;}
canvas.addEventListener('pointerdown',e=>{drawing=true;lastCell=null;canvas.setPointerCapture(e.pointerId);cursor=eventCell(e);edit(cursor);});
canvas.addEventListener('pointermove',e=>{if(drawing){const target=eventCell(e);let x=cursor%COLS,y=Math.floor(cursor/COLS);const tx=target%COLS,ty=Math.floor(target/COLS);while(x!==tx||y!==ty){if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);edit(y*COLS+x);}cursor=target;}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drawing=false;lastCell=null;});
canvas.addEventListener('focus',draw);canvas.addEventListener('blur',draw);
canvas.addEventListener('keydown',e=>{const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-COLS,ArrowDown:COLS};if(e.key in offsets){e.preventDefault();const next=cursor+offsets[e.key];if(next>=0&&next<TOTAL&&distance(cursor,next)===1)cursor=next;draw();}if(e.key==='Enter'){e.preventDefault();lastCell=null;edit(cursor);}});
$('solve').addEventListener('click',solve);$('clear').addEventListener('click',clearPath);$('generate').addEventListener('click',generate);$('preset').addEventListener('change',generate);
$('step').addEventListener('click',()=>{pause();if(search?.done)clearPath();step();if(!search.done)status('One step closer','Search paused. Step again or resume.');metrics();draw();});
$('algorithm').addEventListener('change',()=>{clearPath();const copy=descriptions[$('algorithm').value];$('algorithm-description').textContent=copy[0];$('explanation').textContent=copy[1];});
$('speed').addEventListener('input',()=>{$('speed-value').textContent=['','Slow','Steady','Medium','Fast','Instant'][$('speed').value];});
document.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>selectTool(button.dataset.tool)));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();solve();}const shortcuts={w:'wall',e:'erase',s:'start',f:'finish'};if(shortcuts[e.key.toLowerCase()])selectTool(shortcuts[e.key.toLowerCase()]);});
$('export').addEventListener('click',()=>{pathAnimationStart=-10000;draw();const output=document.createElement('canvas');output.width=canvas.width+80;output.height=canvas.height+140;const c=output.getContext('2d');c.fillStyle=colors.background;c.fillRect(0,0,output.width,output.height);c.fillStyle=colors.text;c.font='500 24px sans-serif';c.fillText('Maze Studio',40,45);c.drawImage(canvas,40,70);c.fillStyle=colors.muted;c.font='14px sans-serif';c.fillText(`${$('algorithm').selectedOptions[0].textContent} · ${explored.size} cells explored${path.length?' · '+(path.length-1)+' steps':''}`,40,output.height-25);const link=document.createElement('a');link.download='maze-studio.png';link.href=output.toDataURL('image/png');link.click();});
if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('speed').value=5;$('speed-value').textContent='Instant';}
generate();

// Size the actual canvas bounds to the grid so pointer coordinates stay exact.
if (typeof ResizeObserver !== 'undefined') {
  const board = canvas.parentElement;
  new ResizeObserver(() => {
    const style = getComputedStyle(board);
    const width = board.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.max(0, Math.min(width / COLS, height / ROWS));
    canvas.style.width = `${COLS * scale}px`;
    canvas.style.height = `${ROWS * scale}px`;
  }).observe(board);
}
