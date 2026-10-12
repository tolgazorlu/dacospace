---
id: ai-data-exfiltration-review
title: Bir RAG copilot'u data exfiltration riskine karşı incele
level: senior
topics: [ai, security, rag, exfiltration, prompt-injection]
minutes: 45
---

## Prompt

Bir security researcher senden şirketinin internal copilot'unun data-exfiltration riskini değerlendirmeni istiyor. Bu, internal bir wiki üzerinde çalışan bir RAG sistemi ve model çıktısını chat UI'da markdown olarak render ediyor, linkler ve görseller dahil. Review'ı ve düzeltmeleri tasarla.

## Clarifications

- **Copilot ne okuyabilir?** İsteği yapan çalışanın erişimi olan her wiki space'i, externally-shared veya externally-editable sayfalar dahil.
- **UI, model çıktısıyla ne yapıyor?** Markdown'ı client-side render ediyor; görseller ve link önizlemeleri varsayılan olarak otomatik fetch ediliyor.
- **Düşünülen attack surface?** Copilot'un ulaşabildiği her sayfa, attacker-controlled talimat veya formatlama içerebilir (birinin yapıştırdığı bir sayfa üzerinden indirect injection).
- **Mevcut output filtresi?** Sadece tam `[text](url)` pattern'ini temizliyor.
- **İş kısıtı?** Product, görsel ve link önizlemelerinin kalmasını istiyor, çünkü çalışanlar görsel wiki içeriği için bunlara güveniyor.
- **Zaman çizelgesi?** Review'ı ve düzeltmeyi 2 hafta içinde ship et; bu çeyrek için full external pentest bütçesi yok.

## Follow-ups

- Kendi output filtreni her markdown link/görsel syntax varyantına karşı nasıl red-team edersin: inline, reference-style, HTML-embedded ve encoded?
- Otomatik fetch edilen görseller ve link önizlemeleri için gerçek CSP allowlist'in ne ve bu domainlerden hiçbirinin arbitrary external URL'leri proxy'lemediğini doğruladın mı?
- Bir vendor'ın "AI guardrails" ürünü bilinen exfiltration pattern'lerinin %97'sini blokladığını iddia ediyor. Bunu satın almak buradaki cevabını değiştirir mi?
- Launch'tan altı hafta sonra, attacker-controlled bir wiki sayfasının, query-string-encoded data içeren bir görsel URL'i üzerinden gerçek bir exfiltration'a sebep olduğunu öğreniyorsun. Root cause'u ve düzeltmeyi baştan sona anlat.

## Rubric

- Her markdown link/görsel syntax varyantını (inline, reference-style, HTML img, nested/encoded) sayar ve filtreyi sadece yaygın olana karşı değil, hepsine karşı kontrol eder.
- Görsellerin veya link önizlemelerinin client-side otomatik fetch edilmesinin hiç gerekli olup olmadığını sorgular ve tutulursa bunu bir exfiltration kanalı olarak ele alır.
- Aynı-vendor proxy veya önizleme endpoint'lerini varsayılan olarak güvenli kabul etmeyen bir CSP/allowlist önerir.
- UI'ın, geniş yazılabilir veya externally-editable dokümanlardan gelen içeriği doğrulanmış-internal olanlardan ayırt edebilmesi için provenance etiketleme önerir.
- Tek bir output filtresini veya üçüncü parti bir guardrails ürününü yeterli saymaz; bunu defense-in-depth içinde bir katman olarak çerçeveler.
- Exfiltration'ı önlemenin yanında, olduktan sonra tespit etmeyi de kapsar (gerçekten render edilen outbound URL'lerin/görsellerin loglanması).
- Product gereksinimiyle (önizlemelerin kullanışlı kalması) trade-off'u ele alır, sadece feature'ı kapatmak yerine.

## Pitfalls

- "Zaten markdown linklerini temizliyoruz" demek, reference-style syntax'ı veya görsel otomatik fetch'i test etmeden; tam da bilinen gap sınıfı bu.
- Bir guardrails ürünü satın alıp prompt injection veya exfiltration'ı "çözülmüş" saymak.
- Zaten gerçekleşmiş bir exfiltration'ı tespit etmek için bir plan olmaması; sadece prevention'a odaklı tasarım.
- Externally-editable veya geniş yazılabilir sayfalardan gelen içeriğin, "internal" boundary içinde yaşasa da attacker-reachable olduğunu göz ardı etmek.
