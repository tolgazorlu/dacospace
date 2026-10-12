---
id: webhook-delivery
title: Bir webhook delivery platformu tasarla
level: mid
topics: [webhooks, retries, queueing, idempotency]
minutes: 45
---

## Prompt

Müşterilerin, platformumuzdan "order.created" veya "payment.failed" gibi event bildirimleri almak için bir URL kaydetmesine izin veriyoruz. Bu webhook event'lerini güvenilir şekilde deliver eden sistemi tasarla.

## Clarifications

- **Ölçek?** 100 bin kayıtlı müşteri endpoint'i, peak'te platform genelinde saniyede 2.000 event üretiliyor.
- **Delivery garantisi?** At-least-once delivery; müşterilerin duplicate'leri bir event id kullanarak ele alması bekleniyor.
- **Retry policy?** Başarısız delivery'ler (non-2xx response veya timeout), exponential backoff ile, 24 saat boyunca 10 denemeye kadar retry edilir; sonrasında event dead-lettered olarak işaretlenir.
- **Latency beklentisi?** Sağlıklı endpoint'ler için ilk delivery denemesi, event gerçekleştikten sonra 5 saniye içinde.
- **Müşteri endpoint sağlığı?** Herhangi bir anda, kayıtlı endpoint'lerin yaklaşık yüzde 2'si yavaş veya down (yanlış yapılandırılmış, deprecated veya geçici olarak hata veriyor).
- **Sıralama?** Aynı resource için event'ler (örneğin aynı order) genellikle sırayla gelmeli, ama katı global sıralama gerekmiyor.
- **Görünürlük?** Müşteriler delivery log'larını görebilir ve başarısız bir event'i, gerçekleştikten sonra 14 gün boyunca manuel olarak replay edebilir.

## Follow-ups

- Bir müşterinin endpoint'i her istekte timeout vermeye başlıyor. Onların retry trafiğinin, herkesin delivery'leri için gereken kaynakları tüketmesini ne önler?
- Bir müşteri, aynı "order.created" event'ini üç kez neden aldığını soruyor. Cevabın ne ve onlar kendi tarafında ne yapmalı?
- Bir flash sale sırasında event hacmi 10 dakika boyunca 10 katına çıkıyor. Önce ne biriküyor ve ilgisiz müşteriler için delivery latency'sinin kötüleşmesini nasıl önlersin?
- Bir müşterinin 10 gün önceki belirli bir event'i, o zamandan beri olan her event'i yeniden deliver etmeden replay etmesine nasıl destek verirsin?
- Bir müşteri endpoint URL'sini değiştiriyor ve eski olan 404 döndürmeye başlıyor. Sistem bunu ne kadar hızlı fark eder ve ne yapar?

## Rubric

- Event source'tan senkron deliver etmek yerine, event producer'lar ile delivery worker'lar arasında destination başına (veya destination'a göre sharded) dayanıklı bir queue kullanır.
- Ana trade-off'u söyler: yavaş/başarısız endpoint'leri izole etmek (örneğin destination başına ayrı queue'lar veya circuit breaker'lar), shared bir worker pool'dan daha fazla infrastructure ve complexity'ye mal olur; ama shared bir pool, kötü bir endpoint'in herkesin delivery'sini açlıktan kesmesine izin verir.
- Exponential backoff ve dead-letter policy'sini, 10-attempts-over-24-hours gereksinimiyle eşleşecek şekilde somut olarak tanımlar.
- Her event'in müşterilerin dedup yapabilmesi için nasıl stable bir id aldığını açıklar ve delivery'nin at-least-once, exactly-once değil, olduğunu açıkça belirtir.
- Destination başına sıralamayı (örneğin müşteri endpoint'i başına tek bir in-order queue) global sıralamaya karşı ele alır ve global sıralamanın neden denenmediğini açıklar.
- Delivery logging'i ve manuel replay özelliğini, 14 günlük pencereyle sınırlı, saklanan bir event store'a karşı yapılan read/write'lar olarak ele alır.
- Bir trafik spike'ı sırasında backpressure handling'i, bir surge'ün ilgisiz müşterilerin event'lerini geciktirmemesi için tartışır.

## Pitfalls

- Webhook'ları, onları tetikleyen event ile senkron ve inline olarak deliver etmek, producer latency'sini bir müşterinin endpoint sağlığına bağlamak.
- Endpoint'ler arasında izolasyon olmaması, bir yavaş müşterinin herkes için delivery'i kötüleştirmesi.
- Ağır koordinasyon olmadan HTTP üzerinde gerçekçi olmayan exactly-once delivery'i vaat etmek.
- Somut bir backoff/dead-letter policy'si olmaması, sadece "çalışana kadar retry et."
