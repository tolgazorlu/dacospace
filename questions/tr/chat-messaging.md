---
id: chat-messaging
title: WhatsApp gibi 1:1 ve grup chat sistemi tasarla
level: senior
topics: [websockets, message-ordering, consistency, presence]
minutes: 45
---

## Prompt

Hem bire bir sohbetleri hem de grup chat'leri destekleyen, mesajları mümkün olduğunda gerçek zamanlı ileten bir chat uygulamasının backend'ini tasarla.

## Clarifications

- **Ölçek?** Günde 100 milyon aktif kullanıcı, günde 50 milyar gönderilen mesaj, ortalama saniyede 580.000 mesaj, peak'te saniyede 2 milyon mesaj.
- **Grup boyutu?** Gruplar en fazla 256 üye; çoğu sohbet 1:1 veya 10 kişinin altındaki küçük gruplar.
- **Delivery gereksinimi?** At-least-once delivery; mesajlar tek bir konuşma içinde gönderenin gönderdiği sırayla teslim edilmeli, konuşmalar arası sıra önemli değil.
- **Online/offline?** Kullanıcıların kabaca yüzde 30'u herhangi bir anda persistent bir bağlantı üzerinden bağlı; offline kullanıcılara mesajlar kuyruğa alınıp yeniden bağlanınca teslim edilmeli, ayrıca bir push notification tetiklenmeli.
- **Okundu bilgisi/yazıyor göstergesi?** 1:1 sohbetlerde zorunlu, gruplarda best-effort (yük altında düşürülebilir).
- **Geçmiş?** Client'lar konuşma başına sayfalanmış şekilde en fazla 1 yıllık mesaj geçmişi çekebilir.
- **Medya?** Görsel/video ayrıca object storage'a yükleniyor; chat mesajı sadece bir referans taşıyor, bunun dışında bu tasarımın kapsamı dışında.

## Follow-ups

- Bir kullanıcı 3 gün offline, 50 konuşma boyunca 2.000 okunmamış mesajı var. Tekrar bağlandığı an ne olacağını baştan sona anlat.
- 256 kişilik çok aktif bir grup dakikada 500 mesaj üretiyor. Fan-out'un tek bir sunucuyu aşırı yüklemeden tüm üyelerin bağlantılarına nasıl işlediğini anlat.
- İki katılımcının mesajları neredeyse aynı anda farklı sunuculara ulaştığında konuşma başına mesaj sırasını nasıl garanti edersin?
- Aynı bağlantı altyapısını kullanarak video/sesli arama sinyalleşmesine ölçekle. Ne değişmeli?

## Rubric

- Persistent bir bağlantı protokolü (WebSocket veya uzun ömürlü TCP) ve bir bağlantı yönlendirme katmanı (örneğin kullanıcı id'sini bağlantısını tutan sunucuya eşleyen bir presence/session servisi) seçer, böylece her backend bir mesajı nereye teslim edeceğini bulabilir.
- Ana trade-off'u söyler: her grup üyesi için her mesajın tam bir kopyasını saklayıp fan-out etmek (daha çok depolama ve write amplification, ama basit ve bağımsız kullanıcı başına kuyruk ve okuma state'i) ile paylaşılan referanslı tek bir mesaj ve kullanıcı başına cursor'lar (daha az depolama, ama daha karmaşık okuma/delivery-state takibi). Burada 256 üye sınırına hangisinin uyduğunu ve nedenini belirtir.
- Konuşma başına sırayı, konuşma kapsamlı bir sequence number kullanarak ya da bir konuşmanın tüm mesajlarını tek bir partition/shard'dan geçirerek (örneğin konuşma id'sine göre partition'lanmış bir message queue) açıklar.
- Offline delivery'yi ele alır: teslim edilmemiş mesajları tutan ve yeniden bağlanınca boşaltılan, dayanıklı kullanıcı başına bir inbox/kuyruk, buna eklenen bir push notification tetikleyicisi.
- Ordering/queueing altyapısı yeniden teslim edebileceği için mesaj id'si üzerinden client-side dedup ile at-least-once delivery'yi ele alır.
- Bu ölçekte 1 yıllık geçmiş için depolamayı tartışır, konuşma id'sine göre shard'lanmış ve zaman bazlı partition'lanmış bir mesaj store önerir, böylece eski geçmiş ucuzca daha soğuk depolamaya taşınabilir.
- Okundu bilgisi ve yazıyor göstergesinden, mesajlarla aynı dayanıklı path'ten geçmeyen, ayrı ve düşük dayanıklılıklı, best-effort bir kanal olarak bahseder.

## Pitfalls

- Bu ölçekte latency ve bağlantı sayısı maliyetini tartışmadan stateless HTTP polling'i birincil delivery mekanizması olarak önermek.
- Çok sunuculu bir deployment'ta bir mesajı alıcının canlı bağlantısını tutan belirli sunucuya yönlendirecek bir mekanizmanın olmaması.
- Mesaj dayanıklılığı gereksinimlerini presence/yazıyor göstergesi gereksinimleriyle karıştırıp ikisine de aynı sıkı garantileri uygulamak.
- Sorgu desenlerinin her zaman tek bir konuşmaya özgü olduğunu göz ardı edip tüm mesajlar için partition stratejisi olmayan tek bir büyük paylaşılan tablo önermek.
