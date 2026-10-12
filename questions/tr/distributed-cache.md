---
id: distributed-cache
title: Dağıtık bir key-value cache tasarla
level: senior
topics: [consistent-hashing, replication, consistency]
minutes: 45
---

## Prompt

Uygulama servislerinin daha yavaş bir ana veritabanından okumaları hızlandırmak için kullandığı, basitleştirilmiş bir Memcached ya da Redis cluster'ı gibi, dağıtık bir in-memory cache tasarla.

## Clarifications

- **Ölçek?** Tüm cluster'da peak'te saniyede 2 milyon GET isteği, saniyede 200.000 SET isteği.
- **Veri boyutu?** Ortalama value 2 KB, 500 milyon farklı key, toplamda kabaca 1 TB hot data.
- **Cluster boyutu?** Her biri 32 GB kullanılabilir belleğe sahip 50 cache node'u.
- **Latency gereksinimi?** Hem GET hem SET için p99'da 5ms'nin altında.
- **Consistency gereksinimi?** Cache, source-of-truth bir veritabanının yanında bir side cache; bir write'tan sonra kısa süreli staleness (birkaç saniye) kabul edilebilir, ama bir node client'ın cache miss'ler üzerinden fark etmediği şekilde sessizce büyük bir key kümesini kaybetmemeli.
- **Eviction?** Bir node'un belleği dolduğunda node başına LRU; key başına TTL destekli, varsayılan 10 dakika.
- **Hata toleransı?** 50 node'dan 1'ini kaybetmek hit rate'i düşürmeli, outage'a yol açmamalı.

## Follow-ups

- Tek bir key (bir ünlü profili, trend bir ürün) kendi başına saniyede 50.000 GET alıyor. Partitioning şeman bunu bir node'u eritmeden nasıl ele alır?
- Bir node çöküyor ve değiştiriliyor. Hata anından cluster'ın tamamen sağlıklı hale gelmesine kadar, sahip olduğu key'lere ne olduğunu baştan sona anlat.
- Büyümeyi karşılamak için 20 node daha eklemen gerekiyor. Ne kadar veri taşınır ve rebalance sırasında client'lar çalışmaya nasıl devam eder?
- Gereksinim "cache, stale okuma sorun değil"den "asla stale veri dönmemeli"ye değişseydi tasarımı nasıl değiştirirdin?

## Rubric

- Key'leri 50 fiziksel node'a eşlemek için virtual node'larla consistent hashing (veya rendezvous hashing gibi bir eşdeğerini) önerir, basit modulo hashing'e kıyasla node ekleme/çıkarmada key hareketini nasıl sınırladığını açıklar.
- Ana trade-off'u açıkça söyler: availability ve okuma throughput'u için replication (her key N node'da saklanır, ekstra bellek ve write maliyeti, daha karmaşık invalidation) ile key başına tek sahip (daha basit, daha ucuz, ama bir node hatası değiştirilene kadar key'lerini düşürür). 1 node hatası toleransı gereksinimi göz önünde somut bir seçim yapar, örneğin replication factor 2 veya 3.
- Hot-key problemini genel partitioning'den ayrı ele alır: client-side caching, key seviyesinde birden fazla node'a replication veya aşırı hot bir key için request coalescing; çünkü tek başına consistent hashing aşırı yüklenmiş tek bir key'i çözmez.
- Client routing'i ele alır: hash ring'i bilen akıllı bir client veya proxy katmanı ile merkezi bir router arasındaki latency/karmaşıklık trade-off'unu.
- Node hatasında ne olacağını tartışır: client'lar bunu nasıl fark eder (health check'ler, consistent hashing ring güncellemesi) ve cache ısınırken veritabanında thundering herd'ü sistem nasıl önler.
- Node eklerken rebalancing'i ele alır: consistent hashing'in key'lerin yaklaşık 1/N'ini taşıma özelliği ile yeni node'a tam trafik göndermeden önce ısıtma operasyonel sürecini.
- Node başına bellek yönetiminden (LRU eviction ve TTL) bahseder ve 1 TB hot data'nın, overhead ve replication factor için pay bırakarak, 50 x 32 GB = 1,6 TB ham bellek içine sığıp sığmayacağını tahmin eder.

## Pitfalls

- Node sayısı değiştiğinde neredeyse tüm key'leri yeniden karıştırdığını ele almadan basit modulo tabanlı hashing (key hash mod node sayısı) önermek.
- Hot-key problemine "consistent hashing load'u dağıtır" dışında cevap vermemek, hashing şemasından bağımsız olarak bir key'in her zaman bir node'a (veya bir replica set'e) eşleneceğini kaçırmak.
- Cache'i sanki system of record'muş gibi davranıp gereksinimlerin açıkça istemediği strong consistency'yi fazla mühendislemek.
- Cluster'ın belleğinin belirtilen veri hacmini tutup tutamayacağını kontrol ederken replication factor'ü hesaba katmayı unutmak.
