# TokenVesting Smart Contract 🔒

Bu akıllı kontrat, ERC20 token'ları için güvenli ve esnek bir vesting (zaman kilitli) mekanizması sağlar. Farklı decimal değerlerine sahip token'lar (örn: USDT-6, WETH-18) için tam uyumluluk sunar.

## 📋 Özellikler

- ✨ Çoklu vesting planı desteği
- 🔐 Güvenli token kilitleme mekanizması
- ⏰ Cliff süresi desteği
- 📊 Linear vesting hesaplaması
- 🎯 Token bazlı decimal uyumluluğu
- 🛡️ Kapsamlı güvenlik kontrolleri
- 📝 Detaylı event logging
- 👑 Güvenli owner yönetimi

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler
- Solidity: ^0.8.20
- OpenZeppelin: ^5.0.1
- Hardhat: ^2.22.18

### Bağımlılıklar
```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.2.0",
    "hardhat": "^2.22.18"
  }
}
```

## 🚀 Kurulum

1. Repo'yu klonlayın:
```bash
git clone https://github.com/sarp07/Token_Vesting.git token-vesting
cd token-vesting
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. .env dosyasını oluşturun:
```bash
cp .env.example .env
# .env dosyasına private key'inizi ve BSCScan API key'inizi ekleyin
```

4. Kontratları derleyin:
```bash
npm run compile
```

## 🧪 Test

Aşağıdaki komutlarla testleri çalıştırabilirsiniz:

```bash
# Normal test
npm run test

# Test coverage raporu
npm run test:coverage

# Gas kullanım raporu ile test
npm run test:gas
```

## 📦 Deploy

### Testnet Deploy
```bash
# BSC Testnet'e deploy
npm run deploy:testnet
```

### Mainnet Deploy
```bash
# BSC Mainnet'e deploy
npm run deploy:mainnet
```

## ✅ Kontrat Doğrulama (Verify)

Deploy edilen kontratları BSCScan'de doğrulamak için:

1. BSCScan API key'inizi alın:
   - https://bscscan.com/myapikey adresine gidin
   - API key oluşturun
   - `.env` dosyasına `BSCSCAN_API_KEY` olarak ekleyin

2. TestToken Kontratını Doğrulama:
```bash
# Testnet için
npm run verify:testnet --address KONTRAT_ADRESI --constructor-args "Test Token" "TST" 6

# Mainnet için
npm run verify:mainnet --address KONTRAT_ADRESI --constructor-args "Test Token" "TST" 6
```

3. TokenVesting Kontratını Doğrulama:
```bash
# Testnet için
npm run verify:testnet --address KONTRAT_ADRESI

# Mainnet için
npm run verify:mainnet --address KONTRAT_ADRESI
```

## 🛠 Yardımcı Komutlar

```bash
# Yerel node başlat
npm run node

# Hesapları listele
npm run accounts

# Kod formatla (Prettier ile)
npm run format

# Cache temizle
npm run clean
```

## 💡 Kullanım Senaryoları

### 1. Token Vesting Planı Oluşturma

```javascript
// Token kontratı adresi ve miktarı
const tokenAddress = "0x...";  // ERC20 token adresi
const amount = ethers.parseUnits("1000", decimals);  // 1000 token

// Vesting parametreleri
const beneficiary = "0x...";  // Faydalanıcı adresi
const startTime = Math.floor(Date.now() / 1000);  // Başlangıç zamanı
const cliffDuration = 2592000;  // 30 gün (saniye cinsinden)
const duration = 31536000;  // 1 yıl (saniye cinsinden)
const slicePeriodSeconds = 86400;  // 1 gün (saniye cinsinden)

// Token approve işlemi
await token.approve(vestingContract.address, amount);

// Vesting planı oluştur
await vestingContract.createVestingSchedule(
    tokenAddress,
    beneficiary,
    startTime,
    cliffDuration,
    duration,
    slicePeriodSeconds,
    amount
);
```

### 2. Token'ları Çekme

```javascript
// Vesting plan ID'sini al
const schedules = await vestingContract.getVestingSchedulesByBeneficiary(beneficiary);
const vestingScheduleId = schedules[0];

// Çekilebilir miktar hesapla
const releasableAmount = await vestingContract.computeReleasableAmount(vestingScheduleId);

// Token'ları çek
if (releasableAmount > 0) {
    await vestingContract.release(vestingScheduleId, releasableAmount);
}
```

### 3. Farklı Decimal'li Token'lar İçin Kullanım

```javascript
// USDT için (6 decimals)
const usdtAmount = ethers.parseUnits("1000", 6);  // 1000 USDT

// WETH için (18 decimals)
const wethAmount = ethers.parseUnits("1000", 18);  // 1000 WETH

// Kontrat otomatik olarak decimal değerini algılar
await vestingContract.createVestingSchedule(
    usdtAddress,
    beneficiary,
    startTime,
    cliffDuration,
    duration,
    slicePeriodSeconds,
    usdtAmount
);
```

## 📊 Vesting Hesaplama Örneği

1. **Başlangıç Parametreleri**:
   - Toplam Miktar: 1000 token
   - Cliff Süresi: 30 gün
   - Toplam Süre: 365 gün
   - Dilim Periyodu: 1 gün

2. **Zaman Çizelgesi**:
   - 0-30 gün: 0 token (cliff dönemi)
   - 30-365 gün: Linear artış
   - 365 gün sonra: Tüm token'lar serbest

3. **Örnek Hesaplama**:
   ```
   180. gün için çekilebilir miktar:
   = (Toplam Miktar * Geçen Süre) / Toplam Süre
   = (1000 * 150) / 335
   ≈ 447.76 token
   ```

## 🔒 Güvenlik

### Audit Raporu
Detaylı güvenlik denetim raporu için [audit_tr.md](./audit/audit_tr.md) dosyasını inceleyebilirsiniz.

### Önemli Güvenlik Özellikleri
- ✅ ReentrancyGuard koruması
- ✅ SafeERC20 implementasyonu
- ✅ Decimal uyumluluk kontrolleri
- ✅ Güvenli owner yönetimi
- ✅ Event logging

## 🌐 Ağ Desteği

- BSC Mainnet
- BSC Testnet
- Diğer EVM uyumlu ağlar

## 📝 Lisans

MIT License. Detaylar için [LICENSE](./LICENSE) dosyasını inceleyebilirsiniz.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 İletişim

- GitHub Issues
- Telegram: [@solazan](https://t.me/solazan)

## 🙏 Teşekkürler

- OpenZeppelin ekibine güvenli kontrat kütüphaneleri için
- Hardhat ekibine geliştirme araçları için

<br/>

```
░██████╗░█████╗░██╗░░░░░░█████╗░███████╗░█████╗░███╗░░██╗
██╔════╝██╔══██╗██║░░░░░██╔══██╗╚════██║██╔══██╗████╗░██║
╚█████╗░██║░░██║██║░░░░░███████║░░███╔═╝███████║██╔██╗██║
░╚═══██╗██║░░██║██║░░░░░██╔══██║██╔══╝░░██╔══██║██║╚████║
██████╔╝╚█████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║
╚═════╝░░╚════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝
```

<div align="center">
<i>Made with ❤️ by SOLAZAN</i>
</div>
