---
id: ai-bank-ai-platform-capstone
title: 5.000 çalışanlı bir banka için AI platformu tasarla
level: senior
topics: [ai, platform, security, evals, knowledge, production, governance]
minutes: 60
---

## Prompt

5.000 çalışanlı bir banka için AI platformu tasarlamakla görevli staff engineer'sın: birden fazla iş birimi, perakende destek, fraud review, internal engineering ve compliance research, bu platform üzerinde AI feature'lar inşa edecek. Platformun mimarisini, model ve tool katmanından başlayıp security, evaluation ve governance'a kadar baştan sona anlat.

## Clarifications

- **İş birimleri ve use case'ler?** Perakende müşteri desteği (chat, policy Q&A, sınırlı hesap işlemleri), bir fraud-review asistanı (case'leri insan analistler için özetler, asla otonom karar vermez), engineering için internal bir coding agent ve regülasyon dokümanları üzerinde çalışan bir compliance research asistanı.
- **Regülasyon bağlamı?** Banka sıkı regülasyon yükümlülüklerine tabi: data residency, auditability, model risk management; EU müşterileri bazı feature'lar için EU AI Act yükümlülüklerini tetikliyor.
- **Veri hassasiyeti?** Müşteri PII'si, hesap verisi ve internal case dosyaları en az bir use case'in kapsamında; internal olarak katı tenant/iş birimi izolasyonu gerekiyor.
- **Mevcut durum?** Her iş birimi bağımsız olarak, farklı vendor'larla, farklı logging'le ve paylaşılan bir security review'ı olmadan prototipler üretiyor.
- **Ölçek hedefi?** Platform 18 ay içinde bu platform üzerinde çalışan en az 10 iş birimi takımını desteklemeli, platform seviyesindeki incident'lar için paylaşılan bir on-call rotasyonuyla.
- **Board seviyesinde talep?** CISO'nun ve Chief Risk Officer'ın ikisinin de imzalayabileceği tek bir governance cevabı, artı CFO'nun takımlara dayatabileceği bir maliyet tavanı.

## Follow-ups

- Fraud-review asistanı, müşterinin gönderdiği metni içeren case notlarını okuyor, yani untrusted-input kanalı ve hesap verisine erişimi var. Bunun yarattığı spesifik riski ve platformun paylaşılan kontrollerinin bunu nasıl ele aldığını, her takımın kendisinin hâlâ ne yapması gerektiğinden ayırarak anlat.
- Tek bir frontier-model sağlayıcısı çok saatlik bir kesinti yaşıyor. Dört use case'inden hangileri zarifçe degrade olabilir, hangileri olamaz ve neden?
- Compliance research asistanı geçen ay yürürlükten kaldırılmış bir regülasyona atıfta bulunuyor. Bunu kimin eval/observability katmanı yakalamalıydı ve nasıl?
- 18 ay sonra yeni bir iş birimi, entegrasyon işini azaltmak için dört domain'e aynı anda erişen bir "süper-agent" onboard etmek istiyor. Platformun tasarımı buna hayır demeni neyle sağlar ve neden?
- CRO sana board için "AI varlığımız ne kadar güvenli" diyen tek bir sayı istiyor. Ona gerçekte ne verirsin ve tek bir sayıya sıkıştırmayı neyi reddedersin?

## Rubric

- Her iş biriminin üzerine inşa ettiği paylaşılan bir platform katmanı (model/tool gateway, logging, identity) tasarlar, böylece security, audit ve maliyet kontrolleri her takımda yeniden icat edilmek yerine merkezi olarak uygulanır.
- Use case başına least-privilege/capability scoping'i açıkça uygular: tek bir geniş süper-agent yerine iş birimi başına dar, göreve özel agent'lar ve kanıtlanabilir security garantileri için bunun neden önemli olduğunu söyler.
- Bankanın trust boundary'sinin dışından gelen her iş birimi girdisini (müşteri mesajları, case notları) untrusted data olarak ele alır; platform, takım başına prompting disiplinine güvenmek yerine yapısal containment sağlar (capability limitleri, sonuç doğuran işlemler için human approval kapıları).
- Use case başına farklı hata taksonomilerine yine de izin veren paylaşılan bir eval/observability katmanı kurar (destek için policy correctness, compliance research için retrieval freshness, coding agent için tool-call correctness), bütün varlık için tek bir karışık kalite skoru yerine.
- Sağlayıcı/vendor hatası için, her use case'in risk profiline uygun zarif degradation ile tasarım yapar; dört use case'in de aynı şekilde degrade olamayacağını veya olmaması gerektiğini açıkça söyler.
- Governance ve audit'i, CISO ve CRO'nun ikisinin de güvenebileceği, devam eden ve sahipli bir süreç olarak ele alır (use case başına risk sınıflandırması, yeniden sınıflandırma tetikleyicileri, audit trail), tek seferlik vendor sertifikasyonlarından ayrı olarak.
- CFO'ya platform katmanında uygulanan, takım başına bir maliyet tavanı verir; routing ve caching stratejileri her takımda ad hoc değil, her takıma hazır olarak sunulur.
- Security, quality ve compliance'ı tek bir board-seviyesi sayıya sıkıştırmayı açıkça reddeder ve board'un onun yerine ne görmesi gerektiğini söyler: risk kategorisi başına küçük bir sahipli, somut metrik seti.

## Pitfalls

- Verimlilik için dört iş birimine de geniş erişimi olan tek bir paylaşılan süper-agent tasarlamak, bunun blast radius'u yoğunlaştırdığını ve scoped, dar agent'larla aynı security garantilerini alamayacağını kabul etmeden.
- Hangi iş biriminin veya hata modunun gerçekten bir regresyonu sürüklediğini gizleyen, platform genelinde tek bir kalite skoru.
- Regüle bir banka için vendor compliance sertifikasını veya satın alınmış bir guardrails ürününü, internal risk sınıflandırması veya audit trail olmadan yeterli governance saymak.
- Use case başına farklılaşmış bir hata/kesinti planı olmaması; dört iş biriminin de sağlayıcı kesintisinde aynı şekilde degrade olabileceğini varsaymak.
- Her iş biriminin kendi logging/observability yaklaşımını seçmesine izin vermek, platformlar arası bir incident soruşturmasını imkânsız hâle getirmek.
