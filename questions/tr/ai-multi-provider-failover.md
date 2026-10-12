---
id: ai-multi-provider-failover
title: LLM'e bağımlı bir ürün için multi-provider failover tasarla
level: senior
topics: [ai, production, reliability, failover]
minutes: 45
---

## Prompt

Müşteriye yönelik ürünün tamamen tek bir LLM API sağlayıcısına bağımlı. O sağlayıcıda çok saatlik, fleet çapında bir kesintinin ürününü de beraberinde götürmemesi için bir failover mimarisi tasarla.

## Clarifications

- **Mevcut durum?** Tek sağlayıcı, tek model ailesi, uygulamadan doğrudan API çağrıları, sadece hata durumunda exponential backoff'lu retry.
- **Kesintinin iş etkisi?** Bu özellik gelir açısından kritik; her saatlik tam kullanılamazlık, sadece rahatsızlık değil, gerçek müşteriye yönelik etkiyle ölçülüyor.
- **Planlanacak kesinti şekli?** Önceden hiç uyarı olmadan 4+ saat süren, sağlayıcı çapında bir kesinti, tek bir başarısız istek değil.
- **Kesinti sırasında ne kabul edilebilir?** Degrade edilmiş servis, cache'lenmiş yanıtlar, read-only mod, kuyruğa alma kabul edilebilir; yanıtsız sert bir hata kabul edilemez.
- **Kısıt?** Prompt'lar ve davranış, primary veya fallback sağlayıcıda çalışırken de makul şekilde tutarlı kalmalı.

## Follow-ups

- Bir konuşmanın ortasında farklı bir model ailesine failover yaptığında spesifik olarak ne bozulur ve bunu nasıl ele alırsın?
- Gerçek bir çok saatlik kesinti beklemeden bu failover yolunu gerçekten nasıl test edersin?
- Fallback sağlayıcı da primary'nin kesintisi sırasında yüksek hata oranları gösteriyor, çünkü diğer şirketler de ona failover yapıyor. Planın ne?
- İkinci bir sağlayıcıyı sıcak ve hazır tutmanın ek baseline maliyeti nedir ve bunu bir kesintinin olasılığı ve maliyetine karşı nasıl gerekçelendirirsin?

## Rubric

- Aynı sağlayıcıyı backoff'la yeniden denemek yerine, ki bu sağlayıcının tamamı çöktüğünde hiçbir şey yapmaz, ikinci bir sağlayıcıya otomatik, health-check'li failover tasarlar.
- Hiçbir sağlayıcının sağlıklı olmadığı pencerede sert bir hata yerine graceful degradation yolları önerir (cache'lenmiş/son bilinen iyi yanıtlar, read-only mod, istek kuyruklama).
- Sağlayıcılar arası prompt/davranış taşınabilirliğini ele alır: model ailesi değiştiğinde yeniden ayarlanması ya da yeniden test edilmesi gerekenler ve aynı kalanlar.
- Gerçek bir kesinti beklemeden failover yolunu test etmek için somut bir plan var: fault injection, planlı tatbikatlar.
- Büyük bir kesinti sırasında fallback sağlayıcının da degrade olduğu, korelasyonlu hata senaryosunu, sadece mükemmel sağlıklı olduğu durumu değil, gerçekçi şekilde kapsar.
- İkinci bir sağlayıcıda sıcak bir yedek tutmanın maliyet/karmaşıklığını belirtir ve belirtilen iş etkisi göz önüne alındığında buna değdiğine dair açık bir savunma yapar.
- Kesintinin dakikalar değil saatler sürebileceğini varsayan incident iletişimi/runbook beklentilerini içerir.

## Pitfalls

- Kullanımdaki tek sağlayıcının fleet çapında kesintisine karşı hiçbir şey yapmayan "exponential backoff'la yeniden deneriz."
- Bu arada uygulanabilir bir fallback olmadan "sağlayıcının status page'ini bekleriz."
- Korelasyonlu hata riskini göz ardı ederek, büyük bir kesinti sırasında fallback sağlayıcının sağlıklı olacağını varsaymak.
- Test edilmemiş bir failover yolu; tasarım ilk gerçek kesintiye kadar sadece kağıt üzerinde var olur.
