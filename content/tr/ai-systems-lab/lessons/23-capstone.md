# Lesson 23 · Capstone: bir kurumsal agent platformu

**Reading time:** 22 min · **Module:** Capstone · **Concepts:** end-to-end design, review and defense
**Cases:** chevrolet-one-dollar-tahoe, dpd-chatbot-swearing, klarna-ai-assistant, openai-dec-2024-outage, nyc-mycity-chatbot, cursor-support-bot-policy

## Problem

Northwind Supply, Desk'in bir script koleksiyonuna değil gerçek bir platforma ihtiyacı olduğuna karar verdi. Desk şu anda dahili belgelerden bayi sorularını yanıtlıyor, siparişleri ve kargoları arıyor, bir limite kadar kredi veriyor, destek ticket'ları açıyor, dışarıdakiler tarafından yazılan gelen destek e-postalarını okuyor ve şirketin belge deposuna erişimi olan çalışanlara Slack üzerinden hizmet veriyor. Bu yeteneklerin her biri, tek başına ele alındığında, zaten dikkatlice inşa etmeyi öğrendiğiniz bir şey. Tek bir gateway'in arkasında bir araya getirildiğinde, 2.000 bayi müşteriye ve 600 çalışana hizmet verdiğinde, hiçbir tek lesson'ın kapsamadığı kendi hata modlarına sahip bir platform haline geliyorlar.

Bu lesson bir design review'dur. Desk pilot'un ötesine ölçeklenmeden önce mimarisini bir VP of Engineering'e gezdiren staff mühendis sizsiniz. Aşağıdaki her bölüm, gerçek bir design review'un gerçekten sorgulayacağı kararları adlandırır ve altta yatan mekanizmayı öğrendiğiniz lesson'a geri işaret eder. Bunu, 01 ile 22 arasındaki lesson'ların tek bir sistemde nasıl bir araya geldiğinin bir haritası olarak okuyun, yeni materyal olarak değil.

## Neden zor

Bir platform özelliklerinin toplamı değildir; etkileşimlerinin toplamıdır. Tek başına çalışan bir guardrail (Lesson 21), onu tasarlayan kişinin hiç düşünmediği bir kanaldan giren bir prompt injection ile atlatılabilir (Lesson 08). Doğru bir şekilde retrieval yapan bir RAG sistemi (Lesson 15, 16), izin filtrelemesi belge deposu için tasarlandıysa ama müşteri verisine de dokunan tool katmanı için tasarlanmadıysa yine de tenant'lar arasında veri sızdırabilir (Lesson 17). Maliyet kesen bir router (Lesson 19), eval'lerinizin asla yakalamak üzere inşa edilmediği tam kalite boyutunu sessizce bozabilir (Lesson 11, 12).

Bu lab boyunca referans verilen her olay, Chevrolet bayisinin 1 dolarlık Tahoe'su, DPD'nin jailbreak'lenmiş şiiri, Klarna'nın maliyet-kalite trade-off'u, OpenAI'nin Aralık 2024 kesintisi, NYC'nin MyCity hukuki hataları, Cursor'un fabrikasyon destek politikası, bazı tekil parçanın tasarlandığı gibi çalıştığı bir sistemde gerçekleşti. Hata kompozisyondaydı: çalışan parça ile onun yanındaki parça arasındaki etkileşimin sahibi yoktu. Desk'in platformunu uçtan uca tasarlamak, her bileşen kendi incelemesini geçtiği için etkileşimlerin kendi kendine hallolacağını varsaymak değil, bu etkileşimleri açıkça sahiplenmek anlamına gelir.

## Fikir: Desk tek bir sistem olarak, katman katman incelenmiş

### Gateway ve model katmanı

Desk'e gelen her request, bayi chat'i, çalışan Slack'i, gelen e-posta, her yüzeyin sağlayıcıları doğrudan çağırması yerine tek bir gateway'den geçer. Burası Lesson 01'in temel iddiasının mimariye dönüştüğü yer: bir LLM güvenilmez bir bağımlılıktır, bu yüzden gateway timeout'ları, sadece geçici hatalar için retry'ları ve structured output doğrulamasını her çağrıda, request'in hangi yüzeyden geldiğinden bağımsız olarak uygular.

Gateway aynı zamanda model routing'in (Lesson 19) sahibidir: rutin sipariş aramaları için ucuz model işleme, krediye veya politikaya dokunan her şey için daha güçlü bir modele escalation, maliyet dashboard'undan ayrı takip edilen kendi doğruluk eval'iyle birlikte, çünkü sadece tasarrufları raporlayan bir router hikayenin yarısını raporluyordur. Ve gateway, provider failover'ın (Lesson 20) yaşadığı yerdir: bayiye yönelik kredi yolu için ikincil bir sağlayıcıya health-checked routing, çünkü bu, OpenAI tarzı çok saatlik bir kesintinin en maliyetli olacağı fonksiyondur, oysa daha düşük riskli çalışan belge asistanı yedekte ikinci bir sağlayıcı olmadan basitçe "şu anda kullanılamıyor"a düşebilir.

### Workflow mu agent mi ve döngülerin durduğu yer

Her Desk yeteneği bir agent gerektirmez. Sipariş durumu arama sabit bir workflow'dur: siparişi getir, yanıtı formatla, bitti (Lesson 02). Kredi verme, bir bayinin geçmişini araştırma, bir ticket yanıtı taslaklama, bunlar gerçekten değişken yollara sahiptir ve kendi tool call'larını seçen bir agent'ı haklı çıkarır. Desk'in bir agent döngüsü çalıştırdığı her yerde, sonradan incelenen bir faturalama uyarısı yerine, herhangi bir ücretli çağrıdan önce kodda zorlanan sert bir adım sayısı ve maliyet tavanı vardır (Lesson 05); yüzeysel olarak farklı yollarla başarısız bir tool call'ı tekrar tekrar deneyen bir agent ilerleme kaydetmiyordur ve döngü bunu tanıyıp durmak zorundadır.

Desk herhangi bir noktada çok-agent bir tasarıma ihtiyaç duyarsa, örneğin belge araştırmasını bir arama sub-agent'ına devreden bir planlama agent'ı, Lesson 06'daki dersi aklınızda tutun: çok-agent sistemler esas olarak bilgi saklamadan ve belirsiz delegasyondan başarısız olur, model yetenek boşluklarından değil. Gerçekten paralelleştirilebilir bir görev için (birden fazla belge kaynağını aynı anda arama) dar bir orchestrator-worker ayrımı savunulabilir; tümü gevşek belirtilmiş context paylaşan genel amaçlı bir "agent takımı" MAST tarzı hataları üretmeye en yatkın pattern'dir.

### Tool izinleri ve blast radius

Desk'in gösterdiği her tool, issue_credit, lookup_order, create_ticket, send_email, görevinin gerektirdiği minimum yeteneğe kapsamlanmıştır ve her sonuçlu eylem, modelin kendi context'inin dışında yaşayan bir onay kapısına sahiptir (Lesson 07). Desk'in standart limitinin üzerinde kredi verme, model'in ikna edilebileceği bir system prompt talimatı olarak değil, tool'un kodunda zorlanan bir insan onayı gerektirir; Chevrolet bayisinin bot'unun fabrikasyon bir fiyatı "yasal bağlayıcı" olarak çağırmasına izin veren tam boşluk buydu, onu durduracak hiçbir şey yoktu. Geri alınamaz veya yüksek blast-radius'lu eylemler (kolayca geri alınamayan bir kredi, bir ticket kapatma, dışarıya gönderilen bir e-posta), agent'ın kendisinin ne yaptığını bildirmesinden bağımsız olarak, gerçeğin kaynağı olan bir audit trail'e kaydedilir.

### Her yüzeyde prompt injection ve lethal trifecta

Desk, dışarıdakiler tarafından yazılan gelen destek e-postalarını ve ticket'ları okur, lethal trifecta'yı (Lesson 08) canlı bir kaygı haline getiren tam olarak aynı yüzey: özel veri (bayi hesap detayları, sipariş geçmişi), güvenilmeyen içerik (gelen bir e-posta veya ticket'taki her şey), ve bir sızdırma kanalı (send_email, create_ticket veya gönderenin görebileceği bir yere yazan herhangi bir tool). Üç bacağı da karşılayan herhangi bir tool kombinasyonu, sonradan yamanacak tek seferlik bir bug olarak değil, duran bir risk olarak ele alınır. Verinin çıkabileceği her yerde (Lesson 09), markdown rendering, otomatik çekilen görseller, giden e-posta, her kanal açıkça sayılır ve kontrol edilir, çünkü yaygın sızdırma pattern'ini yakalayıp sıra dışı bir markdown varyantını kaçıran bir filtre tam olarak EchoLeak sınıfı bir boşluktur.

Desk herhangi bir zaman MCP üzerinden üçüncü taraf tool'ları entegre ederse, örneğin bir CRM konnektörü veya bir kargo taşıyıcı entegrasyonu, tool tanımları onay anında hash-pinned'dir ve her çağrıdan önce yeniden kontrol edilir (Lesson 10), çünkü onaylanmış bir tool kalıcı olarak güvenilir bir tool değildir; Cursor'un rug-pull açığının gösterdiği gibi onaydan sonra drift edebilir.

### Herhangi bir şeyin çalıştığını iddia etmeden önce değerlendirme

Herhangi bir Desk yeteneği pilot'un ötesine gönderilmeden önce, biri gerçekten gerçek trace'lerden bir örneği okumuş ve gördüklerinden bir hata taksonomisi inşa etmiş olmalı, bir planlama toplantısının ne ters gideceğini varsaydığından değil (Lesson 11). Otomatik kontroller, kod tabanlı assertion'lar (tool call kredi tavanına uydu mu) ile LLM hakemler (bu yanıt çekilen politika belgesine sadık mıydı) arasında temiz bir şekilde bölünür ve o pipeline'da kullanılan herhangi bir hakem, önyargıları (position, verbosity) varsayılmadan açıkça test edilmiş olarak, güvenilmeden önce insan etiketlerine karşı hizalanmıştır (Lesson 12). Desk agent döngüleri çalıştırdığı için, değerlendirme sadece sonucu değil trajectory'yi de kapsar: bir onay adımını atlayarak veya bir tool'u gereksiz şekilde iki kez çağırarak doğru nihai yanıta ulaşan bir yanıt, trajectory-farkında bir eval'in yakaladığı ve sadece-sonuç bir eval'in kaçırdığı bir hatadır (Lesson 13). Ve bunların hepsi gözlemlenebilir: her Desk etkileşimi, sonradan "bu spesifik konuşma neden ters gitti" sorusuna, sadece "toplu skor yeşil mi" değil, cevap verebilecek yeterli yapıyla (tool call'lar, retrieval adımları, model çağrıları, düz bir log olarak değil nedensel bir ağaç olarak) trace edilir (Lesson 14).

### RAG, izinler ve grounding

Desk'in fiyat listeleri, dönüş politikası ve sözleşmeler üzerindeki belge retrieval'ı Lesson 15'teki hata noktası disiplinini takip eder: retrieval kalitesi ve generation kalitesi ayrı ayrı ölçülür, çünkü bir sistem doğru chunk'ı çekip yine de onun ötesine kayan bir yanıt üretebilir. Chunking, hybrid search ve reranking, Desk'in gerçek sorgu karışımına göre ayarlanır, tam SKU ve sipariş numarası aramaları saf embedding'lerin kaçırdığı lexical matching gerektirir (Lesson 16). Retrieval, asistanın var olma iznine değil, sorgu anında soru soran kullanıcının gerçek izinlerine göre filtrelenir, Microsoft 365 Copilot'u önceden var olan SharePoint over-sharing'i için bir force-multiplier'a çeviren tam boşluk (Lesson 17); bir bayi doğru soruyu sorarak asla başka bir bayinin sözleşme şartlarını alabilmemelidir. Ve politikaya, fiyatlandırmaya veya yasal şartlara dokunan her yanıt, bir bayiye ulaşmadan önce açık bir claim-to-source kontrolüyle temellendirilir, Air Canada'nın bereavement-fare yanıtından ve NYC'nin MyCity chatbot'unun kendinden emin yanlış yasal iddialarından eksik olan tam adım (Lesson 18).

### Production guardrail'leri, maliyet ve yönetişim

Desk'in politika ve taahhüt dili için çıktı tarafı guardrail'i, ana modelin kendi system prompt'undan bağımsız olarak çalışır (Lesson 21), bu yüzden bir prompt regresyonu veya başarılı bir injection, onu yakalaması gereken tek kontrolü otomatik olarak devre dışı bırakmaz, DPD'nin chatbot'unun ilgisiz bir sistem güncellemesi talimatlarını zayıflattığında küfür etmesine izin veren tam boşluk. Maliyet optimizasyonu (caching, batching, routing), müşterilere görünür hale gelen Klarna tarzı bir maliyet odaklı kalite regresyonundan sonra eklenen bir şey değil, baştan itibaren takip edilen bir kalite metriğiyle eşleştirilir (Lesson 19). Ve yönetişim sahipliği açıktır: Northwind içinde biri Desk'in EU AI Act risk sınıflandırmasının sahibidir devam eden bir şekilde, ISO 42001 veya NIST AI RMF uyumunun içsel süreç disiplini olduğunu ve o sınıflandırmanın yerine geçmediğini anlar, ve Desk'in ürettiği her politikayla ilgili ifadeyi Northwind'in kendi web sitesiyle aynı editöryel hesap verebilirlikle ele alır (Lesson 22). Alıntılanabilir, versiyonlu bir politika belgesine temellendirilemeyen destek bot yanıtları, makul görünen bir tahmin üretmek yerine bir insana yükseltilir, Cursor'un "Sam" bot'u gerçek iptallere yol açan fabrikasyon bir cihaz giriş politikası ürettikten sonra ancak tanımladığı düzeltme.

## Northwind'de pratikte: inceleme sırası

Desk'in tam platformu için bir design review, bir staff mühendisin gerçekte geçeceği sırayla: blast radius ile başlayın (hangi tool'lar geri alınamaz zarara sebep olabilir ve bunlar modelin dışında mı kapalı), sonra trifecta denetimine geçin (hangi tool kombinasyonları özel veriye, güvenilmeyen içeriğe ve bir sızdırma kanalına eşzamanlı olarak dokunuyor), sonra grounding'e (hangi yanıtlar özgürce üretiliyor, hangileri çekilip alıntılanıyor), sonra değerlendirme kapsamına (her agentic yol için trajectory-farkında bir eval var mı, sadece sonuç kontrolleri değil), sonra maliyet ve dayanıklılığa (her maliyet kolu ile eşleştirilmiş bir kalite metriği var mı ve önemli olan sağlayıcıya bağımlı yollar için test edilmiş bir fallback var mı), ve son olarak yönetişim sahipliğine (bir yetenek değiştiğinde riski kim yeniden sınıflandırıyor). Her bireysel bileşen incelemesini geçen ama bu sırayla asla gezilmemiş bir platform gerçekte incelenmiş değildir, bir parça seti olarak kalır.

## İyi mühendislerin bildiği

- Bir platformun hata modları bileşenler arasındaki etkileşimlerde yaşar, tek bir bileşenin içinde değil; dikişleri inceleyin, sadece parçaları değil.
- Bu lab'ın referans verdiği her olay, bazı tekil parçanın tasarlandığı gibi çalıştığı bir sistemde gerçekleşti; boşluk bir bileşen kusuru değil, etkileşim sahipliğiydi.
- Blast-radius ve trifecta denetimleri önce çalıştırılacak en yüksek etkili iki incelemedir, çünkü daha sonraki bir katman (grounding, guardrail'ler, eval'ler) başarısız olsa bile zararı sınırlarlar.
- Bireysel olarak her biri doğru olan ama hiç birlikte test edilmemiş bir guardrail, bir eval ve bir yönetişim süreci, ancak kombinasyonda ortaya çıkan tam hatayı kaçırır.
- "Design review"ın en ucuz versiyonu bir checklist'tir; faydalı versiyonu gerçek bir request'i her katmandan geçirip takip etmek ve her katmanda, bu başarısız olursa ne olur diye sormaktır.
- Maliyet, dayanıklılık ve yönetişim kararları eventually hepsi aynı soruya geri döner: artık risk olarak açıkça kabul etmeye istekli olduğunuz şey nedir ve bunu kim onayladı.
- İzole olarak öğrenilen lesson'ları bir araya getirerek inşa edilen bir platform otomatik olarak iyi tasarlanmış bir platform değildir; kompozisyonun kendisi bir tasarım becerisidir.

## Karar ver: capstone brief

Pilot'tan (200 bayi) tam rollout'a (2.000 bayi, 600 çalışan) ölçeklenmeden önce, Desk'in platform mimarisini Northwind'in VP of Engineering'ine ve General Counsel'ına sunan staff mühendis sizsiniz. Her biri için gerekçelendirilmiş bir tasarım üretmelisiniz:

1. **Gateway ve routing**: bayi chat'i, çalışan Slack'i ve gelen e-postadan gelen request'ler tek bir gateway'in arkasında nasıl birleştirilir; model routing/cascading'in nerede geçerli olduğu ve nerede olmadığı; hangi yeteneklerin multi-provider failover aldığı ve hangilerinin tek-provider riskini kabul ettiği.
2. **Agent sınırları**: hangi Desk yetenekleri sabit workflow'lar ve hangileri gerçek agent'lar; her agent için adım/maliyet tavanı, durma koşulu ve tek-agent mi yoksa çok-agent bir ayrım mı gerektirdiği (ve öyleyse, context'in Cognition'ın Flappy-Bird tarzı hatasını tekrarlamadan nasıl paylaşıldığı).
3. **Tool izinleri**: Desk'in gösterdiği her tool için (kredi verme, sipariş arama, ticket oluşturma, e-posta gönderme), erişim kapsamı, onay kapısı (varsa) ve enforcement'ın nerede yaşadığı (modelin talimatlarında mı, yoksa tool'un kendi kodunda mı, ve neden).
4. **Trifecta ve injection denetimi**: lethal trifecta'yı karşılayabilecek her tool kombinasyonunu sayın ve her biri için spesifik mitigasyonu (kapsamlama, çıktı filtreleme, çift kontrol veya yeteneği kaldırma).
5. **RAG ve izinler**: retrieval'ın soru soran kullanıcının gerçek izinlerine nasıl kapsamlandığı, chunking/hybrid search/reranking'in Desk'in sorgu karışımına nasıl ayarlandığı ve politika/fiyatlandırma/yasal yanıtların özgürce üretilmek yerine nasıl temellendirildiği ve alıntılandığı.
6. **Değerlendirme ve tracing**: offline ve online olarak ne ölçülür, hakem (varsa) insan etiketlerine nasıl hizalandı, trajectory hataları sonuç hatalarından nasıl ayrı yakalanır ve tracing kurulumunun sonradan belirli bir kötü konuşmayı debug etmek için ne yakalaması gerektiği.
7. **Guardrail'ler**: ana modelin context'inin dışında bağımsız bir kontrol olarak ne çalışır ve açıkça kabul ettiğiniz kalıntı hata oranı nedir.
8. **Maliyet ve dayanıklılık**: hangi maliyet kolları nerede geçerli, her biriyle eşleştirilmiş kalite metriği ne ve hangi yetenekler provider failover alır, hangileri zarifçe düşer, hangileri kesinti riskini kabul eder.
9. **Yönetişim**: Desk'in risk sınıflandırmasını ileriye dönük kim sahiplenir, yeniden sınıflandırmayı ne tetikler ve Desk'in dokunduğu bayi ile çalışan verisi karışımı göz önüne alındığında veri saklama planı nedir.

Her bölüm için, uyguladığınız mekanizmanın spesifik lesson'ını (01-22) ve bu bölüm atlandığında veya dikkatsizce yapıldığında ne olacağını gösteren bu lab'ın spesifik olayını (case slug ile) adlandırın. Tek bir doğru mimari yoktur; güçlü bir cevap içsel olarak tutarlıdır, kalıntı risklerini açıkça adlandırır ve her trade-off'u "bu başarısız olduğunda ne olur" diye soran şüpheci bir General Counsel'a karşı savunabilir.

## Tek cümlelik özet

> Bir platform, gerçek bir request'i her katmandan geçirip her katmanda o katman başarısız olduğunda ne olur diye sorana kadar incelenmiş değildir, çünkü bu lab'daki her olay bir dikişte gerçekleşti, tek bir bileşenin içinde değil.

## Kontrol sorusu

Tam rollout'tan altı ay sonra, Desk'in trajectory eval'leri, guardrail logları ve maliyet dashboard'u hepsi yeşil, ama bir bayi, bir kargo anlaşmazlığı hakkında alışılmadık, kalıcı bir ileri-geri de içeren bir konuşma sırasında Desk'in belirtilen tavanın üzerinde bir kredi onayladığını bildiriyor. Yukarıdaki dokuz design-review bölümünden hangisini önce, hangi sırayla kontrol ederdiniz ve neden?

## Kaynaklar

- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic · Dec 2024 · workflows vs. agents
- [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) · Simon Willison · 16 Jun 2025 · trifecta risk model
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) · Cemri, Pan, et al. · Mar 2025 · MAST failure taxonomy
- [GM Dealer Chat Bot Agrees To Sell 2024 Chevy Tahoe For $1](https://gmauthority.com/blog/2023/12/gm-dealer-chat-bot-agrees-to-sell-2024-chevy-tahoe-for-1/) · GM Authority · Dec 2023
- [DPD AI chatbot swears, calls itself 'useless' and criticises delivery firm](https://www.theguardian.com/technology/2024/jan/20/dpd-ai-chatbot-swears-calls-itself-useless-and-criticises-firm) · The Guardian · Jan 2024
- [Klarna plans to hire humans again, as new landmark survey reveals most AI projects fail to deliver](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/) · Fortune · May 2025
- [API and ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024
- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · 29 Mar 2024
- [Cursor AI support agent invents fake policy and triggers user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025
- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024