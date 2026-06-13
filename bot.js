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
    
    // Zafronix verisinin JSON ağacını yakalıyoruz
    let gruplar = response.data.standings || response.data.data || response.data;
    if (!Array.isArray(gruplar) && gruplar.groups) {
        gruplar = gruplar.groups;
    }

    try {
        gruplar.forEach(grupData => {
            // Grup ismini sadeleştir ("Group A" -> "A")
            const grupIsmi = grupData.group || grupData.name || '';
            const grupHarfi = grupIsmi.replace('Group ', '').trim();
            
            // Takımların sıralandığı dizi
            const takimlar = grupData.table || grupData.standings || grupData.teams;
            
            const takimSirasi = takimlar.map(row => {
                const takim = row.team || row;
                // Arayüzündeki 3 harfli kodlarla (örn: MEX, BRA) eşleşmesi için:
                return (takim.code || takim.tla || takim.name.substring(0, 3)).toUpperCase(); 
            });
            
            if (grupHarfi && takimSirasi.length > 0) {
                canliSiralama[grupHarfi] = takimSirasi;
            }
        });
        console.log("Sıralama Başarıyla Çevrildi. İşlenecek Veri:", canliSiralama);
    } catch(e) {
        console.error("API Veri Formatı Beklenenden Farklı! Gelen Ham Veri:");
        console.error(JSON.stringify(response.data, null, 2));
        throw new Error("Veri eşleştirme hatası (JSON formatı farklı).");
    }

    console.log("2. Sanal tarayıcı başlatılıyor...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    console.log("3. Yerel sistem ayağa kaldırılıyor...");
    await page.goto(`file://${__dirname}/index.html`);

    const mevcutKod = fs.readFileSync('sonuc.txt', 'utf8');
    await page.type('#welcomeCode', mevcutKod);
    await page.click('#welcomeCodeBtn');
    await new Promise(r => setTimeout(r, 1000));

    console.log("4. OFFICIAL hesap ile giriş yapılıyor...");
    await page.type('#welcomeName', 'OFFICIAL');
    await page.type('#welcomePno', process.env.ADMIN_SIFRE);
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));

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
