# Lesson 13 · Ajanları değerlendirmek

**Reading time:** 17 min · **Module:** Evals · **Concepts:** outcome vs trajectory, pass^k, benchmark contamination
**Cases:** swe-bench-contamination, mcdonalds-drive-thru-rollback

## Problem

McDonald's, IBM ile birlikte geliştirilen bir AI sesli sipariş pilotunu ABD'deki 100'den fazla drive-thru'da kabaca üç yıl boyunca çalıştırdı. Komik derecede yanlış siparişlerin viral videoları çıktıktan sonra Haziran 2024'te sona erdi: tek bir siparişe eklenen yüzlerce tavuk nugget, dondurmaya eklenen bacon, kimsenin istemediği bir faturaya iliştirilen dokuz buzlu çay. CNBC tarafından atıf yapılan analistler, sistemin doğruluğunu, maliyet ve güvenilirlik açısından bir insan sipariş alıcısını gerçekten geçmek için gereken 95%+ gayri resmi çıta karşısında "düşük-ortadaki 80%'ler aralığında" olarak konumlandırdı. ([CNN](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program); [CNBC](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html))

Üç yıl uzun bir pilot. O süre içinde bir yerde, sistem büyük olasılıkla çok sayıda bireysel siparişi doğru şekilde ele aldı; tek bir başarılı demo, ya da başarılı bir hafta bile, önemli olan soru hiç değildi. Soru şuydu: ölçekte, her siparişte, gözetimsiz, bir insanın yerini almak için yeterince güvenilir mi. Bu, "çalışıyor mu"dan farklı bir değerlendirme türüdür ve ajan inşa eden çoğu ekibin atladığı türdür.

## Neden zor

Yeni bir servisi değerlendiren bir backend mühendisi genellikle sorar: bu test suite'ini geçiyor mu, yük altında SLA'sını karşılıyor mu, belgelenmiş uç durumları ele alıyor mu. Bir görevi çözmek için birden fazla tool call yapan bir ajan için (bir sipariş bulmak, bir kredi uygulamak, bir onay göndermek) eşdeğer disiplin, basit bir geçti/kaldı demosunda görünmeyen iki nedenden ötürü gerçekten daha zordur.

Birincisi, tek bir başarılı deneme, tekrarlı güvenilirlik hakkında az şey söyler, çünkü LLM ajanları stokastiktir. Sierra'nın τ-bench'i bunu doğrudan ölçtü: GPT-4o, fonksiyon çağrısıyla, perakende müşteri hizmetleri görevlerinde her görevde bir kez ölçüldüğünde (pass^1) kabaca 61% başarıya ulaştı, ama aynı görev sekiz bağımsız kez çalıştırılıp her tek çalışmada başarılı olması gerektiğinde (pass^8), başarı 25%'in altına çöktü. ([τ-bench](https://arxiv.org/abs/2406.12045)) Ajan değerlendirmende 90% tek atımlık başarı oranı, hâlâ aynı müşterinin, aynı istekle bir daha aradığında farklı ve yanlış bir sonuç alması için gerçek bir ihtimal anlamına gelebilir. McDonald's'ın "düşük-ortadaki 80%'ler" doğruluk rakamı bu örüntüyle uyumludur: tek tek etkileyici demolar, ama gerçek bir drive-thru şeridinin talep ettiği hacim ve tekrarda güvenilmez.

İkincisi, ajanları veya tedarikçileri karşılaştırmak için güvenebileceğin benchmark'lar nötr ölçüm çıtaları değildir. En çok atıf yapılan kodlama-ajan benchmark'ı olan SWE-bench, gerçek GitHub issue'ları ve pull request'lerinden inşa edilmiştir; bu da görevlerinin (ve genellikle tam çözümlerinin) frontier modellerin eğitildiği aynı kamuya açık web verisi sınırının bir yerinde var olduğu anlamına gelir. OpenAI, kendi o3 modelinin 64 çalışmada tutarsız şekilde başarısız olduğu 138 SWE-bench Verified problemini denetledi ve daha önceki bir filtreleme geçişinin, orijinal SWE-bench kümesinin 68,3%'ünü haksız veya yetersiz tanımlanmış olarak zaten atmış olmasına rağmen, 59,4%'ünde kusurlu test tasarımı buldu. Ayrı olarak, bir modelin başka birinden ezberlenmiş gold-patch ayrıntılarını çıkarmaya çalıştığı otomatik red-teaming'de, GPT-5.2, Claude Opus 4.5 ve Gemini 3 varyantları, hiç görmemiş olmaları gereken problemlerden kelimesi kelimesine gold patch'leri, tam parametre adlarını ve satır içi kod yorumlarını yeniden üretti. ([OpenAI, Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)) Yani bir liderlik tablosu sayısı, muhakeme yerine ezberlemeyi yansıtabilir ve bunu skordan tek başına ayırt edemezsin.

## Fikir: sonuç, yörünge, tekrar ve kontaminasyon

### Sonuç vs. yörünge değerlendirmesi

Sonuç değerlendirmesi sadece son durumu kontrol eder: iade verildi mi, veritabanı satırı doğru mu. Yörünge (trajectory) değerlendirmesi, ajanın oraya ulaşmak için izlediği yolu kontrol eder: hangi tool'ları hangi sırayla, hangi argümanlarla çağırdı, bir hatadan doğru şekilde kurtuldu mu, yol boyunca politika içinde kaldı mı. Sadece-sonuç yargıçları, son sonucun hayatta kalabildiği hatalara yapısal olarak kördür. 2026'daki bir hata-enjeksiyonu çalışması, sadece-sonuç yargıç geri çağırmasının (recall), son cevabı değiştiren hatalarda 0,840'tan müşteriye görünür sonucun ortaya çıkarmadığı hatalarda 0,451'e düştüğünü buldu; bu, sessiz yörünge hatalarının kabaca yarısının sadece-sonuç bir kontrol tarafından tespit edilmeden geçtiği anlamına gelir. ([trajectory-judge](https://arxiv.org/html/2609.00038v1)) `cancel_order`'ı gereksiz yere iki kez çağırıp hâlâ kullanıcıya "tamamlandı" diyen bir ajan, sadece son mesajı okursan doğru bir ajanla aynı görünür.

### pass^k, pass^1 değil

pass^k (kod üretiminde kullanılan ve k denemeden sadece birinin başarılı olmasını gerektiren pass@k'tan farklı olarak), aynı görevin k bağımsız denemesinin tamamının başarılı olma olasılığıdır. Büyük hacimlerde, birbirine çok benzer istekleri ele alan bir üretim ajanı için, tekrarlanan denemelerdeki tutarlılık, müşterilerin gerçekten yaşadığı şeydir. Sadece tek bir çalışmanın başarı oranını raporlamak, τ-bench'in gösterdiği güvenilirlik çöküşünü tam olarak saklar.

### Benchmark kontaminasyonu

Yaygın şekilde taranan materyalden (GitHub issue'ları, Stack Overflow, Wikipedia) alınan kamuya açık benchmark'ların bir kontaminasyon yarı ömrü vardır: ne kadar uzun süre kamuya açık olurlarsa, frontier modellerin bir kısmını ezberlemiş olma olasılığı o kadar yüksektir. OpenAI'nin kendi SWE-bench üzerindeki seyri, bunun ne kadar hızlı ilerlediğini gösteriyor: SWE-bench Verified'ı tavsiye et, kontaminasyon nedeniyle geri çek, kontaminasyona dirençli ardılı olarak SWE-Bench Pro'yu tavsiye et, sonra kamuya açık bölümündeki görevlerin 27,4-34,1%'inin bağımsız olarak bozuk işaretlendiğini bulduktan sonra onu da geri çek. ([Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)) Ayrı olarak, bir ICSE 2026 çalışması, resmi olarak "doğru" olan SWE-bench Verified yamalarının bile depodaki tam test suite'ini 7,8% zamanda geçemediğini ve diferansiyel testin "makul" yamaların 29,6%'sının gerçek sonuçtan farklı davrandığını bulduğunu ortaya koydu, çünkü benchmark'ın notlandırması sadece PR'ın kendi değiştirilmiş test dosyalarını çalıştırır, tam regresyon suite'ini değil. ([PatchDiff study](https://dl.acm.org/doi/abs/10.1145/3744916.3764576))

| Evaluation axis | What it catches | What it misses |
|---|---|---|
| Outcome-only (pass^1) | Whether the task succeeded once | Repeated-trial reliability, silent trajectory faults |
| pass^k | Reliability collapse under repetition | Nothing about *why* trials fail; needs trajectory data for diagnosis |
| Trajectory evaluation | Silent faults the final answer survives, policy adherence mid-task | Needs a failure taxonomy or an expensive full-trace judge, itself unvalidated by default |
| Public contamination-prone benchmark score | Rough capability ranking against public tasks | Memorization vs. genuine reasoning; score can be inflated with no visible sign |

## Northwind'de pratikte

Desk'in bir sipariş-bulma-ve-kredi ajanı var: siparişi bul, iade penceresini doğrula, politika sınırına kadar bir kredi ver, bir destek bileti aç. Tüm 2.000 bayiye devreye almadan önce:

1. Elle seçilmiş birkaç siparişten tek bir geçişte değerlendirme yapma. Her temsili görev sınıfını birden fazla kez çalıştır (pass^k, başlangıç için k=5 veya 8 mantıklı bir değer) ve pass^k sayısını pass^1 ile yan yana raporla, τ-bench'in GPT-4o'nun perakende görevi çöküşünü ortaya çıkardığı aynı şekilde.
2. Sadece son chat mesajını değil, tool call sırasını da enstrümante et, böylece "başarılı" bir kredinin ayrıca gereksiz bir `issue_credit` çağrısı ya da atlanmış bir `open_ticket` adımı içerip içermediğini anlayabilirsin. Müşteriye görünen bir "tamamlandı", yörüngenin temiz olduğunun kanıtı değildir.
3. Northwind bir tedarikçinin kodlama ajanını değerlendiriyorsa (örneğin dahili bir araç kararı için) ve tedarikçi 70%'in üzerinde bir SWE-bench Verified skoru belirtiyorsa, sayıyı öylece kabul etme. Bunun bilinen kontaminasyon sorunlarından önce mi sonra mı ölçüldüğünü ve herhangi bir kamuya açık eğitim korpusunda olması olası olmayan, özel, ayrılmış bir görev kümesinin bunun yerine çalıştırılıp çalıştırılmadığını sor.
4. McDonald's'ın 95%+ çıtasını, gözetimsiz, yüksek hacimli müşteri yüzlü herhangi bir otomasyon için kullanışlı bir çıpa olarak kabul et: demo-seviyesinde bir başarı oranı, "insan yedek planını kaldıracak kadar güvenilir" iddiasıyla aynı değildir ve bu iki iddia arasındaki boşluk, tam olarak pass^k ve yörünge kontrollerinin, bir devreye almadan önce (viral bir videodan sonra değil) ortaya çıkarmak için tasarlandığı şeydir.

## İyi mühendislerin bildiği

- 90% pass^1 başarı oranı çok daha kötü bir pass^8'i saklayabilir; her zaman "k aynı denemenin kaçı başarılı oldu" diye sor, sadece "bir kez başarılı oldu mu" değil. ([τ-bench](https://arxiv.org/abs/2406.12045))
- Sadece-sonuç ajan değerlendirmeleri, gözetim hatasıyla değil, tasarım gereği sessiz yörünge hatalarının kabaca yarısını kaçırır; temiz bir son cevap, oraya ulaşan temiz bir yolun kanıtı değildir. ([trajectory-judge](https://arxiv.org/html/2609.00038v1))
- Kontaminasyon denetimi olmadan bir benchmark skoru, genellenebilir bir yetenek kanıtı değildir; "verified" ve "curated", kamuya açık bir benchmark'ın kalıcı özellikleri değildir.
- Otomatik bir değerlendirici, kendisi test edilen bir sistemdir. "Benchmark'ın test dosyalarını geçiyor" ve "doğru" farklı iddialardır, meğer ki test suite'i kanıtlanabilir şekilde kapsamlı olsun. ([PatchDiff study](https://dl.acm.org/doi/abs/10.1145/3744916.3764576))
- Çok yıllı bir pilot, güvenilirliğin kanıtı değildir; McDonald's, tekrarlanan, viral, bireysel hataların ortaya çıkardığı bir doğruluk boşluğu nedeniyle sona erdirmeden önce drive-thru AI'ını kabaca üç yıl çalıştırdı.
- Yörünge değerlendirmesinin, alan-özel bir hata taksonomisine veya tam-iz bir yargıca ihtiyacı vardır ve o yargıcın kendisinin de insan-etiketli izlere karşı doğrulanması gerekir; doğrulayıcıyı doğrulamayı atlayan bir kestirme yol yoktur.
- Liderliğe tek bir manşet sayı raporlaman gerekiyorsa, en önemli uyarıyla eşleştir: güvenilirlik iddiaları için pass^1 vs. pass^k, herhangi bir kamuya açık benchmark karşılaştırması için kontaminasyon durumu.

## Karar ver

Northwind, dahili bir inceleme aracı inşa etmek için iki tedarikçi kodlama ajanı arasında seçim yapıyor. Her ikisi de 70%'in üzerinde SWE-bench Verified skoru raporluyor ve VP'niz sadece bu sayıya göre seçim yapmak istiyor. Bir tavsiye oluşturmak için yarım gününüz var. Bir yaklaşım seç ve gerekçelendir:

(a) Daha yüksek skorlu tedarikçiyi tavsiye et; yayınlanmış, yaygın olarak atıf yapılan bir benchmark skoru, sektörün kodlama ajanlarını karşılaştırmanın standart yoludur.
(b) Northwind'in kendi dahili kod tabanından inşa edilmiş, küçük, özel, ayrılmış bir görev kümesi çalıştırmayı (asla kamuya açık olmadığı için, dolayısıyla hiçbir eğitim korpusunda değil) ve o sonucu SWE-bench sayısından çok daha fazla ağırlıklandırmayı tavsiye et.
(c) Her iki tedarikçiye de raporladıkları skorların SWE-bench Verified'ın kontaminasyon bulguları kamuya açıklanmadan önce mi sonra mı ölçüldüğünü doğrudan sormayı ve karara sadece onların cevabına göre varmayı tavsiye et.
(d) Kontaminasyonsuz bir kamuya açık benchmark mevcut olana kadar kararı tam bir çeyrek geciktirmeyi tavsiye et.

## Tek cümlelik özet

> Tek bir başarılı deneme ve kamuya açık bir benchmark skoru, ikisi de "çalışabilir mi" sorusuna cevap verir, "ölçekte çalışmayı sürdürecek mi" sorusuna değil; ve bir devreye almadan önce gerçekten önemli olan soruya ancak kendi görevlerinde pass^k ve yörünge düzeyinde kontroller cevap verir.

## Kontrol sorusu

Northwind'in bayiye yönelik iade ajanı, offline testte tek bir çalışmada (pass^1) görevlerinin 95%'ini geçiyor. Tüm 2.000 bayi için onaylamadan önce hangi ek ölçümü gerektirirdin ve bu ölçümün hangi iki olası tasarımı yine de gerçek bir üretim hata modunu kaçırabilir?

## Kaynaklar

- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN · Jun 17, 2024 · Viral failure examples, the pilot's scale and end.
- [McDonald's to end IBM AI drive-thru test](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html) · CNBC · Jun 17, 2024 · The low-to-mid 80% vs. 95%+ accuracy figures.
- [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) · Yao, Shinn, Razavi, Narasimhan (Sierra) · Jun 2024 · pass^k definition and the GPT-4o reliability collapse.
- [Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · OpenAI · Aug 2024 · The original 68.3% filtering rate.
- [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) · OpenAI · 2026 · Contamination and gold-patch reproduction findings.
- [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) · OpenAI · 2026 · SWE-Bench Pro's own broken-task rate.
- [Are "Solved Issues" in SWE-bench Really Solved Correctly?](https://dl.acm.org/doi/abs/10.1145/3744916.3764576) · ICSE 2026 · PatchDiff differential testing results.
- [trajectory-judge: What Outcome-Only LLM Judges Miss on Agent Trajectories](https://arxiv.org/html/2609.00038v1) · 2026 · Outcome-only vs. trajectory judge recall.
