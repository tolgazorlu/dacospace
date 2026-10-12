---
id: file-sync
title: Dropbox gibi bir dosya senkronizasyon servisi tasarla
level: senior
topics: [sync-protocol, conflict-resolution, chunking, offline-first]
minutes: 45
---

## Prompt

Kullanıcılar birden fazla cihaza bir client kuruyor ve bir cihazda düzenledikleri herhangi bir dosyanın, offline kaldıktan sonra bile, diğer tüm cihazlarda saniyeler içinde görünmesini bekliyor. Sync backend'ini ve client protokolünü tasarla.

## Clarifications

- **Ölçek?** 20 milyon kullanıcı, kullanıcı başına ortalama 3 cihaz, kullanıcı başına ortalama 2.000 dosya, ortalama dosya boyutu 4 MB.
- **Değişiklik hızı?** Tüm kullanıcılarda günde 50 milyon dosya-değişiklik event'i, peak'te saniyede 2.000 değişiklik.
- **Dosya boyutu aralığı?** Dosyaların çoğu 10 MB'ın altında, ama yüzde 5'e kadarı 2 GB'a kadar büyük dosyalar (video, arşiv).
- **Offline toleransı?** Bir cihaz 30 güne kadar offline kalabilir ve yeniden bağlandığında doğru şekilde reconcile olmalı.
- **Sync latency hedefi?** Küçük bir dosya düzenlemesi diğer online cihazlara 5 saniye içinde yayılmalı.
- **Conflict senaryosu?** Aynı dosya iki cihazda birbirinden offline iken düzenleniyor; ikisi de aynı saat içinde yeniden bağlanıyor.
- **Bant genişliği kısıtı?** Client, küçük bir düzenlemeden sonra büyük bir dosyanın değişmemiş kısımlarını yeniden yüklememeli.

## Follow-ups

- İki cihaz aynı dosyayı offline düzenliyor, sonra ikisi de 10 dakika arayla online oluyor. Conflict tespiti ve çözümünü baştan sona anlat.
- Bir kullanıcı 1,5 GB'lık bir video dosyasını sonundan 2 saniye kırparak düzenliyor. Tasarımınla ne kadar veri yeniden yüklenip indirilir?
- Bir cihaz 30 gün offline kalmış ve kullanıcı yerel olarak 500 değişiklik yaparken hesap diğer cihazlardan 300 değişiklik daha almış. Reconciliation sürecini anlat.
- 100 milyon kullanıcıya ölçekle. Metadata veya chunk-indexing katmanının hangi parçası önce bottleneck olur?
- Paylaşılan bir klasörü silen bir kullanıcıyla, o klasörün içindeki bir dosyada hâlâ düzenleme yapan başka bir ortak çalışanın durumunu nasıl ele alırsın?

## Rubric

- Dosyaları content-defined chunk'lara böler ve tüm dosyalar değil, sadece değişen chunk'ları senkronlar; bant genişliği ve depolama dedup faydasını açıklar.
- Ana trade-off'u söyler: chunk boyutu dedup granülerliğini ve upload verimliliğini etkiler, buna karşılık metadata overhead'i (daha çok chunk, daha çok index kaydı anlamına gelir).
- Kullanıcı/cihaz başına versiyonlanmış bir değişiklik log'u (veya operation log) önerir, böylece uzun offline dönemlerden sonra reconciliation bir replay'e dönüşür, tahmine değil.
- Somut bir conflict-resolution politikası tanımlar (örneğin conflicted-copy fallback'li last-writer-wins veya vector clock'lar/CRDT'ler) ve bu ürün için seçimi gerekçelendirir.
- Metadata servisini (dosya ağacı, versiyonlar, izinler) chunk/blob depolamadan (content-addressed object store) ayırır.
- Bildirim/yayılım yolunu ele alır: diğer online cihazlar 5 saniyelik hedef içinde bir değişikliğin olduğunu nasıl öğrenir (tüm ağacı polling yapmak yerine push notification ile delta fetch).
- Belirtilen bant genişliği kısıtı göz önünde, büyük dosya işlemeyi küçük dosya işlemeden ayrı ele alır.

## Pitfalls

- Sync'i büyük dosyalar için chunking ve bant genişliği maliyetini göz ardı ederek bütün-dosya upload/download olarak ele almak.
- Conflict'lerin nadir olduğunu varsaymak ve veri kaybı riskini tartışmadan sadece "last write wins" deyip geçmek.
- Uzun süre offline kalan bir client'ın reconcile olması için açık bir mekanizma olmaması; sanki her şeyi yeniden indirecekmiş gibi ima etmek.
- Metadata/index katmanını blob depolama katmanıyla tek, farklılaşmamış bir veritabanı gibi karıştırmak.
