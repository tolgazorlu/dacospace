---
id: flash-sale
title: Flash sale için envanter sistemi tasarla
level: mid
topics: [inventory, concurrency, overselling, queueing]
minutes: 45
---

## Prompt

Bir e-ticaret sitesi flash sale düzenliyor: popüler bir ürünün sınırlı bir miktarı sabit bir zamanda satışa çıkıyor. Sitenin oversell yapmaması için envanteri yöneten sistemi tasarla.

## Clarifications

- **Envanter boyutu?** Satış başladığında ürünün 5.000 adedi mevcut.
- **Talep?** Satış başladığında sayfada bekleyen 300.000 kullanıcı var, ilk 10 saniyede saniyede yaklaşık 50k satın alma denemesi oluşuyor.
- **Doğruluk gereksinimi?** 5.000 adetten asla fazla satma, bir avuç undersold adet kabul edilebilir, overselling kabul edilemez.
- **Checkout akışı?** Başarılı bir envanter rezervasyonu, kullanıcı ödemeyi tamamlarken adedi 5 dakika tutar, ödeme başarısız olur veya timeout olursa serbest bırakır.
- **Adalet?** First-come-first-served kabul edilebilir, bir lottery veya kuyruk-pozisyonu garantisi gerekmiyor.
- **Altyapı?** Standart bir ilişkisel veritabanı ve bir cache katmanı mevcut, özel bir queueing sistemi yok.

## Follow-ups

- Son adet için iki istek aynı veritabanı node'una birbirinden bir milisaniye arayla geliyor; ikisinin de başarılı olmasını tam olarak neyin önlediğini baştan sona anlat.
- Ödeme adımının kendisi yavaş, yük altında 30 saniyeye kadar sürüyor; bu, 5 dakikalık rezervasyon tutma süresiyle nasıl etkileşir?
- Satış ürünü 8 saniyede tükeniyor, diğer 292.000 hayal kırıklığına uğramış kullanıcının retry trafiğiyle siteyi çökertmesini nasıl önlersin?
- Aynı anda satışta her biri kendi sınırlı miktarına sahip 50 farklı ürün olsaydı tasarım nasıl değişirdi?
- Bir ödeme sağlayıcısının webhook'u ödemeyi onayladığında 10 dakika gecikmeli geliyor, rezervasyon zaten süresi dolmuş ve adet yeniden satılmış; bu conflict'i nasıl ele alırsın?

## Rubric

- Oversell race condition'ını önlemek için read-then-write yerine ürün başına tek bir counter üzerinde atomik bir decrement (koşullu update, Lua script veya eşdeğeri) kullanır.
- Ana trade-off'u söyler: tek bir hot counter basit ve doğrudur ama saniyede 50k'da bir serialization noktası haline gelir; counter'ı throughput için sharding'lemek ise daha karmaşık exact-zero tespiti maliyetine gelir.
- Reservation-with-timeout pattern'ini (adedi tut, ödeme tamamlanmazsa süresi dolsun) ve süresi dolmanın stock'u güvenle nasıl geri verdiğini açıklar.
- Stock'un neredeyse tükendiği bilindiğinde edge'de bir kuyruk veya token-bucket admission adımı gibi, sistemin veritabanına ulaşmadan önce yükü nasıl attığını açıklar.
- Aynı kullanıcıdan tekrarlanan satın alma isteklerinde idempotency'yi ele alır.
- Ürünü alamayan kullanıcıların yüzde 99'u için UI/trafiğe ne olduğunu, sitenin kendisinin ayakta kalması için, ele alır.
- Ödeme onayının her zaman tutma penceresi içinde geldiğini varsaymak yerine gecikmeli webhook reconciliation durumunu açıkça tartışır.

## Pitfalls

- Atomiklik olmadan read-then-write envanter kontrolü, klasik oversell bug'ı.
- "Reserved" ve "sold" durumlarını aynı state gibi ele alan bir rezervasyon/expiry mekanizmasının olmaması.
- Sadece happy path için tasarlamak ve sisteme hâlâ ulaşan 290k'dan fazla kaybeden isteği göz ardı etmek.
- Sharding veya bir admission kuyruğu tartışmadan tek bir veritabanı sunucusunun saniyede 50k write'a ölçeklendiğini varsaymak.
