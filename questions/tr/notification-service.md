---
id: notification-service
title: Push, email ve SMS için bir notification service tasarla
level: mid
topics: [queues, fan-out, delivery-guarantees]
minutes: 45
---

## Prompt

Diğer internal servislerin, son kullanıcıları push notification, email ya
da SMS üzerinden bilgilendirmesi gerekiyor. Bu servislerin çağırdığı bir
notification service tasarla.

## Clarifications

- **Ölçek?** Tüm kanallarda günde 50 milyon bildirim gönderiliyor, mesai saatlerinde peak'te saniyede 3.000, ortalama saniyede 580.
- **Kanal dağılımı?** Kabaca yüzde 70 push, yüzde 20 email, yüzde 10 SMS.
- **Gönderenler kim?** Paylaşılan bir API'yi çağıran yaklaşık 30 internal microservice (order güncellemeleri, pazarlama kampanyaları, security alert'leri).
- **Delivery garantisi?** Kanal provider'ına at-least-once delivery; son kullanıcıya duplicate bildirim nadir olmalı ama bir bildirimi sessizce düşürmekten daha kabul edilebilir.
- **Latency gereksinimi?** Transactional bildirimler (örn. OTP, security alert'leri) istekten 2 saniye içinde gönderilmeli; pazarlama/bulk bildirimler 10 dakikaya kadar gecikebilir ve batch'leniyor.
- **Kullanıcı tercihleri?** Kullanıcılar kanal başına ve bildirim kategorisi başına opt-out olabiliyor; servis göndermeden önce tercihleri kontrol etmeli.
- **Harici provider'lar?** Bir push provider'ı (örn. FCM/APNs eşdeğeri), bir email provider'ı, bir SMS provider'ı; her birinin saniyede 1.000-5.000 istek civarında kendi rate limit'i var.

## Follow-ups

- SMS provider'ı isteklerin yüzde 30'u için error dönmeye başlıyor. Sistem, bu bildirimleri kaybetmeden ya da sonsuza kadar retry etmeden nasıl zarifçe degrade olur?
- Bir pazarlama kampanyası bir saat içinde 10 milyon kullanıcıya göndermek istiyor. Bu, transactional trafiğin 2 saniyelik SLA'sıyla nasıl etkileşir?
- Gönderen bir servis timeout'tan sonra API çağrısını retry ederse, aynı kullanıcının aynı bildirimi iki kez almasını nasıl önlersin?
- Bir gereksinim ekle: kullanıcılar uygulama içinde bir bildirim geçmişi/inbox'ı görebilmeli. Ne değişir?

## Rubric

- Sistemi bir ingestion API'sine, kanal ya da öncelik başına bir queue/broker'a ve harici provider'ları çağıran kanala özgü worker pool'larına ayırır.
- Ana trade-off'u açıkça söyler: idempotency key'leriyle at-least-once delivery (daha basit altyapı, client/receiver tarafında dedup gerektirir) ile exactly-once (çok daha karmaşık koordinasyon, burada genelde buna değmez) arasında.
- Transactional'ı (düşük latency, yüksek öncelikli queue) bulk/pazarlama trafiğinden (batch'lenmiş, düşük öncelikli queue) ayırır, böylece biri diğerini aç bırakmaz.
- Exponential backoff ile retry stratejisini ve N denemeden sonra başarısız olan bildirimler için bir dead-letter queue'yu, artı hataların nasıl görünür kılındığını ele alır.
- Kullanıcı tercih kontrollerinin enqueue'dan ya da gönderimden önce yapıldığını, sonra değil, böylece boşa giden provider çağrıları ve compliance riski önlendiğini ele alır.
- Provider rate limit'lerinden ve worker'ların provider başına saniyede 1.000-5.000 isteğin altında kalmak için throttle etmesi gerektiğinden, muhtemelen provider başına queue'larla bahseder.
- Retry'ları dedup'lamak için idempotency key'lerden (örn. çağıran servisten gelen request id) bahseder.

## Pitfalls

- Üç kanalı da önceliksiz, tek bir farksız queue gibi ele almak, bu da bir bulk pazarlama gönderiminin bir security alert'ini geciktirmesine izin verir.
- Idempotency mekanizması olmaması, bir çağıranın network timeout'u sonrası retry'ının duplicate gönderimlere yol açması.
- Harici provider'ların kendi rate limit'leri olduğunu görmezden gelip notification service'in onlara sınırsız throughput push edebileceğini varsaymak.
- Kullanıcının opt-out tercihlerini sadece sonradan akla gelen bir şey olarak ya da hiç kontrol etmemek.
