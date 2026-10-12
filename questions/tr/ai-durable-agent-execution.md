---
id: ai-durable-agent-execution
title: Çökmeye eğilimli bir agent için durable execution tasarla
level: senior
topics: [ai, agents, durability, idempotency]
minutes: 45
---

## Prompt

Coding agent'ın, on-plus dakika sürebilen ve side effect'li işlemler içeren çok adımlı task'lar çalıştırıyor (clone, edit, test, commit). Şu anda, worker process task sırasında çöker veya kill edilirse, bütün task sıfırdan yeniden başlıyor, bazen side effect'leri tekrarlayarak. Bunun için durable bir execution katmanı tasarla.

## Clarifications

- **Tipik task?** Her biri gerçek bir side effect'i olan bir tool çağıran 5-10 ayrı adım (dosya yazma, git commit, bir ticketing sistemine API çağrısı).
- **Çökme sıklığı?** Worker process'leri uzun süren task'ların kabaca %1-2'sinde kill edilip yeniden başlatılıyor (deploy'lar, OOM, spot-instance reclaim).
- **Mevcut hata modu?** Yeniden başlatıldığında, agent zaten gerçekleşmiş side effect'ler dahil tüm adımları 1'inci adımdan yeniden yapıyor (duplicate commit'ler, duplicate ticket yorumları).
- **Ayrıca gözlenen?** Flaky bir downstream API her seferinde biraz farklı hata metniyle başarısız oluyor, yani naif identical-retry detection loop'u hiç yakalamıyor ve bir çalışma kimse fark etmeden $40 bütçe tüketiyor.
- **Gereksinim?** Bir çökme ve yeniden başlatma sonrasında, hiçbir side effect'li tool call iki kez çalışmamalı ve task yeniden başlamak yerine devam etmeli.

## Follow-ups

- 7 adımlı bir task'ın 4'üncü ve 5'inci adımı arasında process kill edildiğinde ve worker yeniden başladığında tam olarak ne olduğunu adım adım anlat.
- "Agent meşru bir şekilde uzun, çok adımlı bir task yapıyor" ile "agent bir loop'ta sıkışmış" arasındaki farkı otomatik olarak nasıl ayırt edersin?
- Flaky API'nin hata metni her çağrıda değişiyor. Tasarımın bunu yine de aynı tekrarlayan hata olarak nasıl tanır ve durdurur?
- Şimdi herhangi bir yıkıcı adımdan önce human approval ekle. Task bir insanın yanıt vermesini saatlerce bekleyebileceğine göre, bu senin durability tasarımınla nasıl etkileşir?

## Rubric

- Bir durable-execution pattern'i önerir (event log plus replay veya bir workflow engine), böylece bir çökme sonrası 1'inci adımdan yeniden başlamak yerine son tamamlanan adımdan devam edilir.
- Her side effect'li tool call'ı idempotent yapar (çalışma/adım başına idempotency key), böylece çökme sonrası replay gerçek dünyada bir effect'i tekrarlayamaz.
- Her çağrıdan önce kontrol edilen, model'in kendi muhakemesinden bağımsız sabit bir step-sayısı ve maliyet tavanı uygular.
- Loop/sıkışmış-task tespitini tam string eşleştirmesi yerine hataların semantic equivalence'ına (aynı hata kategorisi) dayandırarak tasarlar, böylece değişken hata metni tespiti bozmaz.
- Human-approval duraklamasını, bloklayan bir in-memory bekleme değil, first-class durable bir state olarak ele alır, böylece task saatlerce beklerken ilerlemeyi kaybetmez.
- "Gerçekte ne olduğunun" agent'ın iddia ettiğinden bağımsız olarak log'dan yeniden kurulabilmesini sağlayacak kadar state loglar.
- Replay basitliği (kaba-taneli checkpoint'ler) ile side-effect güvenliği (tool call başına ince-taneli idempotency) arasındaki trade-off'u açıkça söyler.

## Pitfalls

- Crash recovery'yi "tüm task'ı tekrar dene" olarak ele almak, zaten çalışmış side effect'leri göz ardı ederek.
- Exact-match retry'lara dayanan loop/sıkışma tespiti, ki değişken hata metinli flaky bir API bunu kolayca atlar.
- Bekleyen bir human approval için persist edilmiş state olmaması, böylece bekleme sırasında bir çökme task'ı tamamen kaybeder.
- Kod içinde uygulanmış bir maliyet tavanının olmaması, agent'ın "durmaya karar vermesine" güvenmek.
