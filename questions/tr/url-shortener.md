---
id: url-shortener
title: Bir URL shortener tasarla
level: junior
topics: [hashing, databases, caching]
minutes: 45
---

## Prompt

URL shortener gibi bir servis istiyoruz: kullanıcı uzun bir URL gönderir ve orijinaline yönlendiren kısa bir URL alır. Sistemi tasarla.

## Clarifications

- **Ölçek?** Ayda 100 milyon yeni kısa URL oluşturuluyor, read-to-write oranı 10:1, yani ayda yaklaşık 1 milyar redirect.
- **Peak trafik?** Write'lar ortalama saniyede 40, peak'te 5 katına çıkıp saniyede 200. Read'ler ortalama saniyede 400, peak'te saniyede 2.000.
- **Short code uzunluğu?** [a-zA-Z0-9] setinden 7 karakter, bu da 62^7 (yaklaşık 3,5 trilyon) olası kod verir; bu oranda 10 yılda gereken 1,2 milyar koddan çok daha fazlası.
- **Custom alias?** Kullanıcılar isteğe bağlı olarak özel bir alias talep edebilir; benzersiz olmalı, write anında kontrol edilir.
- **Expiration?** Linkler, kullanıcı pinlemediği sürece varsayılan olarak 5 yıl sonra expire olur; expire olmuş linkler redirect yerine 404 döner.
- **Redirect tipi?** Her hit'te server-side click analytics toplanabilsin diye 302 (temporary) redirect.
- **Data retention?** Oluşturulma zamanı, orijinal URL, owner id (anonim için nullable) ve click count saklanır.

## Follow-ups

- Saniyede 200 write'ta merkezi bir counter'ın bottleneck'e dönüşmesini önleyerek benzersiz short code'ları nasıl üretirsin?
- Bir short code'un redirect hedefinin değişmesi gerekiyor (kullanıcı hedefi düzenliyor). Caching bununla nasıl etkileşir?
- Viral olan bir linke trafik saniyede 50.000 redirect'e sıçrıyor. Önce ne bozulur ve bunu nasıl çözersin?
- Write latency'sini çok artırmadan oluşturma anında kötü niyetli veya spam URL'leri nasıl tespit edip reddedersin?

## Rubric

- Somut bir short-code üretim stratejisi önerir (bir auto-increment id'nin base62'si ya da bir key-generation service tarafından dağıtılan önceden üretilmiş key pool'u) ve collision/uniqueness garantisini açıklar.
- Read path'i hot path olarak tanımlar ve database'in önüne update'lerde cache-aside invalidation yapan bir cache (örneğin Redis) tasarlar.
- Ana trade-off'u söyler: bir counter'ı encode etmek (kompakt, collision yok ama bir coordination service veya sharded counter'lar gerektirir) ile collision retry'larıyla rastgele üretim (daha basit ama write başına bir uniqueness kontrolü gerektirir).
- Database seçimini ve schema'yı kapsar: short code'a göre key'lenmiş bir key-value store veya indexli bir relational table, ölçek için read replica'larla.
- Hot-link problemini ele alır (son derece popüler redirect'ler için CDN veya edge cache, ya da code prefix'e göre sharding).
- Analytics/click counting'in redirect critical path'inde senkron olarak durmaması gerektiğini belirtir (async increment veya write-behind).

## Pitfalls

- Primary database'de tek bir auto-increment counter kullanmak ve bunun bir write bottleneck'ine veya single point of failure'a nasıl dönüştüğünü tartışmamak.
- Custom alias'ların ve üretilen kodların aynı namespace'i paylaştığını ve her ikisinin de uniqueness için kontrol edilmesi gerektiğini unutmak.
- 301 permanent redirect tasarlayıp bunun click analytics'i bozduğunu fark etmemek (browser'lar permanent redirect'leri cache'ler).
