"use strict";

/*
  MM2 Track Conductor v1
  - MIDIなしの手入力版
  - 既存 data.js の dataAssets.wing.ground を利用
  - ぜんまいメソッドの探索ロジックをベースに候補を作る
  - 1ブロック/1音符を基本配置
  - 同じ列を共用できる候補を許可
  - 配線が悪い音符は前後へ最大Nブロックまで動かして再探索
  - 横スクロールは「1ブロックあたり[f]」で補正
*/

const $ = (q) => document.querySelector(q);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const bpmEl = $("#bpm");
const gridEl = $("#grid");
const baseHeightEl = $("#baseHeight");
const baseDelayEl = $("#baseDelay");
const landingEl = $("#landing");
const loadingEl = $("#loading");
const scrollPerBlockEl = $("#scrollPerBlock");
const maxShiftEl = $("#maxShift");
const priorityEl = $("#priority");

const pianoGrid = $("#pianoGrid");
const pitchLabels = $("#pitchLabels");
const noteTableBody = $("#noteTable tbody");
const noteCountEl = $("#noteCount");
const durationInfoEl = $("#durationInfo");
const frameInfoEl = $("#frameInfo");
const resultCards = $("#resultCards");
const railOverview = $("#railOverview");
const summaryEl = $("#summary");

const PITCHES = [];

// C2 ～ C4+ の25音
const names = [
  "ド", "ド#", "レ", "レ#", "ミ", "ファ",
  "ファ#", "ソ", "ソ#", "ラ", "ラ#", "シ"
];

for (let midi = 48; midi >= 24; midi--) {
  const oct = Math.floor(midi / 12) - 1;
  PITCHES.push({
    midi,
    name: `${names[midi % 12]}${oct}`
  });
}

let notes = [];
let lastResults = [];

function getAsset() {
  if (!window.dataAssets?.wing?.ground) {
    throw new Error(
      "data.js の dataAssets.wing.ground が見つかりません。"
    );
  }

  return dataAssets.wing.ground;
}

function getLanding() {
  const asset = getAsset();
  const idx = Number(landingEl.value);

  return asset.landings[idx] || asset.landings[0];
}

function getQuarterFrames() {
  const bpm = Number(bpmEl.value);

  if (!bpm || bpm <= 0) return 0;

  return 3600 / bpm;
}

function getGridFrames() {
  const q = getQuarterFrames();
  const den = Number(gridEl.value);

  if (!den || den <= 0) return 0;

  return q * 4 / den;
}

function pitchToHeight(firstMidi, midi) {
  return Number(baseHeightEl.value) + (midi - firstMidi);
}

function renderPitchLabels() {
  pitchLabels.innerHTML = "";

  PITCHES.forEach(p => {
    const d = document.createElement("div");

    d.className = "pitch-label";
    d.textContent = p.name;

    pitchLabels.appendChild(d);
  });
}

function renderGrid() {
  pianoGrid.innerHTML = "";

  const cols = 48;

  for (let r = 0; r < PITCHES.length; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");

      cell.className = "piano-cell";

      if (c === 0) {
        cell.classList.add("playhead");
      }

      const note = notes.find(
        n => n.step === c && n.midi === PITCHES[r].midi
      );

      if (note) {
        cell.classList.add("active");
        cell.title =
          `${note.name} / ${Number(note.timeFrames).toFixed(3)}f`;
      }

      cell.addEventListener("click", () => {
        // 同じ開始時刻にある音符を削除
        const sameTime = notes.findIndex(n => n.step === c);

        if (sameTime >= 0) {
          notes.splice(sameTime, 1);
        }

        // クリックした場所に音符を追加
        if (!note) {
          const pitch = PITCHES[r];

          notes.push({
            step: c,
            midi: pitch.midi,
            name: pitch.name
          });
        }

        normalizeNotes();
        renderAll();
      });

      pianoGrid.appendChild(cell);
    }
  }
}

function normalizeNotes() {
  notes.sort((a, b) => a.step - b.step);

  const firstMidi = notes[0]?.midi ?? 48;
  const gridFrames = getGridFrames();

  notes.forEach((n, i) => {
    n.index = i + 1;
    n.timeFrames = n.step * gridFrames;
    n.height = pitchToHeight(firstMidi, n.midi);
  });
}

function renderNoteTable() {
  noteTableBody.innerHTML = "";

  const firstMidi = notes[0]?.midi ?? 48;

  notes.forEach((n, i) => {
    const tr = document.createElement("tr");

    const h = pitchToHeight(firstMidi, n.midi);

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${n.name}</td>
      <td>${Number(n.timeFrames).toFixed(3)}</td>
      <td>${i}</td>
      <td>${h}</td>
    `;

    noteTableBody.appendChild(tr);
  });

  noteCountEl.textContent = notes.length;

  const total = notes.length
    ? notes[notes.length - 1].timeFrames
    : 0;

  durationInfoEl.textContent =
    `${Number(total).toFixed(3)}f`;

  frameInfoEl.textContent =
    `4分音符 = ${getQuarterFrames().toFixed(3)}f`;
}

function renderAll() {
  normalizeNotes();
  renderGrid();
  renderNoteTable();
  updateLoadingUI();
}

function updateLoadingUI() {
  scrollPerBlockEl.disabled =
    loadingEl.value !== "horizontal";
}

function parseLandingType(landingName) {
  return String(landingName || "").slice(0, 2);
}

function accelerationFor(asset, landingType, column) {
  let key = "general";

  if (column === 0) {
    key = {
      "1v": "vertical",
      "1d": "diagonal",
      "2a": "second"
    }[landingType] || "general";
  } else if (
    landingType &&
    column === 1 &&
    ["1v", "1d", "4a"].includes(landingType)
  ) {
    key = "second";
  }

  return (
    asset.accelerationsList?.[key] ||
    asset.accelerationsList?.general ||
    []
  );
}

function makeWirableFinder(asset, landingType) {
  const relativeRailDelays =
    asset.relativeRailDelays || [];

  const upOptions =
    asset.upOptions || [];

  const gaps =
    asset.gaps || [];

  function getAcceleration(distance, column) {
    const acc = accelerationFor(
      asset,
      landingType,
      column
    );

    return (
      distance >= 1 &&
      distance <= acc.length
    )
      ? acc[distance - 1]
      : 0;
  }

  /*
    元ツールの findWiringResults() を
    UIに依存しない形に整理。

    戻り値:
      [◎候補, ○候補, △候補]
  */
  function find(delay, height, column = 0) {
    const target = Math.round(delay);

    const results = [[], [], []];

    let startingUp = 0;

    function addDownOption(
      _delay,
      _distance,
      count,
      _str
    ) {
      for (const gap of gaps) {
        let dDelay = 0;
        let d = 1;

        for (;;) {
          const distance =
            _distance - (gap.down + d * 2);

          if (distance <= 0) {
            if (d === 1) return;
            break;
          }

          dDelay += relativeRailDelays[
            (gap.offset + d - 1) % 3
          ];

          const optionDelay =
            _delay +
            gap.delay +
            dDelay;

          const totalDelay =
            optionDelay -
            getAcceleration(distance, column);

          const str =
            `${_str}G${gap.down}R${d}`;

          const error =
            Math.abs(totalDelay - target);

          if (error <= 2) {
            results[error].push({
              delay: totalDelay,
              up: startingUp,
              down: height - distance,
              str
            });

            break;
          }

          if (totalDelay - target > 0) {
            break;
          }

          if (count > 1) {
            addDownOption(
              optionDelay,
              distance,
              count - 1,
              str
            );
          }

          d++;
        }
      }
    }

    for (const upOption of upOptions) {
      startingUp = upOption.up;

      let dDelay = 0;
      let d = 0;

      for (;;) {
        const startingDown = d * 2;
        const distance = height - startingDown;

        if (distance <= 0) break;

        if (d !== 0) {
          dDelay += relativeRailDelays[
            (upOption.offset + d - 1) % 3
          ];
        }

        const startingDelay =
          upOption.delay + dDelay;

        const totalDelay =
          startingDelay -
          getAcceleration(distance, column);

        const str =
          `${upOption.str}-${d === 0 ? "" : "R" + d}`;

        const error =
          Math.abs(totalDelay - target);

        if (error <= 2) {
          results[error].push({
            delay: totalDelay,
            up: startingUp,
            down: startingDown,
            str
          });

          break;
        }

        if (totalDelay - target > 0) {
          break;
        }

        addDownOption(
          startingDelay,
          distance,
          3,
          str
        );

        d++;
      }
    }

    return results;
  }

  return find;
}

function collectionDelayAtX(x) {
  const asset = getAsset();
  const landing = getLanding();

  const offset =
    Number(String(landing.name).charAt(0));

  const blockDelays =
    asset.blockDelays || [10, 11, 11];

  /*
    x=0 は着線パターンの初期遅延。
    2列目以降は blockDelays の周期を使用。
  */
  let sum =
    Number(landing.second) || 0;

  for (let col = 1; col <= x; col++) {
    sum += Number(
      blockDelays[
        (offset + col + 2) % 3
      ]
    ) || 0;
  }

  return sum;
}

function loadingDelayAtX(x) {
  if (loadingEl.value !== "horizontal") {
    return 0;
  }

  return (
    x *
    Number(scrollPerBlockEl.value || 0)
  );
}

function requiredDelayFor(note, x) {
  const baseDelay =
    Number(baseDelayEl.value);

  const firstMidi =
    notes[0]?.midi ?? note.midi;

  const height =
    pitchToHeight(firstMidi, note.midi);

  /*
    地上・自由落下系の高さ補正4f/block。

    横方向の集音遅延と、
    横スクロールによる読み込み遅延を
    合わせて目標遅延へ反映。
  */
  return {
    height,

    delay:
      baseDelay +
      Number(note.timeFrames) -
      height * 4 -
      collectionDelayAtX(x) -
      loadingDelayAtX(x)
  };
}

function bestCandidate(delay, height, column) {
  const finder =
    makeWirableFinder(
      getAsset(),
      getLanding().name
    );

  const list =
    finder(delay, height, column);

  let best = null;

  for (let e = 0; e < list.length; e++) {
    for (const item of list[e]) {
      const candidate = {
        ...item,
        eval: e,
        evalLabel: ["◎", "○", "△"][e]
      };

      if (
        !best ||
        e < best.eval ||
        (
          e === best.eval &&
          item.up + item.down <
          best.up + best.down
        )
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

function candidateXs(i, maxShift) {
  const min =
    Math.max(0, i - maxShift);

  const max =
    i + maxShift;

  const xs = [];

  for (let x = min; x <= max; x++) {
    xs.push(x);
  }

  return xs;
}

function sameColumnAllowed(candidate, chosen, note) {
  if (!chosen) return true;

  if (candidate.x !== chosen.x) {
    return true;
  }

  /*
    同じ列では同じ高さの音符ブロックを
    重ねない。

    高さが違えば共用候補にする。
  */
  return candidate.height !== note.height;
}

function optimizePlacement() {
  if (!notes.length) return [];

  const maxShift = clamp(
    Number(maxShiftEl.value) || 0,
    0,
    10
  );

  // 各音符・各配置列の探索結果を保存
  const cache = new Map();

  function evalAt(i, x) {
    const key = `${i}:${x}`;

    if (cache.has(key)) {
      return cache.get(key);
    }

    const n = notes[i];

    const info =
      requiredDelayFor(n, x);

    const wiring =
      bestCandidate(
        info.delay,
        info.height,
        i
      );

    const value = {
      i,
      x,
      baseX: i,
      shift: x - i,
      note: n,
      height: info.height,
      targetDelay: Math.round(info.delay),
      collectionDelay: collectionDelayAtX(x),
      loadingDelay: loadingDelayAtX(x),
      wiring
    };

    cache.set(key, value);

    return value;
  }

  /*
    動的計画法。

    基本は x=i。

    xを非減少にすることで、
    レールが時間順に戻らないようにする。

    同じxは「同じ列を共用する候補」。
  */
  let states = new Map();

  for (const x of candidateXs(0, maxShift)) {
    const v = evalAt(0, x);

    states.set(x, {
      cost: stateCost(v, null),
      items: [v]
    });
  }

  for (let i = 1; i < notes.length; i++) {
    const next = new Map();

    for (const [prevX, state] of states) {
      for (const x of candidateXs(i, maxShift)) {
        if (x < prevX) continue;

        const v = evalAt(i, x);

        const prev =
          state.items[state.items.length - 1];

        // 同じ列で同じ高さは不可
        if (
          x === prevX &&
          !sameColumnAllowed(
            v,
            prev,
            notes[i]
          )
        ) {
          continue;
        }

        const cost =
          state.cost +
          stateCost(v, prev);

        const old = next.get(x);

        if (!old || cost < old.cost) {
          next.set(x, {
            cost,
            items: [...state.items, v]
          });
        }
      }
    }

    states = next;
  }

  if (!states.size) return [];

  let best = null;

  for (const state of states.values()) {
    if (!best || state.cost < best.cost) {
      best = state;
    }
  }

  return best.items;
}

function stateCost(v, prev) {
  const evalValue =
    v.wiring ? v.wiring.eval : 3;

  /*
    ◎を最優先。

    レールを短くするため、
    新しい列を増やすコストを重くする。

    同じ列なら列追加コストは0。
  */
  let cost =
    evalValue * 100000;

  const openedColumns = prev
    ? Math.max(0, v.x - prev.x)
    : v.x;

  cost += openedColumns * 100;

  cost += Math.abs(v.shift) * (
    priorityEl.value === "accuracy"
      ? 4
      : 1
  );

  if (!v.wiring) {
    cost += 50000;
  }

  if (v.wiring) {
    cost +=
      v.wiring.up +
      v.wiring.down;
  }

  return cost;
}

function evalClass(label) {
  if (label === "◎") return "eval-good";
  if (label === "○") return "eval-near";
  if (label === "△") return "eval-far";

  return "eval-bad";
}

function wiringText(w) {
  return w
    ? w.str
    : "見つからない";
}

function renderResults(items) {
  resultCards.innerHTML = "";
  railOverview.innerHTML = "";

  if (!items.length) {
    summaryEl.textContent =
      "音符を入力してください。";

    railOverview.innerHTML =
      '<span class="empty">計算すると配置が表示されます。</span>';

    return;
  }

  let exact = 0;
  let near = 0;
  let far = 0;
  let bad = 0;

  items.forEach((v, i) => {
    const label =
      v.wiring?.evalLabel || "×";

    if (label === "◎") exact++;
    else if (label === "○") near++;
    else if (label === "△") far++;
    else bad++;

    const card =
      document.createElement("div");

    card.className =
      "result-card";

    card.innerHTML = `
      <div class="result-top">
        <span class="dot"
          style="background:${
            label === "◎"
              ? "#5de6a6"
              : label === "○"
                ? "#8dd4ff"
                : label === "△"
                  ? "#ffd36b"
                  : "#ff7891"
          }">
        </span>

        <b>${i + 1}. ${v.note.name}</b>

        <span class="${evalClass(label)}">
          ${label}
        </span>
      </div>

      <div class="result-meta">
        開始 ${v.note.timeFrames.toFixed(2)}f /
        配置 x=${v.x}
        (${v.shift >= 0 ? "+" : ""}${v.shift})<br>

        高さ ${v.height}b /
        集音遅延 ${v.collectionDelay}f /
        読み込み ${v.loadingDelay.toFixed(2)}f<br>

        目標遅延 ${v.targetDelay}f /
        配線 ${wiringText(v.wiring)}
      </div>
    `;

    resultCards.appendChild(card);
  });

  const minX =
    Math.min(...items.map(v => v.x));

  const maxX =
    Math.max(...items.map(v => v.x));

  const railLength =
    maxX - minX + 1;

  summaryEl.innerHTML =
    `レール ${railLength}列 / ◎ ${exact} / ○ ${near} / △ ${far} / × ${bad}`;

  // 1段の列概要
  const row =
    document.createElement("div");

  row.className =
    "rail-row";

  for (let x = minX; x <= maxX; x++) {
    const cell =
      document.createElement("div");

    cell.className =
      "rail-cell";

    const here =
      items.filter(v => v.x === x);

    const text =
      document.createElement("div");

    text.className =
      "notes";

    text.innerHTML =
      here.map(v => `${v.i + 1}`).join("<br>");

    cell.appendChild(text);

    cell.title = here.length
      ? here
          .map(v =>
            `${v.i + 1}: ${v.note.name} / ${v.height}b`
          )
          .join("\n")
      : `x=${x}`;

    row.appendChild(cell);
  }

  railOverview.appendChild(row);

  // 共用列の情報
  const shared =
    [...new Set(items.map(v => v.x))]
      .map(x => ({
        x,
        count: items.filter(v => v.x === x).length
      }))
      .filter(v => v.count >= 2);

  if (shared.length) {
    const p =
      document.createElement("p");

    p.className =
      "hint";

    p.textContent =
      `共用列: ${
        shared
          .map(v => `x=${v.x} (${v.count}音)`)
          .join(" / ")
      }`;

    railOverview.appendChild(p);
  }
}

function calculate() {
  try {
    normalizeNotes();

    const items =
      optimizePlacement();

    lastResults = items;

    renderResults(items);
  } catch (err) {
    console.error(err);

    summaryEl.textContent =
      "計算エラー";

    resultCards.innerHTML = `
      <div class="result-card">
        <div class="eval-bad">
          × ${err.message}
        </div>

        <div class="result-meta">
          data.js の構造と配線データを確認してください。
        </div>
      </div>
    `;
  }
}

function clearAll() {
  notes = [];
  lastResults = [];

  renderAll();
  renderResults([]);
}

$("#calculate").addEventListener(
  "click",
  calculate
);

$("#clear").addEventListener(
  "click",
  clearAll
);

bpmEl.addEventListener(
  "input",
  renderAll
);

gridEl.addEventListener(
  "change",
  renderAll
);

loadingEl.addEventListener(
  "change",
  updateLoadingUI
);

$("#addLast").addEventListener("click", () => {
  normalizeNotes();

  const nextStep =
    notes.length
      ? notes[notes.length - 1].step + 1
      : 0;

  const old =
    notes[notes.length - 1]?.midi ?? 48;

  const clampedStep =
    clamp(nextStep, 0, 47);

  notes.push({
    step: clampedStep,
    midi: old,
    name:
      PITCHES.find(p => p.midi === old)?.name ||
      `MIDI${old}`
  });

  normalizeNotes();
  renderAll();
});

function initLanding() {
  const asset =
    getAsset();

  landingEl.innerHTML = "";

  asset.landings.forEach((landing, i) => {
    const option =
      document.createElement("option");

    option.value = i;
    option.textContent = landing.name;

    landingEl.appendChild(option);
  });

  // 元ツールの先頭選択と合わせる
  landingEl.selectedIndex = 0;
}

renderPitchLabels();
initLanding();
renderAll();
