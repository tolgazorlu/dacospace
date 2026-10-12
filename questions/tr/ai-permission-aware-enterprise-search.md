---
id: ai-permission-aware-enterprise-search
title: Enterprise dokümanlar üzerinde permission-aware search tasarla
level: senior
topics: [ai, knowledge, rag, permissions, security]
minutes: 45
---

## Prompt

3.000 çalışanı olan bir sigorta şirketi, poliçe ve underwriting sorularını 40.000 internal dokümandan (PDF'ler, wiki'ler ve chat export'ları), karışık ve tutarsız klasör düzeyinde izinlerle, retrieval yaparak yanıtlayan internal bir chatbot istiyor. CISO bir oversharing olayından korkuyor. Retrieval ve permission sistemini tasarla.

## Clarifications

- **Bugünkü doküman erişimi?** Kaynak sistemlerde ACL'ler var ama tutarsız; bazı klasörler yıllar önce "geçici" olarak geniş çapta paylaşıldı ve hiç geri alınmadı.
- **Ölçek?** 3.000 çalışan, 40.000 doküman, haftada ~500 doküman büyüyor.
- **Güncellik gereksinimi?** Bir kullanıcının erişim değişikliği (rol değişikliği, işten ayrılma) aynı iş günü içinde chatbot'un retrieval yapabildiği şeye yansımalı.
- **İncelenen mevcut plan?** Her şeyi bir kez index'le, sorgu zamanında vektör veritabanında saklanan bir role alanını kullanarak sonuçları isteyen kullanıcının rolüne göre filtrele.
- **Audit gereksinimi?** Security, sonradan herhangi bir sorgunun kullanıcıya tam olarak ne gösterdiğini incelemek istiyor.
- **Launch baskısı?** İş birimi 6 hafta içinde tüm çalışanlara launch yapmak istiyor.

## Follow-ups

- Bir kullanıcının bir departman klasörüne erişimi session ortasında (rol değişikliği) geri alınıyor. Zaten açık olan bir chat session'ına ne olur?
- Birkaç dokümanın kaynak sistemden eksik veya çakışan ACL metadata'sı var. Sistemin bunlar için varsayılan davranışı ne: göster mi, saklasın mı?
- İnsanın gözle fark edeceğinden farklı olabilecek sorgular ve yanıtlar göz önüne alınırsa, bir oversharing olayını sonradan nasıl tespit edersin?
- Launch'tan altı hafta önce, bir pre-launch audit dokümanların yüzde 12'sinin kaynak sistemin kendi ACL'lerine göre erişimi olmaması gereken kullanıcılar tarafından keşfedilebilir olduğunu buluyor. Ne yaparsın: geciktir, düzelt, yoksa filtrele ve gönder mi?

## Rubric

- Retrieval'ı, build zamanında index'e gömülmüş eski bir snapshot'a değil, sorgu zamanındaki canlı ACL'lere göre filtreler.
- Keşfedilebilirliği kısıtlamayı (hızlı, geri alınabilir: retrieval'dan gizleme) ve altta yatan izinleri düzeltmeyi (daha yavaş, yapısal olarak doğru: kaynak ACL'yi düzeltme) birbirinden ayırır ve bunları launch'tan önce uygun şekilde sıralar.
- Kaynak sistem ACL'lerinin zaten doğru olduğunu varsaymak yerine, "kullanıcının erişimi var" ile "içerik o kullanıcı tarafından keşfedilebilir olmalı"yı ayıran bir pre-launch permission audit'i çalıştırır.
- Eksik veya çakışan ACL metadata'sı olan dokümanlar için güvenli bir varsayılan tanımlar: expose-by-default değil, deny-by-default.
- Bir oversharing olayının sonradan araştırılıp kapsamının belirlenebilmesi için her sorgunun kullanıcı başına gerçekte ne gösterdiğinin loglanmasını tasarlar.
- Sadece yeni bir session'ın başında değil, session ortasında gerçekleşen erişim iptalini de ele alır.
- Trade-off'u belirtir: her retrieval'da gerçek zamanlı ACL kontrolleri latency ve karmaşıklık ekler, buna karşı izinleri cache'lemek eski erişimin sunulması riskini taşır.

## Pitfalls

- Permission veri kalitesini ya da gerçek zamanlı iptali ele almadan tüm tasarım olarak "sadece role göre filtrele."
- Açık, test edilebilir bir filtreleme adımı olmadan vektör veritabanının "izinleri otomatik hallettiğini" varsaymak.
- Dokümanlar ve roller değişirken devam eden bir yeniden kontrol olmadan, tek seferlik bir pre-launch ACL audit'ini yeterli saymak.
- Launch sonrası bir oversharing olayını tespit etmek için plan olmaması; birinin fark edip şikayet etmesine güvenmek.
