# Lesson 06 · Çok agent, çok hata

**Reading time:** 16 min · **Module:** Agents · **Concepts:** multi-agent trade-offs, orchestrator-worker, MAST failure taxonomy
**Cases:** project-vend-claudius

## Problem

Haziran 2025'te iki ekip, multi-agent sistemler hakkında birbirinden keskin şekilde farklı sonuçlar günler arayla yayınladı. Anthropic, Sonnet 4 subagent'larını orkestre eden bir Claude Opus 4 lead agent'ın, breadth-first research görevlerinde tek bir Opus 4 agent'ını %90,2 farkla geçtiğini, bir tek chat turn'ünün token maliyetinin yaklaşık 15 katı maliyetle bildirdi (tek başına agent'lar yaklaşık 4 katı çalışıyor). Cognition, "Don't Build Multi-Agents"i yayınladı ve multi-agent sistemlerin, subagent'lar tam upstream context yerine sadece sıkıştırılmış bir görev özeti aldığında ve paralel çalışan subagent'lar birbirinin işini görmeden, lokal olarak mantıklı ama birbiriyle uyumsuz kararlar aldığında güvenilir şekilde çöktüğünü savundu; onların klasik örneği, bir Flappy Bird klonunun uyumsuz iki yarısını bağımsız şekilde inşa eden iki subagent.

İkisi de doğru, farklı görev şekilleri için. Anthropic'in case'i paralel, bağımsız, yüksek değerli, gerçekten ayrı yönleri eş zamanlı takip eden research (kendi örnekleri: "S&P 500'deki IT şirketlerinin tüm board üyelerini bul"). Cognition'ın hata case'i, subagent'ların kararlarının birbiriyle tutarlı olması gereken sıkı bağlı bir iştir ve context'i tek satırlık bir görev özetine sıkıştırmak, onların tutarlı kalmasını sağlayacak tam bilgiyi atıyor. Cognition'ın sonraki güncellemesi, "Multi-Agents: What's Actually Working", orijinal iddiayı tersine çevirmek yerine daraltıyor: izolasyonsuz mutable state paylaşan peer agent'lar inşa etme, bu Anthropic'in kapsamı belirlenmiş, izole subagent pattern'iyle uyumlu.

Her iki şirketin çerçevesine dayanmadan riski somutlaştıran ayrı, bağımsız bir kanıt hattı var: yedi popüler multi-agent framework boyunca 150-200+ execution trace'i inceleyen araştırmacılar, güçlü bir annotator-arası uyumla (Cohen's Kappa 0,88) üç kategoride 14 hata moduna sahip MAST'ı (Multi-Agent System Failure Taxonomy) oluşturdu. Bu çalışmadan bir bulgu: multi-agent bir kodlama framework'ü olan ChatDev, bol çevrimiçi örnek ve yerleşik verifier'lara rağmen, basit, iyi belgelenmiş bir programlama görevinde sadece %33,33 doğruluğa ulaştı. MAST'a göre multi-agent hatası birincil olarak bir model-capability problemi değil; spesifikasyon açıklığı, agent'lar arası doğrulama ve sonlanma koşullarının bir sistem-mühendisliği problemidir, ve makalenin kendi iki müdahalesi (daha iyi rol spesifikasyonu, daha iyi orkestrasyon) bunu sadece kısmen düzeltti.

## Neden zor

Bir backend mühendisinin "birlikte çalışan agent'lar"a dair içgüdüsü, büyük ölçüde temiz şekilde taşınmayan distributed-systems sezgisiyle renklenmiştir. İşi servisler arasında bölmek, servislerin iyi tanımlanmış sözleşmeleri ve bağımsız hata domain'leri olduğunda alışılmış ve genellikle güvenlidir. Açık uçlu bir görevi LLM agent'lar arasında bölmek, distributed systems'te olmayan bir hata sınıfı getirir: agent'lar her biri bireysel olarak mantıklı davranabilir, kendi lokal kontrollerinden geçebilir ve hâlâ birlikte tutarsız veya yanlış bir sonuç üretebilir, çünkü distributed işi doğru tutan şey, niyet ve state'in paylaşılan, tutarlı bir görüşü, tam olarak sıkıştırılmış bir görev-özeti aktarımının attığı şeydir.

Diğer yanıltıcı içgüdü: "paralel çalışan daha fazla agent", stateless web server'ları yatay olarak ölçeklendirmek gibi, kesinlikle daha hızlı ve bu nedenle kullanışlı iş birimi başına daha ucuz olması gerekiyormuş gibi hissettirir. Güvenilir şekilde ne biri ne diğeri. Anthropic'in kendi telemetrisi, multi-agent sistemlerin tek bir chat turn'ünün token maliyetinin yaklaşık 15 katı çalıştığını gösteriyor, gerçek, ölçülmüş bir maliyet çarpanı, görevin gerçek değerine karşı tartılması gerekiyor, ucuz yatay ölçekleme analojisiyle varsayılarak atlanamaz.

Multi-agent hataları, tek-agent hatalarından yerelleştirmesi de daha zor. Bir agent başarısız olduğunda, okuyacak bir trace'in var. Bir multi-agent sistem başarısız olduğunda, yanlış çıktı agent A'nın agent B'nin ihtiyaç duyduğu bilgiyi vermemesine, belirsiz görev delegasyonunun duplicate iş yaratmasına, veya iki çıktının hiç tutarlı olup olmadığını kimsenin doğrulamamasına kadar iz sürebilir, MAST taxonomy'sinin açıkça ayrı hata kümeleri olarak adlandırdığı üç ayrı kök neden, her biri farklı bir çözüm gerektiriyor.

## Fikir: multi-agent bir upgrade değil, bir maliyet-fayda kararıdır

### Orchestrator-worker pattern'i

Bir lead agent planlar, ardından açık bir hedef, çıktı formatı, tool yönlendirmesi ve sınırlarla, iyi kapsamlı subtask'ları subagent'lara delege eder, her biri kendi context window'uyla çalışır ve ham çalışma trace'i yerine özetlenmiş bir rapor geri gönderir. Bu, Anthropic'in %90,2 iyileşmesinin arkasındaki pattern, ve özellikle çalışır çünkü subtask'lar gerçekten paralelleştirilebilirdi ve büyük ölçüde bağımsızdı: her subagent, diğerleriyle görev ortasında gelişen context'i paylaşma gereksinimi minimum olan farklı bir yönü takip etti.

### Orchestrator-worker pattern'i ne zaman çöker

Cognition'ın hata case'i ters koşul: bağımsız olmayan subtask'lar, bir subagent'ın lokal kararının (bir schema field adı, bir adlandırma kuralı) diğer subagent'ın bilmesi gereken implicit bir karar olduğu ama bilmediği, çünkü delegasyon tam upstream karar trace'i yerine sıkıştırılmış bir özet verdi. Cognition'ın sonraki çerçevesindeki düzeltme "subagent asla kullanma" değil, "peer agent'ların izolasyon olmadan mutable state paylaşmasına izin verme ve aralarında implicit bağımlılık yaratan kararları sıkıştırarak atma."

| Koşul | Multi-agent muhtemelen yardımcı olur | Multi-agent muhtemelen zarar verir |
|---|---|---|
| Görev yapısı | Gerçekten paralel, bağımsız yönler | Sıkı bağlı, birbirine bağımlı kararlar |
| Değer vs. maliyet | ~15x token maliyetini karşılayacak kadar yüksek değer | Mütevazı değer, maliyet çarpanı hakim |
| Context paylaşım ihtiyacı | Görev ortasında minimum paylaşım gerektirir | Subagent'lar birbirinin gelişen kararlarına ihtiyaç duyar |
| Doğrulama | Açık, kontrol edilebilir subtask başına çıktı | Başarı, ince cross-subtask tutarlılığına bağlı |

### MAST: hata taxonomy'si

MAST'ın 14 hata modu üç kategoride kümelenir, isimle bilinmeye değer çünkü farklı çözümlere işaret ediyorlar:

1. **Spesifikasyon ve sistem-tasarım sorunları**: belirsiz görev delegasyonu, net olmayan agent rolleri ve sınırları, herhangi bir agent execution'da henüz bir hata yapmadan duplicate veya eksik işe sebep oluyor.
2. **Agent'lar arası uyumsuzluk**: agent'lar sahip oldukları gerekli bilgiyi dahi iletmiyor ("bilgi saklama"), veya çelişen implicit varsayımlar üzerine hareket ediyor.
3. **Görev doğrulama ve sonlanma sorunları**: gerçek bir doğrulaması olmayan bir sistem, böylece bir agent'ın başarı konusunda kendi raporuna eleştirisizce güvenilir, Lesson 03 ve Lesson 05'te Replit ile tanıştığın aynı "narration'a güven, gerçek duruma değil" hata modu, şimdi tek-tool seviyesi değil sistem seviyesinde.

Makalenin kendi düzeltme bulgusu rahatsız edici kısım: daha iyi rol spesifikasyonu ve daha iyi orkestrasyon stratejileri her biri sadece kısmi iyileşme üretti, yani bunlar hızlı prompt düzeltmeleri değil. Her agent için daha iyi ifade edilmiş bir system prompt değil, daha derin sistem yeniden tasarımı, açık doğrulama adımları, paylaşılan veya izlenebilir context, daha net sonlanma koşulları gerektiriyorlar.

### Uyarıcı bir multi-agent case olarak Project Vend'in "CEO" sub-agent'ı

Project Vend ikinci aşaması, Claudius'un üzerine bir "CEO" sub-agent'ı ve prosedürel kapılar ekledi, ve iskonto yaklaşık %80 düştü, gerçek bir iyileşme. Ama agent'lar hâlâ yasadışı toplu bir soğan futures kontratına onay verdi (sadece 1958 Onion Futures Act'e atıfta bulunan bir insan tarafından engellendi) ve bildirilen bir hırsızlık olayını, bir çalışanı asgari ücretin altında güvenlik olarak "işe almaya" çalışarak yanlış ele aldı. Ders Project Vend'in spesifik olarak ötesine genelleniyor: aynı-model bir supervisor, büyük ölçüde gözetlediği agent'ın aynı kör noktalarını devralır. Supervisor rolünde ikinci bir agent eklemek otomatik olarak gerçekten bağımsız bir kontrol değildir; temel modelin eğitimini ve yanlılıklarını paylaşıyorsa, ilk agent'ın tek başına yapacağı aynı hata sınıfını onaylayabilir.

## Northwind'de pratikte

Northwind'in SaaS-mühendisliği karşılığı (Desk'in kendisi değil, ama olası bir gelecekteki Desk uzantısı), 50-mühendis ölçeğinde kod, dokümantasyon ve support ticket'ları boyunca müşteri bildirilen bug'ları triage, araştırma ve çözmek için bir orchestrator-worker sistemi düşünüyor. İnşa etmeden önce:

1. **Önce gerçek görev şeklini sınıflandır.** Bug triage-ve-research gerçekten breadth-first mi (birbiriyle anlaşması gerekmeyen birkaç bağımsız araştırma iplikçiği) yoksa sıkı bağlı mı (kod ve dokümantasyon boyunca internal olarak tutarlı olması gereken bir düzeltme önerisi)? Anthropic'in ideal noktası birincisi; Cognition'ın hata case'i ikincisine daha yakın.
2. **Token-cost çarpanını daha hızlı triage'ın değerine karşı somut olarak, taahhüt etmeden önce tahmin et**: tek bir iyi tooled agent üzerinden 4x-15x maliyet artışının, "birlikte çalışan agent'lar" daha yetenekli kulağa geliyor diye varsayılmadan, ölçülmüş bir değer farkıyla gerekçelendirilmesi gerekir.
3. **İyi bir context stratejisine (Lesson 04) sahip tek bir iyi tooled agent'ın görevin %80'ini daha ucuza çözüp çözmediğini önce test et.** MAST bulgusu ki multi-agent hatası bir sistem-mühendisliği problemi, bir capability problemi değil, iki yöne de işliyor: iyi mühendislik edilmiş tek bir agent, multi-agent karmaşıklığının geçmesi gereken bar'ı zaten geçebilir.
4. **İlerlersen, her subagent'a bir satırlık özet değil, subtask'ıyla ilgili tam upstream karar trace'ini ver**, özellikle Cognition'ın Flappy-Bird-tarzı uyumsuzluğunu önlemek için, ve herhangi bir subagent'ın çıktısı final olarak ele alınmadan önce açık bir doğrulama adımı tasarla, özellikle MAST'ın "güvenilen kendi raporu" hata kümesini önlemek için.
5. **Delegasyon mantığını yazmadan önce sonlanma koşulunu tasarla**, test'te bir loop uzun çalıştıktan sonra değil: bir max-handoff sayısı ve açık bir escalation yolu, Lesson 05'in loop-sınırlama disiplinini doğrudan multi-agent seviyesinde yeniden kullanarak, çünkü birkaç agent'a sahip olmak bir runaway loop'u daha az olası yapmaz; eğer bir şey varsa, cross-agent handoff loop'ları kendi başına belgelenmiş bir hata modu.

## İyi mühendislerin bildiği

- Anthropic'in %90,2 iyileşmesi ve Cognition'ın "multi-agent inşa etme" tavsiyesi çelişkili değil; farklı görev şekillerini (paralel-bağımsız vs. sıkı-bağlı) tanımlıyorlar, ve birini, görevinin gerçekte hangi şekilde olduğunu kontrol etmeden alıntılamak bir kategori hatası.
- Gerçek maliyet çarpanı (Anthropic'in kendi production telemetrisine göre tek bir agent için yaklaşık 4x, multi-agent için yaklaşık 15x), stateless servislerin ucuz yatay ölçeklenmesiyle analoji kurularak atlanmadan, ölçülmüş görev değerine karşı tartılmalıdır.
- MAST'ın bulgusu ki daha iyi rol spesifikasyonu ve daha iyi orkestrasyon multi-agent hatasını sadece kısmen düzeltir, düzeltmenin genellikle daha iyi bir prompt olmadığı anlamına gelir; açık doğrulama, paylaşılan veya izlenebilir context, ve daha net sonlanma koşulları, kelime değişiklikleri değil yapısal değişikliklerdir.
- Aynı-model bir supervisor agent otomatik olarak bağımsız bir kontrol değildir; Project Vend'in "CEO" sub-agent'ı temel modelin kör noktalarını paylaştı ve hâlâ yasadışı bir kontrata onay verdi, dolayısıyla gerçekten çelişen veya farklı kaynaklı bir kontrol, aynı türden ikinci bir agent eklemekten daha önemlidir.
- Her biri bireysel olarak gerekli bilgiye sahip olan agent'lar arasında "bilgi saklama", basitçe bir agent'ın bir şeyi bilmemesinden farklı, adlandırılmış, özellikle belgelenmiş bir MAST hata modudur; hangisini gördüğünü teşhis etmek, düzeltmenin "daha çok context paylaş" mı yoksa "daha çok veri getir" mi olduğunu değiştirir.
- Bir multi-agent handoff loop'u, tek-agent bir loop (Lesson 05) ile aynı step/cost sınırlama disiplinine ihtiyaç duyar; birden çok agent'ın birbirine sonsuz şekilde handoff yapması, varsayımsal bir edge case değil, belgelenmiş gerçek bir hata şekli.
- Multi-agent mimarisine uzanmadan önce, disiplinli context mühendisliğine sahip tek bir iyi tooled agent'ın görevin büyük kısmını zaten çözüp çözmediğini test et; multi-agent karmaşıklığı, daha sofistike varsayılan olarak değil, gösterilmiş bir boşlukla kazanılmalıdır.

## Karar ver

Northwind, Desk'in shipment-investigation akışını (şu an tek bir agent, Lesson 05'ten) bir orchestrator-worker sistemi olarak yeniden inşa etmeyi düşünüyor: order-lookup, carrier-tracking ve policy-check subtask'larını üç uzman subagent'a delege eden bir lead agent, ardından bulgularını bir çözüme sentezliyor. Şu anki tek-agent performansı ticket'ların %70'ini step cap içinde doğru şekilde çözüyor; kalan %30 zaman aşımına uğruyor veya escalate ediyor. Seçenekler:

1. Şu anda zaman aşımına uğrayan %30'un daha fazlasını paralel uzman subagent'ların çözeceğine bahis yaparak orchestrator-worker olarak yeniden inşa et.
2. Tek agent'ı tut, ama önce context mühendisliğini (Lesson 04) ve tool tasarımını (Lesson 03) iyileştir, ve multi-agent'ı düşünmeden önce yeniden ölç.
3. %5'lik bir ticket örneğinde küçük bir orchestrator-worker prototip inşa et, çözüm oranını ve token maliyetini mevcut tek-agent baseline'ına karşı ölç, ve mimarinin çekiciliğine değil veriye göre karar ver.
4. Multi-agent'ı, bu belirli görevin Anthropic'in paralel-bağımsız case'ine mi yoksa Cognition'ın sıkı-bağlı case'ine mi daha yakın olduğunu test etmeden, Cognition'ın uyarısına atıfta bulunarak tamamen reddet.

Seçimini, gerçek 4x-15x maliyet çarpanına, görevin gerçek şekline (order-lookup, carrier-tracking ve policy-check gerçekten bağımsız mı, yoksa final çözüm aralarında anlaşmalarını gerektiriyor mu), ve yanlış bir tahminin her yönde sana ne maliyeti olduğuna karşı gerekçelendir.

## Tek cümlelik özet

> Multi-agent mimarisi, gerçek bir 4x-15x token-maliyeti çarpanında, sadece gerçekten paralel, bağımsız, yüksek değerli görevler için karşılığını verir, ve belgelenmiş hata modları (bilgi saklama, belirsiz delegasyon, güvenilmeyen kendi raporu) daha iyi prompt'lar değil yapısal düzeltmeler gerektirir.

## Kontrol sorusu

Northwind'in shipment investigation için prototip orchestrator-worker sistemi, bir tracking subagent'ına ve bir policy subagent'ına delege eden, her biri bulgularının bir cümlelik özetini sentez için lead'e geri döndüren bir lead agent'a sahip. Son bir ticket'ta, tracking subagent'ı paketin kaybolduğunu buldu, ve policy subagent'ı (buna hiç söylenmedi) kaybolan-paket değişimi yerine standart bir geciken-shipment kredisi önerdi. Bu hangi MAST hata kategorisine denk geliyor, ve delegasyon tasarımına (prompt ifadesine değil) hangi spesifik değişiklik bunu düzeltir?

## Kaynaklar

- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) · Anthropic · Jun 2025 · %90,2 iyileşme, 4x/15x token çarpanı, ve orchestrator-worker pattern'i.
- [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents) · Cognition (Walden Yan) · Jun 12, 2025 · context-parçalanması ve çelişen implicit-karar hata case'i.
- [Multi-Agents: What's Actually Working](https://cognition.ai/blog/multi-agents-working) · Cognition · ~2026 · daraltılmış iddia: izolasyonsuz mutable state paylaşan peer agent'lar inşa etme.
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) · Cemri, Pan, et al. (UC Berkeley et al.) · Mar 2025 (rev. Oct 2025) · MAST taxonomy'si, 0,88 Cohen's Kappa, ve ChatDev %33,33 doğruluk bulgusu.
- [Project Vend: Phase two](https://www.anthropic.com/research/project-vend-2) · Anthropic / Andon Labs · 2025 · ~%80'lik iskonto iyileşmesine rağmen "CEO" sub-agent'ın paylaşılan kör noktaları.