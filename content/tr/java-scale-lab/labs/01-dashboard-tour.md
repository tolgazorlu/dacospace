# Mission 01 · Gözlerini aç: bir dashboard turu

**Time:** 45-60 min · **Concept:** RED metrics, p50/p95/p99, why the average lies
**Lesson:** 01 · **Curriculum link:** system design 2.7 Observability

## Senaryo

Bir bayi sipariş sistemi işletiyorsun. 2.000 bayi, 20.000 ürün, geçen yıldan 400k sipariş.
Bayiler sabah fiyat listesini açıyor, gün boyunca sipariş veriyor ve ara sıra "son
siparişlerim" ekranına bakıyor. Henüz hiçbir şey optimize edilmedi.

Bugün hiçbir kod değiştirmiyorsun. Sadece **görmeyi** öğreniyorsun. Sonraki 22 mission hepsi
aynı şekilde işliyor: "bu grafiğe bak, bu sayı hareket etti mi?" Grafiği okuyamıyorsan,
bunların hiçbiri işe yaramaz.

## Kurulum

```bash
./lab up
./lab seed
```

`./lab seed` sadece bir kez gerekli (yaklaşık 15 s). Uygulamayı environment bar'dan başlat
veya ayrı bir terminalde `./lab run` çalıştır.

Grafana: http://localhost:4182 → Dashboards → Scale Lab → **Scale Lab**

## 1. Önce tahmin et (yaz)

Testi çalıştırmadan önce şunları yaz:

1. Saniyede 100 request'te, fiyat listesi endpoint'inin p95'i ms olarak nedir?
2. p99, ortalamadan kaç kat daha büyük?

Yanlış bir tahmin sorun değil. Tahmin etmeden ölçmek, sonucu "evet, beklendiği gibi" diye
okumana yol açar. Tahmin, ölçümü dikkatlice okumaya zorlar.

## 2. Ölç

```bash
./lab load morning-rush 100
```

Test 100 s boyunca çalışır. Çalışırken şu dört paneli izle:

| Panel | What it tells you |
|---|---|
| Rate | Saniyedeki request sayısı. 100'e ulaşıyor mu? |
| Errors | 4xx/5xx. Şu an boş olmalı. |
| Duration p50/p95/p99 + average | Asıl ders burada |
| DB connection pool | `active`, `idle`, `pending` |

## 3. Keşfet

1. Dashboard'daki "average (lies)" çizgisini p99 ile karşılaştır. Aralarındaki fark ne kadar?
2. Grafana → Explore → **Tempo** → Search → en yavaş trace'i aç.
   Span'lere bak: zamanın çoğu nereye gitti? Controller mı, SQL mi?
3. Prometheus'ta (http://localhost:4183) şu sorguyu çalıştır ve döndürdüğü şeyi kendi
   cümlelerinle açıkla:
   ```
   rate(http_server_requests_seconds_count{uri="/api/products"}[1m])
   ```
4. Yavaş sorgu raporunu çalıştır. Hangi sorgu toplam en çok zamanı harcadı?

```bash
./lab topsql
```

## 4. Kanıt

Bu tabloyu defterine doldur:

| | My guess | Measured |
|---|---|---|
| p95 (price list) | | |
| average | | |
| p99 | | |
| where the slowest trace spent its time | | |

## 5. Kendi cümlelerinle (bu mission bu olmadan tamamlanmaz)

Tek cümle: ortalama ve p99 arasındaki farkı bir bayiye nasıl açıklardın?

## Kontrol sorusu

Dashboard p50 = 20 ms ve p99 = 2.000 ms gösteriyor. Bir meslektaş "ortalama 45 ms, sorun
yok" diyor. Ona hangi tek sayıyı gösterirsin ve neden?

## Java köşesi

`ProductController.java`'yı aç. Şu üç şeyi bul ve kendine açıkla:
- `@RestController` ne yapar?
- URL'nin hangi kısmını `@RequestParam String category` alır?
- `.stream().map(ProductView::from).toList()` ne üretir?

Bilinmeyen her terimi java-dev-journal'ına yaz.