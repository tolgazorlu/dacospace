# Lesson 12 · Cache süresi doldu, herkes DB'ye koştu

**Reading time:** 12 min · **Concept:** cache stampede (thundering herd), request coalescing (single flight), jittered TTL, early refresh
**Mission:** 12

## Problem

Lesson 11'deki cache iyi çalışıyor. Kampanya günü geliyor: 09:00:00, her bayi 20 kampanya ürününde
bir indirim var mı diye bakmak için aynı anda uygulamayı açıyor. O kategori için cache'lenmiş entry,
60 saniyelik bir TTL ile 08:59:00'da yazılmıştı, yani tam olarak 09:00:00'da, 500 bayinin isteğinin
geldiği aynı anda, süresi doluyor. Bu 500 isteğin her biri Redis'i kontrol eder, hiçbir şey bulamaz,
ve cache-aside'ın söylediği şeyi tam olarak yapar: Postgres'e sor. Günlük trafiğin sabit sızıntısını
rahatça karşılayan 10 connection'lık pool'un, şimdi 500 isteğin aynı anda bir connection ödünç almaya
çalıştığı bir durumu var.

## Neden zor

Cache 59 saniye ve 59,9 saniye boyunca işini yaptı; sorun tam olarak işini yapmayı bıraktığı anda
ortaya çıkıyor, ve bir eğim olarak değil bir sıçrama olarak ortaya çıkıyor, çünkü 500 isteğin her
biri aynı soruyu soruyordu ve aynı anda "cache'de değil" cevabını aldı. Lesson 02'deki Little's Law
değişmedi: pool'un hâlâ aynı anda sadece 10 istek tutabilir. 10'luk bir pool'a karşı 500 varış, her
saniye büyüyen kuyruktur, ve bu, trafiğin gerçekten artmasından değil, bir süresi dolmuş cache
entry'sinden büyüyor.

## Fikir: sürü tek açık geçide koşuyor

Hepsi bir havuzdan su içen bir sürü hayvanı düşün. Günün büyük kısmında dağınıklar. Sonra, havuzun
yeniden doldurulduğu tek anda, hepsi aynı anda koşuyor, ve geçitte birbirlerini çiğniyorlar, havuzun
kendisi onlara teker teker yetecek kadar olsa bile. Bu koşuya **thundering herd** denir, veya
cache'e özgü olarak **cache stampede**: birçok istek aynı anda aynı eksik cache entry'sini keşfeder
ve hepsi doğrudan onun arkasındaki kaynağa gider.

### Request coalescing: sadece ilki gerçekten gidiyor

500 bayinin 500 ayrı Postgres yolculuğuna ihtiyacı yok. Veritabanının **bir kez** sorulmasına
ihtiyaçları var, diğer 499'u basitçe o bir cevabı bekliyor ve sonra paylaşıyor. Bu, genelde
**single flight** denen **request coalescing**'dir: belirli bir cache key'i için, eksik olduğunu
bulan sadece ilk istek onu getirmeye gidebilir. Aynı key için fetch devam ederken gelen her başka
istek, kendi veritabanı query'sini başlatmaz; ilk isteğin zaten ürettiği sonucu bekler, ve hazır
olduğu an aynı cevabı alır.

```
500 requests miss "products:category:flour" within the same 200 ms window.
Without coalescing: 500 queries sent to Postgres, 490 of them queue behind a pool of 10.
With coalescing:    1 query sent to Postgres, 499 requests wait on that 1 result, then all return.
```

Beş yüz yerine bir query, küçük bir optimizasyon değil; kısa süre meşgul olan bir pool ile 490
derinliğindeki bir kuyruğu çalışmakla geçen süre boyunca saturasyona ulaşmış bir pool arasındaki
fark. Pratikte bu, cache key'iyle anahtarlanmış bir lock veya paylaşılan, devam-eden bir future ile
uygulanır: oraya önce ulaşan onu oluşturur, herkes diğeri işi tekrarlamak yerine ona bağlanır.

### Jittered TTL: tüm saatlerin birlikte gece yarısını çalmasına izin verme

Request coalescing, stampede başladıktan sonra düzeltir. **Jittered TTL**, birçok key'in baştan
tam olarak aynı anda sona ermesini önlemeye çalışır. Her kategorinin cache entry'si düz 60 saniyelik
bir TTL ile yazılıyorsa, ve birkaçı aynı saniyede yazılmış olduysa (deployment'tan hemen sonra cache
ısıtıldıysa mesela), hepsi de aynı saniyede sona erecek, bir yerine birkaç stampede üretecektir.
Her TTL'ye sabit bir sayı yerine küçük, rastgele bir miktar ekle: mesela, 60 saniye temel artı 0 ile
10 saniye arasında rastgele bir ek, her entry'ye 60 ile 70 saniye arasında bir gerçek TTL vererek.
Birçok key'e yayıldığında, sona ermeler artık tek bir anda değil 10 saniyelik bir pencerede olur, bu
yüzden veritabanı bir sıçrama yerine bir yenileme sızıntısı görür.

### Early refresh: havuzu kurumadan önce yeniden doldur

Jitter her şeyi yayar ama tek bir sıcak key, kampanya günündeki 20-kampanya-ürünü kategorisi gibi,
tamamen boşalmasını beklemeden yenilemek istemeyeceğin kadar kendi başına önemli olabilir. **Early
refresh**, kuralı "sadece süresi dolduktan sonra yenile"den "süresi dolmadan biraz önce, eski değer
hâlâ sunulurken yenile"ye değiştirir. Örneğin: bir entry'nin TTL'si 60 saniyeyse, kalan ömrü 5
saniyenin altına düştüğünde arka planda bir yenileme tetikleyebilirsin, o pencerede her istek hâlâ
geçerli cache'lenmiş değeri hemen almaya devam eder. Bir isteğin cache okuması, arka planda sessizce
gerçekleşen bir yenilemenin tetikleyicisi olur; hiç kimse onu beklemek zorunda kalmaz, ve yoğun
trafik altında key gerçekten sıfıra hiç ulaşmadığı için, yüzlerce isteğin aynı anda bir miss
keşfettiği bir an hiç olmaz.

Jitter ve early refresh aynı sorunun farklı kısımlarını çözer: jitter birçok *farklı* key'in
hizalanmasını engeller, early refresh *tek bir sıcak* key'in tamamen tükenmesini engeller. Request
coalescing, ikisinin de altında hâlâ sızabilen herhangi bir eşzamanlı miss anı için bir güvenlik
ağıdır.

## Bununla nerede karşılaşırsın

- Deployment sonrası cache ısıtması: aynı timestamp'te önceden doldurduğun her key, jitter
  eklemezsen daha sonra aynı timestamp'te sona erecektir.
- Herhangi bir tek sıcak key, bir ana sayfa, bir kampanya fiyat listesi, trend olan bir feed, bir
  stampede'e en açık olandır, tam olarak en popüler olduğu için.
- Bir cache katmanında code review: "bu key süresi dolduğunda yük altında ne olur" sorusu, "cache
  hit olduğunda ne olur"dan önce sormaya değer.

## Tek cümlelik özet

> Bir cache stampede, birçok isteğin aynı sona ermiş key'i aynı anda keşfedip hepsinin aynı anda
> veritabanına gitmesidir; coalescing sadece birinin gerçekten gitmesine izin verir, jitter farklı
> key'lerin birlikte sona ermesini engeller, ve early refresh bir sıcak key'in baştan yük altında
> sıfıra ulaşmasını engeller.

## Kontrol sorusu

Farklı bir kategori için "sugar" cache entry'si, 10:14:30'da düz 60 saniyelik bir TTL ile, jitter
olmadan ve early refresh olmadan yazıldı. "Sugar" için 300 istek 10:15:29 ile 10:15:31 arasında
geliyor. Bunların kabaca kaçı entry'yi eksik bulup doğrudan veritabanına gidecek, ve bu dersteki
hangi tek değişiklik bunu kabaca bir veritabanı query'sine çevirir?