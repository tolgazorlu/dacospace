# Lesson 10 · Aynı sipariş iki kez

**Reading time:** 11 min · **Concept:** idempotency key, client retries after timeout, unique constraint, storing the first response
**Mission:** 10

## Problem

Bir bayi, bir fırının haftalık un siparişinde "Siparişi ver"e dokunuyor. Ekran dönüyor. Üç saniye
geçiyor, hiçbir şey olmuyor, bayinin treni bir tünele giriyor ve bağlantı tamamen kesiliyor.
Bayinin telefonunda uygulama mantıklı olanı yapıyor: bağlantı geri geldiğinde aynı isteği yeniden
deniyor. Bu arada bayi, biraz önce hâlâ dönen bir ekran gördüğü için, sabırsızlıkla butona ikinci
kez dokunmuştu bile. Aynı `POST /api/orders`'ın iki, belki üç kopyası servisine ulaşıyor. Stok iki
kez rezerve ediliyor, ödeme sağlayıcısı iki kez ücretlendiriliyor ve bayi sadece bir kez istediği
un için iki aynı siparişle kalıyor.

## Neden zor

Lesson 08 sana retry'ların, bir çağrı bir şey yapmadan önce başarısız olmuş olabileceğinde doğru
hamle olduğunu öğretti. Ama `POST /api/orders` o türden bir çağrı değil: stok düşürür, bir kartı
ücretlendirir ve bir satır yazar. İki kez çalıştır, bir etkinin iki kez güvenle yapılması değil,
iki gerçek dünya etkisi alırsın. Client, bir timeout'tan tek başına, sunucunun isteği hiç almadığını
mı yoksa aldığını ve cevabın geri yolda kaybolduğunu mu anlayamaz. Retry yapmak doğru içgüdüdür;
aynı yan etkiyi iki kez yapmak yanlış sonuçtur. İsteği *etkiyi* tekrarlamadan yeniden deneyecek bir
yola ihtiyacın var.

## Fikir: client'ın sana bir kez verdiği bir anahtar

Düzeltme sadece sunucuda yaşamıyor, client ile sunucu arasında bir sözleşme. Siparişi göndermeden
önce, bayinin uygulaması rastgele bir **idempotency key** üretir; ağ onu ne kadar çok yeniden
denemeye zorlasa da bu tek siparişi vermeye yönelik bu tek mantıksal denemeyi tanımlayan bir token.
Uygulama bu aynı anahtarı, retry'lar dahil her denemeye ekler:

```
Attempt 1 (times out, response lost): POST /api/orders   Idempotency-Key: 7f1e-aa21
Attempt 2 (retry, same key):          POST /api/orders   Idempotency-Key: 7f1e-aa21
```

Sunucunun işi basitçe şöyle ifade edilebilir: `7f1e-aa21`'i ilk gördüğünde gerçek işi bir kez yap.
`7f1e-aa21`'i her gördüğü sonraki zamanda, işi atla ve ilk kez ne yanıt verdiyse onu geri ver.

### "İlk kez"i bir unique constraint ile güvenli yapmak

"Bu anahtarı görüp görmediğimizi kontrol et, sonra harekete geç" basit görünür, ama bayinin
isteğinin iki kopyası neredeyse aynı anda gelebilir ve her ikisi de hiçbiri bitirmeden önce "henüz
görülmedi" görebilir; bu, lesson 06'da stok için düzelttiğin aynı oku-kontrol et-yaz yarışıdır.
Güvenilir versiyon bir Java `if`'i yerine veritabanına dayanır: idempotency key sütununda bir
**unique constraint**'i olan bir tablo.

```sql
CREATE TABLE idempotency_keys (
    key          TEXT PRIMARY KEY,
    order_id     BIGINT,
    response_body TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
```

Neredeyse eş zamanlı iki istek de `7f1e-aa21` için bir satır `INSERT` etmeye çalışıyor. Postgres
bu insert'lerden sadece birinin başarılı olabileceğini garanti eder; ikincisi anında ve bedavaya,
unique-violation hatasıyla başarısız olur, çünkü veritabanının kendisi aynı primary key'e sahip iki
satırı tutmaz. Insert'i başarılı olan istek gerçek işi yapmaya gider: stok düşürür, ödeme
sağlayıcısını çağırır, siparişi yazar. Insert'i başarısız olan istek, kesin olarak, diğerinin
bunu yaptığını (veya zaten yaptığını) bilir ve bunun yerine saklanan sonucu getirmeye ve döndürmeye
gider.

### Sadece bir bayrak değil, ilk cevabı saklamak

Yaygın bir yarım tedbir, sadece "bu anahtar kullanıldı"yı hatırlamak ve tekrarlarda genel bir
"zaten işlendi" mesajı döndürmektir. Bu burada yeterli değil: bayinin telefonundaki retry hâlâ
bayiye bir fiş göstermek için gerçek sipariş onayına, sipariş id'sine, belki toplam fiyata ihtiyaç
duyar. Dolayısıyla ilk başarılı deneme için satır, geri gönderilen **response body**'yi de saklar.
Aynı anahtarla gelen her sonraki istek, gerçek iş sadece bir kez olmuş olsa da, sanki gerçek iş
yeniden olmuş gibi, byte byte o tam saklanmış cevabı alır.

```
Attempt 1: inserts key, lowers stock, charges card, writes order #501, stores the 201 response.
Attempt 2: insert fails (key exists), reads the stored response, returns the same 201 for order #501.
```

Bayi tarafında, butona yapılan her iki dokunuş ve ikisinin arasındaki otomatik retry, tek bir
siparişe, numara 501'e, tek bir ücretlendirmeye işaret ederek sonlanır.

### İyi bir anahtarı ne yapar

Anahtarın client'tan gelmesi gerekir, sunucudan değil, çünkü sunucu butona yapılan iki ayrı
dokunuşu kendi başına ayırt edemez; sadece client "bu hâlâ aynı deneme" ile "bu yepyeni bir sipariş"
arasındaki farkı bilir. Gerçekten yeni her sipariş için taze üretilen ve o aynı siparişin
retry'ları için yeniden kullanılan bir anahtar, tüm mekanizmayı çalıştıran şeydir. Bir bayinin
her siparişi için aynı olan bir anahtar, on farklı siparişi yanlışlıkla bire indirir; her retry'da
farklı olan bir anahtar ise amacını tamamen boşa çıkarır.

## Bununla nerede karşılaşırsın

- Yeniden deneyebilecek bir client'ın arkasında para harcayan veya stok değiştiren herhangi bir
  endpoint: ödemeler, sipariş verme, bilet rezervasyonu.
- Ödeme sağlayıcılarının kendileri de genellikle, bir katman daha ötede aynı nedenle *onlara* bir
  idempotency key göndermeni gerektirir.
- Kod incelemesi: "bu POST iki kez aynı body ile gelirse ne olur" sorusu, doğal olarak idempotent
  olmayan herhangi bir endpoint için, düz bir `GET` gibi olmayan, makul bir sorudur.

## Tek cümlelik özet

> Bir idempotency key, bir client'ın doğal olarak tekrarlanabilir olmayan bir işlemi güvenle
> yeniden denemesine izin verir; sunucunun gerçek işi bir unique constraint'in arkasında bir kez
> yapmasını ve o anahtarı taşıyan her sonraki isteğe aynı saklanmış cevabı geri vermesini
> sağlayarak.

## Kontrol sorusu

Bir bayinin uygulaması, kararsız bir bağlantı nedeniyle aynı idempotency key'i üç kez gönderiyor:
ilk deneme sipariş #220'yi oluşturuyor ve kartı başarıyla ücretlendiriyor, ama cevap telefon
görmeden kayboluyor. İkinci ve üçüncü deneme ne geri almalı ve tasarımın hangi parçası kartın üç
kez değil tam olarak bir kez ücretlendirildiğini garanti ediyor?
