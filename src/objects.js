function render2() {
    var p, x, y;

    context.clearRect(0, 0, width, height);
    context.strokeStyle = altColorAlpha;

    p = geoToPixel(52.52230, 13.39550);
    x = p.x-originX;
    y = p.y-originY;
    dome({ x:x, y:y }, 30, 30);
}

function line(a, b) {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
}

function cone(c, r, h, minHeight) {
    // TODO: min height
    var apex = project(c.x, c.y, camZ / (camZ - h)),
        _x = apex.x,
        _y = apex.y;

    var t = getTangentsFromPoint(c, r, _x, _y),
        tx, ty, ta,
        isAlt,
        ax, ay;

    // draw normal and alternative colored wall segments
    for (var i = 0; i < 2; i++) {
        isAlt = !!i;
        tx = t[i].x;
        ty = t[i].y;
        ax = (c.x - tx) * (isAlt ? 1 : -1);
        ay = (c.y - ty) * (isAlt ? 1 : -1);
        ta = atan2(ay, ax) + (isAlt ? PI : 0);

        // tangent not visible, avoid flickering
        if (ax < 0) {
            continue;
        }

        context.fillStyle = !isAlt ? wallColorAlpha : altColorAlpha;
        context.beginPath();
        context.moveTo(tx, ty);
        context.arc(c.x, c.y, r, ta, HALF_PI, isAlt);
        context.arc(_x, _y, 0, HALF_PI, ta, !isAlt);
        context.closePath();
        context.fill();
    }
}

function rotation(p, c, a) {
    var ms = sin(a), mc = cos(a);
    p.x -= c.x;
    p.y -= c.y;
    return {
        x: p.x* mc + p.y*ms + c.x,
        y: p.x*-ms + p.y*mc + c.y
    };
}

var KAPPA = 0.5522847498;
function dome(c, r, h, minHeight) {
    if (!h) {
        h = r;
    }

    minHeight = minHeight || 0;

    // VERTICAL TANGENT POINTS ON SPHERE:
    // side view at scenario:
    // sphere at c.x,c.y & radius => circle at c.y,minHeight
    // cam    at camX/camY/camZ => point  at camY/camZ
    var t = getEllipseTangent(r, h, camY-c.y, camZ-minHeight);
    t.x += c.y;
    t.y += minHeight;

    if (minHeight) {
        c = project(c.x, c.y, camZ / (camZ-minHeight));
        r *= camZ / (camZ-minHeight);
    }

// radialGradient(c, r, roofColorAlpha)
    drawCircle(c, r, TRUE);

    var _h = camZ / (camZ-h),
      hfK = camZ / (camZ-(h*KAPPA));

    var apex = project(c.x, c.y, _h);
debugMarker(apex);

    var angle = atan((camX-c.x)/(camY-c.y));

    context.beginPath();

    // ausgerichteter sichtrand!
    var _th = camZ / (camZ-t.y);
    var p = rotation({ x:c.x, y:t.x }, c, angle);
    var _p = project(p.x, p.y, _th);
//debugMarker(_p);
    var p1h = rotation({ x:c.x-r, y:t.x }, c, angle);
    var _p1h = project(p1h.x, p1h.y, _th);
//debugMarker(_p1h);
    var p2h = rotation({ x:c.x+r, y:t.x }, c, angle);
    var _p2h = project(p2h.x, p2h.y, _th);
//debugMarker(_p2h);
    var p1v = rotation({ x:c.x-r, y:c.y }, c, angle);
//debugMarker(p1v);
    var p2v = rotation({ x:c.x+r, y:c.y }, c, angle);
//debugMarker(p2v);

    context.moveTo(p1v.x, p1v.y);
    context.bezierCurveTo(
        p1v.x + (_p1h.x-p1v.x) * KAPPA,
        p1v.y + (_p1h.y-p1v.y) * KAPPA,
        _p.x + (_p1h.x-_p.x) * KAPPA,
        _p.y + (_p1h.y-_p.y) * KAPPA,
        _p.x, _p.y);

    context.moveTo(p2v.x, p2v.y);
    context.bezierCurveTo(
        p2v.x + (_p1h.x-p1v.x) * KAPPA,
        p2v.y + (_p1h.y-p1v.y) * KAPPA,
        _p.x + (_p2h.x-_p.x) * KAPPA,
        _p.y + (_p2h.y-_p.y) * KAPPA,
        _p.x, _p.y);


//            drawMeridian(c, r, _h, hfK, apex,  45/RAD);
//            drawMeridian(c, r, _h, hfK, apex, 135/RAD);

    for (var i = 0; i <= 180; i+=30) {
        drawMeridian(c, r, _h, hfK, apex, i*RAD);
    }

//            for (var i = 0; i <= 180; i+=30) {
//                drawMeridian(c, r, _h, hfK, apex, i*RAD);
//            }

//            context.fill();
    context.stroke();
}

function drawMeridian(c, r, _h, hfK, apex, angle) {
    drawHalfMeridian(c, r, _h, hfK, apex, angle);
    drawHalfMeridian(c, r, _h, hfK, apex, angle + PI);
}

function drawHalfMeridian(c, r, _h, hfK, apex, angle) {
    var p1 = rotation({ x:c.x, y:c.y-r },       c, angle);
    var p2 = rotation({ x:c.x, y:c.y-r*KAPPA }, c, angle);
    var _p1 = project(p1.x, p1.y, hfK);
    var _p2 = project(p2.x, p2.y, _h);
    context.moveTo(p1.x, p1.y);
    context.bezierCurveTo(_p1.x, _p1.y, _p2.x, _p2.y, apex.x, apex.y);
}

function getEllipseTangent(a, b, x, y) {
    var C = (x*x) / (a*a) + (y*y) / (b*b),
        R = Math.sqrt(C-1),
        yabR = y*(a/b)*R,
        xbaR = x*(b/a)*R;
    return {
        x: (x + (  yabR < 0 ? yabR : -yabR)) / C,
        y: (y + (y+xbaR > 0 ? xbaR : -xbaR)) / C
    };
}

function getTangentsFromPoint(c, r, p) {
    var a = c.x-p.x, b = c.y-p.y,
        u = sqrt(a*a + b*b),
        ur = r/u,
        ux = -a/u, uy = -b/u,
        res = [],
        h = sqrt(max(0, 1 - ur*ur)),
        nx, ny;
    for (var sign = 1; sign >= -1; sign -= 2) {
        nx = ux*ur - sign*h*uy;
        ny = uy*ur + sign*h*ux;
        res.push({ x:c.x + r*nx <<0, y: c.y + r*ny <<0 });
    }
    return res;
}

function drawPyramidalRoof(points, height, strokeRoofs) {
    if (height <= 20) {
        context.fillStyle = 'rgba(225,175,175,0.5)';
    }

    if (points.length > 8 || height > 20) {
        drawPolygon(points, strokeRoofs);
        return;
    }

    var h = height*1.3,
        cx = 0, cy = 0,
        num = points.length/2,
        apex;

    for (var i = 0, il = points.length - 1; i < il; i += 2) {
        cx += points[i];
        cy += points[i+1];
    }

    apex = project(cx/num, cy/num, camZ / (camZ-h));

    var ax,bx,ay,by;
    for (i = 0, il = points.length-3; i < il; i += 2) {
        ax = points[i];
        bx = points[i+2];
        ay = points[i+1];
        by = points[i+3];

        //if ((ax - bx) > (ay - by)) {
        if ((ax < bx && ay < by) || (ax > bx && ay > by)) {
            context.fillStyle = 'rgba(200,100,100,0.25)';
        } else {
            context.fillStyle = 'rgba(200,175,175,0.25)';
        }

        drawPolygon([
            points[i],   points[i+1],
            points[i+2], points[i+3],
            apex.x, apex.y
        ], strokeRoofs);
    }

    ax = points[i];
    bx = points[0];
    ay = points[i + 1];
    by = points[1];

    if ((ax - bx) > (ay - by)) {
        context.fillStyle = 'rgba(250,0,0,0.25)';
    } else {
        context.fillStyle = 'rgba(250,100,100,0.25)';
    }

    drawPolygon([
        points[i], points[i + 1],
        points[0], points[1],
        apex.x, apex.y
    ], strokeRoofs);
}
