# Lesson 01 · Bir LLM güvenilmez bir bağımlılıktır

**Reading time:** 14 min · **Module:** Foundations · **Concepts:** nondeterminism, pass^k, structured output, timeouts
**Cases:** mcdonalds-drive-thru-rollback

## Problem

2024'te McDonald's, 100'den fazla ABD drive-thru'sunda yürüttüğü, IBM tarafından inşa edilmiş yaklaşık üç yıllık bir AI sesli sipariş pilotunu sonlandırdı, çünkü viral videolar sistemin dondurmaya bacon eklediğini, yüzlerce tavuk nugget sipariş ettiğini ve tek bir faturaya dokuz buzlu çay yığdığını gösterdi. Analistler sistemin doğruluğunun, maliyet ve güvenilirlikte bir insan sipariş alıcısını yenmek için gereken gayri resmi %95+ bar'a karşı "%80'lerin düşük-orta aralığında" sıkışıp kaldığını bildirdi (CNN, Jun 2024).

Bu kötü bir model hakkında bir hikaye değil. Olasılıksal bir bileşeni deterministik bir bileşen gibi ele alan bir sistem hakkında bir hikaye: sistemin güveni düşük olduğunda insana açık bir fallback yoktu, bu yüzden yanlış-ama-güvenli bir transkripsiyon yükseltilmeden direkt kasaya gitti. Siparişlerin yüzde on beş ila yirmisinin yanlış çıkması drive-thru hacminde yuvarlama hatası değildir, ve zamanının anlamlı bir kısmında güvenle yanlış olan bir sistem genellikle görünür yardım isteyen bir sistemden iş için daha kötüdür, çünkü yanlış-ama-güvenli çıktılar, kullanıcılar notlarını karşılaştırmaya başlayınca güveni görünür sürtünmeden daha hızlı aşındırır.

Northwind'in **Desk**'i gibi sistemler inşa edeceksin: bayi sorularını yanıtlayan, siparişleri arayan ve kredi veren bir asistan. Bu eylemlerin her biri bir LLM çağrısının aşağısında oturur. Bu çağrıyı bir veritabanı okuması gibi ele alırsan, sistemin McDonald's'ın başına gelen şekilde başarısız olur.

## Neden zor

Bir backend mühendisinin içgüdüleri deterministik bağımlılıklar için inşa edilmiştir. Aynı fonksiyonu aynı girdiyle iki kez çağır, aynı çıktıyı iki kez al. Hatada retry et, ve retry ya aynı şekilde başarılı olur ya da aynı şekilde başarısız olur. Timeout'lar seni yavaş çağrılardan korur, güvenle dönen ve basitçe yanlış olan çağrılardan değil.

Bir LLM bu üç varsayımı aynı anda bozar:

- **Aynı prompt farklı çıktılar üretebilir.** Temperature 0'da bile, sayısal gürültü, batching etkileri ve sağlayıcı tarafı güncellemeler, çağrılar arasında, hatta model versiyonları arasında byte-byte determinizm varsayamayacağın anlamına gelir.
- **"Başarılı" bir çağrı (200 OK, iyi biçimlendirilmiş metin) hâlâ yanlış olabilir.** Model bir politikayı halüsine ettiğinde veya öğeleri yanlış saydığında yakalayacak bir exception yoktur. Hata semantiktir, mekanik değil, bu yüzden olağan hata yönetimi dağarcığın (retry, circuit-break, fallback) otomatik olarak buraya aktarılmaz.
- **Güvenilirlik tek bir sayı değildir.** Bir model bir görevi bir kez çözebilir ama "aynı" görevi küçük bir varyasyonla tekrar çalıştırdığında zamanının anlamlı bir kısmında başarısız olabilir. Deterministik sistemlerden gelen mühendisler "çalışıyor mu" diye sorarken, "ne sıklıkla çalışıyor, kaç gerçekçi varyasyon boyunca" diye sormaları gerekir.

"Sadece retry et" içgüdüsü burada aktif olarak tehlikelidir: LLM çağrısı yavaş veya biçimsiz göründüğü için idempotent olmayan, yan etkili bir tool call'u (karttan para çek, e-posta gönder) retry etmek gerçek dünyada bir etkiyi çoğaltabilir. Temiz görünen bir JSON cevaba güvenmek içgüdüsü de tehlikelidir: geçerli JSON şeması geçerli içerik anlamına gelmez.

## Fikir: güvenilirlik ölçülür, varsayılmaz

### pass@k ve pass^k

İki farklı metrik sürekli birbirine karışıyor, ve fark, güvenilirliği mühendislik dışındaki birine nasıl raporladığın için önemli.

- **pass@k** (kod üretimi benchmark'larında yaygın): bir görevin k bağımsız denemesinden *en az birinin* başarılı olma olasılığı. Birkaç kandidat üretip en iyisini seçebildiğin zaman kullanışlı.
- **pass^k** (τ-bench, Sierra, Jun 2024 tarafından tanıtıldı): aynı altta yatan görevin k bağımsız denemesinin *tamamının* başarılı olma olasılığı. Bu, binlerce benzer-ama-aynı-olmayan gerçek talebi işleyen müşteriye dönük bir agent için önemli olan metriktir, çünkü müşterilerin bir deneme tutana kadar retry etmene izin vermeyecektir; her biri tam olarak bir şans alır ve her seferinde aynı kaliteyi bekler.

τ-bench bunu doğrudan simüle edilmiş müşteri hizmetleri görevlerinde ölçtü (perakende ve havayolu alanları, politikaya uyan agent'lar, aynı altta yatan anlamla fakat leksik varyasyonla her görev için 8 kez tekrarlanmış): function calling'li GPT-4o perakendede kabaca pass^1 ≈ %61 ve havayolunda ≈ %35 skorladı, perakendede pass^8 < %25'e düştü. Bu, bir denemeden sekize giderken güvenilirlikte kabaca %60'lık göreli bir düşüş. Tek bir demo'da güçlü görünen bir model, gerçek bir kullanımın gerektirdiği hacimde kabul edilemez ölçüde güvenilmez olabilir.

| Metric | Cevapladığı soru | Ne zaman kullanılır |
|---|---|---|
| pass@1 | Bu bir kez çalıştı mı | Demo'lar, keşif amaçlı test |
| pass@k | k denemeden en az biri çalıştı mı | Filtreleyebildiğin kandidat üretimi (kod üretimi, taslak üretimi) |
| pass^k | k denemenin tamamı çalıştı mı | Birçok gerçek, benzer-ama-farklı vakayı işleyen her sistem (destek, geri ödeme, sipariş sorgulama) |

### Structured output bir sözleşmedir, bir garanti değil

Modeli JSON mode'a, bir function-call şemasına veya bir Pydantic modeline zorlamak sana *parse edilebilirlik* alır, *doğruluk* değil. Model, halüsine edilmiş bir sipariş numarası veya icat edilmiş bir politika maddesiyle mükemmel geçerli JSON yayabilir. Structured output bir hata sınıfını (parser'ını çökerten biçimsiz cevaplar) çözer ve daha zor sınıfı (güvenle yanlış içerik) tamamen dokunulmamış bırakır. Şema doğrulamasını kontrollerinin tavanı değil, tabanı olarak ele al.

### Timeout'lar, retry'lar ve idempotency

- Bir **timeout** seni yavaş veya donmuş bir çağrıdan korur. Tamamlanmış bir çağrının doğru olup olmadığı hakkında sana hiçbir şey söylemez.
- Bir **retry**, ancak altta yatan eylem **idempotent** ise güvenlidir: aynı girdiyle iki kez çağırmak, bir kez çağırmakla aynı gerçek dünya etkisini üretir ("kredi ver" veya "geri ödeme gönder" üzerinde bir idempotency key, çıplak bir POST değil). Durable-execution sistemleri geçici hatalarda aktiviteleri otomatik olarak retry eder, bu yüzden yan etkisi olan her tool, retry'ların gerçek etkileri sessizce çoğaltmaması için güvenli tekrar için tasarlanmalıdır.
- Bir LLM bağımlılığı için **circuit breaker**, HTTP hata oranından fazlasında tetiklenmeli: biçimsiz-output oranını, reddetme (refusal) oranını ve (ölçebildiğin yerde) görev seviyesi doğruluk kaymasını takip et, çünkü sağlayıcı "çalışır durumda" olabilir (200'ler akarken) ama gerçek güvenilirliğin çökmüş olabilir.

## Northwind'de pratikte

Desk siparişleri arar, politika sorularını yanıtlar ve bir sınıra kadar kredi verir. Bunların herhangi birini göndermeden önce şunları yapardın:

1. **Her görev için "doğru" ne anlama gelir, otomatik olarak notlandırılacak kadar somut bir şekilde tanımla**: "sipariş durumunu ara" için doğruluk, "döndürülen sipariş numarası, durum ve ETA kaynak sistemle eşleşiyor"dur. "Bir iade politikası sorusunu yanıtla" için doğruluk, "belirtilen politika koşulları geçerli politika belgesiyle eşleşiyor"dur, "mantıklı geliyor" değil.
2. **Lansmandan önce pass@1 değil pass^k ölç.** Görev tipi başına 20-30 gerçekçi bayi sorusu al, her birini 5-8 varyanta paraphrase et ve her varyantı Desk'ten k kez çalıştır. Test ettiğin tam ifadede 10'da 9 geçen ama paraphrase'lerde sert düşen bir görev, üretime hazır değildir; bir demo'dur.
3. **Kredi vermeyi idempotent yap ve modelin dışında sınırla.** Dolar tavanı ve idempotency key, system prompt'ta değil, krediyi veren serviste yaşar, böylece retry edilen veya çoğaltılmış bir çağrı krediyi iki kez verdiremez ve bir prompt değişikliği tavanı sessizce yükseltemez.
4. **Biçimsiz veya boş bir tool-call cevabını, modelin bir şey söyleyip yanlış olmasından ayrı, belirgin, loglanmış bir hata modu olarak ele al.** Ayırt edemediğin şeyi düzeltemezsin.
5. **Sipariş sorgulamaları ve politika cevapları için açık bir düşük güven yükseltme (escalation) yolu belirle**, McDonald's dersini yansıtarak: görünür bir "bunun için bir insana bağlıyorum" ölçekte her zaman güvenle verilmiş yanlış bir cevabı yener.

## İyi mühendislerin bildiği

- Temiz, şema-geçerli bir cevap doğruluk kanıtı değildir; içeriği gerçek veriye (ground truth) karşı doğrula, sadece şekle değil.
- Güvenilirliği favori test prompt'un üzerinde pass@1 değil, gerçekçi görev varyasyonu üzerinde pass^k olarak raporla; liderlik "bir güvenilirlik sayısı" isteyecek, ve tek bir pass@1 rakamı sessizce sahip olmadığı bir tutarlılığı ima eder.
- Retry etmek sadece idempotent eylemler için güvenlidir; yan etkili bir tool call'daki bir retry, aşağı akış sistemine tasarlanmış bir idempotency key gerektirir, LLM'in "bunu bir daha yapmayacağı" umuduna değil.
- Görünür bir hata (yükselt, "bilmiyorum" de), genellikle iş için güvenle verilmiş yanlış bir cevaptan daha ucuzdur, çünkü kullanıcılar notlarını karşılaştırmaya başlayınca yanlış-ama-güvenli çıktılar güveni daha hızlı aşındırır (McDonald's'ın gerçek hacimde %15-20 hata oranına bak).
- Temperature 0'da bile, çağrılar arasında veya sağlayıcının bir model-versiyon güncellemesi arasında byte-identik çıktılar varsayma; aşağı akış mantığın tam ifadeye bağlıysa model versiyonlarını sabitle ve izle.
- Eval setini gerçek görevlerin paraphrase edilmiş varyantlarından kur, sadece demo'nda işe yaramış olan tam ifadeden değil; τ-bench'in kendi tasarımı (leksik varyasyon, aynı anlam) şablondur.
- "Hatada retry" politikası, "iyi biçimlendirilmiş ama yanlış"ı içeren bir hata tanımına ihtiyaç duyar, bu genellikle aynı modelin kendi hatasını fark etmesine güvenmek yerine ikinci, bağımsız bir kontrol (bir validator, bir insan örneklemi, bir grounding kontrolü) anlamına gelir.

## Karar ver

Northwind'in Destek Başkan Yardımcısı, Desk'in sipariş sorgulama özelliğini 2.000 bayinin tamamına açmadan önce bir hedef güvenilirlik sayısı istiyor. Şu anki testin, ekibinin elle yazdığı on soru üzerinde pass@1 = %94 gösteriyor. Liderlik incelemesinden önce bir haftan var. Seçenekler:

1. %94 pass@1 sayısını olduğu gibi raporla ve lansmanı zamanında yap.
2. Haftayı bir 30 soruluk paraphrase seti kurmaya (6 temel soru, her biri için 5 varyant) adamak ve herhangi bir sayı raporlamadan önce pass^5 ölçmek.
3. Önce %5'lik bir bayi örneklemine lansman yap, üretimde pass^k'yı enstrümanlaştır ve iki hafta gerçek trafik sonra bir sayı raporla.
4. pass@1 raporla ama boşluğu kapatmak için ilk ay her sipariş sorgulamasında zorunlu bir insan-incelemesi adımı ekle.

Birini (veya bir kombinasyonu) seç ve bunu her yöndeki yanlış olmanın maliyetine karşı gerekçelendir: optimistik çıkan bir güvenilirlik sayısı göndermek ile daha titizlikle ölçmek için lansmanı geciktirmek.

## Tek cümlelik özet

> Bir LLM çağrısı olasılıksal bir bağımlılıktır: güvenilirliğini tek bir pass@1 demo'su olarak değil, gerçekçi görev varyasyonu üzerinde pass^k olarak ölç, ve idempotent olmayan yan etkili bir çağrıyı asla retry etme.

## Kontrol sorusu

Northwind'in kredi-verme aracı şu anda LLM sağlayıcısından herhangi bir 5xx veya timeout'ta otomatik olarak retry ediyor, aşağı akış "kredi ver" çağrısında idempotency key yok. Bir bayi, bir ağ sorununda tek bir istekten sonra hesabına aynı 200$'lık iki kredinin indiğini bildiriyor. Bu boşluğu kapatacak, hangi sırada, hangi iki değişiklik gerekir, ve sıra neden önemli?

## Kaynaklar

- [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/html/2406.12045) · Sierra (Yao et al.) · Jun 2024 · defines pass^k and reports the pass^1-to-pass^8 reliability drop.
- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN · Jun 2024 · the accuracy-vs-bar case for why confident-wrong is worse than visible failure.
- [Of course you can build dynamic AI agents with Temporal](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal) · Temporal · 2025/2026 · the idempotency requirement for retried side-effecting tool calls.
- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic · Dec 2024 · foundational framing for treating the LLM as one unreliable component in a larger system.
