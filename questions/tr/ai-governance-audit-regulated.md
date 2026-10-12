---
id: ai-governance-audit-regulated
title: Regüle bir şirket için AI governance ve audit tasarla
level: senior
topics: [ai, production, governance, compliance, audit]
minutes: 45
---

## Prompt

Legal, şirketinin EU kullanıcılarına deploy edilmiş müşteri-yüzlü LLM feature'ının EU AI Act'e uyması gerekip gerekmediğini ve ISO/IEC 42001 sertifikasyonuna gidilip gidilmeyeceğini soruyor. Bunu tek seferlik değil, sürekli olarak cevaplayan governance ve audit sürecini tasarla.

## Clarifications

- **Feature ne yapıyor?** Müşteri sorularını cevaplıyor ve bazı otomatik işlemler yapıyor (limitler içinde hesap değişiklikleri); EU kullanıcıları trafiğin önemli bir kısmı.
- **Mevcut durum?** Resmi bir risk sınıflandırması yapılmamış; legal içeride "ISO 42001" ve "EU AI Act" terimlerinin birbirinin yerine kullanıldığını duydu.
- **Organizasyon yapısı?** Şu anda "bu AI sistemi compliant mı" sorusunu hiçbir takım sahiplenmiyor; feature değiştiğinde kimin yeniden değerlendireceği belirsiz.
- **Değişim hızı?** Takım bu sisteme prompt ve feature değişikliklerini kabaca haftalık ship ediyor.
- **Talep?** Bugün savunulabilir bir cevap üreten ve sistem veya regülasyonun yükümlülükleri değiştikçe doğru cevap üretmeyi sürdüren bir süreç.

## Follow-ups

- Gelecek çeyrekte daha yüksek riskli bir otomatik işlem yapan yeni bir feature ekleniyor. Bunun sistemin risk sınıflandırmasını değiştirip değiştirmediğine kim karar verir ve ne kadar hızlı?
- ISO 42001 denetiminden geçmek, sistemin EU AI Act ile yasal olarak compliant olduğu anlamına mı gelir? Her birinin gerçekte neyi sertifikalandırdığını kesin olarak açıkla.
- Bir yükümlülüğün uygulanma tarihi kayıyor, bu Act'in bazı bölümlerinde zaten oldu. Senin sürecin, kimse yıllık olarak yeniden kontrol etmeyi hatırlamadan nasıl doğru kalır?
- Birisi "bir compliance tool'u satın al ve bitir" öneriyor. O tool gerçekte neyi kapsıyor ve neyi kapsamıyor?

## Rubric

- Sistemin Act altındaki gerçek risk seviyesini (herhangi bir bileşenin high-risk yükümlülüklerine, GPAI-sağlayıcı yükümlülüklerine, ya da hiçbirine girip girmediği) kapsamlı bir "compliant'ız" iddiası değil, somut bir ilk adım olarak sınıflandırır.
- Bağlayıcı regülasyonu, gerçek yasal yükümlülükleri ve cezaları, compliance'ı desteklemek için yardımcı olan ama kendisi yasa olmayan gönüllü destek çerçevelerinden, yönetim-sistemi standartlarından ve risk-yönetimi çerçevelerinden ayırır.
- ISO 42001-tarzı bir sertifikasyonun gerçekte neyi sertifikaladığını kesin olarak söyler, organizasyonel bir AI yönetim sistemini ve neyi sertifikalamadığını, belirli bir model'in belirli bir regülasyonla yasal uyumunu.
- Sistem değiştiğinde yeniden sınıflandırma için açık, sürekli bir sahiplik atar, launch'ta yapılan tek seferlik bir review değil.
- Mevcut yükümlülükleri gerçek kademeli uygulama zaman çizelgesine göre eşleştirir ve tarihler veya kapsam değiştikçe bu eşlemeyi yeniden kontrol eden tekrarlayan bir süreç kurar, bugünün cevabını kalıcı saymak yerine.
- Bir regülatör veya denetçi sonradan sorarsa dayanacak bir audit trail (kararlar, sınıflandırmalar, tarihler, kimin onayladığı) tasarlar.
- Satın alınmış bir compliance tool'unu problemin bir kısmını kapsıyor olarak ele alır, örneğin dokümantasyon veya bir risk register ve neyi kapsamadığını açıkça söyler.

## Pitfalls

- "Evet, compliant'ız çünkü bir compliance tool'u satın aldık," hiç gerçek bir risk sınıflandırması yapmadan.
- ISO 42001 sertifikasyonunu Act ile yasal compliance'a eşdeğer saymak.
- Sistem veya feature'ları değiştiğinde yeniden sınıflandırma için bir sahip olmaması; compliance durumunun sessizce bayatlaması.
- Bugünün uygulama zaman çizelgesini sabit saymak ve yükümlülükler aşamalandıkça veya kaydıkça hiç yeniden kontrol etmemek.
