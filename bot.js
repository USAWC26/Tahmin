const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    console.log("1. Canlı puan durumu Zafronix API'den çekiliyor...");
    
    // Zafronix API Dünya Kupası Standings Uç Noktası
    const response = await axios.get('https://api.zafronix.com/fifa/worldcup/v1/standings', {
      params: { year: 2026 },
      headers: {
        'X-API-Key': process.env.API_KEY,
        'Accept': 'application/json'
      }
    });
fs.writeFileSync(
    "api.json",
    JSON.stringify(response.data, null, 2)
);
    const canliSiralama = {};

const TEAM_MAP = {
  "Mexico":"mx","South Africa":"za","Korea Republic":"kr","Czechia":"cz",
  "Canada":"ca","Bosnia and Herzegovina":"ba","Qatar":"qa","Switzerland":"ch",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "USA":"us","Paraguay":"py","Australia":"au","Türkiye":"tr",
  "Germany":"de","Curaçao":"cw","Côte d'Ivoire":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","IR Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cabo Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","Congo DR":"cd","Uzbekistan":"uz","Colombia":"co",
  "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"
};

try {

    Object.entries(response.data.groups).forEach(([grupHarfi, takimlar]) => {

        canliSiralama[grupHarfi] = takimlar
            .map(t => TEAM_MAP[t.team])
            .filter(Boolean);

    });

    console.log("Sıralama Başarıyla Çevrildi:", canliSiralama);
        console.log("Sıralama Başarıyla Çevrildi. İşlenecek Veri:", canliSiralama);
    } catch(e) {
        console.error("API Veri Formatı Beklenenden Farklı! Gelen Ham Veri:");
        console.error(JSON.stringify(response.data, null, 2));
        throw new Error("Veri eşleştirme hatası (JSON formatı farklı).");
    }

    console.log("2. Sanal tarayıcı başlatılıyor...");
    const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});
    const page = await browser.newPage();

    console.log("3. Yerel sistem ayağa kaldırılıyor...");
    await page.goto(`file://${__dirname}/index.html`);

    console.log("4. Siteye giriş yapılıyor...");

await page.waitForSelector('#welcomeName', {
  visible: true,
  timeout: 10000
});

await page.type('#welcomeName', 'AAA AAA');
await page.type('#welcomePno', '123456');

await page.click('#welcomeStart');

await new Promise(r => setTimeout(r, 2000));

await page.screenshot({ path: 'ekran.png' });

console.log("5. Oyuncu listesi aranıyor...");

await page.waitForSelector('#userSel', {
  visible: true,
  timeout: 15000
});

console.log("Oyuncu listesi bulundu");

const options = await page.$$eval(
  '#userSel option',
  opts => opts.map(o => ({
    text: o.textContent,
    value: o.value
  }))
);

console.log("OYUNCULAR:");
console.log(JSON.stringify(options, null, 2));

console.log("Gerçek Sonuçlar seçiliyor...");

page.once('dialog', async dialog => {
  console.log("PIN istendi");
  console.log("PIN gönderiliyor...");
  
  await dialog.accept(process.env.ADMIN_SIFRE);
  
  console.log("PIN gönderildi");
});

await page.select('#userSel', '__official__');

console.log("Official seçildi");

await new Promise(r => setTimeout(r, 5000));

console.log("5 saniye beklendi");
console.log("Gerçek Sonuçlar hesabına geçildi");
    
    console.log("5. Sıralamalar arayüze işleniyor...");

for (const [grup, takimlar] of Object.entries(canliSiralama)) {

    for (const takimKodu of takimlar) {

        const takimIndex = await page.evaluate((grup, takimKodu) => {

            const GROUPS = {
                A:["mx","za","kr","cz"],
                B:["ca","ba","qa","ch"],
                C:["br","ma","ht","gb-sct"],
                D:["us","py","au","tr"],
                E:["de","cw","ci","ec"],
                F:["nl","jp","se","tn"],
                G:["be","eg","ir","nz"],
                H:["es","cv","sa","uy"],
                I:["fr","sn","iq","no"],
                J:["ar","dz","at","jo"],
                K:["pt","cd","uz","co"],
                L:["gb-eng","hr","gh","pa"]
            };

            return GROUPS[grup].indexOf(takimKodu);

        }, grup, takimKodu);

        if (takimIndex === -1) {
            console.log(`Takım bulunamadı: ${takimKodu}`);
            continue;
        }

        const selector = `[data-rank="${grup}-${takimIndex}"]`;

        try {

            await page.waitForSelector(selector, { timeout: 5000 });

            await page.click(selector);

            console.log(`${grup} -> ${takimKodu} seçildi`);

            await new Promise(r => setTimeout(r, 300));

        } catch(err) {

            console.log(`Tıklanamadı: ${selector}`);

        }
    }
}

await page.screenshot({
    path: 'son-secim.png',
    fullPage: true
});
    

    // ===== BONUSLAR (liderlikten önce) — cevabı bildikçe "..." yerine yaz; "..." veya boş kalanlar atlanır =====
    console.log("5.5. Bonuslar işaretleniyor...");

await page.click('button[data-tab="bonus"]');

await page.waitForSelector('[data-bonus]', { timeout: 10000 });

const bonuslar = [
    { id: "scorer",     tip: "yazi",     cevap: "..." },      // ⚽ Gol Kralı (oyuncu adı)        örn: "Kylian Mbappé"
    { id: "assist",     tip: "yazi",     cevap: "..." },      // 🅰️ Asist Kralı (oyuncu adı)      örn: "Lamine Yamal"
    { id: "finalgoals", tip: "yazi",     cevap: "..." },      // 🥅 Final maçı toplam gol (sayı)  örn: "3"
    { id: "glove",      tip: "dropdown", cevap: "..." },      // 🧤 Altın Eldiven (ülke)          örn: "Fransa"
    { id: "topteam",    tip: "dropdown", cevap: "..." },      // ⚽ En Golcü Takım (ülke)         örn: "Brezilya"
    { id: "hattrick",   tip: "dropdown", cevap: "Arjantin" }, // 🎩 İlk Hat-trick (ülke)          örn: "Arjantin"
];

for (const b of bonuslar) {

    if (!b.cevap || b.cevap === "...") continue;   // doldurulmamış -> atla

    try {
        if (b.tip === "dropdown") {
            // ülke seçimi (dropdown) — otomatik "change" tetikler
            await page.select(`select[data-bonus="${b.id}"]`, b.cevap);
        } else {
            // yazı/sayı girişi — önce temizle, sonra yaz ("input" tetikler)
            await page.click(`input[data-bonus="${b.id}"]`, { clickCount: 3 });
            await page.type(`input[data-bonus="${b.id}"]`, String(b.cevap));
        }
        console.log(`Bonus işaretlendi: ${b.id} = ${b.cevap}`);
    } catch (e) {
        console.log(`Bonus atlandı: ${b.id} (${e.message})`);
    }
}

await new Promise(r => setTimeout(r, 500));

    console.log("6. Liderlik sekmesine geçiliyor...");

await page.click('button[data-tab="board"]');

await new Promise(r => setTimeout(r, 2000));

let yayinKodu = "";

await page.evaluate(() => {

    window.yayinKodu = "";

    window.prompt = (msg, def) => {

        window.yayinKodu = def || "";

        return def;
    };

});

await page.click('#publishBtn');

await new Promise(r => setTimeout(r, 2000));

yayinKodu = await page.evaluate(() => window.yayinKodu);

fs.writeFileSync('sonuc.txt', yayinKodu);

console.log("Kod kaydedildi:");
console.log(yayinKodu);

console.log("İşlem başarıyla tamamlandı!");

    await browser.close();
  } catch (error) {
    if (error.response) {
      console.error("API Bizi Reddetti! Durum Kodu:", error.response.status);
      console.error("Reddedilme Sebebi:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Kritik Hata:", error.message);
    }
    process.exit(1);
  }
})();
