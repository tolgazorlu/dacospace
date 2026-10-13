# Mission 02 · 09:00 koşuşturması: kırılma noktası

**Time:** 60-90 min · **Concept:** Little's Law, connection pool, saturation
**Lesson:** 02 · **Curriculum link:** system design 0.2 and 1.4(c)

## Senaryo

Kampanya günü. Bayiler bu sabah fiyat listesini açtı, şimdi sipariş veriyorlar. Siparişlerin %80'i 20
kampanya ürününden birini içeriyor. Patronun soruyor: **"Saniyede kaç sipariş alabiliriz?"**

Mission 01'de fiyat listesinin çok trafik kaldırdığını gördün. Sipariş yolu farklı: veritabanında
stok düşürüyor, ödeme sağlayıcısını çağırıyor ve satır yazıyor.

## 1. Önce hesapla (kağıt üzerinde, büyük testten ÖNCE)

Önce düşük yükte bir siparişin ne kadar sürdüğünü ölç:

```bash
./lab load orders 20
```

Çıktıdan `med`'i `W` olarak al. `application.yml` içinde `maximum-pool-size`'ı bul.

Şimdi 4 adımı yaz:

1. **Ne bozuk?** Henüz bilmiyorsun. Soruyu yaz: "kaç sipariş/s üstünde bozulur?"
2. **Rakamlar:** `W` = ? s, pool = ? connection.
3. **İsteğin yolu:** `OrderService.place()`'i oku. İstek ne zaman bir connection alıyor, ne zaman
   geri veriyor? (İpucu: `@Transactional`.) Yolu sırayla yaz.
4. **Matematik:** her istek bir connection'ı `W` saniye tutuyorsa, 10 connection saniyede en fazla
   kaç isteği bitirebilir? `λ_max = pool / W`

Sonucu yaz: "Sistem saniyede ___ siparişin üstünde bozuluyor."

## 2. Ölç

Tahmininin bir altı, bir üstü:

```bash
./lab load orders 40
./lab load orders 80
```

**DB connection pool** panelini izle. `pending` satırı ne zaman sıfırdan ayrılıyor?

## 3. Deney: daha büyük bir pool düzeltir mi?

`application.yml`'de `maximum-pool-size: 10`'u `30`'a değiştir, uygulamayı yeniden başlat, aynı testi
çalıştır:

```bash
./lab load orders 80
./lab compare orders
```

Bakmadan önce tahmin et: p95 3 kat daha iyi olacak mı? Sonra ölç. Beklediğin gibi olmadıysa,
nedenini bul:
- **Outbound HTTP (payment provider)** paneli ne gösteriyor?
- Bunu bir testin ortasında çalıştır. Sıfırın üstünde mi? (Kampanya ürünü satırlarını düşün.)

```bash
./lab sql "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock'"
```

Bittiğinde, **pool'u 10'a geri al**. Gerçek düzeltme mission 05 ve 06'da geliyor.

## 4. Kanıt

| | 20/s | 40/s | 80/s | 80/s (pool 30) |
|---|---|---|---|---|
| p95 | | | | |
| max pool pending | | | | |
| dropped iterations | | | | |

Hesapladığın `λ_max`, gerçek kırılma noktasından ne kadar (% olarak) uzaktı?

## 5. Kendi cümlelerinle

Tek cümle: patronuna "saniyede kaç sipariş" sorusunu yanıtlamak için hangi iki rakamı verirsin?

## Kontrol sorusu

`W`, ölçtüğün değerden 0,05 s'ye düşerse ve pool aynı kalırsa, siparişler/s cinsinden yeni kapasite
nedir? Oraya ulaşmak için `place()`'in hangi satırını transaction'ın dışına taşırdın? (Sadece yaz,
değiştirme. O mission 05.)

## Java köşesi

`OrderService.place()`'te `@Transactional` var. Kendine açıkla:
- Spring bu anotasyonu gördüğünde metodun başında ve sonunda ne yapıyor?
- Metot bir exception fırlatırsa, stok değişikliğine ne olur?
- `payments.charge(...)` satırı transaction'ın içinde mi dışında mı?