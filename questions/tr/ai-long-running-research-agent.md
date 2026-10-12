---
id: ai-long-running-research-agent
title: Uzun süre çalışan bir research agent tasarla
level: senior
topics: [ai, agents, context-management, multi-agent]
minutes: 45
---

## Prompt

Şirketin saatlerce çalışabilecek bir AI research agent'ı istiyor: geniş bir soru verildiğinde web'de ve internal dokümanlarda arama yapıyor, onlarca kaynağı okuyor ve sentezlenmiş bir rapor yazıyor. Sistemi, görev uzadıkça ne olduğuna özellikle dikkat ederek tasarla.

## Clarifications

- **Tipik görev süresi?** 30 dakika ile 4 saat arasında wall-clock zamanı, onlarca ile birkaç yüz arasında tool call (search, fetch, internal doc read).
- **Context büyümesi?** Birkaç bin token'la başlayan session'lar, daha fazla arama sonucu ve ara not biriktikçe 100K token'ı geçti.
- **Gözlenen hata?** Geçen ay güvenilir çalışan görevler, hiçbir token-limit hatası almadan şimdi başarısız oluyor ya da konudan sapıyor.
- **Değerlendirilen mimari?** Büyük bir context window'u olan tek bir agent, ya da alt konu başına paralel subagent'lar başlatan bir lead agent.
- **Maliyet tavanı?** Tamamlanan rapor başına hedef 10 dolar; mevcut çalıştırmalar bazen 40 doları aşıyor.
- **Çıktı gereksinimi?** Nihai rapordaki her iddia, belirli bir retrieved kaynağa kadar izlenebilir olmalı.

## Follow-ups

- Bir rapor, incelendiğinde iddia ettiği şeyi gerçekte söylemeyen bir kaynağı güvenle alıntılıyor. Bu hata sınıfını sadece bu vakayı değil, sistematik olarak nasıl yakalarsın?
- Biri, degrade olan görev problemini çözmek için "sadece daha büyük context window'u olan bir modele geç" öneriyor. Bu neden sorunu çözmeyebilir?
- Bir lead agent ve paralel subagent'lara ayrıştırıyorsun. İki subagent sessizce aynı araştırmayı tekrarlıyor. Bunu nasıl tespit edip önlersin?
- Üst yönetim raporların 4 saat yerine 10 dakikada gelmesini istiyor. Bu hangi mimari değişikliği zorunlu kılar ve kalite ya da token harcaması açısından buna bedeli nedir?

## Rubric

- Uzun session'larda kalite bozulmasını, nominal token limitinin altında bile input uzunluğuyla performansın düşmesi olan context rot olarak teşhis eder; bunu sadece sert bir context tavanına çarpmaktan ayırır.
- Sadece daha büyük bir context window istemek yerine, window içinde kalan şeyi aktif olarak küçültmek için compaction, tool-result temizleme ve harici bellek önerir.
- İyi context engineering'le çalışan tek agent'ı, gerçek görev şekline bakarak bir lead/subagent mimarisine karşı tartar: breadth-first ve paralelleştirilebilir olan multi-agent'ı, sıkı bağlı/sıralı olan ise tek agent'ı destekler.
- Multi-agent ise, birkaç agent çalıştırmanın token-maliyet çarpanını daha hızlı veya daha geniş kapsamın değeriyle tartar ve yinelenen işi önlemek için subagent başına açık görev sınırları tasarlar.
- Bir citation/entailment kontrolü kurar: sadece "bir URL alıntılandı" değil, retrieved kaynağın gerçekten o iddiayı destekleyip desteklemediğini kontrol eder.
- Context rot için (input uzunluğuna karşı doğruluk) uçtan uca kalite skorundan ayrı, özel bir regresyon testi ya da eval tasarlar.
- Maliyet tavanlarını ve bir çalışmanın görev ortasında bütçeyi aşma eğilimine girdiğinde ne olacağını ele alır.

## Pitfalls

- "Görev zorlaştı" ile "context window küçüldü" durumlarını aynı sayıp ikisini de daha büyük bir context window'la çözmek.
- "Daha güçlü görünüyor" diye, önce iyi tool'lanmış tek bir agent'ın iş yükünün çoğunu daha ucuza halledip halledemeyeceğini test etmeden multi-agent mimarisine geçmek.
- Alıntılanan kaynakların gerçekten o kaynaklar hakkında yapılan iddiaları destekleyip desteklemediğini doğrulayacak bir mekanizma olmaması.
- Sınır ya da maliyet tavanı olmaması; böylece uzun süren bir görev kimse fark etmeden bütçesinin çok ötesine sessizce geçebilir.
