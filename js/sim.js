// Theos Seitenscheidel - Fahrzeugphysik (reine Simulation, fester Zeitschritt, ohne Rendering).
// Arcade-Rally-Modell mit voller Kontrolle: Die Lenkung steuert die Gierrate (nie mehr als der Grip hergibt), das Auto kann
// sich nie von selbst drehen oder überschlagen. Handbremse = kein Antrieb, leichte Bremswirkung, Heck rutscht kontrolliert (Drift).
// Der gesamte Zustand steckt in `state` (JSON-tauglich) - später lässt sich das über das Netzwerk teilen.
// Koordinaten: Vorwärts = (sin psi, cos psi), links = (cos psi, -sin psi); +psi = Linkskurve; v>0 = Schlupf nach links.

export const CAR = {
  m: 1050, Iz: 1500, a: 1.15, b: 1.35, h: 0.5, g: 9.81,
  power: 400000, maxDrive: 14500, brake: 14500, handbrake: 4200, engineBrake: 1500, reverseForce: 3600, reverseMax: 8,
  drag: 0.42, vmax: 83.5, // Höchstgeschwindigkeit 83,5 m/s = 300 km/h (mit Nitro deutlich mehr; Tacho bis 320)
  radius: 0.95, circles: [1.45, 0.1, -1.4], // Kollisionskreise (Abstand vom Schwerpunkt nach vorn)
  crashKmh: 40,    // Baumkontakt ab diesem Fahrzeugtempo ist tödlich (Crash); darunter prallt der Wagen nur ab (Bump)
  maxSlip: 0.55,   // größter Schräglauf (|v|/|u|) ohne Handbremse; im Drift (loss) bis maxSlip+driftSlip
  driftSlip: 0.55,
  // Lenkgefühl: Das Lenkrad folgt der Taste kritisch gedämpft (w0 langsam gefahren, w1 bei Tempo, 1/s), kleine Einschläge wirken bei Tempo schwächer (lin), die Gierrate kommt weich (yawV), und im Kurvendruck gleitet der Wagen leicht nach außen (glide, kv)
  feel: { w0: 11, w1: 7.2, back: 1.4, hand: 1.9, lin: 0.32, yawV: 0.075, glide: 0.34, kv: 0.62 },
};
// ay: Querbeschleunigung (m/s²) die der Untergrund hergibt, kv: wie schnell Seitenrutschen abgebaut wird (1/s), roll: Rollwiderstand (N)
const SURFACE = { road: { mu: 1.0, ay: 19, kv: 9, roll: 240 }, mud: { mu: 0.62, ay: 12, kv: 5.5, roll: 1100 }, grass: { mu: 0.72, ay: 13, kv: 6.5, roll: 1500 } };

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// Leistungsfaktoren aus dem Schadenssystem (damage.js computePerf) - ohne Angabe: neutral. nitro 0..1 = Nitro-Stärke.
const NP = { power: 1, vmax: 1, brake: 1, grip: 1, steerBias: 0, steerResp: 1, nitro: 0, nitroSteer: 1 };

export function createState(pose = { x: 0, z: 0, psi: 0 }) {
  return { x: pose.x, z: pose.z, psi: pose.psi, u: 0, v: 0, r: 0, steer: 0, steerV: 0, delta: 0, ax: 0, ay: 0, hand: 0, loss: 0,
    surface: 'road', slip: 0, reverse: false, odo: 0, stuck: 0, lastImpact: 0 };
}

// Eingabe: { throttle 0..1, brake 0..1, steer -1..1 (links +), hand 0|1 }
export function step(st, inp, track, dt, events = []) {
  const C = inp.car || CAR; const L = C.a + C.b;
  const q = track.nearest(st.x, st.z);
  st.surface = track.surfaceAt(st.x, st.z, q);
  st.lane = q; // Streckenposition (s, Querabstand) für Spiel-Logik und Anzeige
  const surf = SURFACE[st.surface];
  const pf = inp.perf || NP; const nit = pf.nitro || 0;
  const u0 = st.u;
  const au = Math.abs(st.u);

  // Griffverlust hinten: Handbremse nimmt ihn schnell, er kommt langsam zurück (weicher Ausstieg aus dem Drift).
  st.hand += clamp((inp.hand ? 1 : 0) - st.hand, -9 * dt, 9 * dt);
  st.loss += clamp(st.hand - st.loss, -2.2 * dt, 5.5 * dt); // Handbremse greift in ~0,2 s an und rutscht dann voll rein (weich statt ruckartig)
  const loss = st.loss;
  const hsp = clamp((Math.abs(st.u) - 8) / 32, 0, 1); // Handbremse wirkt mit dem Tempo stärker (bei 40 m/s ~ voller Bonus)

  // Querbeschleunigung, die der Wagen halten kann (starker Abtrieb: auch bei hohem Tempo bleibt die Lenkung direkt)
  const ayLim = surf.ay * (C.ayMul || 1) * (1 + (C.noAero ? 0 : 2.5) * Math.min(1, (au / 52) ** 1.5)) * pf.grip * (1 - 0.3 * nit * clamp((au - 60) / 40, 0, 1));

  // Lenkung: schnelle Eingabe. Voller Ausschlag entspricht immer etwa dem Grip-Limit -> kein Überlenken bei hohem Tempo.
  const target = clamp(inp.steer + (pf.steerBias || 0), -1, 1);
  const F = inp.direct ? null : C.feel; const vk = clamp((au - 6) / 42, 0, 1); // vk: 0 unter ~20 km/h, 1 ab ~170 km/h; die KI lenkt stufenlos und braucht die Tastatur-Glättung nicht (inp.direct)
  let steerNow = st.steer;
  if (F) { // Kritisch gedämpft statt Rampe: kein Einschnappen, kein Zurückschnappen, nie Überschwingen. Handbremse und Gegenlenken dürfen schneller sein
    const w = (F.w0 + (F.w1 - F.w0) * vk) * (pf.steerResp || 1) * (Math.abs(target) < Math.abs(st.steer) || target * st.steer < 0 ? F.back : 1) * (1 + (F.hand - 1) * st.hand);
    st.steerV += (w * w * (target - st.steer) - 2 * w * st.steerV) * dt; st.steer += st.steerV * dt;
    if (Math.abs(st.steer) > 1) { st.steer = Math.sign(st.steer); st.steerV = 0; }
    const lin = F.lin + (1 - F.lin) * (1 - vk); steerNow = st.steer * (lin + (1 - lin) * Math.abs(st.steer)); // Tipper korrigieren fein, gehaltene Taste gibt weiter den vollen Grip
  } else {
    const rate = (Math.abs(target) < Math.abs(st.steer) || target * st.steer < 0 ? 7.0 : 4.6) * (pf.steerResp || 1) * (C.steerRate || 1);
    st.steer += clamp((target - st.steer) * (1 - Math.exp(-dt * 10)), -rate * dt, rate * dt); st.steerV = 0; steerNow = st.steer; // weiche Lenkbewegung
  }
  const dmax = Math.min(C.maxDelta || 0.6, L * ayLim * 1.1 / Math.max(au * au, 1)) * (pf.nitroSteer || 1);
  st.delta = steerNow * dmax;

  // Längskräfte
  const th = Math.max(clamp(inp.throttle, 0, 1), nit > 0.05 ? 1 : 0); const br = clamp(inp.brake, 0, 1);
  const vmaxNow = C.vmax * (pf.vmax || 1) + 36 * nit; // Nitro: bis ~380 km/h
  let wantReverse = false;
  if (br > 0 && th === 0 && st.u < 0.8) wantReverse = true;
  st.reverse = wantReverse;
  let fDrive = 0; let fBrake = 0;
  const punch = C.noPunch ? 1 : 1 + 0.55 * clamp(1 - au / 20, 0, 1) + 0.9 * clamp(inp.launch || 0, 0, 1) * clamp(1 - au / 38, 0, 1); // Antritt: je langsamer, desto brutaler; Raketenstart obendrauf
  if (th > 0 && st.u > -0.5) fDrive = th * Math.min(C.maxDrive * punch * (1 + 1.3 * nit), C.power * (1 + 0.3 * clamp(inp.launch || 0, 0, 1) + 2.4 * nit) / Math.max(au, 2)) * pf.power * clamp((vmaxNow - st.u) / 3, 0, 1);
  else if (th > 0 && st.u <= -0.5) fBrake = C.brake * th; // aus dem Rückwärtsgang wieder vorwärts: erst abbremsen
  if (wantReverse) fDrive = st.u > -C.reverseMax ? -C.reverseForce * br : 0;
  else if (br > 0 && st.u >= 0.8) fBrake = Math.max(fBrake, C.brake * br * pf.brake);
  fDrive *= 1 + 0.4 * clamp(inp.kick || 0, 0, 1); // Schaltruck: nach dem Hochschalten kickt der Motor kurz mehr rein
  fDrive *= 1 - clamp(st.hand * 1.6, 0, 1); // Handbremse gezogen: Beschleunigung hört sofort auf
  fBrake += C.handbrake * st.hand * (1 + 0.45 * hsp);
  if (th === 0 && !wantReverse && st.u > 0.5) fBrake += C.engineBrake + 14 * au; // Gas weg: spürbare Motorbremse
  const sgn = Math.sign(st.u) || 0;
  // quer rutschende Reifen bremsen zusätzlich (Driften kostet Tempo)
  const scrub = C.m * (2.8 + 1.5 * hsp) * loss * Math.min(1, Math.abs(st.v) / (0.25 * au + 0.5));
  const fBrk = -sgn * Math.min(fBrake + scrub, au * C.m / dt * 0.98); // bremst nie über Stillstand hinaus
  const fRes = -sgn * (surf.roll * (C.rollMul || 1) + C.drag * st.u * st.u);

  // Gierrate: Soll aus der Lenkung (Ackermann), begrenzt durch den Grip; die Handbremse lässt das Heck deutlich mehr drehen als der Wagen abbiegt
  const rKin = st.u * Math.tan(st.delta) / L * (1 + (0.35 + 0.3 * hsp) * loss) + st.steer * loss * clamp(au / 10, 0, 1.3) * (0.4 + 0.1 * hsp); // + sofortiger Dreh-Ruck, sobald die Handbremse zieht
  const ayOld = surf.ay * (1 + 0.9 * Math.min(1, (au / 70) ** 2)); // Grip-Bonus der Handbremse hängt nicht vom (starken) Lenk-Abtrieb ab
  const rMax = (ayLim + ayOld * (0.4 + 0.45 * hsp) * loss) / Math.max(au, 3);
  let rT = clamp(rKin, -rMax, rMax);
  // Winkelbegrenzer: Je näher das Heck am größten Driftwinkel ist, desto weniger dreht der Wagen weiter in dieselbe Richtung (kein Spin-out, A/D fängt ihn ab)
  { const slipNow = Math.abs(st.v) / Math.max(au, 3); const lim = C.maxSlip + C.driftSlip * loss; if (rT * st.v < 0 && slipNow > 0.6 * lim) rT *= 1 - clamp((slipNow - 0.6 * lim) / (0.4 * lim), 0, 1); }
  if (nit > 0.05 && au > 62) rT += (Math.sin(st.odo * 0.37) + 0.6 * Math.sin(st.odo * 0.91 + 1.3)) * 0.05 * nit * clamp((au - 62) / 40, 0, 1); // Nitro-Tempo: der Wagen pendelt, die Spur zu halten wird Arbeit
  st.r += (rT - st.r) * Math.min(1, dt / ((C.yawLag || 0.09) + 0.03 * loss + (F ? F.yawV * vk : 0)));

  // Längs- und Querbewegung im Fahrzeugsystem (Coriolis-Terme halten die Welt-Bewegung konsistent)
  const press = F ? clamp(Math.abs(st.u * st.r) / Math.max(ayLim, 1), 0, 1) : 0; // Kurvendruck: 0 geradeaus, 1 am Grip-Limit
  const grip = 1 - 0.55 * loss - (F ? F.glide * (0.25 + 0.75 * press) * (1 - loss) * clamp(au / 14, 0, 1) : 0); // Anteil der Kurvenkraft, den die Reifen liefern; der Rest lässt den Wagen sanft nach außen gleiten
  const slipMax = C.maxSlip + C.driftSlip * loss;
  const kv = surf.kv * (F ? F.kv + (1 - F.kv) * loss : 1) * (1 - 0.8 * loss) + 14 * Math.max(0, Math.abs(st.v) / Math.max(au, 3) - slipMax * 0.85);
  const du = (fDrive + fBrk + fRes) / C.m + st.v * st.r;
  const dv = -(1 - grip) * st.u * st.r - kv * st.v;
  st.u += du * dt; st.v += dv * dt;
  const vlim = slipMax * Math.max(Math.abs(st.u), 3);
  if (Math.abs(st.v) > vlim) st.v -= (Math.abs(st.v) - vlim) * Math.sign(st.v) * Math.min(1, dt * 14); // nie quer zur Fahrtrichtung
  // bei Schleichtempo: Seitenschlupf abbauen, Stillstand halten
  if (Math.abs(st.u) < 3) st.v *= Math.exp(-(1 - Math.abs(st.u) / 3) * 7 * dt);
  if (Math.abs(st.u) < 0.12 && th === 0 && br === 0 && !st.hand) { st.u = 0; st.v *= 0.8; st.r *= 0.7; }
  if (fBrake > 0 && sgn !== 0 && Math.sign(st.u) !== sgn) st.u = 0; // Bremse kehrt die Richtung nie um
  st.ax += ((st.u - u0) / dt - st.ax) * Math.min(1, dt * 6);
  st.ay += ((st.u * st.r) - st.ay) * Math.min(1, dt * 6);
  st.slip = Math.abs(st.v) / Math.max(Math.abs(st.u), 4);

  // Position
  const sn = Math.sin(st.psi); const cs = Math.cos(st.psi);
  st.x += (st.u * sn + st.v * cs) * dt; st.z += (st.u * cs - st.v * sn) * dt; st.psi += st.r * dt;
  st.odo += Math.abs(st.u) * dt;

  collide(st, track, events, C);

  // festgefahren? (zum Hinweis "R drücken")
  if (Math.abs(st.u) < 0.6 && (th > 0 || br > 0)) st.stuck += dt; else st.stuck = Math.max(0, st.stuck - dt * 2);
  return st;
}

const tmp = [];
function collide(st, track, events, C = CAR) {
  const sn = Math.sin(st.psi); const cs = Math.cos(st.psi);
  let worst = 0; const carSpeed = Math.hypot(st.u, st.v); const deadly = carSpeed >= C.crashKmh / 3.6;
  for (const off of C.circles) {
    const cx = st.x + sn * off; const cz = st.z + cs * off;
    const near = track.treesNear(cx, cz, C.radius + 2.5, tmp);
    for (const t of near) {
      const dx = cx - t.x; const dz = cz - t.z; const d2 = dx * dx + dz * dz; const rr = C.radius + t.r;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-3; const nx = dx / d; const nz = dz / d;
      // Position herausschieben
      st.x += nx * (rr - d); st.z += nz * (rr - d);
      // Geschwindigkeit der Berührstelle in der Welt
      const vwx = st.u * sn + st.v * cs; const vwz = st.u * cs - st.v * sn;
      const rx = sn * off; const rz = cs * off; // Hebelarm
      const pvx = vwx + st.r * rz; const pvz = vwz - st.r * rx;
      const vn = pvx * nx + pvz * nz;
      if (vn >= 0) continue;
      const e = deadly ? 0.05 : 0.5; const rxn = nx * rz - nz * rx;
      const j = -(1 + e) * vn / (1 / C.m + rxn * rxn / C.Iz);
      const nvx = vwx + nx * j / C.m; const nvz = vwz + nz * j / C.m;
      st.r += rxn * j / C.Iz;
      // zurück ins Fahrzeugsystem; ein bisschen Reibung am Stamm
      st.u = (nvx * sn + nvz * cs) * 0.96; st.v = (nvx * cs - nvz * sn) * 0.96;
      worst = Math.max(worst, -vn);
    }
  }
  // Wände neben der Fahrbahn (Fels, Leitplanke, Häuser, Reifenstapel): Der Wagen schrammt daran entlang, nur steile Einschläge sind tödlich
  let wall = 0; if (track.limL && track.theme !== 'forest') for (const off of C.circles) {
    const cx = st.x + Math.sin(st.psi) * off; const cz = st.z + Math.cos(st.psi) * off; const q2 = track.nearest(cx, cz); const i = Math.min(track.rows - 1, q2.i); const L = q2.lat >= 0 ? track.limL[i] : track.limR[i]; const over = Math.min(0.3, Math.abs(q2.lat) + C.radius * 0.92 - L); if (over <= 0 || L > 50) continue;
    const sg = q2.lat >= 0 ? 1 : -1; const nx = -sg * Math.cos(q2.psi); const nz = sg * Math.sin(q2.psi); st.x += nx * over; st.z += nz * over;
    const sn2 = Math.sin(st.psi); const cs2 = Math.cos(st.psi); const vwx = st.u * sn2 + st.v * cs2; const vwz = st.u * cs2 - st.v * sn2; const vn = vwx * nx + vwz * nz; if (vn >= 0) continue;
    const e = 0.32; const nvx = vwx - (1 + e) * vn * nx; const nvz = vwz - (1 + e) * vn * nz; st.u = (nvx * sn2 + nvz * cs2) * 0.992; st.v = (nvx * cs2 - nvz * sn2) * 0.992; const dh = Math.atan2(Math.sin(q2.psi - st.psi), Math.cos(q2.psi - st.psi)); st.psi += clamp(dh, -0.6, 0.6) * 0.02; st.r *= 0.9; wall = Math.max(wall, -vn);
  }
  if (wall > 0.8) { const hard = deadly && wall >= 11; st.lastImpact = wall; events.push({ type: hard ? 'crash' : 'bump', speed: hard ? carSpeed : wall }); } // Schrammen kostet Tempo, erst ein steiler Einschlag ist tödlich
  // unsichtbare Begrenzung weit abseits der Straße (der Wald ist dort sehr dicht)
  const q = track.nearest(st.x, st.z);
  if (q.dist > 58) { const k = (q.dist - 58) / q.dist; st.x -= (st.x - q.cx) * k; st.z -= (st.z - q.cz) * k; st.u *= 0.9; st.v *= 0.9; }
  if (worst > 0.8) {
    st.lastImpact = worst;
    const crash = deadly && worst >= 1.5; // schleifender Kontakt mit kaum Normalanteil zählt nicht
    events.push({ type: crash ? 'crash' : 'bump', speed: crash ? carSpeed : worst });
  }
}

// kleine Hilfe für Anzeigen: Tempo in km/h (Betrag der Längsgeschwindigkeit)
export const kmh = (st) => Math.abs(st.u) * 3.6;
