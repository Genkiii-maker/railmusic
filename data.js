"use strict";

const dataAssets = {
  wing: {
    blockDelays: [10, 11, 11],

    ground: {
      relativeRailDelays: [13, 13, 14],

      landings: [
        { name: "1v", second: 9 },
        { name: "1d", second: 10 },
        { name: "2a", second: 11 },
        { name: "2b", second: 11 },
        { name: "3", second: 11 },
        { name: "4a", second: 10 },
        { name: "4b", second: 10 }
      ],

      accelerationsList: {
        general: [11, 8, 5, 3, 2, 1, 1],
        second: [11, 8, 5, 3, 2, 1],
        vertical: [10, 7, 4, 3, 1, 1, -1],
        diagonal: [10, 7, 4, 2, 1, 0, -1]
      },

      upOptions: [
        { delay: 0, str: "↓", up: 0, offset: 2 },
        { delay: 21, str: "↑R0", up: 0, offset: 1 },
        { delay: 64, str: "↑R1", up: 2, offset: 2 },
        { delay: 82, str: "↑G1R1", up: 3, offset: 0 },
        { delay: 98, str: "↑G2R1", up: 4, offset: 2 },
        { delay: 107, str: "↑R2", up: 4, offset: 0 },
        { delay: 111, str: "↑F", up: 0, offset: 0 },
        { delay: 120, str: "↑G3R1", up: 5, offset: 0 },
        { delay: 124, str: "↑G1R2", up: 5, offset: 0 },
        { delay: 125, str: "↑R1G1R1", up: 5, offset: 1 },
        { delay: 140, str: "↑G2R2", up: 6, offset: 2 },
        { delay: 142, str: "↑R1G2R1", up: 6, offset: 0 },
        { delay: 149, str: "↑R3", up: 6, offset: 1 },
        { delay: 154, str: "↑R1F", up: 2, offset: 1 },
        { delay: 159, str: "↑G1R1G2R1", up: 7, offset: 0 },
        { delay: 159, str: "↑G2R1G1R1", up: 7, offset: 2 },
        { delay: 162, str: "↑G3R2", up: 7, offset: 0 },
        { delay: 163, str: "↑R1G3R1", up: 7, offset: 1 },
        { delay: 167, str: "↑G1R3", up: 7, offset: 0 },
        { delay: 167, str: "↑R1G1R2", up: 5, offset: 1 },
        { delay: 167, str: "↑R2G1R1", up: 5, offset: 2 },
        { delay: 172, str: "↑G1R1F", up: 3, offset: 0 },
        { delay: 175, str: "↑G2R1G2R1", up: 8, offset: 2 },
        { delay: 184, str: "↑R1G2R2", up: 8, offset: 0 },
        { delay: 184, str: "↑R2G2R1", up: 8, offset: 1 },
        { delay: 184, str: "↑G2R3", up: 8, offset: 2 },
        { delay: 188, str: "↑G2R1F", up: 4, offset: 2 },
        { delay: 192, str: "↑R4", up: 8, offset: 2 },
        { delay: 196, str: "↑R2F", up: 4, offset: 2 },
        { delay: 197, str: "↑G3R1G2R1", up: 9, offset: 0 },
        { delay: 197, str: "↑G2R1G3R1", up: 9, offset: 2 },
        { delay: 202, str: "↑G1R2G2R1", up: 9, offset: 0 },
        { delay: 202, str: "↑G2R1G1R2", up: 9, offset: 2 },
        { delay: 205, str: "↑G3R3", up: 9, offset: 0 },
        { delay: 205, str: "↑R1G3R2", up: 9, offset: 1 },
        { delay: 205, str: "↑R2G3R1", up: 9, offset: 2 },
        { delay: 209, str: "↑R2G1R2", up: 9, offset: 2 },
        { delay: 210, str: "↑G3R1F", up: 5, offset: 0 },
        { delay: 210, str: "↑R1G1R3", up: 9, offset: 1 },
        { delay: 214, str: "↑G1R2F", up: 5, offset: 0 },
        { delay: 230, str: "↑G2R2F", up: 6, offset: 2 },
        { delay: 232, str: "↑R1G2R1F", up: 6, offset: 0 },
        { delay: 235, str: "↑R5", up: 10, offset: 0 },
        { delay: 239, str: "↑R3F", up: 6, offset: 0 }
      ],

      gaps: [
        { delay: 5, down: 1, offset: 2 },
        { delay: 9, down: 2, offset: 1 },
        { delay: 11, down: 3, offset: 2 },
        { delay: 13, down: 4, offset: 1 },
        { delay: 14, down: 5, offset: 2 },
        { delay: 15, down: 6, offset: 1 },
        { delay: 16, down: 8, offset: 0 },
        { delay: 16, down: 9, offset: 0 },
        { delay: 16, down: 10, offset: 0 },
        { delay: 16, down: 7, offset: 2 }
      ]
    }
  }
};

const landingNamesList = {
  ja: {
    general: "通常",
    second: "2マス目",
    vertical: "垂直",
    diagonal: "斜め"
  },
  en: {
    general: "General",
    second: "2nd",
    vertical: "Vertical",
    diagonal: "Diagonal"
  }
};
