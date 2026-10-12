---
id: payment-ledger
title: Wallet ve ledger'lı bir ödeme sistemi tasarla
level: senior
topics: [double-entry-ledger, idempotency, consistency, distributed-transactions]
minutes: 45
---

## Prompt

Kullanıcılar uygulama içi bir wallet'ta bakiye tutuyor ve diğer kullanıcılara
para transfer edebiliyor ya da merchant'lara ödeme yapabiliyor. Bakiyeleri
takip eden ve her işlemi kaydedip hesapların her zaman denk gelmesini
sağlayan backend'i tasarla.

## Clarifications

- **Ölçek?** 10 milyon wallet, günde 2 milyon işlem, ortalama saniyede 23 işlem, promosyonlarda peak'te 10 katına çıkıyor.
- **İşlem türleri?** Karttan top-up, peer-to-peer transfer, merchant ödemesi ve refund.
- **Consistency gereksinimi?** Bir wallet bakiyesi, concurrent istekler altında bile asla negatife düşmemeli ve asla double-spend yapmamalı.
- **Idempotency?** Client'lar timeout'ta bir transfer isteğini 3 kere kadar retry edebilir; her mantıksal işlemin client'tan gelen benzersiz bir idempotency key'i var.
- **Latency hedefi?** Bir peer-to-peer transfer'in completed işaretlenmesi için p99 300 ms'nin altında.
- **Audit gereksinimi?** Her bakiye değişikliği immutable bir ledger entry'sinden yeniden kurulabilmeli; bakiyeler türetilmiş/cache'lenmiş bir view, source of truth değil.
- **Reconciliation?** Her gece çalışan bir job, ledger'dan türetilen bakiyeleri 10 milyon wallet'ın tümü için cache'lenmiş bakiyelerle karşılaştırıp uyuşmazlıkları işaretliyor.

## Follow-ups

- Bir client transfer cevabını beklerken timeout alıyor ve aynı idempotency key'iyle retry ediyor. Sisteminin retry'da tam olarak ne yaptığını adım adım anlat.
- Aynı wallet'tan gelen iki transfer eş zamanlı varıyor ve birlikte bakiyeyi aşıyor. Sadece güvenli bir alt kümenin başarılı olmasını nasıl garanti edersin?
- Her gece çalışan reconciliation job'ı, cache'lenmiş bakiyenin ledger toplamıyla uyuşmadığı 40 wallet buluyor. Olası sebepler neler ve sistemi durdurmadan bunları nasıl çözersin?
- 100 milyon wallet'a ve saniyede 2.000 işleme ölçekle. Bu tasarımın hangi kısmı önce bozulur?
- Bir düzenleyici, geçen çeyrekte sistemde hiç para yaratılmadığını ya da yok edilmediğini kanıtlamanı istiyor. Onlara ne gösterirsin?

## Rubric

- Ledger'ı double-entry olarak modeller: her işlem tek bir bakiye mutasyonu değil, dengeli bir debit/credit entry çifti (ya da seti) yazar.
- Ana trade-off'u açıkça söyler: bakiye kontrollerinde strong consistency (locking ya da serializable transaction'lar) ile throughput arasında ve belirtilen QPS için bir yaklaşım seçer.
- Retry edilen bir isteğin iki kez çalışmak yerine orijinal sonucu dönmesi için kalıcı olarak saklanan idempotency key'ler kullanır.
- Ledger'ı append-only ve source of truth olarak ele alır, wallet bakiyesini materialized, yeniden kurulabilir bir cache olarak ele alır.
- Aynı wallet'a karşı concurrent debit'lerin overdraft'ı önlemek için nasıl serialize edildiğini (row-level lock, retry'lı optimistic concurrency ya da wallet başına tek-writer queue) tanımlar.
- Reconciliation'ı sonradan akla gelen bir şey değil, sürekli ya da zamanlanmış bir doğruluk kontrolü olarak ele alır.
- Hata atomicity'sini ele alır: bir işlem ya tamamen commit olur (ledger'ın her iki tarafı da) ya da tamamen geri alınır, kısmi yazma yok.

## Pitfalls

- Immutable bir işlem log'u olmadan sadece mutable bir bakiye sütunu saklamak, sistemi denetlenemez hale getirmek.
- Idempotency'yi görmezden gelip retry'ların bir transfer'i iki kez işlemesine izin vermek.
- Bakiye kontrolleri için getirdiği overdraft riskini kabul etmeden eventual consistency kullanmak.
- Refund'ları, belirli bir önceki işlemi referans alıp geri çevirmesi gerektiğini düşünmeden sadece başka bir transfer gibi ele almak.
