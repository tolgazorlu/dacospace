---
id: web-crawler
title: Bir web crawler tasarla
level: mid
topics: [distributed-systems, queues, dedup]
minutes: 45
---

## Prompt

Linkleri takip ederek yeni sayfalar bulan, web sayfalarını ölçekte keşfeden ve indiren bir web crawler tasarla.

## Clarifications

- **Ölçek?** Ayda 1 milyar sayfa crawl ediliyor, sürekli throughput saniyede kabaca 400 sayfa, burst'lerde saniyede 1.500'e çıkıyor.
- **Seed set?** 10.000 seed URL'den başlar ve outbound link'leri takip eder.
- **Politeness?** robots.txt'e uymalı ve genel crawler throughput'u ne olursa olsun, herhangi bir domain'e saniyede 1 istekten daha hızlı vurmamalı.
- **Freshness?** Popüler/yüksek trafikli sayfalar (tahmini önem sırasına göre en üstteki yüzde 1) her 24 saatte bir yeniden crawl edilmeli; long tail ise kabaca her 30 günde bir.
- **İçerik boyutu?** Ortalama sayfa, referans verilen ama indirilmeyen asset'ler dahil 500 KB (sadece HTML fetch edilir, ortalama kabaca 80 KB).
- **Dedup gereksinimi?** Farklı URL'lerle erişilebilen aynı içeriği yeniden indirmekten kaçınmalı ve circular link'lerden kaynaklanan sonsuz döngülerden kaçınmalı.
- **Storage?** İndirilen HTML, downstream indexing için saklanır; bu tasarım için "dayanıklı bir yere yaz" ötesinde kapsam dışı.

## Follow-ups

- İki crawler worker, frontier queue'dan neredeyse aynı anda aynı URL'yi alıyor. Duplicate üzerinde bir fetch'i heba etmekten nasıl kaçınırsın?
- Bir domain, seed set'inden 2 milyon sayfa barındırıyor. Saniyede 1 istek politeness limitini ihlal etmeden, aynı zamanda tüm domain'ler genelinde saniyede 400 sayfaya ulaşırken onu tamamen nasıl crawl edersin?
- Kötü niyetli veya yanlış yapılandırılmış bir site, query parametreleri üzerinden sonsuz farklı URL üretiyor (bir crawler trap). Bunu nasıl tespit edip durdurursun?
- En üstteki yüzde 1'lik sayfaları her 24 saatte bir yeniden crawl etmeye öncelik verirken long tail'i tamamen açlıktan nasıl koruyursun?

## Rubric

- Frontier'ı, tek bir global FIFO queue yerine, politeness ve priority'nin ikisinin de uygulanabilmesi için bir priority queue (veya domain başına queue'lar kümesi) olarak tasarlar.
- Ana trade-off'u söyler: domain başına rate limiting'li, domain başına bir queue (güçlü politeness garantileri, daha fazla bookkeeping, bir domain-to-queue router gerektirir) ile domain başına timestamp-based throttling'li tek bir global queue (daha basit ama çarpık yük altında hiçbir domain'in ezilmeyeceğini garanti etmek daha zor).
- URL-seen ve content-seen dedup'ı ayrı ayrı ele alır: yeniden fetch etmemek için bir URL dedup set'i/bloom filter'ı ve farklı URL'ler üzerinden fetch edilen duplicate içeriği saklamamak için bir content hash (örneğin simhash veya exact hash).
- Domain başına robots.txt fetch etmeyi ve cache'lemeyi, o domain'e herhangi bir fetch'ten önce kontrol edilerek kapsar.
- Crawl worker'larını dağıtmayı ve frontier/dedup state'ini partition'lamayı (örneğin domain hash'ine göre) tartışır; böylece worker'ların her URL için tek bir shared lock'a ihtiyacı olmaz.
- Crawler trap'lerinden (sonsuz URL üretimi) ve max URL depth, domain başına max sayfa sayısı veya düşük değerli URL pattern'lerini tespit etme gibi bir mitigation'dan bahseder.
- Yeniden crawl zamanlamasını, herkes için sabit bir aralık değil, sayfa önemini ve staleness'ı birleştiren bir priority score olarak ele alır.

## Pitfalls

- Domain başına bir yapı olmadan tek bir global frontier queue, saniyede 1 istek politeness limitini düzgünce uygulamayı imkansız kılar.
- Content-level dedup olmadan sadece URL dedup'ı yapmak, farklı URL'lerin aynı içeriği servis edebileceğini gözden kaçırmak.
- Sorulmadan robots.txt veya politeness'tan hiç bahsetmemek.
- Crawl depth'inde veya domain başına sayfa sayısında bir sınır olmaması, crawler trap'lerine açık olmak.
