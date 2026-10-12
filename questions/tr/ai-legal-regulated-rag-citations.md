---
id: ai-legal-regulated-rag-citations
title: Güvenilir citation'ları olan bir hukuki RAG asistanı tasarla
level: senior
topics: [ai, knowledge, rag, citations, regulated]
minutes: 45
---

## Prompt

Bir hukuk firması, case law üzerinde çalışan bir RAG pipeline'ına dayanan, citation'larla soruları cevaplayan internal bir research asistanı istiyor. İlk testler, bazen gerçek, erişilebilir bir case'e atıfta bulunduğunu ama bu case'in asistanın ona yüklediği spesifik hukuki önermeyi gerçekte desteklemediğini gösteriyor. Bu hatanın bir filing'e veya müşteriye ship edilmesini önleyen bir sistem tasarla.

## Clarifications

- **Corpus?** Case law ile internal memo'lar, yeni kararlar ve yürürlüğü değiştiren rehberler geldikçe sürekli güncelleniyor.
- **Mevcut kontrol?** "Citation gerçek, erişilebilir bir doküman mı," ve atıf yapılan pasaj iddiayı desteklemediğinde bile bu kontrol geçiyor.
- **Use case'in önemi?** Çıktı sonunda bir court filing'e girebilir veya direkt müşteriye gönderilebilir; doğrulanmamış bir iddianın ikisine de ulaşmasına tolerans yok.
- **Bayatlama riski?** Bazı rehberler yürürlükten kaldırılıyor; eski ve yeni versiyonlar bazen açık bir tarihlendirme olmadan corpus'ta aynı anda duruyor.
- **İstenen review süreci?** İnsan bir avukat herhangi bir şey dışarı çıkmadan önce çıktıyı review ediyor, ama firma asistanın bariz yanlış citation'ları ön-filtrelemesini istiyor.
- **Hacim?** Firma genelinde haftada ~400 research sorgusu.

## Follow-ups

- Citation-claim entailment için otomatik bir kontrolü nasıl kurarsın, sadece citation'ın var olmasını değil, getirilen pasajın iddiayı gerçekten destekleyip desteklemediğini?
- Herhangi bir çıktı bir filing'e ulaşmadan önce human review için SLA'n ne ve bu SLA deadline baskısı altında ihlal edilirse ne değişir?
- Corpus, hem yürürlükten kaldırılmış bir rehberi hem de onun yerini alanı, bu ikisini ayırt eden bir tarih metadata'sı olmadan içeriyor. Retrieval nasıl davranır ve nasıl davranmalı?
- Her sorgu için ground-truth label olmadan production'da citation-claim accuracy'yi nasıl ölçersin?

## Rubric

- Citation varlığını (case gerçek ve erişilebilir) citation desteğinden (getirilen pasaj ona yüklenen iddiayı gerçekten entail ediyor mu) ayırır ve özellikle ikincisi için bir kontrol kurar.
- Retrieval grounding'ini doğruluk için gerekli ama yeterli görmez; bir cevabın bazı getirilen pasajlara dayandığı için RAG'ın hallucination'ı önlediğini iddia etmez.
- Herhangi bir çıktı müşteriye veya filing'e ulaşmadan önce bir human verification kapısı tasarlar, açık bir SLA ile ve bu SLA karşılanamazsa ne olacağına dair açık bir kararla.
- Bayatlamayı hallucination'dan farklı bir hata sınıfı olarak ele alır: index'e effective-date/versioning metadata'sı ve çakışan yürürlükten-kaldırılmış-vs-güncel kaynaklar için bir politika ekler.
- Her sorgu için ground-truth label gerektirmeyen bir production ölçüm yaklaşımı önerir citation-claim accuracy için (sample'lanmış review, claim-decomposition kontrolleri).
- Hiçbir getirilen pasaj bir iddiayı gerçekten desteklemediğinde ne olması gerektiğini söyler: kendinden emin üretmek yerine reddetmek veya işaretlemek.
- Bir doküman güncellemesinin (yeni bir karar eski rehberin yerini alması) index'e ve retrieval sıralamasına nasıl yayıldığını kapsar.

## Pitfalls

- "RAG hallucination'ı önler çünkü her cevap gerçek bir dokümana dayanıyor," entailment'ı kontrol etmeden retrieval grounding'ini yeterli saymak.
- Bayat-ama-gerçek bir citation'ı grounding başarısı saymak, çünkü kontrol hiç dokümanın tarihine veya yürürlükten kaldırılma durumuna bakmıyor.
- Citation-claim desteği için hiç otomatik veya sample'lanmış bir kontrol olmaması; tamamen manuel review'a güvenmek.
- Bir dokümanın bulunabilirliği ile ona yüklenen spesifik bir iddianın gerçekten doğru olup olmadığı arasında hiç ayrım olmaması.
