---
id: leaderboard
title: Mobil bir oyun için real-time leaderboard tasarla
level: mid
topics: [sorted-sets, caching, real-time-updates, sharding]
minutes: 45
---

## Prompt

Mobil bir oyun, en iyi 100 oyuncuyu gösteren global bir leaderboard istiyor
ve her oyuncunun kendi rank'ini görebilmesini istiyor. Skorlar insanlar
oynadıkça sürekli güncelleniyor. Bunun arkasındaki sistemi tasarla.

## Clarifications

- **Ölçek?** Günde 8 milyon aktif oyuncu, günde 40 milyon skor güncelleme event'i, peak'te saniyede 3.000 güncelleme.
- **Okuma deseni?** Top-100 view günde 500.000 kez çekiliyor; "my rank" lookup'ı günde 2 milyon kez çekiliyor.
- **Bayatlık toleransı?** Top-100 listesi en fazla 5 saniye bayat olabilir; bir oyuncunun kendi rank'i en son skorunu 2 saniye içinde yansıtmalı.
- **Skor aralığı?** 0 ile 10.000.000 arası integer skorlar, berabere durumlarda en erken ulaşılma zamanı tie-break'e kullanılıyor.
- **Leaderboard kapsamı?** Global leaderboard artı 6 bölge için bölgesel leaderboard'lar; her biri aynı top-100 ve rank-lookup davranışına ihtiyaç duyuyor.
- **Reset sıklığı?** Leaderboard haftalık reset oluyor; geçmiş haftaların top-100 snapshot'ları saklanıyor.
- **Yazma boyutu?** Her güncelleme tek bir oyuncunun yeni skoru, batch değil.

## Follow-ups

- Bir oyuncunun rank lookup'ının "8.000.000 oyuncu içinde #45.213'sün" demesi gerekiyor. Tüm set'i taramadan bu rank'i verimli nasıl hesaplarsın?
- Global bir turnuva sırasında skor güncelleme event'lerini saniyede 30.000'e ölçekle. Tasarımında ne değişir?
- İki oyuncu birbirine milisaniyeler içinde aynı skorda berabere kalacak güncellemeler gönderiyor. En-erken-ulaşılma-zamanına göre tie-breaking, concurrent yazmalar altında nasıl doğru tutulur?
- Haftalık reset, UTC'de gece yarısı herhangi bir in-flight skor güncellemesini düşürmeden atomik olarak gerçekleşmeli. Bunu nasıl yaparsın?
- Bölgesel leaderboard'lar, write cost'unu 7 katına çıkarmadan global olanla altyapıyı nasıl paylaşır?

## Rubric

- Her okumada sıralama yapmak yerine O(log n) rank ve range sorguları için in-memory sorted-set tarzı bir yapı kullanır (örn. Redis ZSET ya da eşdeğeri).
- Ana trade-off'u açıkça söyler: her rank lookup'ı için kesin real-time doğruluk ile belirtilen saniyede 3.000 güncelleme ölçeğinde throughput için caching/batching yazmalar arasında.
- Herhangi bir oyuncu için (sadece top 100 değil) rank lookup'ını 8 milyon skoru taramak yerine sorted yapı içindeki rank ile tanımlar.
- Tie-breaking'i deterministik ele alır, kazara insertion sırasına güvenmek yerine composite bir sort key (skor artı timestamp) kullanır.
- Haftalık reset'i, canlı veriyi silip yeniden kurmak yerine atomik bir cutover (örn. yeni bir yapıya/key'e geçiş ve eskisini arşivleme) olarak ele alır.
- Bölgesel leaderboard'ların aynı yazma akışından, write yükünü orantılı çoğaltmadan nasıl türetildiğini ya da partition'landığını tartışır.
- Top-100 view'in, değişme sıklığına göre çok daha sık okunduğu için tam rank yapısından ayrı cache'lenmesinden bahseder.

## Pitfalls

- Her yazmada ya da her okumada tüm sıralı leaderboard'ı yeniden hesaplamak yerine incremental olarak tutulan sorted bir yapı kullanmamak.
- Tie-breaking kurallarını görmezden gelip beraberliklerin nondeterministik çözülmesine izin vermek.
- "My rank"i 8 milyon oyuncudaki maliyetini hiç tartışmadan tam bir table scan gerektiriyormuş gibi ele almak.
- Haftalık reset sınırı için bir plan olmaması, cutover sırasında kaybolan güncellemeler ya da görünür bir kesinti riski.
