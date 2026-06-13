JavaScript
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // 1. Sanal tarayıcıyı başlat
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // 2. Repodaki index.html dosyasını aç
  await page.goto(`file://${__dirname}/index.html`);

  // 3. Mevcut sonuc.txt'yi oku ve sisteme yükle
  const mevcutKod = fs.readFileSync('sonuc.txt', 'utf8');
  await page.type('#welcomeCode', mevcutKod);
  await page.click('#welcomeCodeBtn');

  // 4. Admin girişi yap
  await page.type('#welcomeName', 'OFFICIAL'); // Kendi referans kullanıcı adın neyse 'OFFICIAL' yerine onu yazabilirsin
  await page.type('#welcomePno', process.env.ADMIN_SIFRE);
  await page.keyboard.press('Enter');

  // Arayüzün yüklenmesi için 2 saniye bekle
  await new Promise(r => setTimeout(r, 2000));

  // 5. API'den Canlı Verileri Çek ve Arayüze Tıkla
  // ---> BURASI EKSİK: Beraber tamamlayacağız <---

  // 6. Yeni Kodu Oluştur ve sonuc.txt'ye yaz
  // await page.click('#YAYINLA_BUTONU_ID');
  // const yeniKod = await page.$eval('#CIKTI_KUTUSU_ID', el => el.value);
  // fs.writeFileSync('sonuc.txt', yeniKod);

  await browser.close();
})();
