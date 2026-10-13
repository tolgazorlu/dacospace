# Mission 03 · Bayinin sipariş geçmişi

**Time:** 60 min · **Concept:** EXPLAIN, seq scan, index, Flyway migration
**Lesson:** 03 · **Curriculum link:** system design 1.4(a)

## Senaryo

Bayiler "son siparişlerim" ekranını açıyor. Tabloda 400k sipariş var, bayi başına yaklaşık 200.
Şikayet: "ekran bazen hiç açılmıyor".

## 1. Önce ölç

```bash
./lab load dealer-history 50
```

Not: sistem bu test sırasında ciddi şekilde yavaşlayabilir. Bu normal, görmen gereken de bu.

Grafana'da **endpoint başına p95**'i ve **DB bağlantı havuzunu** izle. Ardından:

```bash
./lab topsql
```

Hangi sorgu en çok toplam zaman harcadı? Kaç çağrı, ms olarak ortalaması ne?

## 2. Sorguyu aç

```bash
./lab explain "SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20"
```

Çıktıda şunları bul:
- `Seq Scan` mı yoksa `Index Scan` mı diyor?
- `Execution Time` ms olarak kaç?
- 20 satır istedin. Postgres kaç satıra baktı?

## 3. 4 adım (kağıt üzerinde)

1. **Ne bozuk:** bir cümle.
2. **Sayılar:** sorgu süresi `W_sql`, istek başına sorgu sayısı (topsql'deki `calls` / istek sayısı),
   50 istek/s × ... → ne kadar havuz talebi `L`? Havuz 10.
3. **Yol:** istek → controller → `findByDealerIdOrderByCreatedAtDesc` → Postgres → ...
4. **Ne bozulabilir:** zamanı hangi kalem yiyor?

## 4. Düzelt

İndeksi bir **Flyway migration** ile ekle. `CREATE INDEX`'i elle çalıştırıp olduğu yerde bırakma:
production'da migration olmadan değişiklik olmaz.

`src/main/resources/db/migration/V2__...sql` dosyasını oluştur. İndeksin **hangi kolonları**
kapsadığına ve **hangi sırada** kapsadığına kendin karar ver. İpucu: sorgu hem filtreliyor (`WHERE`)
hem de sıralıyor (`ORDER BY`).

Uygulamayı yeniden başlat (Flyway migration'ı başlangıçta çalıştırır), ardından:

```bash
./lab explain "SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20"
./lab load dealer-history 50
./lab compare dealer-history
```

## 5. Hâlâ yavaş mı?

Bir sürprize hazır ol: `EXPLAIN` dramatik şekilde hızlanır, endpoint zar zor kıpırdar. `./lab topsql`'i
yeniden çalıştır. Şimdi en üstte hangi sorgular var? Ne sıklıkla çağrılıyorlar? Bunu fark etmek
yeterli, düzeltme mission 04'te. `calls` sayısını not et. Düzelttiğin sorgunun darboğaz olmadığını
fark etmek bir başarısızlık değil, gerçek bir sonuçtur.

## 6. Kanıt

| | Before | After index |
|---|---|---|
| EXPLAIN: scan type | | |
| Execution Time | | |
| dealer-history p95 | | |
| dropped iterations | | |
| top query in topsql | | |

## 7. Kendi cümlelerinle

Bir indeksin kolon sırasına neyin karar verdiği hakkında bir cümle. Sonra commit et:
`git commit -m "perf: index orders by dealer and date"`

## Kontrol sorusu

İndeksi `(created_at, dealer_id)` olarak oluştursaydın, aynı hızı alır mıydın? Açıklamak için 52
kartlık bir deste kullan: önce türe göre mi, yoksa önce numaraya göre mi sıraladın?

## Java köşesi

`OrderRepository.findByDealerIdOrderByCreatedAtDesc`'in gövdesi yok. Spring Data SQL'i metot
isminden oluşturuyor. `application.yml`'de `show_sql: true` ayarla, bir istek gönder, SQL'i log'da
bul. İsmin her bir parçası (`findBy`, `DealerId`, `OrderBy`, `CreatedAt`, `Desc`) SQL'in hangi
parçası oldu?
