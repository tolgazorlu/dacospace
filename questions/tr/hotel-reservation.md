---
id: hotel-reservation
title: Bir otel rezervasyon sistemi tasarla
level: mid
topics: [inventory-management, concurrency, search, overbooking]
minutes: 45
---

## Prompt

Bir booking sitesi kullanıcıların şehir ve tarihe göre otel arayıp uygun odaları görmesine ve birini rezerve etmesine izin veriyor. Birçok otel üzerinde oda envanterini ve rezervasyonları yöneten sistemi tasarla.

## Clarifications

- **Ölçek?** 50.000 otel, otel başına ortalama 120 oda, günde 2 milyon arama, günde 150.000 onaylanmış rezervasyon.
- **Arama deseni?** Kullanıcı şehir, giriş/çıkış tarihi ve misafir sayısına göre arıyor; sonuçların 1 saniyenin altında gelmesini bekliyor.
- **Rezervasyon penceresi?** Rezervasyonlar aynı günden 12 ay öncesine kadar herhangi bir zamanda yapılabiliyor.
- **Oda tipleri?** Her otel kendi geceliğine özgü envanter sayısı olan 3-8 oda tipi sunuyor (örneğin standart, deluxe, suit).
- **Checkout sırasında tutma?** Kullanıcı ödeme bilgilerini girerken bir oda 10 dakika geçici olarak tutuluyor.
- **Overbooking politikası?** İşletme, geçmiş no-show oranlarını karşılamak için oda tipi başına yüzde 3'e kadar kasıtlı overbooking'e izin veriyor, ama hiçbir zaman bir tipin son 2 odası için.
- **Çok geceli rezervasyonlar?** Bir rezervasyon 1 ile 21 gece arasında olabilir ve aralıktaki her gece için envanteri eşzamanlı tutmalıdır.

## Follow-ups

- İki kullanıcı aynı 3 gece için son uygun deluxe odayı birbirinden 100ms arayla rezerve etmeye çalışıyor. Ne olduğunu baştan sona anlat.
- Çok geceli bir rezervasyon, oda tipinin farklı gecelerde farklı uygunluğa sahip olduğu bir tarih aralığına yayılıyor (1. gece 3 oda kaldı, 2. gece 1 oda kaldı). Tutma mantığın bunu nasıl ele alır?
- Overbooking politikası, onaylanmış rezervasyonların belirli bir gecede fiziksel odaları bazen aşmasına izin veriyor demek. Sistemin kimin "walked" edileceğine nasıl karar verdiğini ve bunun availability/booking mantığının kendisinden nasıl ayrı tutulduğunu anlat.
- Büyük bir şehir otelinin bir gün boyunca normal arama ve rezervasyon trafiğinin 10 katını aldığı bir flash sale'e ölçekle. Ne değişir?
- Bir otel yarından başlayarak 10 odayı bakım için envanterden çıkarmak istiyor, bu zaten onaylanmış gelecekteki rezervasyonları etkiliyor. Sistemin misafirleri sessizce iptal etmeden bunu nasıl ele aldığını anlat.

## Rubric

- Envanteri otel başına, oda tipi başına, gece başına modelleyerek, çok geceli rezervasyonların sadece tek bir sayı değil, bir tarih aralığı boyunca kontrol edilip tutulmasını sağlar.
- Ana trade-off'u söyler: overbooking geliri artırır ve no-show'ları telafi eder ama operasyonel karmaşıklık ve risk ekler, kritik düşük envantere yaklaşmaktan sınırlanmalıdır.
- Birden fazla geceye yayılan bir rezervasyonun ya gereken tüm geceleri rezerve etmesini ya hiçbirini etmemesini sağlayan atomik bir çok-geceli tutma mekanizması kullanır, kısmi tutmaları önler.
- Arama-rezervasyon funnel'ını ele alır: arama bir ölçüde staleness'e (cache'lenmiş uygunluk) tolere edebilir, ama son rezervasyon adımı taze, yetkili envanteri kontrol etmelidir.
- 10 dakikalık tutmayı ve expiry/release mekanizmasını açıkça ele alır, kullanıcının session'ının checkout ortasında kapanması durumunda ne olduğu dahil.
- Günde 2 milyon aramanın nasıl verimli servis edildiğini tartışır, muhtemelen transactional booking store'dan ayrı, okuma için optimize edilmiş bir index üzerinden.
- "Misafiri walk etme" operasyonel kararını, temel availability/booking consistency mantığından ayrı bir konu olarak tutar.

## Pitfalls

- Envanteri oda-tipi-başına-gece yerine otel başına tek bir sayı olarak modellemek, çok geceli ve karışık uygunluklu rezervasyonları bozmak.
- Arama sonuçlarının taze bir yeniden kontrol olmadan son rezervasyon onayı için yetkili kaynak gibi çift görev görmesine izin vermek.
- Overbooking'i, tam kapasiteye yaklaşırken yarattığı risk penceresini kabul etmeden bedava bir politika kolu olarak ele almak.
- Bir otel sonradan envanterden oda çektiğinde onaylanmış rezervasyonlara ne olduğunu göz ardı etmek.
