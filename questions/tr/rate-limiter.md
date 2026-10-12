---
id: rate-limiter
title: Public bir API için rate limiter tasarla
level: mid
topics: [rate-limiting, redis, distributed-counters]
minutes: 45
---

## Prompt

Public bir API'nin önünde duran ve tek bir client'ın backend'i boğmasını engelleyen bir rate limiter tasarla. Birden çok API sunucusunda birlikte çalışması gerektiğini varsay.

## Clarifications

- **Client'lar kim?** API key kullanan üçüncü parti geliştiriciler, yaklaşık 50.000 aktif key.
- **Ölçek?** Tüm key'lerde toplam peak'te saniyede 20.000 istek, ortalama saniyede 4.000 istek.
- **Limit hangi seviyede?** API key başına; varsayılan dakikada 100 istek, ayrıca dakikada 1.000 isteklik bir premium tier var.
- **Deployment?** Bir load balancer arkasında 30 stateless API sunucusu instance'ı; yani limiter state'i tek bir process'in belleğinde duramaz.
- **Limit aşılınca ne olacak?** `Retry-After` header'ı ile HTTP 429 dön; istekleri kuyruğa alma ya da geciktirme.
- **Doğruluk beklentisi?** Yaklaşık sonuç yeterli, yüzde 5'e kadar fazla sayma kabul edilebilir; ama eksik sayma (limitin çok üstüne izin vermek) kabul edilmez.
- **Latency bütçesi?** Rate limit kontrolünün kendisi p99'da en fazla 2 ms eklemeli.

## Follow-ups

- Shared counter store'un Redis ve 10 saniyeliğine çöküyor. Bu süre boyunca trafiğe ne olur?
- Bir client, sabit bir dakikalık iki pencerenin tam sınırında ve sınırın iki yanına yayarak limitinin iki katını gönderiyor. Bunu sliding window yaklaşımıyla nasıl çözersin?
- 500.000 API key'e ve saniyede 200.000 isteğe ölçekle. Redis tabanlı tasarımın hâlâ çalışır mı, çalışmazsa ne değişir?
- Key başına limite ek olarak endpoint başına limiti nasıl desteklersin? Örneğin write-heavy bir endpoint için daha sıkı bir limit.

## Rubric

- Somut bir algoritma seçer (token bucket, sliding window log ya da sliding window counter) ve burst davranışı açısından neden fixed window yerine onu seçtiğini açıklar.
- Ana trade-off'u açıkça söyler: doğruluk ve adalet (sliding window log, daha çok bellek ve CPU) ile maliyet ve sadelik (fixed window ya da token bucket, daha ucuz ama pencere sınırında burst'e izin verir).
- 30 API sunucusunun aynı state'te anlaşması için paylaşılan, düşük latency'li bir counter store önerir (atomik INCR/EXPIRE ya da Lua script ile Redis).
- Single point of failure'ı ele alır: Redis erişilemezken fail-open mı fail-closed mı, bu sistem hangisini seçmeli ve neden.
- Limiter'ın nerede çalıştığını tartışır (API gateway/middleware ya da her servisin içinde) ve Redis'e giden network hop'unun latency etkisini konuşur.
- Limitlerin key/tier bazında nasıl yapılandırıldığını ve bu config'in restart gerektirmeden enforcement noktalarına nasıl dağıtıldığını anlatır.

## Pitfalls

- Sunucu başına in-memory counter önermek ve 30 sunucunun her birinin tam limite izin vereceğini, yani efektif limitin 30 katına çıkacağını görmemek.
- Fixed window counter seçip sorulduğunda pencere sınırındaki burst problemini kabul etmemek.
- Shared store (Redis) çöktüğünde ne olacağına cevap verememek; her zaman ayakta olduğunu sessizce varsaymak.
- Latency bütçesini yok saymak ve istek başına store'a birden çok round trip gerektiren bir tasarım önermek.
