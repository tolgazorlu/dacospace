# Lesson 01 · Ortalama neden yalan söyler

**Reading time:** 10 min · **Concept:** RED metrics, percentiles (p50, p95, p99)
**Mission:** 01

## Problem

Bir dashboard açıyorsun. Diyor ki: ortalama yanıt süresi 60 ms, hata oranı %0. Her yerde yeşil.
Aynı sabah, üç bayi destek hattını arıyor: "fiyat listesini açmaya çalışırken uygulama dondu".
Dashboard'a tekrar bakıyorsun. Hâlâ yeşil.

İkisi de doğru. Dashboard bozuk değil ve bayiler yalan söylemiyor. Dashboard yanlış soruyu
cevaplıyor.

## Neden zor

"Servisim ne kadar hızlı?" tek cevabı olan tek bir soru gibi görünüyor. Değil. Bir servis
binlerce request'e cevap veriyor ve her birinin kendi süresi var. Hepsini tek bir sayıya
sıkıştırmak, kullanıcıların şikayet ettiği tam kısmı, yavaş olanları, atıyorsun demek.

## Fikir, 10 request ile

Milyonlarca request'i unut. Bir tezgahta duruyorsun ve 10 bayiye hizmet veriyorsun. Her birinin
ne kadar beklediğini ms cinsinden yazıyorsun:

```
12  10  11  9  13  10  12  11  10  2000
```

Dokuzu neredeyse anında hizmet aldı. Biri tam iki saniye bekledi.

**Sen** ortalamayı hesaplıyorsun: (12+10+11+9+13+10+12+11+10+2000) / 10 = **209,8 ms**.

Bu sayıya bak. Kimse 209,8 ms beklemedi. Dokuz kişi yaklaşık 11 ms bekledi ve bir kişi 2.000 ms
bekledi. Ortalama, var olmayan bir bayiyi tarif ediyor.

Şimdi farklı yap. Listeyi **sırala**:

```
9  10  10  10  11  11  12  12  13  2000
```

- Ortadaki değer (10'un 5'incisi) 11. Bu, medyan olan **p50**: "request'lerin yarısı bundan daha
  hızlıydı".
- %90'lık noktadaki değer (10'un 9'uncusu) 13. Bu **p90**: "%90'ı bundan daha hızlıydı".
- Sonuncusu, 2.000, buradaki en kötü durum. 100 request ile, 99'uncu değer senin **p99**'un olurdu.

Bir percentile sadece "sırala, sonra bir pozisyonu işaretle" demek. Başka bir şey değil.

### Neden p95 ve p99'u önemsiyoruz, p50'yi değil

Kendine sor: bir bayi günde kaç request gönderir? Fiyat listesini açıyor, kategoriye göre
filtreliyor, birkaç ürün açıyor, siparişlerini kontrol ediyor. Diyelim günde 50 request.

Request'lerin %1'i yavaşsa (kötü bir p99 bunu ifade eder), günde 50 request'i olan bir bayinin en
az bir yavaş request'e çarpma ihtimali çok yüksektir. Matematik: *asla* yavaş bir request'e
çarpmama ihtimali 0,99^50 ≈ 0,61. Yani **10 bayiden yaklaşık 4'ü her gün yavaş bir request'e
çarpıyor.**

Yani p99 "nadir bir kullanıcı" değil. Kullanıcı başına yeterli request olduğunda, kuyruk herkesin
günlük deneyimi haline gelir. Ciddi ekiplerin uyarılarına ortalamayı değil, p95 ya da p99'u
koymalarının nedeni bu.

## RED: endpoint başına üç sayı

Kullanacağın dashboard, kullanıcının hissettiği üç şey olan **RED** etrafında inşa edilmiş:

| Letter | Meaning | Question it answers |
|---|---|---|
| **R**ate | saniye başına request | ne kadar meşgulüz? |
| **E**rrors | saniye başına (ya da % olarak) başarısız request | insanlar hata mı alıyor? |
| **D**uration | yanıt süresinin p50, p95, p99'u | insanlar ne kadar bekliyor? |

Her endpoint kendi RED'ini alır. "Servis yavaş" ifadesi, "`POST /api/orders`, saniyede 60
request'te 3 s p95'e sahip, `GET /api/products` sorunsuz" olur. Bu cümle kodu işaret eder.

**USE** (Utilization, Saturation, Errors) adlı ikinci bir aile var. RED, servise kullanıcı
tarafından bakar. USE, bir kaynağa içeriden bakar: CPU, bir connection pool, bir thread pool. Lab
dashboard'unda "Saturation" satırı USE'dir. Lesson 02'de buna ihtiyacın olacak.

## Percentile'lar nasıl ölçülür (tam yeterince)

Spring uygulaman her süreyi bellekte tutmuyor. Bir **histogram** tutuyor: "5 ms altı", "10 ms
altı", "25 ms altı" ... gibi bir bucket sırası ve kaç request'in hangi bucket'a düştüğünü sayıyor.
Prometheus bu counter'ları her 5 saniyede bir kazır. Grafana'nın `histogram_quantile(0.95, ...)`
fonksiyonu, request'lerin %95'inin nerede olduğunu bulmak için bucket'ları dolaşır.

Lab'da fark edeceğin iki sonuç:

1. Percentile'lar bir bucket içinde **tahminlerdir**, bu yüzden gerçek değer 22 ms iken p95,
   23,7 ms diyebilir. Kararlar için uygun, 3 ondalık basamak için değil.
2. Percentile'ları **ortalayamazsın**. A instance'ının p95'i 100 ms ve B instance'ının p95'i
   300 ms ise, toplam p95, 200 ms değildir. Önce bucket'ları toplamalı, sonra hesaplamalısın.
   Dashboard sorguları bunu `sum by (le)` ile yapar.

## Trace'ler: bir yavaş request'in arkasındaki "neden"

Percentile'lar sana bazı request'lerin yavaş olduğunu *söyler*. Bir **trace**, onlardan *birinin
neden* yavaş olduğunu söyler. Bu, tek bir request'in zaman çizelgesidir: controller'da 2 ms,
bir veritabanı bağlantısı için 1.800 ms bekleme, SQL'i çalıştırmak için 15 ms, JSON yazmak için
3 ms. Her parça bir **span** olarak adlandırılır.

Lab'da, her request izlenir ve Tempo'da saklanır. p99 sıçradığında, en yavaş trace'i açar ve
zamanın nereye gittiğini okursun. Metrikler problemi bulur, trace'ler onu açıklar.

## Bununla nerede karşılaşırsın

- Her olay incelemesi: "ortalama iyi görünüyordu" cümlesi, birisi p99'a bakmadan önce söylenen en
  yaygın cümledir.
- Her SLO: "checkout request'lerinin %99'u 800 ms altında" bir percentile hedefidir.
- Bu lab'daki her load test: her düzeltmeden önce ve sonra p95'i karşılaştıracaksın.

## Tek cümlelik özet

> Ortalama, var olmayan bir kullanıcıyı tarif eder; p95 ve p99, şikayet eden kullanıcıları
> tarif eder, ve kullanıcı başına yeterli request olduğunda, bu herkes demektir.

## Kontrol sorusu

10 request'e hizmet veriyorsun: `8 9 9 10 10 11 11 12 900 950`.
Hesap makinesi olmadan: ortalama p50'ye mi yoksa p99'a mı daha yakın? Bir uyarıya hangi sayıyı
koyardın ve neden?