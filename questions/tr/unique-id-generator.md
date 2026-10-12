---
id: unique-id-generator
title: Benzersiz bir ID generator tasarla
level: junior
topics: [distributed-ids, sharding]
minutes: 45
---

## Prompt

Dağıtık bir veritabanında oluşturulan satırlar için benzersiz ID'ler üreten bir servis tasarla. Basit bir auto-increment column'un artık işe yaramadığını varsay.

## Clarifications

- **Ölçek?** Tüm sistemde peak'te saniyede 50.000 ID üretiliyor, ortalama saniyede 8.000.
- **ID üreten node sayısı?** 20 application sunucusu birbirinden bağımsız olarak ID isteyebilir; hiçbiri asla aynı ID'yi iki kez vermemeli.
- **Sıralama gereksinimi?** ID'ler kabaca zamana göre sıralanabilir olmalı (yeni ID'ler sayısal olarak eski ID'lerden büyük olmalı) ki database index locality'si makul kalsın; ama sunucular arasında katı global sıralama gerekmiyor.
- **Format?** Schema değişikliği yapmadan mevcut primary key column'larına sığması için 64 bit'lik bir integer.
- **Latency gereksinimi?** Bir ID üretmek, ihtiyaç duyan isteğe en fazla 1 ms eklemeli ve ID başına merkezi bir servise network round trip gerektirmemeli.
- **Durability?** Bir sunucu çökse ve yeniden başlasa bile, daha önce verdiği bir ID'yi tekrar kullanmamalı.

## Follow-ups

- İki sunucu aynı milisaniyede ID üretiyor. ID başına birbirleriyle konuşmadan hiç çakışmayacaklarını nasıl garanti edersin?
- Bir sunucunun saati 2 saniye geriye kayıyor (NTP correction). Bu, tasarımını nasıl etkiler ve bunun duplicate veya sırası bozuk bir ID üretmesini nasıl önlersin?
- 20 sunucudan 2.000 sunucuya ölçekle. ID formatında hâlâ yeterli alan var mı?
- Downstream bir sistem, sadece ID'den database lookup yapmadan yaklaşık oluşturulma zamanını çıkarmak istiyor. Formatın bunu destekliyor mu?

## Rubric

- Snowflake tarzı composite bir ID önerir: timestamp, machine/worker id ve milisaniye başına sequence number'ı birleştiren bir bit layout'u ve bit genişliklerini belirtilen ölçeğe göre gerekçelendirir (örneğin saniyede 50.000 peak için yeterli pay bırakan sequence bit'leri, 20 sunucunun üzerine büyümeye yetecek machine-id bit'leri).
- Ana trade-off'u söyler: ID başına herhangi bir koordinasyondan kaçınmak için bir machine id gömmek (hızlı, network çağrısı yok ama benzersiz machine id atayan bir mekanizma gerektirir) ile merkezi bir ID-issuing servisi veya database sequence (ID başına daha basit mantık ama bir network round trip ve potansiyel bottleneck/SPOF, burada 1 ms'lik no-round-trip gereksinimini ihlal eder).
- Machine id atamasını ele alır: 20 (ve ileride daha fazla) sunucunun her birinin manuel koordinasyon olmadan nasıl benzersiz bir machine id aldığını, örneğin Zookeeper/etcd gibi bir coordination service üzerinden ya da startup'ta çakışma kontrolü yapan config-assigned bir id ile.
- Saat sorunlarını kapsar: geriye saat kaymasını tespit edip, o pencere için duplicate veya sırası bozuk bir id riski almak yerine ID üretmeyi reddetmek (veya beklemek).
- Bit-budget hesabını yaparak 64 bit'in yeterli olduğunu doğrular: örneğin 41 bit timestamp (milisaniye çözünürlüğünde yaklaşık 69 yıl), 10 bit machine id (1024 makine), 12 bit sequence (makine başına milisaniyede 4096, saniyede 50.000 / 20 sunucu ≈ sunucu başına 2.500 peak'in epey üzerinde).
- ID'lerin makineler arasında sadece kabaca, katı olarak değil, global sıralı olduğunu ve bunun belirtilen gereksinime göre kabul edilebilir olduğunu belirtir.

## Pitfalls

- Tek bir merkezi counter service önermek ve bunun bir bottleneck veya SPOF'a dönüşeceğini, doğrudan no-network-round-trip gereksinimiyle çelişeceğini kabul etmemek.
- Gereksinim açıkça kabaca zaman sıralaması isterken, UUID kullanıp bunların zamana göre sıralanabilir olmadığını ve database index locality'sine zarar verdiğini ele almamak.
- Bit-budget hesabını yapmamak, böylece sequence veya machine-id alanının belirtilen ölçek için yetersiz çıkmasını candidate'ın fark etmemesi.
- Saat kaymasına karşı hiçbir önlem almamak, sunucu saatlerinin her zaman monoton ve senkronize olduğunu varsaymak.
