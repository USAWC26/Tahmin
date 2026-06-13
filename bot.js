JavaScript
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    console.log("1. Canlı puan durumu football-data.org üzerinden çekiliyor...");
    
    // API'den Dünya Kupası (WC) puan durumunu çek (Headers kısmı bu API'ye özeldir)
    const response = await axios.get('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 'X-Auth-Token': process.env.API_KEY }
    });
    
    // Sadece grupların genel (TOTAL) puan durumunu filtrele
    const gruplar = response.data.standings.filter(s => s.type === 'TOTAL');
    
    // Veriyi bizim botun anlayacağı formata çeviriyoruz: { "A": ["MEX", "CAN", "USA"], "B": [...] }
    const canliSiralama = {};
    
    gruplar.forEach(grupData => {
        // API'den gelen "GROUP_A" isminden sadece "A" harfini alıyoruz
        const grupHarfi = grupData.group.replace('GROUP_', ''); 
        
        // Tablodaki takımların 3 harfli kısa kodlarını (tla) sırasıyla listeye alıyoruz
        const takimSirasi = grupData.table.map(row => row.team.tla);
        
        canliSiralama[grupHarfi] = takimSirasi;
    });

    console.log("Güncel Sıralama Başarıyla Alındı!");

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
            // HTML tarafında takım seçici div yapısının 'data-team' kullandığını varsayıyoruz
            const kutuSecici = `[data-team="${takimKodu}"]`; 
            
            try {
               await page.waitForSelector(kutuSecici, { timeout: 2000 });
               await page.click(kutuSecici); // Sırasıyla 1., 2., 3. olarak tıklar
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
    console.error("Kritik Hata:", error.message);
    process.exit(1);
  }
})();
