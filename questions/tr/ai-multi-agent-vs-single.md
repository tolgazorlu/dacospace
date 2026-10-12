---
id: ai-multi-agent-vs-single
title: Tek bir agent ile multi-agent sistem arasında seç
level: senior
topics: [ai, agents, multi-agent, architecture]
minutes: 45
---

## Prompt

Bir SaaS şirketi, ~50 kişilik bir mühendislik org'u için müşteri tarafından bildirilen bug'ları triage eden, araştıran ve düzeltme öneren, kod, doküman ve support ticket'larından veri çeken bir sistem kurmak istiyor. Takım, iyi tool'lanmış tek bir agent ile birkaç uzman subagent'ı olan bir orchestrator arasında tartışıyor. Nasıl karar vereceğini ve ne kuracağını anlat.

## Clarifications

- **Hacim?** Haftada ~200 yeni bug raporu; sistem bunların çoğu için bir saat içinde taslak bir düzeltme ya da root-cause özeti önermeli.
- **Görev şekli?** Bazı bug'lar genişlik gerektiriyor (bir hatanın nereden kaynaklandığını bulmak için birçok dosya/servisi aramak); diğerleri sıkı, sıralı bir zincir gerektiriyor (reproduce et, sonra düzelt, sonra doğrula).
- **Bütçe?** Mevcut tek agent maliyeti bug başına ~0,80 dolar; erken bir multi-agent prototipi bug başına 4 ile 15 kat daha fazla maliyetli.
- **Review gereksinimi?** Önerilen her düzeltme merge'den önce insan bir mühendise gidiyor; hiçbir şey otomatik merge edilmiyor.
- **Day-one test?** Takımın değerlendirme için elinde 20'den az el ile etiketlenmiş örnek bug var.

## Follow-ups

- İki subagent'ın bütçeyi harcamadan önce sessizce aynı araştırmayı tekrarladığını nasıl tespit edersin?
- Lead agent, 2-subagent'lık olması gereken bir işte bir bug için 15 subagent başlatıyor. Fallback planın ne?
- Bu sistemi day-one'da sadece 20 etiketli örnekle güvenilir şekilde nasıl değerlendirirsin?
- Altı ay sonra, takımının neredeyse göndereceği tek-agent versiyonu 10 kat daha az maliyetli olurdu. Üst yönetim multi-agent yatırımının buna değip değmediğini soruyor. Bu soruyu hangi kanıt yanıtlar?

## Rubric

- Görevin gerçekten breadth-first/paralelleştirilebilir olup olmadığını (multi-agent sistemlere uyan kalıp) sıkı bağlı/sıralı olana (multi-agent koordinasyon overhead'inin kaybettiği yer) karşı ölçer, varsayılan olarak karar vermez.
- Token-maliyet çarpanını açıkça belirtir ve bunu "daha güçlü" gibi belirsiz bir gerekçeye karşı değil, gerçekten sağlanan değere (daha hızlı triage, daha geniş kapsam) karşı tartar.
- İşin tekrarlanmaması ve çıktıların deterministik birleştirilebilmesi için subagent başına açık görev sınırları ve çıktı formatları tasarlar.
- Mimariden bağımsız olarak, önerilen bir düzeltme insana ulaşmadan önce bir doğrulama/citation adımı ekler.
- Çok az etiketli örnekle sistemi anlamlı şekilde nasıl değerlendireceğini önerir (hedefli hata analizi, sentetik varyantlar, kademeli rollout), büyük bir eval setini beklemek yerine.
- Multi-agent sistemlere özgü ayrıştırma risklerini adlandırır: agent'lar arası geçen verinin örtük bağlamı ya da upstream'de alınan kararları kaybetmesi ve sessiz yinelenen iş.
- Tek agent'tan multi-agent'a ne zaman geçileceği için somut bir karar kriteri verir, "her zaman multi-agent'la başla" ya da "hiç kullanma" demez.

## Pitfalls

- İyi bir context stratejisi olan tek bir agent'ın iş yükünün çoğunu kapsayıp kapsamadığını önce test etmeden, "agent'lar birlikte çalışıyor" daha güçlü göründüğü için multi-agent seçmek.
- Subagent'lar arası yinelenen işi tespit etmek için bir plan olmaması.
- İş vakasını boyutlandırırken token-maliyet çarpanını göz ardı etmek.
- Sistemi sadece genel görev başarısına göre değerlendirmek; subagent'ların birbirlerine eksik bağlam aktardığını gözden kaçırmak, yanlış nedenle "çalışan" bir sonuç.
