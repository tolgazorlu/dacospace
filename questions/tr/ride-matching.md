---
id: ride-matching
title: Bir ride-hailing uygulaması için driver-matching sistemini tasarla
level: senior
topics: [geospatial-indexing, dispatch, real-time-systems, queueing]
minutes: 45
---

## Prompt

Bir rider uygulamayı açar, "request ride"a dokunur ve birkaç saniye içinde
bir driver'ın assign edilmesini bekler. Rider'ları yakındaki available
driver'larla eşleştiren backend sistemini tasarla.

## Clarifications

- **Ölçek?** Peak saatlerde 80 şehirde 500 bin concurrent rider ve 150 bin aktif driver.
- **Request oranı?** Global peak'te saniyede 2.000 ride request.
- **Konum güncellemeleri?** Her driver'ın uygulaması konumu 4 saniyede bir ping'liyor, yani sadece aktif driver'lardan saniyede yaklaşık 37.500 konum güncellemesi.
- **Matching SLA'sı?** Bir driver request'ten itibaren 5 saniye içinde assign edilmeli, yoksa rider genişletilmiş bir radius ile "searching" retry'ı görür.
- **Arama radius'u?** 1,5 km'den başla, hiçbir driver 2 saniyelik pencereler içinde kabul etmezse 3 km'ye, sonra 6 km'ye genişlet.
- **Driver yanıt penceresi?** Dispatch edilen bir driver'ın kabul etmek için 10 saniyesi var; timeout veya decline durumunda bir sonraki candidate'a geç.
- **Veri freshness toleransı?** 15 saniyeden eski bir driver konumu stale olarak kabul edilir ve matching'den hariç tutulur.

## Follow-ups

- Aynı blokta iki rider birbirinden 200 ms arayla ride request ediyor ve en yakın driver sadece birine hizmet verebilir. Aynı driver'ı ikisine birden assign etmekten nasıl kaçınırsın?
- Bir şehirde bir surge event var (konser bitişi) ve talep 20 dakika boyunca normalin 10 katı. Matching stratejinde ne değişir?
- Kabul eden ama GPS'i 90 saniye boyunca pickup'a doğru hareket etmediğini gösteren bir driver'ı nasıl ele alırsın?
- Downtown için 20 bin driver tutan geospatial index node'u çöküyor. Blast radius ve recovery path nedir?
- Product, "rating'i 4.8'den yüksek driver'ları tercih et" filtresini eklemek istiyor. Bu, candidate selection latency'sini nasıl değiştirir?

## Rubric

- Scoring'den önce candidate'ları daraltmak için bir geospatial index kullanır (geohash grid veya quadtree/S2 cell'leri), tüm driver'ların full scan'i değil.
- Ana trade-off'u söyler: arama radius'unu genişletmek, match latency'sini driver'ın idle-trip mesafesine ve rider bekleme süresine karşı trade eder.
- Bir driver'ın iki rider'a double-dispatch edilmesini önlemek için atomik bir assignment adımı önerir (driver başına lock veya compare-and-swap).
- Yüksek frekanslı konum güncelleme path'ini matching/dispatch path'inden ayırır, böylece write'lar read'leri bloklamaz.
- Driver accept/decline/timeout state machine'ini, bounded bir retry ve bir sonraki candidate'a fallback ile ele alır.
- Stale veya eksik konum ping'lerinin false negative yaratmadan nasıl hariç tutulduğunu tartışır.
- Surge'ün matching'i nasıl etkilediğinden bahseder, radius genişletme, pricing-based demand shaping veya ikisi; birini seçer.

## Pitfalls

- Driver konumunu her zaman fresh gibi ele almak, staleness veya kaçırılan ping'leri hiç tartışmamak.
- Matching'i geospatial partitioning olmadan tek bir global queue olarak tasarlamak, ölçeği göz ardı etmek.
- Double-assignment race condition'ını tamamen gözden kaçırmak.
- Önce doğru, race-free bir assignment mekanizması kurmadan direkt machine-learning tabanlı ranking'e atlamak.
