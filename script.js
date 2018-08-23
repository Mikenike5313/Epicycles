//Premises
/*
  Variables:
    e = lim(n->∞) of (1+(1/n))ⁿ = 2.71828...
    i = √-1
    t = argument of complex #
    n = constant
    z = complex constant

  Euler's Formula:
    eⁱᵗ = cos(t) + i*sin(t)

    z(eⁱⁿᵗ) = z(cos(nt) + i*sin(nt))

      if n is positive
        as t: 0->2π, point moves counterclockwise
      if n is negative
        as t: 0->2π, point moves clockwise
      if n != 1
        as t: 0->2π, trace circle n times

      z is the start and endpoint of the circle traced

    2π
    ∫ eⁱⁿᵗ dt = 0
    0
    (because you are tracing a circle symmetric about the x axis, meaining = + & - parts which sums to 0)


  The edge being traced on the final epicycle is calculated by the sum of each
  complex vector starting from the center of the current circle(which changes dependign on its parent circle)
  and extending out to the current position along the arc of the circle

  This sum is shown as:
    z0 + z1(eⁱᵗ) + z2(e⁻ⁱᵗ) + z3(e²ⁱᵗ) + z4(e⁻²ⁱᵗ) + ...

    where z is a complex number representing the starting position along the arc of the previous circle,
    indexed by the number epicycle it is
    (z0 is the anchor point, may/may not be the origin)

    it can be seen that the sum is a sires of coefficients multiplied by varying n values in the exponent of Euler's formula

  This is a Fourier Sires:
    it can rewrite our periodic function (with a period of 2π):

    f(t) = ... + c₋₂(e⁻²ⁱᵗ) + c₋₁(e⁻ⁱᵗ) + c₀(e⁰ⁱᵗ) + c₁(eⁱᵗ) + c₂(e²ⁱᵗ) + ...

    each side extends to -∞/∞

  To calculate each coefficient c(n):

                  2π
    c(n) = (1/2π) ∫ f(t)e⁻ⁱⁿᵗ dt
                  0


  After the = spaced points are fed in, the shortest tour of them should be calculated
  (travelling salesman problem, greedy/2opt algorithm, in my case I just take the points in the order the user draws them),
  then to calculate the integral above, integral approximations should be used

  Once the coefficients have been calculated, the epicycles can be animated
*/


//settings
var accuracy = 100; // <1400
var rotationSpeed = 0.01;


//setup
var mouseDown = false;

var canvas,
    ctx;
var can,
    c;

var path;

var coeffs;

//init
function init() {
  canvas = document.getElementById('plane');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx = canvas.getContext('2d');

  can = document.getElementById('epicycles');
  can.width = can.offsetWidth;
  can.height = can.offsetHeight;
  c = can.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  c.clearRect(0, 0, can.width, can.height);

  path = [];

  coeffs = [];


  can.addEventListener('mousedown', function(event) {
    mouseDown = true;

    window.cancelAnimationFrame(animate);

    cx = 0;
    cy = 0;

    path = [];
    coeffs = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    path.push(moveTo(Math.round(event.clientX), Math.round(event.clientY)));
  });
  can.addEventListener('mouseup', function() {
    mouseDown = false;

    calcCoeffs(accuracy);

    //reset t
    t = 0;
    //immediately move to first point
    moveTo(path[0]%canvas.width, Math.floor(path[0]/canvas.width));
    trace();
  });
  can.addEventListener('mousemove', function(event) {
    if(mouseDown) {
      path = path.concat(lineTo(Math.round(event.clientX), Math.round(event.clientY), 'gray'));
    }
  });

  //start with imgs, need server on for this (see traceImage function below for reason)
  /*
  traceImage('./imgs/africa.png');
  //*/
}


//drawing
var cx,
    cy;

function moveTo(x, y) {
  cx = x;
  cy = y;

  return x + y*canvas.width;
}

function line(sx, sy, ex, ey, color) {
  ctx.fillStyle = color ? color : 'white';

  //calculate slope
  var m = (ey-sy)/(ex-sx);

  //fill in start point
  ctx.fillRect(sx, sy, 1, 1);

  //draw line & save pixels (starting with first point)
  var pixels = [sx + sy*canvas.width];
  /*
    change x or y by 1
    change y or x (reverse of above) by rounded slope (y/x if x++, x/y if y++)
    to get discrete pixels
  */
  if(Math.abs(m) <= 1) {
    //find direction to change (+ or - to get to ex?)
    var del = sx <= ex ? 1 : -1;
    for(var delX = del; Math.abs(delX) < Math.abs(ex-sx); delX += del) {
      var x = sx+delX,
          y = sy+Math.round(delX*m);

      pixels.push(y*canvas.width + x);

      ctx.fillRect(x, y, 1, 1);
    }
  }
  else {
    //find direction to change (+ or - to get to ex?)
    var del = sy <= ey ? 1 : -1;
    for(var delY = del; Math.abs(delY) < Math.abs(ey-sy); delY += del) {
      var x = sx+Math.round(delY*(1/m)),
          y = sy+delY;

      pixels.push(y*canvas.width + x);

      ctx.fillRect(x, y, 1, 1);
    }
  }
  //fill in endpoint & add it to pixels
  ctx.fillRect(ex, ey, 1, 1);
  pixels.push(ex + ey*canvas.width);

  return pixels;
}

function lineTo(x, y, color) {
  var pixels = line(cx, cy, x, y, color);

  cx = x;
  cy = y;

  return pixels;
}

function circle(x, y, r, i) {
  var mag = Math.sqrt(r*r + i*i);

  c.strokeStyle = 'rgb(150, 150, 100)';
  c.beginPath();
  c.arc(x + can.width/2, can.height/2 - y, mag, 0, 2*Math.PI);
  c.closePath();
  c.stroke();
}


//algorithms
function greedy(points) {
  var ordered = points.splice(0, 1);

  while(points.length > 0) {
    var curPoint = ordered[ordered.length-1];
    var curX = curPoint%canvas.width,
        curY = Math.floor(curPoint/canvas.width);

    var nearest = 0;
    var howClose = canvas.height*canvas.height + canvas.width*canvas.width;
    for(var p = 0; p < points.length; p++) {
      var point = points[p];
      var xDist = curX - point%canvas.width,
          yDist = curY - Math.floor(point/canvas.width);

      var distSq = xDist*xDist + yDist*yDist; //compare distances still squared to save time
      if(distSq < howClose) {
        nearest = p;
        howClose = distSq;
      }
    }

    ordered.push(points.splice(nearest, 1)[0]);
  }

  return ordered;
}
function twoOpt(points) {
  var ordered = points;

  // TODO: switch crossed lines here

  return ordered;
}
function shortestTour(points) {
  return twoOpt(greedy(points));
}

//gets path of outline (1px thick) within rectangle described with parameters
function getPath(x, y, w, h) {
  var tour = [];

  var edges = [];
  var data = ctx.getImageData(x, y, w, h).data;
  for(var p = 0; p < data.length; p += 4) {
    if(data[p] + data[p+1] + data[p+2] + data[p+3] > 0) {
      edges.push(p/4 + y*canvas.width + x + Math.floor((p/4)/w)*(canvas.width - w));
    }
  }

  tour = shortestTour(edges);

  return tour;
}
function fourierCoeff(n) {
  var rIntegral = 0;
  var iIntegral = 0;

  var delT = 2*Math.PI/path.length;
  //using left endpoints, calc integral
  for(var p = 0; p < path.length; p++) {
    var t = p*delT;

    //f(t) values
    var r = (path[p]%canvas.width - canvas.width/2),
        i = (-Math.floor(path[p]/canvas.width) + canvas.height/2);
    //f(t)e⁻ⁱⁿᵗ values
    var gtr = r*Math.cos(-n*t) - i*Math.sin(-n*t),
        gti = r*Math.sin(-n*t) + i*Math.cos(-n*t);

    rIntegral += gtr * delT;
    iIntegral += gti * delT;
  }

  return {r: (1/(2*Math.PI))*rIntegral, i: (1/(2*Math.PI))*iIntegral};
}
function calcCoeffs(accuracy) {
  coeffs = [];

  coeffs.push(fourierCoeff(0));

  if(!accuracy) {
    return;
  }

  for(var n = 1; n <= accuracy; n++) {
    coeffs.push(fourierCoeff(n));
    coeffs.push(fourierCoeff(-n));
  }
}




//animation
var animate;

var then = Date.now(),
    now;
var delta;

var fps = 60;
    interval = 1000/fps;

var t = 0;

function trace() {
  now = Date.now();
  delta = now - then;

  if (delta > interval) {
    then = now - (delta % interval);

    //clear epicycle canvas
    c.clearRect(0, 0, can.width, can.height);

    //rotate
    var x = coeffs[0].r,
        y = coeffs[0].i;
    for(var cn = 1; cn < coeffs.length; cn++) {
      var n = cn%2 ? Math.ceil(cn/2) : -Math.ceil(cn/2);
      //calc current epicycle vectors
      var vx = coeffs[cn].r*Math.cos(n*t) - coeffs[cn].i*Math.sin(n*t),
          vy = coeffs[cn].r*Math.sin(n*t) + coeffs[cn].i*Math.cos(n*t);

      //center
      c.fillStyle = 'blue';
      c.fillRect(x + canvas.width/2, canvas.height/2 - y, 1, 1);
      //circle
      circle(x, y, vx, vy);

      x += vx,
      y += vy;
    }

    //trace point by points
    /*
    ctx.fillStyle = 'purple';
    ctx.fillRect(x + canvas.width/2, canvas.height/2 - y, 1, 1);
    //*/

    //trace with lines
    ///*
    lineTo(x + canvas.width/2, canvas.height/2 - y, 'purple');
    //*/

    t += rotationSpeed;
    if(t > 2*Math.PI) {
      //clear each cycle
      /*
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      //*/
      t = 0;
    }
  }

  animate = window.requestAnimationFrame(trace);
}

//need server on for this to work, if from file, canvas won't give pixel data because it considers it cross-origin (and prevents grabbing pixels to protect potential sensitive data)
//also, image should be a outline 1px thick for desired results
function traceImage(src) {
  var img = new Image();
  img.src = src;

  img.onload = function() {
    var x = Math.round(canvas.width/2 - img.width/2),
        y = Math.round(canvas.height/2 - img.height/2);

    ctx.drawImage(img, x, y);

    path = getPath(x, y, img.width, img.height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    calcCoeffs(accuracy);

    //reset t
    t = 0;
    //immediately move to first point
    moveTo(path[0]%canvas.width, Math.floor(path[0]/canvas.width));
    trace();
  }
}

init();






//******************* tests *******************
/*
//show epicycles
function displayEpicycles() {
  line(canvas.width/2, canvas.height/2, canvas.width/2, canvas.height/2, 'purple');
  var cx = coeffs[0].r,
      cy = coeffs[0].i;
  for(var e = 1; e < coeffs.length; e++) {
    var r = coeffs[e].r,
        i = coeffs[e].i;

    line(cx + canvas.width/2, canvas.height/2 - cy, cx + canvas.width/2, canvas.height/2 - cy, 'blue');
    circle(cx, cy, r, i, 255/coeffs.length*e*2);

    cx += r;
    cy += i;
  }
}

//show path followed
var animate2;

var then2 = Date.now(),
    now2;
var delta2;

var fps2 = 60,
    interval2 = 1000/fps2;
var pix = 0;
function tracePath() {
  now2 = Date.now();
  delta2 = now2 - then2;

  if (delta2 > interval2) {
    then2 = now2 - (delta2 % interval2);
    //lineTo(path[pix]%canvas.width, Math.floor(path[pix]/canvas.width), 'green');
    ctx.fillRect(path[pix]%canvas.width, Math.floor(path[pix]/canvas.width), 1, 1);
  }
  pix++;
  animate2 = window.requestAnimationFrame(tracePath);
}
function checkPath() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'blue';
  pix = 0;
  tracePath();
}
//*/
