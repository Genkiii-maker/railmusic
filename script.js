document.addEventListener("DOMContentLoaded", () => {
  const data = dataAssets.wing.ground;

  const app = document.createElement("div");
  app.id = "app";

  app.innerHTML = `
    <div class="card">
      <h1>Rail Wiring Calculator</h1>
      <p class="subtitle">羽あり・地上レール専用</p>

      <label>
        必要な遅延フレーム
        <input id="delayInput" type="number" value="100" min="0">
      </label>

      <label>
        高さ
        <input id="heightInput" type="number" value="0" min="0">
      </label>

      <label>
        着線パターン
        <select id="landingInput"></select>
      </label>

      <button id="calculateButton">配線を計算する</button>

      <div id="status"></div>
      <div id="results"></div>
    </div>
  `;

  document.body.appendChild(app);

  const landingSelect = document.getElementById("landingInput");

  data.landings.forEach((landing, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent =
      `${landing.name || landing.id || `パターン${index + 1}`} `
      + `(遅延 ${landing.delay}f)`;
    landingSelect.appendChild(option);
  });

  document
    .getElementById("calculateButton")
    .addEventListener("click", calculate);

  function getAcceleration(distance, type) {
    const list = data.accelerationsList[type];

    if (!list) return 0;
    if (distance < 0) return 0;
    if (distance >= list.length) return 0;

    return list[distance];
  }

  function getAccelerationType(landing, column = 0) {
    if (column === 0) {
      if (landing === "1v") return "vertical";
      if (landing === "1d") return "diagonal";
      if (landing === "2a") return "second";
    }

    return "general";
  }

  function judgeDelay(target, actual) {
    const difference = Math.abs(target - actual);

    if (difference === 0) return "◎";
    if (difference <= 1) return "○";
    if (difference <= 2) return "△";
    return "×";
  }

  function calculate() {
    const targetDelay = Number(
      document.getElementById("delayInput").value
    );

    const height = Number(
      document.getElementById("heightInput").value
    );

    const landingIndex = Number(
      document.getElementById("landingInput").value
    );

    const landing = data.landings[landingIndex];

    if (!Number.isFinite(targetDelay) || !Number.isFinite(height)) {
      showError("数値を正しく入力してね。");
      return;
    }

    const results = [];

    const accelerationType = getAccelerationType(
      landing.id,
      0
    );

    /*
     * 上側の配線候補を調べる
     */
    for (const upOption of data.upOptions) {
      for (let d = 0; d <= 12; d++) {
        const distance = height - d * 2;

        if (distance < 0) continue;

        let delay = upOption.delay;

        for (let i = 0; i < d; i++) {
          const offset =
            (upOption.offset + i) % 3;

          delay += data.relativeRailDelays[offset];
        }

        const acceleration = getAcceleration(
          distance,
          accelerationType
        );

        const actualDelay = delay - acceleration;

        const mark = judgeDelay(
          targetDelay,
          actualDelay
        );

        if (mark !== "×") {
          results.push({
            mark,
            difference: Math.abs(targetDelay - actualDelay),
            actualDelay,
            wiring: `${upOption.str}${d === 0 ? "" : ` R${d}`}`,
            height: distance,
            type: "上側候補"
          });
        }
      }
    }

    /*
     * 下側の配線候補を調べる
     */
    for (const gap of data.gaps) {
      for (let d = 0; d <= 12; d++) {
        const distance =
          height - (gap.down + d * 2);

        if (distance < 0) continue;

        let delay = gap.delay;

        for (let i = 0; i < d; i++) {
          const offset =
            (gap.offset + i) % 3;

          delay += data.relativeRailDelays[offset];
        }

        const acceleration = getAcceleration(
          distance,
          accelerationType
        );

        const actualDelay = delay - acceleration;

        const mark = judgeDelay(
          targetDelay,
          actualDelay
        );

        if (mark !== "×") {
          results.push({
            mark,
            difference: Math.abs(targetDelay - actualDelay),
            actualDelay,
            wiring: `G${gap.down}${d === 0 ? "" : ` R${d}`}`,
            height: distance,
            type: "下側候補"
          });
        }
      }
    }

    results.sort((a, b) => {
      const rank = {
        "◎": 0,
        "○": 1,
        "△": 2
      };

      return (
        rank[a.mark] - rank[b.mark]
        || a.difference - b.difference
      );
    });

    showResults(results, targetDelay, height);
  }

  function showResults(results, targetDelay, height) {
    const status = document.getElementById("status");
    const resultBox = document.getElementById("results");

    if (results.length === 0) {
      status.innerHTML = `
        <div class="warning">
          条件に合う配線が見つかりませんでした。
        </div>
      `;

      resultBox.innerHTML = "";
      return;
    }

    status.innerHTML = `
      <div class="success">
        ${results.length}件の候補が見つかりました！
      </div>
    `;

    resultBox.innerHTML = `
      <h2>計算結果</h2>
      <p>
        目標遅延：${targetDelay}f　
        高さ：${height}
      </p>

      <div class="result-list">
        ${results.slice(0, 30).map(result => `
          <div class="result ${result.mark}">
            <div class="result-top">
              <strong>${result.mark}</strong>
              <span>${result.type}</span>
            </div>

            <div class="wiring">
              ${result.wiring}
            </div>

            <div class="detail">
              実際の遅延：${result.actualDelay}f　
              誤差：${result.difference}f　
              高さ：${result.height}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function showError(message) {
    document.getElementById("status").innerHTML = `
      <div class="warning">${message}</div>
    `;
  }
});
