# Mission 04 · Bir istek, çok sayıda query

**Time:** 60-90 min · **Concept:** N+1, Hibernate lazy loading, batch fetching
**Lesson:** 04 · **Curriculum link:** system design 1.4(b)

## Senaryo

Mission 03'te index'i ekledin. Orders query'si onlarca milisaniyeden bir milisaniyenin altına düştü.
Ama "benim son siparişlerim" hâlâ saniyede 50 istekte çöküyor. Düzelttiğin query, zamanı yiyen query
değildi. Bugün endpoint'in Postgres'e gerçekte ne gönderdiğini sayıyorsun.

## 1. Önce tahmin et (kağıt üzerinde)

`OrderService.recentOrders()` ve `OrderView.from()`'u oku. Endpoint, bir bayinin son 20 siparişini,
her birinin item'larıyla ve her item'ın ürün adıyla birlikte döndürüyor.

- **Bir** istek kaç SQL statement'ı gönderiyor? Ölçmeden önce bir sayı yaz.
- Java'nın hangi satırı ekstra olanları tetikliyor?

## 2. Query'leri say

İstatistikleri sıfırla, tam olarak bir istek gönder, sonra bak:

```bash
./lab sql "SELECT pg_stat_statements_reset()"
./lab load smoke
./lab topsql
```

Smoke test bir isteğin fazlasını gönderiyor, o yüzden böl. Temiz bir sayım için, yeniden sıfırla ve
http://localhost:4180/api/dealers/42/orders?limit=20 adresini tarayıcında bir kez aç, sonra
`./lab topsql` çalıştır.

Üç sayı yaz: orders query'sinin çağrı sayısı, `order_items` query'sinin çağrı sayısı, `products`
query'sinin çağrı sayısı.

## 3. Yavaş olanı bul

`order_items` query'si çok kez çağrılıyor. Her çağrı ne kadar sürüyor (`mean_ms`)? Açıkla:

```bash
./lab explain "SELECT * FROM order_items WHERE order_id = 1234"
```

Yine Seq Scan mı? Lesson 03'ü hatırla: Postgres foreign key'leri senin için indexlemez.

## 4. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** bulduğun iki sorunu da adlandıran bir cümle.
2. **Sayılar:** istek başına query × query başına süre = isteğin bir connection'ı elinde tuttuğu süre (`W`).
   10'luk bir pool ile, `λ_max` nedir?
3. **Yol:** controller → `recentOrders()` → orders query → `OrderView.from()` → ...
4. **Ne bozulabilir:** iki sorundan sadece birini düzeltsen, hangisi hâlâ zarar verirdi?

## 5. Düzelt

İki değişiklik, her biri ayrı bir commit:

1. Item'lar query'sinin filtrelediği kolonu indexleyen bir Flyway migration'ı (`V3__...sql`).
2. Hibernate'in 20 siparişin tümünün item'larını ve ürünlerini 60 query yerine birkaç query ile
   yüklemesini sağla. Üç aracın var, birini seç ve neden seçtiğini söyleyebil: bir `join fetch`
   query'si, bir `@EntityGraph`, veya Hibernate'in batch fetching'i (`hibernate.default_batch_fetch_size`).
   Dikkat: bir collection'da `LIMIT` ile birlikte `join fetch`, Hibernate'in bellekte sayfalamasına
   neden olur. Bunu seçersen log'da o uyarıyı ara.

Uygulamayı yeniden başlat, sonra tekrar ölç:

```bash
./lab topsql
./lab load dealer-history 50
./lab compare dealer-history
```

## 6. Kanıt

| | Before | After |
|---|---|---|
| İstek başına SQL statement'ı | | |
| Item'lar query'sinin mean ms'si | | |
| 50/s'de dealer-history p95 | | |
| Düşen iterasyonlar | | |

## 7. Kendi cümlelerinle

Bir cümle: mission 03'teki index bu endpoint'i neden hızlandırmadı?

## Kontrol sorusu

Bir sayfa 50 bayi gösteriyor ve her bayi için, lazily yüklenen, şehrinin satış temsilcisinin adını
gösteriyor. Batch fetching olmadan, sayfa kaç query gönderir? `default_batch_fetch_size: 25` ile, kaç?

## Java köşesi

`Order.java`'da, `items` bir `@OneToMany(fetch = FetchType.LAZY)`. Kendine açıkla:
- Hibernate, ona dokunmadan önce `items` alanına hangi nesneyi koyar? ("PersistentBag" ara.)
- `OrderView.from()` neden `@Transactional(readOnly = true)` içinde çalışıyor? `spring.jpa.open-in-view: false`
  varken, onsuz hangi exception'ı alırdın?