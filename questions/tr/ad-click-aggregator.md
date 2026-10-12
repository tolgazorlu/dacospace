---
id: ad-click-aggregator
title: Reklam tıklama agregasyon ve raporlama sistemi tasarla
level: senior
topics: [stream-processing, aggregation, exactly-once, time-windows]
minutes: 45
---

## Prompt

Bir reklam ağının, reklamverenlerin dashboard'da harcama ve performansı görebilmesi için kampanya başına tıklamaları gerçek zamana yakın saymaya ihtiyacı var. Tıklama event'lerini alıp bu agregatları üreten sistemi tasarla.

## Clarifications

- **Ölçek?** Platform genelinde saniyede 300k reklam gösterimi, click-through rate yaklaşık yüzde 1, yani ortalama saniyede 3k tıklama, peak'te saniyede 10k.
- **Kampanyalar?** Herhangi bir anda 500k aktif kampanya.
- **Dashboard tazeliği?** Reklamverenler tıklamadan sonra sayıların 1 dakika içinde güncellenmesini bekliyor.
- **Sorgu deseni?** Dashboard okumaları kampanya başına, saat başına ve gün başına rollup'lar; peak'te dakikada yaklaşık 50k dashboard okuması.
- **Doğruluk gereksinimi?** Faturalama bu sayılara dayanıyor, yani tekrar sayma veya atlanan tıklamalar reklamverenleri doğrudan maliyete sokar veya dolandırır; tolerans yüzde 0,1'in altında.
- **Saklama?** Ham tıklama event'leri fraud soruşturması için 30 gün, agregatlar 2 yıl saklanıyor.
- **Tıklama fraud'u?** Bu tasarımın kapsamı dışında, sadece bir fraud filtresinin nereye bağlanacağını belirtmek yeterli.

## Follow-ups

- Bir tıklama, mobil client'ın retry kuyruğu yüzünden 20 dakika gecikmeli geliyor; hâlâ sayılıyor mu ve hangi zaman penceresinde?
- Client onaylanmamış bir isteği retry ettiği için aynı tıklama iki kez teslim ediliyor; tekrar saymayı nasıl önlersin?
- Büyük bir satış etkinliği sırasında peak trafik 10 katına (saniyede 100k tıklama) sıçrıyor; pipeline'ın hangi parçası önce bozulur?
- Bir reklamveren sayısına itiraz edip tam olarak hangi tıklamaların sayıldığını denetlemek istiyor; her şeyi hot path'te sonsuza kadar saklamadan bunu nasıl desteklersin?
- Dün bir bug 3 saat boyunca eksik saydıysa, replay'de tekrar saymadan düzeltilmiş bir agregatı nasıl backfill edersin?

## Rubric

- Bu throughput'ta naif tıklama başına veritabanı increment'i yerine bir stream processing yaklaşımı (örneğin Kafka gibi bir log üzerinde windowed aggregation) seçer.
- Ana trade-off'u açıkça söyler: exactly-once doğruluk (idempotent dedup key'leri, late data için watermark'lar) ile düşük latency ve daha basit ama overcounting riski taşıyan at-least-once delivery.
- Somut bir dedup key tanımlar (örneğin impression id ile click id'nin birleşimi) ve late-arrival toleransına uyan bir dedup penceresi belirler.
- Hot aggregation path'i (kampanya başına dakika başına counter'lar) audit ve replay için kullanılan cold raw-event store'dan ayırır.
- Sıra dışı event'ler için watermarking veya izin verilen gecikmeyi açıklar ve pencere kapandıktan sonra gelen event'lere ne olacağını anlatır.
- Reprocessing/backfill'in nasıl idempotent yapıldığını anlatır, böylece bir zaman aralığının replay'i agregatı iki katına çıkarmaz.
- Dashboard için okuma ölçeklenmesini her sorguda ham event taramak yerine önceden hesaplanmış rollup'lar üzerinden ele alır.

## Pitfalls

- At-least-once delivery semantics'i yok sayarak her tıklama için dedup olmadan tek bir veritabanı counter'ını artırmak.
- Gecikmeli veya sıra dışı event'lere cevap vermemek.
- Audit/ham depolama gereksinimini real-time agregat path'iyle karıştırıp bir sistemin ikisini de kötü yapmaya çalışmasına yol açmak.
- Faturalama doğruluğunun, sıradan bir analytics dashboard'una kıyasla kabul edilebilir trade-off'ları değiştirdiğini fark etmemek.
