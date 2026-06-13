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

console.log("5. Gerçek Sonuçlar ekranı açılıyor...");

await page.waitForSelector('#goOfficial', {
  visible: true,
  timeout: 15000
});

console.log("goOfficial bulundu");

page.once('dialog', async dialog => {
  console.log("PIN penceresi açıldı");
  await dialog.accept(process.env.ADMIN_SIFRE);
});

await page.$eval('#goOfficial', el => el.click());

await new Promise(r => setTimeout(r, 3000));

console.log("Gerçek Sonuçlar ekranına girildi");

    console.log("5. Sıralamalar arayüze işleniyor...");
    for (const [grup, takimlar] of Object.entries(canliSiralama)) {
        for (const takimKodu of takimlar) {
            const kutuSecici = `[data-team="${takimKodu}"]`; 
            try {
               await page.waitForSelector(kutuSecici, { timeout: 2000 });
               await page.click(kutuSecici); 
               await new Promise(r => setTimeout(r, 500));
            } catch(e) {
               console.log(`Uyarı: Arayüzde ${takimKodu} kodlu takım bulunamadı.`);
            }
        }
    }

    console.log("6. Yeni kod üretiliyor...");
    await page.click('#genS'); 
    await new Promise(r => setTimeout(r, 1000));

    const yeniKod = await page.$eval('#outS', el => el.value);
    fs.writeFileSync('sonuc.txt', yeniKod);
    console.log("İşlem başarıyla tamamlandı! Yeni sıralama github'a kaydedilecek.");

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
