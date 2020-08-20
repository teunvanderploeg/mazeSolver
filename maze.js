var canvas;
var ctx;
var output;

var WIDTH = 1000;
var HEIGHT = 600;

var tileW = 20;
var tileH = 20;

var tileRowCount = 20;
var tileColumnCount = 40;

var dragok = false;

var boundX = 0;
var boundY = 0;

var tiles = [];
for (var c = 0; c < tileColumnCount; c++) {
  tiles[c] = [];
  for (var r = 0; r < tileRowCount; r++) {
    tiles[c][r] = { x: c * (tileW + 3), y: r * (tileH + 3), state: "e" };
  }
}
tiles[0][0].state = "s";
tiles[tileColumnCount - 1][tileRowCount - 1].state = "f";

function rect(x, y, w, h, state) {
  //red red green green blue blue {color code #00 00 00}
  if (state === "s") {
    ctx.fillStyle = "#00FF00"; //green
  } else if (state === "f") {
    ctx.fillStyle = "#FF0000"; //red
  } else if (state === "e") {
    ctx.fillStyle = "#95a5a6"; //gray
  } else if (state === "w") {
    ctx.fillStyle = "#000000"; //black
  } else if (state === "x") {
    ctx.fillStyle = "#2ecc71"; //green
  } else {
    ctx.fillStyle = "#f39c12"; //geel
  }

  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.closePath();
  ctx.fill();
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function clear() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

function draw() {
  clear();

  for (var c = 0; c < tileColumnCount; c++) {
    for (var r = 0; r < tileRowCount; r++) {
      rect(tiles[c][r].x, tiles[c][r].y, tileW, tileH, tiles[c][r].state);
    }
  }
}

function findBiggestIndex(queue) {
  var biggestIndex = 0;
  for (var i = 0; i < queue.length; i++) {
    if (
      queue[i][0] + queue[i][1] >
      queue[biggestIndex][0] + queue[biggestIndex][1]
    ) {
      biggestIndex = i;
    }
  }
  return biggestIndex;
}

function solveMaze() {
  var queue = [[0, 0]];

  var pathFound = false;

  var xLoc;
  var yLoc;

  while (queue.length > 0 && !pathFound) {
    //xLoc = Xqueue.shift();
    //yLoc = Yqueue.shift();

    var index = findBiggestIndex(queue);
    xLoc = queue[index][0];
    yLoc = queue[index][1];

    queue.splice(index, 1);

    // checks if the finish is one around itself
    if (xLoc > 0) {
      if (tiles[xLoc - 1][yLoc].state === "f") {
        pathFound = true;
      }
    }
    if (xLoc < tileColumnCount - 1) {
      if (tiles[xLoc + 1][yLoc].state === "f") {
        pathFound = true;
      }
    }

    if (yLoc > 0) {
      if (tiles[xLoc][yLoc - 1].state === "f") {
        pathFound = true;
      }
    }
    if (yLoc < tileRowCount - 1) {
      if (tiles[xLoc][yLoc + 1].state === "f") {
        pathFound = true;
      }
    }
    //--------------
    // checks if bloks eround it self is empty
    if (xLoc > 0) {
      if (tiles[xLoc - 1][yLoc].state === "e") {
        queue.push([xLoc - 1, yLoc]);
        tiles[xLoc - 1][yLoc].state = tiles[xLoc][yLoc].state + "l";
      }
    }
    if (xLoc < tileColumnCount - 1) {
      if (tiles[xLoc + 1][yLoc].state === "e") {
        console.log("je kan naar rechts xloc:" + xLoc + " yloc:" + yLoc);
        queue.push([xLoc + 1, yLoc]);
        tiles[xLoc + 1][yLoc].state = tiles[xLoc][yLoc].state + "r";
      }
    }

    if (yLoc > 0) {
      if (tiles[xLoc][yLoc - 1].state === "e") {
        queue.push([xLoc, yLoc - 1]);
        tiles[xLoc][yLoc - 1].state = tiles[xLoc][yLoc].state + "u";
      }
    }

    if (yLoc < tileRowCount - 1) {
      if (tiles[xLoc][yLoc + 1].state === "e") {
        queue.push([xLoc, yLoc + 1]);
        tiles[xLoc][yLoc + 1].state = tiles[xLoc][yLoc].state + "d";
      }
    }
    if (!pathFound) {
      output.innerHTML = "No Solution";
    } else {
      output.innerHTML = "Solved";
      var path = tiles[xLoc][yLoc].state;
      var pathLength = path.length;
      var currX = 0;
      var currY = 0;
      for (var i = 0; i < pathLength - 1; i++) {
        if (path.charAt(i + 1) == "u") {
          currY -= 1;
        }
        if (path.charAt(i + 1) == "d") {
          currY += 1;
        }
        if (path.charAt(i + 1) == "r") {
          currX += 1;
        }
        if (path.charAt(i + 1) == "l") {
          currX -= 1;
        }
        tiles[currX][currY].state = "x";
      }
    }
  }
}
function reset() {
  for (var c = 0; c < tileColumnCount; c++) {
    tiles[c] = [];
    for (var r = 0; r < tileRowCount; r++) {
      tiles[c][r] = { x: c * (tileW + 3), y: r * (tileH + 3), state: "e" };
    }
  }
  tiles[0][0].state = "s";
  tiles[tileColumnCount - 1][tileRowCount - 1].state = "f";
  output.innerHTML =
    "Draw your own maze and let the machine find the route through your maze";
}
function init() {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");
  output = document.getElementById("outcome");
  return setInterval(draw, 10);
}

function myMove(e) {
  var x = e.pageX - canvas.offsetLeft;
  var y = e.pageY - canvas.offsetTop;
  for (var c = 0; c < tileColumnCount; c++) {
    for (var r = 0; r < tileRowCount; r++) {
      if (
        c * (tileW + 3) < x &&
        x < c * (tileW + 3) + tileW &&
        r * (tileH + 3) < y &&
        y < r * (tileH + 3) + tileH
      ) {
        if (tiles[c][r].state === "e" && (c != boundX || r != boundY)) {
          tiles[c][r].state = "w";
          boundX = c;
          boundY = r;
        } else if (tiles[c][r].state === "w" && (c != boundX || r != boundY)) {
          tiles[c][r].state = "e";
          boundX = c;
          boundY = r;
        }
      }
    }
  }
}

function myDown(e) {
  canvas.onmousemove = myMove;
  var x = e.pageX - canvas.offsetLeft;
  var y = e.pageY - canvas.offsetTop;

  for (var c = 0; c < tileColumnCount; c++) {
    for (var r = 0; r < tileRowCount; r++) {
      if (
        c * (tileW + 3) < x &&
        x < c * (tileW + 3) + tileW &&
        r * (tileH + 3) < y &&
        y < r * (tileH + 3) + tileH
      ) {
        if (tiles[c][r].state === "e") {
          tiles[c][r].state = "w";
          boundX = c;
          boundY = r;
        } else if (tiles[c][r].state === "w") {
          tiles[c][r].state = "e";
          boundX = c;
          boundY = r;
        }
      }
    }
  }
}
function myUp() {
  canvas.onmousemove = null;
}

init();
canvas.onmousedown = myDown;
canvas.onmouseup = myUp;
