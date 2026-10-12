---
id: collaborative-editor
title: Google Docs gibi ortak çalışılan bir doküman editörü tasarla
level: senior
topics: [crdt, operational-transform, real-time-sync, conflict-resolution]
minutes: 45
---

## Prompt

Birden fazla kişinin aynı metin dokümanını aynı anda düzenlemesini ve birbirinin değişikliklerini anlık görmesini istiyoruz, Google Docs'a benzer şekilde. Herkesin görünümünü tutarlı tutan sistemi tasarla.

## Clarifications

- **Ölçek?** Peak'te eşzamanlı olarak aktif düzenlenen 200k doküman, aktif doküman başına ortalama 3 eşzamanlı editör, bir avuç çok büyük paylaşılan dokümanda ise 50'ye kadar editör.
- **Doküman boyutu?** Tipik doküman 5.000 kelime, desteklenen en büyük dokümanlar yaklaşık 200.000 kelime.
- **Latency beklentisi?** İyi bir bağlantıda bir tuş vuruşu diğer editörlerin ekranında 200ms içinde görünmeli.
- **Conflict senaryosu?** İki kullanıcı aynı paragrafa aynı anda yazıyor, her iki değişiklik de hayatta kalmalı ve nihai metin her client'ta aynı olmalı.
- **Offline desteği?** Bir kullanıcı kısa süreliğine (2 dakikaya kadar) offline olsa da yazmaya devam edebilmeli ve yeniden bağlanınca değişiklikleri birleşmeli.
- **Kalıcılık?** Her doküman dayanıklı şekilde saklanıyor, kullanıcının geriye kaydırabileceği bir versiyon geçmişi var, aktif düzenleme sırasında en az 5 dakikada bir snapshot alınıyor.
- **Client platformları?** Web ve masaüstü uygulaması, ikisi de aynı consistency garantilerine ihtiyaç duyuyor.

## Follow-ups

- İki kullanıcı tam bir dakika boyunca offline düzenliyor, ikisi de aynı cursor konumuna metin ekliyor; birleştirilmiş dokümanın nasıl görüneceğini ve nedenini baştan sona anlat.
- Bir doküman 50 eşzamanlı editörle 200.000 kelimeye büyüyor, mevcut tasarımın hangi parçası önce yavaşlar?
- O sırada başka birinin yaptığı değişiklikleri geri almadan bir kullanıcı için "undo"yu nasıl uygularsın?
- Bir client 10 dakika offline kaldıktan sonra yeniden bağlanıyor, bu süre içinde doküman ağır şekilde değişti; ne kadar veriyi yeniden senkronlamalı ve tüm dokümanı yeniden göndermekten nasıl kaçınırsın?
- Asıl düzenleme akışıyla rekabet etmeyecek şekilde presence'ı (cursor'lar, seçimler, kim online) nasıl eklersin?

## Rubric

- Bir doküman alanında naif last-write-wins yerine bir conflict resolution yaklaşımı (CRDT veya operational transform) seçer ve gerekçelendirir.
- Ana trade-off'u söyler: CRDT'ler daha basit convergence garantileri ve daha iyi offline desteği sunar ama karakter başına daha fazla metadata overhead'i taşır; OT ise daha derli toplu ama merkezi bir transform sunucusu gerektirir ve offline handling'i daha zordur.
- Değişikliklerin nasıl temsil edildiğini (karakter seviyesinde veya token seviyesinde operasyonlar) ve diğer bağlı client'lara nasıl broadcast edildiğini açıklar.
- Reconnect/resync yolunu açıklar: bir client bildiği son state'i veya version vector'ü gönderir, sunucu tüm dokümanı değil sadece delta'yı gönderir.
- Kalıcılık ve versiyon geçmişini, replay süresini sınırlamak için periyodik snapshot'larla birlikte, real-time sync log'undan ayrı bir konu olarak ele alır.
- Presence/cursor verisini dayanıklı düzenleme operasyonlarından ayrı, geçici bir kanal olarak ele alır.
- Çok editörlü bir geçmişte undo'nun nasıl sadece bir kullanıcının operasyonlarına kapsanacağını tartışır.

## Pitfalls

- Gerçek eşzamanlı düzenlemeyi bozan last-write-wins veya basit locking'e başvurmak.
- Geçici presence verisi ile dayanıklı düzenleme geçmişi arasında hiç ayrım yapmamak.
- Offline düzenleme ve merge'i tamamen göz ardı etmek.
- Her yeniden bağlanmada veya her düzenlemede tüm dokümanın yeniden gönderildiğini varsaymak.
