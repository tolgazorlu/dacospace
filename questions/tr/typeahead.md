---
id: typeahead
title: Arama autocomplete'i (typeahead) tasarla
level: mid
topics: [tries, caching, ranking]
minutes: 45
---

## Prompt

Bir arama kutusunun autocomplete özelliği için backend'i tasarla: kullanıcı
yazarken, birkaç yüz milisaniye içinde en uygun önerileri göster.

## Clarifications

- **Ölçek?** Günde 10 milyon arama, her arama kabaca 5 keystroke seviyesinde autocomplete request tetikler, yani günde yaklaşık 50 milyon autocomplete request'i, ortalama saniyede 580, peak'te saniyede 4.000.
- **Latency gereksinimi?** Her keystroke'ta tetiklendiği için p99'da uçtan uca 100 ms'nin altında.
- **Öneri kaynağı?** Son 30 gündeki historical arama frekansına göre ranked; sorgu prefix'i başına top 10 öneri gösterilir.
- **Vocabulary boyutu?** Yaklaşık 20 milyon farklı historical sorgu takip ediliyor, 20 karaktere kadar prefix'ler dikkate alınıyor.
- **Freshness?** Yeni trend olan terimler önerileri yaklaşık 1 saat içinde etkilemeli, real time değil.
- **Personalization?** Bu interview için kapsam dışı; aynı prefix verildiğinde öneriler tüm kullanıcılar için aynı.
- **Typo'lar?** Kapsam dışı; sadece exact prefix matching olduğunu varsay.

## Follow-ups

- 1 karakterlik bir prefix'in büyük, unranked bir liste döndürmemesi için 20 milyon farklı sorgu için prefix index'i nasıl inşa edip serve ettiğini anlat.
- Yeni bir terim aniden spike yapıyor (breaking news). 1 saatlik freshness penceresi içinde nasıl top bir öneri hale gelir?
- Latency bütçesini p99'da 50 ms'ye düşür. Ne değiştirirsin?
- Vocabulary çok dilde 500 milyon farklı sorguya büyüseydi bunu nasıl sharding yapardın?

## Rubric

- Core serving data structure olarak bir trie (prefix tree) veya eşdeğer bir prefix index önerir, her node veya compressed bir subtree kendi top-k önerilerini precomputed olarak cache'ler, böylece lookup'lar request time'da scan ve rank yapmaz.
- Ana trade-off'u söyler: her trie node'unda top-k önerileri precompute etmek (hızlı read'ler ama ranking'ler değiştiğinde maliyetli ve karmaşık güncellemeler) ile request başına daha küçük bir candidate set'ten top-k'yı anlık hesaplamak (daha basit güncellemeler, daha yavaş read'ler). Hangisinin 100 ms bütçesine ve 1 saatlik freshness penceresine uyduğunu belirtir.
- Write path'ini (arama loglarını query frequency sayımlarına aggregate etmek, offline/batch yapılır) read path'inden (precomputed trie'yi serve etmek) ayırır, kabaca saatlik olarak yeniden inşa edilir veya incremental güncellenir.
- En sıcak, en kısa prefix'leri (1-3 karakter) bir edge/CDN katmanında veya in-memory cache'te cache'lemeyi ele alır, çünkü bunlar orantısız trafik alır.
- Tek bir makineye sığmaz hale geldiğinde trie'yi prefix range'e veya ilk karakter(ler)e göre sharding yapmayı tartışır.
- Offline aggregation job'ının downtime olmadan yeni bir trie/index'i nasıl devreye aldığını ele alır (örneğin yeni versiyonu inşa et, pointer'ı atomik olarak swap et).

## Pitfalls

- Serving path olarak canlı bir tabloya karşı bir SQL `LIKE 'prefix%'` sorgusu önerip bunu bitmiş saymak, 100 ms/4000 QPS gereksinimini ele almamak.
- Offline precompute etmek yerine her request'te top-k ranking'leri raw log'lardan senkron olarak yeniden hesaplamak.
- Index'in zamanla nasıl güncellendiğinin tartışılmaması, bir kere inşa edilip sonsuza kadar static kaldığının varsayılması.
