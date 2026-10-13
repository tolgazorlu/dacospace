# Case · SWE-bench Verified kontaminasyonu (2026)

**Category:** Evals · **Lessons:** 13, 12 · **Severity:** kontaminasyon denetiminden sonra benchmark'ı kendi yayıncısı geri çekti

## Sistem

SWE-bench Verified, orijinal SWE-bench'in insan tarafından filtrelenmiş bir alt kümesi olan, yaygın olarak kullanılan açık kaynak repolarındaki (Django, Astropy ve benzerleri) gerçek GitHub issue'ları ve pull request'lerinden inşa edilmiş 500 görevlik bir coding benchmark'ı. OpenAI ve diğer laboratuvarlar, bu benchmark'a karşı frontier model skorlarını bir başlık yetenek rakamı olarak raporladı.

## Ne gözlendi

OpenAI, o3 modelinin 64 koşu boyunca tutarlı şekilde çözemediği 138 SWE-bench Verified problemini denetledi. Ayrıca, bir modelin diğerinden ezberlenmiş gold-patch detaylarını çıkarmaya çalıştığı otomatik red-teaming çalıştırdı.

## Dur ve düşün

1. SWE-bench görevleri kamuya açık GitHub geçmişinden çıkarılıyor. Bu, o tam görevlerin frontier bir modelin eğitim verisinde zaten bulunup bulunmadığı konusunda ne ima ediyor?
2. Bir model, bir bugfix'in tam değişken adlarını ve satır içi kod yorumlarını yeniden üretirse, bu sana modelin çözüme muhakeme yoluyla ulaşıp ulaşmadığı hakkında ne söyler?
3. Üç satıcı da aynı kamuya açık benchmark'ta %70'in üzerinde skor raporluyor. Onun yerine hangi tek rakamı isterdin ve neden?

## Gerçekte ne oldu

138 problemlik denetim, SWE-bench Verified'ın orijinal insan filtrelemesi zaten ham SWE-bench setinin %68,3'ünü adil olmadığı veya yetersiz tanımlandığı için düşürdükten sonra bile %59,4'ünün kusurlu testleri (dar/sıkı testler, veya belirtilmemiş davranışı kontrol eden "geniş" testler) olduğunu buldu.

Daha çarpıcı bulgu red-teaming egzersizinden geldi: GPT-5.2, Claude Opus 4.5 ve Gemini 3 varyantları, hiçbir zaman çözümünü görmemeleri gereken problemlerden kelimesi kelimesine gold patch'leri, tam parametre adlarını ve hatta satır içi kod yorumlarını yeniden ürettiler. ([OpenAI, Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/))

SWE-bench görevleri, frontier pretraining korpuslarında da bulunan repolardaki kamuya açık GitHub issue'ları ve PR'lardan kaynaklanıyor. Düzeltmeyi ezberlemiş bir model, konu hakkında gerçekten muhakeme eden bir modelden daha iyi performans gösterir; bu da gerçek genellenebilir yeteneği yansıtmadan görünen yetenek kazanımlarını şişirir. OpenAI, daha sonra, public-split görevlerinin kabaca %27-34'ünün de bozuk olduğunu bulduktan sonra, SWE-Bench Pro'yu kontaminasyona dirençli bir ardıl olarak önerdiği daha önceki kendi tavsiyesini geri çekti. ([OpenAI, Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/))

## Kök nedenler

**Teknik:** kamuya açık, yaygın şekilde crawl edilmiş web verisinden (GitHub) benchmark inşası, üzerinde değerlendirilen modellerin pretraining korpuslarıyla örtüşüyor; ezberlemenin muhakeme gibi görünmesini önleyen yerleşik bir mekanizma yok.

**Organizasyonel:** sektör, kalıcı bir kontaminasyon denetim süreci olmadan ve "düzeltme PR'ı tarafından değiştirilen belirli test dosyalarını geçiyor" ile "gerçekten doğru" arasında ayrım yapmadan, tek bir kamuya açık leaderboard rakamını genel yetenek için bir proxy olarak kabul etti.

## Neyle önlenebilirdi

- **Benchmark verisi üzerinde canary string'ler ve erişim kontrolleri** kamuya açılmadan önce, böylece OpenAI'nin çalıştırdığı gibi tam çoğaltma problarları tespit edilebilir, bilinen bir gösterge haline gelir.
- **Görevleri, herhangi bir eğitim korpusunda bulunması olası olmayan özel veya yeni oluşturulmuş repolardan kaynaklamak**, daha pahalı ve yavaş benchmark inşası maliyetiyle (ve tarihsel kamuya açık skorlarla karşılaştırma yeteneğini kaybetmek).
- **Veri setlerini şifreyle koruma ve canary'leri eğitim verisinden filtreleme**, OpenAI'nin kendi açık tavsiyesi, bu tek bir satıcının yalnız hareket etmesi değil laboratuvarlar arasında işbirliği gerektirir.

## Senin sistemin için ders

- Kontaminasyon denetimi olmayan bir leaderboard rakamı genellenebilir yeteneğin kanıtı değildir; benchmark'ın neyden inşa edildiğini ve bunun eğitim verisiyle örtüşüp örtüşmediğini sor.
- "Verified" ve "curated" bir benchmark'ın kalıcı özellikleri değildir; bilinen bir kusur için düzeltilmiş bir benchmark (SWE-bench Verified) modeller ve benchmark'ın kendi kamuya açıklık durumu değiştikçe yine de yeniden denetlenmeye ihtiyaç duyabilir.
- Teknik olmayan bir stakeholder'a tek bir rakam raporlamak zorundaysan, bunu niteliksiz sunmak yerine kontaminasyon riski hakkında açık bir uyarıyla eşleştir.
- Bir satıcı karşılaştırma kararı gerçek bir ağırlık taşıyorsa, kendi kod tabanından veya alanından kendi özel, held-out görev setini inşa et; web'den kazınan veriden inşa edilmiş kamuya açık benchmark'ların bir kontaminasyon yarı ömrü var.

## Kaynaklar

- [Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · OpenAI · Ağustos 2024
- [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) · OpenAI · 2026
- [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) · OpenAI · 2026