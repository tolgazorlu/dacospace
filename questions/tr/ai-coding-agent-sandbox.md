---
id: ai-coding-agent-sandbox
title: Gözetimsiz bir coding agent için sandbox tasarla
level: senior
topics: [ai, security, agents, sandboxing, blast-radius]
minutes: 45
---

## Prompt

Şirketin, bir staging ortamına karşı gece boyunca gözetimsiz çalışacak, küçük PR'lar üretip merge edecek bir coding agent'a shell ve dosya sistemi erişimi vermek istiyor. Sandbox'ı ve etrafındaki kontrolleri tasarla.

## Clarifications

- **İstenen erişimin kapsamı?** Tam shell, dosya read/write ve staging-tracked bir branch'e git push; doğrudan production credential'ları yok.
- **Hacim?** Gece başına ~20 çalışma, her biri $5 ve 150 agent step bütçeli.
- **Tetikleyici?** Çalışmalar, küçük ve iyi tanımlı ticket'lardan oluşan bir kuyruktan otomatik başlıyor (dependency bump'ları, test-flakiness düzeltmeleri).
- **İşler ters giderse asıl blast radius ne?** Şimdiye kadar konuşulan en kötü durum, API bütçesini tüketen bir runaway loop veya staging'de yıkıcı bir dosya işlemi.
- **Review gereksinimi?** Her PR merge'den önce bir insan tarafından review edilmeli; agent kendi PR'ını merge edemez.
- **Bugünkü kontrol?** Takım, pipeline'ı hızlandırmak için `--trust-all-tools --no-interactive` flag'lerini eklemek istiyor, şu anda var olan tek approval prompt'unu kaldırarak.

## Follow-ups

- Agent bir dosya silmenin "geri alınamaz" olduğunu bildiriyor. Bu iddiaya güvenir misin ve tasarımın bunu bağımsız olarak doğrulamanı nasıl sağlar?
- Agent'ın çektiği bir dependency güncellemesinin sonradan zehirli olduğu anlaşılıyor. Mevcut ortamında `--trust-all-tools`'un gerçek blast radius'u nedir?
- Bir retry loop'u, her seferinde biraz farklı hata metniyle flaky bir testte tetiklenmeye başlıyor, yani naif duplicate-detection hiç devreye girmiyor. Tasarımın bunu gecenin bütçesini tüketmeden önce nasıl durdurur?
- Birisi bu agent'ı mesai saatlerinde production'a "sadece read-only diagnostics için" erişecek şekilde genişletmek istiyor. Ne değişir, ne değişmez?

## Rubric

- Ortam ayrımını (agent'ın production credential'larına literal olarak ulaşamaması, network-restricted olması) bir policy ifadesi değil, pazarlıksız bir gereklilik olarak ele alır.
- Gözetimsiz çalışmalar için `--trust-all-tools`/approval-gate'siz flag'leri reddeder, gerçek alternatif kontrol olarak sandboxing'i (ephemeral, network-restricted container'lar) önerir.
- Her tool call'dan önce kontrol edilen, kod içinde uygulanan sabit bir çalışma başına maliyet tavanı ve step-sayısı limiti zorlar; sadece bir prompt'ta tarif edilmiş olarak değil.
- Agent'ın geri alınamazlık veya başarı hakkındaki kendi beyanlarına güvenmez; ground truth olarak bağımsız, dışsal bir audit log veya snapshot gerektirir.
- Hiçbir tek dış katkının (zehirli bir dependency, hazırlanmış bir PR yorumu) hem agent'ın davranışını değiştirip hem de neyin ship edileceğini kontrol edemeyeceği şekilde görev ayrımı yapar.
- Yıkıcı veya tekrarlanan işlemler için idempotency ve loop-termination tasarlar (max step, maliyet tavanı, tekrarlayan hatalarda semantic-equivalence kontrolü), sadece identical-string retry detection değil.
- Agent'ın anlatımından bağımsız olarak gerçekte ne olduğunun yeniden kurulabilmesini sağlayacak audit logging'i kapsar.

## Pitfalls

- "System prompt'ta prod'a dokunmamasını söyledik" tek kontrol olarak, hiçbir infrastructure-seviyesi uygulama olmadan.
- Agent'ın kendi durum raporunu ("rollback mümkün değil") bağımsız bir kontrol olmadan gerçek saymak.
- Gözetimsiz/CI bağlamını approval-gate muhakemesinden muaf saymak, "zaten onay verecek kimse etrafta yok" diye.
- Yüzeyde farklı görünen ama semantik olarak aynı hata olan retry loop'larına bir sınır koymamak.
