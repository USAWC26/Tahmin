const axios = require("axios");

const endpoints = [
  "standings",
  "matches",
  "fixtures",
  "bracket",
  "knockout",
  "rounds",
  "playoffs"
];

(async () => {
  for (const ep of endpoints) {
    try {
      const r = await axios.get(
        `https://api.zafronix.com/fifa/worldcup/v1/${ep}`,
        {
          params: { year: 2026 },
          headers: {
            "X-API-Key": process.env.API_KEY,
            Accept: "application/json"
          }
        }
      );

      console.log("\n========================");
      console.log(ep.toUpperCase());
      console.log("========================");
      console.log(JSON.stringify(r.data, null, 2));
      const stages = [...new Set(r.data.map(x => x.stage))];
console.log("STAGES:", stages);
    } catch (e) {
      console.log(`${ep} -> ${e.response?.status || e.message}`);
    }
  }
})();
