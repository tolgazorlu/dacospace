# Mission 10 · Aynı sipariş iki kez

**Time:** 60-90 min · **Concept:** idempotency key, client retries, unique constraint
**Lesson:** 10 · **Curriculum link:** system design 2.1

## Senaryo

Bir bayi trende bir sipariş veriyor. İstek sana ulaşıyor, sipariş yazılıyor ve ödeniyor, ama cevap
bir tünelde kayboluyor. Uygulama her iyi uygulamanın yaptığını yapıyor: aynı isteği tekrar
gönderiyor. Bayi şimdi tek bir sipariş için iki kez ücretlendiriliyor. Bugün "aynı isteği iki kez
gönderme"nin "bir sipariş" anlamına gelmesini sağlıyorsun.

## 1. Yeniden üret

`./lab double`, bayi 2000 için 50 sipariş gönderir, her birini aynı `Idempotency-Key` header'ıyla
iki kez, ve yazılan siparişleri sayar:

```bash
./lab double
```

## 2. Önce tahmin et ve karar ver (kağıt üzerinde)

- Anahtar nerede saklanmalı, böylece ikinci istek onu, uygulamanın başka bir örneğinde bile bulsun?
- İkinci istek ne almalı: bir hata mı, yoksa ilk sipariş mi? Hangi HTTP status kodu?
- Aynı isteğin iki kopyası aynı milisaniyede geliyor. İkisi de anahtarı arıyor, ikisi de bulamıyor.
  İkisinin de bir sipariş yazmasını ne engeller?

## 3. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** bir cümle.
2. **Sayılar:** gönderilen siparişler, denemeler, yazılan siparişler.
3. **Yol:** client → `POST /api/orders` → ... anahtarı nerede kontrol ederdin?
4. **Ne bozulabilir:** adım 2'deki son sorudaki yarış durumu.

## 4. Düzelt

- `OrderController`'da `Idempotency-Key` header'ını oku (opsiyonel header: eski client'lar göndermez).
- Siparişle birlikte, bir **unique index** ile korunarak sakla (Flyway migration). İki denemenin
  yarıştığında kararı veren bir Java `if` değil, bu index'tir (mission 06'yı hatırla).
- Bilinen bir anahtarla gelen bir istek ilk siparişi döndürür. Status kodunu belirle (`200` vs
  `201`) ve controller'ın onu döndürmesini sağla (`ResponseEntity`).

```bash
./lab double
./lab load smoke
```

## 5. Kanıt

| | Before | After |
|---|---|---|
| orders written for 50 × 2 attempts | | |
| status of the second attempt | | |
| smoke failed % | | |

## 6. Kendi cümlelerinle

Bir cümle: mission 08'deki retry neden sadece bu mission tamamlandıktan sonra güvenli?

## Kontrol sorusu

İlk deneme hâlâ ödeme sağlayıcısını beklerken (sipariş `PENDING`) aynı anahtarla ikinci deneme
geliyor. İkinci deneme ne döndürmeli ve asla ne yapmamalı?

## Java köşesi

- Unique index bir insert'i reddettiğinde Spring hangi exception'ı fırlatır? Başarısız olan
  transaction'ın yeniden kullanılmaması için onu yakalamak için doğru yer nerede?
- Veritabanına tekrarı tespit etmesini güvendiğinde `save` yerine `saveAndFlush` neden kullanılır?
