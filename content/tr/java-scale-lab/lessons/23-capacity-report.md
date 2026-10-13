# Lesson 23 · Kapasite raporu

**Reading time:** 13 min · **Concept:** capacity planning, bottleneck chain, headroom, load test to model, writing the report
**Mission:** 23

## Problem

Biri düz bir soru sorar: "gelecek ay sipariş trafiğini kabaca üçe katlayacak bir kampanya
yapıyoruz, sistem bunu karşılayabilir mi?" İndeksler kurdun, race condition'ı düzelttin, timeout'lar,
retry'lar, bir circuit breaker, idempotency key'leri, bir cache, rate limit'ler, bir load balancer
arkasında üç instance, virtual thread'ler, Kafka, bir read replica ve partitioning ekledin. Hepsi
çalışıyor. Bunların hiçbiri, tek başına, "sistem trafiğin üç katını karşılayabilir mi" sorusunu
cevaplamaz, çünkü bu soru bunlardan herhangi biriyle ilgili değildir. Hepsinin birlikteliğiyle,
özellikle de hangisinin önce yerinin tükendiğiyle ilgilidir.

## Neden zor

Şimdiye kadarki her ders bir kaynağı tek başına inceledi: bir havuz, bir cache, bir rate limit. Bir
kapasite sorusu seni zincirin tamamına birden bakmaya ve en zayıf halkayı bulmaya zorlar, çünkü önemli
olan tek şey en zayıf halkadır. İkinci en zayıf halkayı önce düzeltmek ilerleme gibi hissettirir ve
hiçbir şeyi değiştirmez: sistem aynı trafik seviyesinde, beklediğinden farklı bir nedenle de olsa,
yine çöker. Bu ders yeni bir teknikten çok, ölçtüğün her şeyi, odada olmayan birinin güvenebileceği
şekilde yazılmış, tek bir cevapta birleştirme disiplinidir.

## Fikir: hangi kasa önce tükenirse sınırı o belirler

Süpermarkete bir kez daha dönelim, ama şimdi tükenebilecek birden fazla şey var, sadece kasalar değil:
10 kasa hattı, 60 yerlik bir otopark ve belirli bir hızda rafları yeniden stoklayabilen bir yükleme
rampası. Kasaların dakikada 40 müşteri işleyebildiğini (lesson 02: 10 hat, müşteri başına 0,25 dakika),
otoparkın 60 araba aldığını ve ortalama ziyaretin 20 dakika olduğunu varsayalım, böylece Little's Law'a
göre tam doluluktaki otopark dakikada 60 / 20 = 3 yeni araba kabul edebilir, ve yükleme rampasının
dakikada 50 müşteriye yetecek alışveriş kadar raf stoklu tutabildiğini varsayalım.

Üç sayı: 40, 3, 50. Süpermarketin gerçek kapasitesi, diğer iki parça bundan on katından fazlasını
karşılayabilse de, en küçüğü olan **dakikada 3 müşteri**dir. Yükleme rampasına daha fazla para akıtmak
hiçbir şeyi değiştirmez: arabalar hâlâ otopark bulmaya çalışırken sıkışıp kalır. Birbirine bağlı
kaynakların bu zinciri, yani sistemin genel kapasitesinin en küçük tek kapasitesine eşit olduğu zincir,
**bottleneck chain**'dir. Raporlanacak doğru sayıyı bulmak, bu halkanın hangisi olduğunu bulmaktır,
hepsini aynı önemdeymiş gibi listelemek değil.

### Uygulamanda da aynı zincir

Aynı isteği sisteminden geçir ve her kaynağın doyuma ulaşmadan önce ne yapabildiğini, tahminlerle
değil daha önceki derslerin formülleri ve kurallarıyla yazıya dök:

| Resource | Rule | Example number (yours will differ) |
|---|---|---|
| HikariCP pool | `size / W` (lesson 02) | havuz 10, W 0,1 s → 100 req/s |
| Tomcat threads | thread sayısı / (bir thread'in işgal edildiği süre) | 200 thread, her biri 0,2 s → 1.000 req/s |
| Payment provider | kendi belirttiği limit, eksi circuit breaker'ının eşiği | mesela çökmeden önce 80 req/s |
| Rate limiter | şu anda kullanılan bayi başına token bucket'larının toplamı | kaç bayinin aynı anda aktif olduğuna bağlı |
| Cache hit rate | `(1 - hit rate) × raw traffic` veritabanına çarpar | %80 hit rate, 500 req/s'yi DB'de 100 req/s'ye çevirir |
| Read replica | sadece okumalar için kendi `size / W`'si | ayrı bir sayı, yazmaları sınırlamaz |

Bu uydurma örnekte, en küçük sayı 80 req/s ile payment provider. Bu, `POST /api/orders` için
sisteminin kapasitesidir, nokta, bu sayı değişene kadar. Havuzun 100 req/s'si, cache'in yardımı, üç
instance: yükleme rampasının kapasitesi otopark dolduktan sonra önemli olmadığı gibi, bu noktadan
sonra bunların hiçbiri önemli değildir.

### Headroom

**Headroom**, karşılayabildiğin şey ile şu anda ondan geçirdiğin şey arasındaki boşluktur, genellikle
bir yüzde olarak yazılır: bottleneck 80 req/s yapabiliyorsa ve mevcut tepe trafik 50 req/s ise,
headroom `(80 - 50) / 80 = 37.5%`'tir. Trafiği 150 req/s'ye üçe katlayan bir kampanya %37,5
headroom'a sığmaz; zincirin başka bir yerindeki daha büyük bir havuz değil, bottleneck'in kendisinin
hareket etmesi gerekir.

## Load test sihirli bir sayı bulmak için değil, model kurmak için

Tek bir load test sonucu, "85 req/s'de bozuldu", bir öğleden sonraya, bir veritabanı cache durumuna,
bir WireMock delay ayarına özgü bir gerçektir. Bir load testin faydalı çıktısı o sayı değildir, yükü
adım adım yükselttikçe eğrinin **şekli**dir: p95'in trafikten daha hızlı tırmanmaya başladığı yer,
hata oranının sıfırdan ayrıldığı yer, belirli bir kaynağın (havuzun beklemede sayısı, bir queue
derinliği) tırmanmaya başladığı ve geri inmediği yer. Bu şekil, henüz test etmediğin trafik
seviyeleri için akıl yürütebileceğin bir modeldir, tam olarak otoparkın dakikada 3'te tükendiğini
bilmek için süpermarkete gerçekten 3.000 müşteri sokmana gerek olmaması gibi: parçaları ölçtün ve
çarptın.

## Raporu yazmak

Başka bir mühendisin testlerini yeniden çalıştırmadan harekete geçebileceği bir kapasite raporunun
şu sırayla dört parçası vardır:

1. **Bottleneck ve sayısı.** Bir cümle: "sistemin yazma kapasitesi, veritabanı veya uygulama
   instance'ları tarafından değil, payment provider'ın circuit breaker eşiği olan 80 req/s tarafından
   sınırlanıyor."
2. **Mevcut headroom.** Mevcut tepe trafik, bottleneck'in sınırı, ortaya çıkan yüzde ve onun ötesinde
   ne olur (queue büyür, hatalar başlar, hangisi, hangi önceki dersten).
3. **Bottleneck sayısını değiştiren şey** ve değiştirmeyen şey. Dördüncü bir uygulama instance'ı
   eklemek 80 req/s'yi yükseltmez. İkinci bir payment provider veya daha yüksek throughput'lu bir
   sözleşme yükseltir.
4. **Gerçekte neyi test ettiğin**, load testin şekli dahil, böylece okuyucu ölçülen bir sayıyı bir
   tahminden ayırt edebilir.

1. adımı atla ve rapor, sorulan soruyu cevaplamayan bir sağlıklı grafikler listesi gibi okunur.

## Bununla nerede karşılaşırsın

- Mühendis olmayan ve altı dashboard değil tek bir net cevaba ihtiyacı olan birinden gelen "kampanyayı
  / Black Friday'i / migration'ı karşılayabilir miyiz" sorusu.
- Bütçe konuşmaları: "daha fazla sunucu ekle" sadece sunucular bottleneck ise doğru harcamadır; bu
  rapor, para hareket etmeden önce bunu kanıtlayan veya çürüten şeydir.
- Olay sonrası takip: "kapasiteye vurduk", o gün dashboard'da görünür olan hangi kaynak için daha
  büyük bir sayı değil, her zaman güncellenmiş bir bottleneck chain ile sonuçlanmalıdır.

## Tek cümlelik özet

> Bir sistemin gerçek kapasitesi, ortalaması veya en iyi görünen kaynağı değil en küçük halkasıdır,
> bu yüzden bir kapasite raporu o tek halkayı, onun headroom'unu ve onu hareket ettirmek için
> gerçekte neyin değişmesi gerektiğini adlandırır.

## Kontrol sorusu

Dürüstçe ölçülen zincirin şu sayıları veriyor: havuz 120 req/s, payment provider 90 req/s, rate
limiter (aktif bayiler genelinde toplanmış) 150 req/s, cache destekli okumalar bu yazma yolu için
ilgisiz. Mevcut tepe yazma trafiği 60 req/s. Sistemin yazma kapasitesi nedir, headroom'u yüzde
olarak nedir ve dördüncü bir uygulama instance'ı eklemek bu iki sayıdan herhangi birini değiştirir mi?
