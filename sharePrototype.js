"use strict";

/*
 * 配線共有・試作版
 *
 * 既存の集音計算には手を加えず、
 * 概要図の上に「共有した場合の見た目」を重ねて表示する。
 *
 * 今回の目的：
 * 「2つのブロックを別々の列に置く」のではなく、
 * 「1列の中に2ブロックを置き、1本の配線を共有する」
 * という表示を試す。
 */

(() => {

  const overview = getElm("#divOverview");
  const overviewButton = getElm("#buttonChangeOverview");

  if (!overview || !overviewButton) return;


  /* =========================
     試作ON/OFF
     ========================= */

  const label = document.createElement("label");

  label.className = "labelInput";
  label.innerHTML =
    '<input id="checkSharePrototype" type="checkbox">' +
    '<span>配線共有（試作）</span>';

  overviewButton.parentNode.append(label);

  const checkSharePrototype =
    getElm("#checkSharePrototype");


  /* =========================
     試作用Canvas
     ========================= */

  const canvas = document.createElement("canvas");

  canvas.id = "canvasSharePrototype";

  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10";

  overview.append(canvas);


  function setCanvasSize(width, height) {

    canvas.width = width;
    canvas.height = height;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }


  /* =========================
     画像読み込み
     ========================= */

  const images = {};

  const imageNames = [
    "space",
    "openU",
    "note",
    "openD",
    "middle",
    "connection",
    "close"
  ];

  imageNames.forEach(name => {

    const image = new Image();

    image.src = `images/railparts/${name}.png`;

    images[name] = image;

  });


  function drawImage(context, name, x, y) {

    const image = images[name];

    if (!image) return;

    if (!image.complete) {

      image.onload = () => {
        context.drawImage(
          image,
          x,
          y,
          16,
          16
        );
      };

      return;
    }

    context.drawImage(
      image,
      x,
      y,
      16,
      16
    );
  }


  /* =========================
     現在の概要図の高さを取得
     ========================= */

  function getHeights() {

    const cells = tables[2].rows[3].cells;

    const heights = [];

    for (let c = 1; c <= tableLength; c++) {

      const value =
        parseInt(cells[c].textContent);

      if (!Number.isFinite(value)) break;

      heights.push(value);
    }

    return heights;
  }


  /* =========================
     共有候補を探す
     =========================
     
     ここは「試作用」の判定。

     同じ列に置いたときに、
     2つのブロックの高さが近いものを
     共有候補として扱う。

     後で実際の配線条件に合わせて
     この部分だけ精密化できる。
     ========================= */

  function findSharePairs(heights) {

    const pairs = [];

    for (let i = 0; i < heights.length; i++) {

      for (let j = i + 1; j < heights.length; j++) {

        const difference =
          Math.abs(
            heights[i] - heights[j]
          );

        /*
         * とりあえず高さ差が2以内なら
         * 「同じ配線を共有できる候補」
         * として表示する。
         */

        if (difference <= 2) {

          pairs.push({
            first: i,
            second: j,
            difference
          });

          /*
           * 1つのブロックを
           * 複数グループに入れない。
           */

          break;
        }
      }
    }

    return pairs;
  }


  /* =========================
     共有表示
     ========================= */

  function drawSharedBlock(
    context,
    x,
    y1,
    y2
  ) {

    const top =
      Math.min(y1, y2);

    const bottom =
      Math.max(y1, y2);


    /*
     * 上側ブロック
     */

    drawImage(
      context,
      "openU",
      x,
      y1
    );

    drawImage(
      context,
      "note",
      x,
      y1 + 16
    );

    drawImage(
      context,
      "openD",
      x,
      y1 + 32
    );


    /*
     * 下側ブロック
     */

    drawImage(
      context,
      "openU",
      x,
      y2
    );

    drawImage(
      context,
      "note",
      x,
      y2 + 16
    );

    drawImage(
      context,
      "openD",
      x,
      y2 + 32
    );


    /*
     * 2ブロックの間を
     * 1本の配線としてつなぐ。
     */

    for (
      let y = top + 48;
      y < bottom;
      y += 16
    ) {

      drawImage(
        context,
        "middle",
        x,
        y
      );
    }

  }


  /* =========================
     試作表示
     ========================= */

  function drawPrototype() {

    if (
      !checkSharePrototype.checked ||
      !isOverview
    ) {

      canvas.style.display = "none";

      return;
    }


    canvas.style.display = "block";


    const heights =
      getHeights();

    if (!heights.length) return;


    setCanvasSize(
      canvasOverview.width,
      canvasOverview.height
    );


    const context =
      canvas.getContext("2d");

    context.imageSmoothingEnabled = false;

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    const pairs =
      findSharePairs(heights);


    /*
     * 概要図と同じ基準で
     * 一番高い位置を求める。
     */

    const maxHeight =
      Math.max(...heights);


    /*
     * 共有候補を描画
     */

    pairs.forEach(pair => {

      const firstHeight =
        heights[pair.first];

      const secondHeight =
        heights[pair.second];


      const firstY =
        16 *
        (maxHeight - firstHeight);


      const secondY =
        16 *
        (maxHeight - secondHeight);


      /*
       * ★ここが今回のポイント
       *
       * 2つのブロックを
       * 「それぞれの列」に描かず、
       *
       * pair.first の列に
       * 2ブロックとも描く。
       */

      const x =
        16 * pair.first;


      drawSharedBlock(
        context,
        x,
        firstY,
        secondY
      );

    });

  }


  /* =========================
     更新
     ========================= */

  checkSharePrototype.addEventListener(
    "change",
    drawPrototype
  );


  /*
   * 概要図を表示したとき
   */

  overviewButton.addEventListener(
    "click",
    () => {

      setTimeout(
        drawPrototype,
        100
      );

    }
  );


  /*
   * 集音計算後
   */

  const sortButton =
    getElm("#buttonSortWirings");

  if (sortButton) {

    sortButton.addEventListener(
      "click",
      () => {

        setTimeout(
          drawPrototype,
          100
        );

      }
    );

  }


  /*
   * 画像読み込み後にも更新
   */

  imageNames.forEach(name => {

    images[name].addEventListener(
      "load",
      () => {

        if (
          checkSharePrototype.checked
        ) {
          drawPrototype();
        }

      }
    );

  });

})();
