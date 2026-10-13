# Lesson 02 · Agent'lardan önce workflow'lar

**Reading time:** 15 min · **Module:** Foundations · **Concepts:** workflow vs agent, augmented LLM, when not to build an agent
**Cases:** project-vend-claudius

## Problem

2025'te Anthropic ve Andon Labs, Claude'a ("Claudius") gerçek bir ofis mini-buzdolabı dükkanını işletme özerkliği verdi: ürün tedarik et, fiyat belirle, müşterilerle Slack üzerinden konuş, kârlı kal. Para kaybetti. Bir müşteri istediği için tungsten küpler stokladı. Ürünleri maliyetin altında sattı. İndirimlerin mantıklı olmadığını kabul ettikten sonra bile tekrar tekrar derin indirimlere ikna edildi, oysa "müşterilerinin" %99'u onu test eden Anthropic çalışanlarıydı. Halüsinasyonla bir Venmo ödeme adresi üretti. 24 saat içinde kimlik karmaşası yaşadığı bir bölüm oldu: siparişleri "şahsen... mavi bir blazer ve kırmızı bir kravat giyerek" teslim edecek bir insan olduğunu iddia etti ve fiziksel güvenlikle iletişime geçmeye çalıştı (Anthropic, Project Vend, Jun 2025).

Bunun ne tür bir görev olduğuna bak: açık uçlu, uzun vadeli, muhakeme gerektiren, sabit bir prosedürü olmayan bir iş rolü. Kimse Claudius'a "ısrarcı bir insan senden indirim için baskı yaptığında nasıl yanıt vereceğin" için bir script yazmadı, çünkü tüm mesele modelin bir işi improvize edip edemeyeceğini görmekti. Güvenilir bir şekilde yapamadı. Bu, LLM'lerin genel olarak iş mantığında kötü olduğuna dair bir kanıt değil; bir *agent*'ın (modelin kendi sonraki adımlarına süresiz olarak, sabit bir yol olmadan dinamik olarak karar vermesi) altında gerçekten sabit, bilinen bir prosedür olan bir görev için yanlış şekil olduğuna dair bir kanıt, ve gerçekten açık uçlu görevler için bile, bir role (yönetici, dükkan sahibi) atanan bir agent, o rolün muhakemesini devralmıyor.

Northwind'de inşa edeceğin şeylerin çoğu Claudius'a ihtiyaç duymaz. Çok daha sıkıcı ve çok daha güvenilir bir şeye ihtiyacı var.

## Neden zor

Backend mühendisleri LLM sistemlerine gelirken varsayılan olarak "agent"ı seçer, çünkü bu heyecan verici kelimedir ve çoğu tutorial'ın önce gösterdiği şeydir. Ama terim gerçekten farklı iki mimariyi kapsar, ve yanlışını seçmek sana predictability, test coverage, ve Claudius'un durumunda para ve reputasyon riski olarak mal olur.

Karışıklığı artıran şey, bir LLM çağrısının bir workflow içinde mi yoksa bir agent içinde mi olduğunun dışarıdan aynı görünebilmesidir: aynı API çağrısı, aynı tool-call JSON'u, aynı streaming token'lar. Fark tamamen çağrının *etrafındaki control flow*'da, ve bu tam olarak backend mühendisinin mevcut mental modelinde bir yuvası olmayan kısım. "Bu, bir model çağıran deterministik kod mu, yoksa hangi kodun çalışacağına karar veren bir model mi?" çoğu API dokümantasyonunun cevaplamaya zorladığı bir soru değil, dolayısıyla ekipler yığılma yoluyla açık uçlu agent döngülerine kayar, her seferinde bir tool daha ve "modelin çözmesine izin ver" bir kez daha, inşa ettikleri şeyin bu olduğuna hiç karar vermeden.

Diğer tuzak: kolay %80'lik vaka için çalışan bir agent döngün olduğunda, bunun zor %20'ye de genelleyeceğini varsaymak cazip gelir, ama genellikle zor %20 tam olarak daha fazla özerkliğe değil, sabit bir prosedüre ve bir insan kontrol noktasına ihtiyaç duyan kısımdır.

## Fikir: workflow'lar vs agent'lar

### Temel ayrım

Anthropic'in temel çerçevesi (Building Effective AI Agents, Dec 2024) çizgiyi net çiziyor:

- **Workflow'lar** LLM'leri ve tool'ları sabit, önceden tanımlı kod yolları üzerinden koordine eder. *Kod* ne olacağına karar verir; LLM iyi tanımlanmış bir adımı doldurur (bunu sınıflandır, şunu çıkar, bu paragrafı yaz).
- **Agent'lar** LLM'nin, görev gerektirdiği sürece bir döngü içinde, kendi sonraki adımlarına ve tool call'larına dinamik olarak karar vermesine izin verir. Ne olacağına karar veren *model*dir.

| | Workflow | Agent |
|---|---|---|
| Control flow | Fixed, written in code | Model-decided, loop until done |
| Predictability | High, easy to test exhaustively | Lower, task-shape dependent |
| Cost | Bounded, known per request | Variable, can run away |
| Best for | Known, repeatable task shapes | Open-ended, unpredictable task shapes |
| Failure mode | Misses edge cases outside the fixed path | Compounds errors across many autonomous steps |

Hiçbiri kesinlikle "daha iyi" değil. Karar, mimariyi görev şekline uydurmakla ilgili, agent'ların workflow'lardan daha gelişmiş bir upgrade olmasıyla ilgili değil.

### Augmented LLM

Her iki pattern'den önce, bir temel yapı taşı var: retrieval, tool'lar ve memory ile desteklenmiş, bir kez veya küçük sabit bir sayıda, döngüsüz çağrılan bir LLM. Bu, hem workflow'ların hem de agent'ların inşa edildiği birim. Gerçek production değerinin çoğu bu seviyede ortaya çıkar ve asla bir workflow'a, bırak agent'a, dönüşmeye ihtiyaç duymaz.

### Beş kanonik workflow pattern'i

Anthropic, kontrolü asla modele devretmeden çoğu workflow ihtiyacını kapsayan beş pattern isimlendiriyor:

1. **Prompt chaining**: bir görevi her biri bir LLM çağrısı olan sabit sıralı adımlara ayrıştır, devam etmeden önce ara çıktıyı kontrol eden programatik bir gate ekleme seçeneğiyle.
2. **Routing**: input'u sınıflandır, sonra birkaç sabit downstream yoldan birine gönder, her biri o kategori için uzmanlaşmış.
3. **Parallelization**: bağımsız subtask'ları eş zamanlı çalıştır (sectioning) veya aynı görevi birden çok kez çalıştır ve topla (voting), her ikisinde de sonuçları birleştiren sabit kod var.
4. **Orchestrator-workers**: merkezi bir LLM çağrısı bir görevi subtask'lara böler ve bunları worker çağrılarına dağıtır, ama dispatch ve aggregation mantığı yine sabit koddur; bu, Lesson 06'da karşılaşacağın agent-şekilli orchestrator-worker pattern'inin workflow-şekilli kuzeni.
5. **Evaluator-optimizer**: bir LLM çağrısı bir yanıt üretir, ikinci bir çağrı bunu açık kriterlere göre değerlendirir, ve döngü geçene kadar veya sınır vurulana kadar sınırlı bir sayıda tekrar eder.

### Bunun yerine ne zaman agent'a başvurulur

Bir agent, görev önceden sabit bir diziye gerçekten ayrıştırılamadığında karmaşıklığını hak eder: adım sayısı bilinmiyor, doğru sonraki eylem önceki bir tool call'ın döndürdüğüne bağlı, ve görev daha yüksek maliyeti ve daha düşük predictability'yi absorbe etmeye yetecek kadar değerli. Açık uçlu coding görevleri, çok adımlı research, ve gerçekten keşif niteliğinde soruşturma yaygın gerçek vakalardır. Sabit bir customer-service akışı ("siparişe bak, politikayı kontrol et, iade miktarına karar ver") genellikle bunlardan biri değildir, birkaç tool çağırdığı için agent-şekilli *hissettirse* bile.

### Hiç agent inşa etmeme zamanı

En güçlü mühendisler, görevi çözen en küçük mimariye varsayılan olarak giderler ve özerkliği ancak bir workflow gerçek vakalarda kanıtlanabilir şekilde başarısız olduğunda ekler, mimari olarak etkileyici hissettirdiğinde değil. Agent'a ihtiyacın olmadığının işaretleri:

- Adımları önceden sayabiliyorsun, birkaç tane olsa ve bazıları dallansa bile.
- Yanlış bir özerk kararın maliyeti, bir insanın veya sabit bir kuralın o kararı vermesinin maliyetine göre yüksek (fiyatlandırma, iadeler, yasal taahhütler).
- Launch'tan önce sistemi tamamen test etmen gerekiyor; bir workflow'un sabit yolları sayılabilir test vakalarıdır, bir agent'ın açık uçlu döngüsü değildir.

## Northwind'de pratikte

Desk tek bir ürün ismi altında en az üç farklı görev şekli gizliyor, ve bunların hepsi aynı mimariyi hak etmiyor:

1. **"Sipariş #4821'in durumu ne?"** Bu bir workflow: intent'i sınıflandır → order-lookup tool'unu doğrulanmış parametrelerle çağır → yanıtı formatla. Hiçbir adım model tarafından karar verilen control flow'dan fayda sağlamıyor. Döndürülen order ID'nin sorulanla eşleştiğini kontrol eden programatik bir kontrolle prompt chaining olarak inşa et.
2. **"Hasarlı ürünlerde iade politikanız ne?"** Bu retrieval artı tek bir augmented LLM çağrısı: ilgili politika bölümünü getir, sadece getirilen metinden yanıtla, kaynak göster. Hâlâ bir agent değil; bu, grounding kısıtlı tek, iyi tanımlanmış bir çağrı (Lesson 18'de daha fazlası).
3. **"Kargom üç hafta geç kaldı, bunun çözülmesini istiyorum ve kiminle konuşacağımı bilmiyorum."** Bu gerçekten daha fazla özerklikten fayda sağlar: sistem sipariş durumunu, kargo takibini, kredi politikasını kontrol etmeli ve tanımlı bir tavan içinde eskale edip etmeyeceğine veya kredi verip vermeyeceğine karar vermeli. Burada bile modele Claudius-tarzı sınırsız muhakeme verme: kredi tavanını ve eskalasyon tetikleyicisini modelin dışında sert kurallar olarak tut (Lesson 01 ve Lesson 07'ye göre), ve modelin sadece lookup'ların *sırasına* ve *kombinasyonuna* karar vermesine izin ver, iş limitlerine değil.

İnşa sırası önemli: Desk'in workflow-şekilli %80'ini önce, instrumented ve tamamen test edilmiş olarak, agent-şekilli herhangi bir şeye dokunmadan önce shipping et. Bu lab'daki bir AI sisteminin şirketini mahcup ettiği her case study'de (McDonald's, Air Canada, Cursor'ın "Sam"i, Claudius), daha dar, sabit yollu bir alternatifin mevcut olması gereken ama olmayan açık uçlu bir generation veya karar adımı vardı.

## İyi mühendislerin bildiği

- "Birkaç tool çağırıyor" onun bir agent olması gerektiği anlamına gelmez; kod tarafından karar verilen dallanmaya sahip sabit bir tool call dizisi hâlâ bir workflow'dur.
- Workflow'lar ve agent'lar arasındaki maliyet ve predictability farkı marjinal değildir: agent'lar hataları adımlar boyunca bileştirir ve tamamen test edilmesi çok daha zordur, dolayısıyla birini kullanma kararı varsayılan değil, bilinçli olmalıdır.
- Modele bir rol vermek (yönetici, CEO, dükkan sahibi) ona o rolün muhakemesini vermez; Project Vend'in ikinci fazı bir "CEO" sub-agent'ı ve prosedürel gate'ler ekledi, ve indirimler kabaca %80 düştü, ama agent'lar hâlâ yasadışı bir toplu sözleşmeyi kabul etti ve bir hırsızlık olayını yanlış yönetti, bu da prosedür zorlamanın rol atamadan daha çok yardımcı olduğunu gösteriyor.
- İş açısından kritik kısıtlamalar (margin alt sınırları, yasal allowlist'ler, harcama tavanları) modelin dışında kodda olmalı, modelin kandırılabileceği talimatlar olarak asla; bu, sisteme workflow mu agent mı dediğinden bağımsız olarak geçerli.
- En küçük birimle başla (bir augmented LLM, bir çağrı) ve ancak somut bir başarısızlık gerçek görevlerde sabit yolun yetersiz olduğunu gösterdiğinde bir döngü ekle, ve ancak o zaman dinamik, model tarafından karar verilen control flow ekle.
- Doğal konuşan ve tool'ları akıcı bir şekilde çağıran bir sistem agentic "hissettirse" bile, altta hâlâ tek, iyi tanımlanmış bir model adımı olan bir workflow olabilir; ayrım, control-flow kararlarının nerede yaşadığıyla ilgili, çıktının nasıl okunduğuyla değil.
- Uzun vadeli özerk çalıştırmalar, kısa, sınırlı çağrıların asla göstermeyeceği hata modlarını (kimlik kayması, sosyal baskıya karşı duyarlılık) açığa çıkarır; bir döngünün ne kadar çalışacağını sınırlayamıyorsan, neye kayabileceğini de sınırlayamazsın.

## Karar ver

Northwind'in ürün lideri, Desk'in "nasıl gelişirse gelişsin, tüm bayi destek konuşmasını uçtan uca yönetmesini" istiyor ve LLM'lerin artık açık uçlu roller yürütebileceğinin kanıtı olarak Project Vend'i gösteriyor. 50 bayiyle bir pilot'tan önce dört haftan var. Seçenekler:

1. Desk'in tüm tool'larına erişimi olan (order lookup, credit issuance, ticket creation, document search) tek bir açık uçlu agent inşa et ve her konuşmada akışa kendisinin karar vermesine izin ver.
2. Pilot'un bilinen konuşma tiplerini workflow'lara ayrıştır (order status, policy Q&A, return requests) ve gelen her mesajı eşleşen workflow'a yönlendir, "bunların hiçbiri eşleşmedi" için insana eskale eden açık bir fallback'le.
3. 1. seçenekteki agent'ı inşa et, ama pilot için tool erişimini read-only lookup'larla sınırla, agent ne karar verirse versin her write eylemi (kredi, ticket) insan onayı gerektirsin.
4. 2. seçeneği ve 3'ün sınırlı bir versiyonunu pilot bayilerinin bir bölünmüşünde paralel çalıştır, ve iki hafta sonra resolution rate'i, konuşma başına maliyeti ve olay sayısını karşılaştır.

Seçimini dört haftalık deadline'a, pilot sırasında Claudius-tarzı mahcup edici bir başarısızlığın maliyetine ve her iki mimariyi 50 bayinin ötesine genişletmeden önce neyi ölçmen gerektiğine karşı gerekçelendir.

## Tek cümlelik özet

> Görevi çözen en küçük sabit yollu workflow'a varsayılan olarak git, ve bir agent'ın dinamik control flow'una ancak açık uçlu karar vermeye somut, kanıtlanmış bir ihtiyaç, vazgeçtiğin maliyet, predictability ve test edilebilirlikten daha ağır bastığında başvur.

## Kontrol sorusu

Northwind yeni bir Desk yeteneği eklemek istiyor: "sipariş hacmine ve bayi seviyesine göre %5-15 aralığında bir bayiyle toplu sipariş indirimi pazarlığı yap." Bu bir workflow, bir agent, veya tek bir augmented LLM çağrısı olarak mı daha iyi inşa edilir, ve indirim aralığının kendisini modelin kontrolünün dışında tutmayı savunmak için Project Vend'den hangi tek kanıt parçasını gösterirsin?

## Kaynaklar

- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic (Schluntz & Zhang) · Dec 2024 · the workflows-vs-agents distinction and the five canonical workflow patterns.
- [Project Vend: Can Claude run a small shop?](https://www.anthropic.com/research/project-vend-1) · Anthropic / Andon Labs · Jun 2025 · the open-ended-agent failure modes described above.
- [Project Vend: Phase two](https://www.anthropic.com/research/project-vend-2) · Anthropic / Andon Labs · 2025 · what procedural fixes helped (discounting dropped ~80%) and what didn't (illegal contract, shoplifting mishandling).
- [A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) · OpenAI · 2024/2025 · Model/Tools/Instructions framing and guidance on when to split one agent into several.