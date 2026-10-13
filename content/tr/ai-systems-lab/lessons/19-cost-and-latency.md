# Lesson 19 · Maliyet ve gecikme (latency)

**Reading time:** 18 min · **Module:** Production · **Concepts:** prompt caching, model routing and cascades, batch, semantic cache risks
**Cases:** klarna-ai-assistant

## Problem

Şubat 2024'te Klarna, OpenAI destekli müşteri hizmetleri asistanının ilk ayında 2,3 milyon sohbeti işlediğini, bunun tüm destek hacminin üçte ikisi kadar olduğunu duyurdu. Şirket bunu "700 tam zamanlı temsilcinin eşdeğeri iş" olarak çerçeveledi ve yılda 40 milyon dolarlık maliyet kaçınması tahmin etti. Raporlanan sayılara göre bu bir maliyet-optimizasyonu başarı hikayesiydi.

On beş ay sonra, Mayıs 2025'te, CEO Sebastian Siemiatkowski Bloomberg'e (Fortune'ın bildirdiği gibi) "maalesef maliyet, bunu organize ederken fazla baskın bir değerlendirme faktörü olmuş gibi görünüyor, sonunda elinde kalan şey daha düşük kalite" dedi. Klarna, bir müşterinin "her zaman" bir insana erişebilmesi için esnek, "Uber-tarzı" bir kurulumda yeniden insan temsilci işe almaya başladığını duyurdu. Çalışan sayısı 5.527'den (Aralık 2022) 3.422'ye (Aralık 2024) düşmüştü, şirket bu düşüşü kısmen AI-güdümlü verimliliğe, kısmen de bir işe alım dondurmasına ve doğal çalışan kaybına bağlıyor. Tam olarak kaç insanın yeniden işe alındığına dair raporlama kaynaklar arasında tutarsız, CEO'nun kendi kabulü ve beyan edilen işe alım niyetinin dışında doğrulanmamış olarak ele alınmalı.

Bir noktada, LLM faturanı agresif bir yüzde ile kesmen istenecek. Bu lesson, bu hikayenin bir sonraki versiyonu olmadan bunu yapmakla ilgili.

## Neden zor

Backend mühendisleri altyapı maliyetini nasıl düşüreceklerini zaten biliyor: agresif önbellekle (cache), bekleyebilecek şeyleri batch'le, instance'ı doğru boyutlandır. LLM maliyet optimizasyonu aynı kelime hazinesini (caching, batching, routing) yeniden kullanır, ama her kaldıraç klasik bir altyapı bug'ına hiç benzemeyen bir hata modu taşır.

Prompt caching sessizce başarısız olur. Bir cache hit, bir prefix üzerinde tam byte eşleşmesidir; bir timestamp, bir yeniden sıralanmış tool tanımı, cache sınırından önce eklenmiş istek-özgü dinamik içerik, ve hit rate'in sessizce sıfıra düşer, sadece gecikmeyi ve hata oranını takip eden her dashboard iyi görünürken.

Model routing ve cascade'ler maliyeti yeni bir güvenilirlik riskiyle takas eder: yanlış yönlendirme (misrouting). Kolay bir sorguyu ucuz bir modele göndermek bir kazançtır. Zor bir sorguyu, güvenle ve yanlış cevaplayan ucuz bir modele göndermek bir kayıptır ve bir maliyet dashboard'u bunu sana asla göstermez, çünkü çağrı yine de daha düşük bir fiyata 200 OK döndü.

Semantic caching en keskin tuzaktır, çünkü maliyet odaklı bir incelemeye önemli her metrikte tam bir kazanç gibi görünür: hit rate yukarı, gecikme aşağı, gider aşağı. Hata, benzer-ama-aynı-olmayan sorgulardan bir "mahalleye" sunulan bayat veya yanlış bir cevaptır, hit rate, gecikme ve hata oranında eşzamanlı olarak görünmezdir, çünkü bunların hiçbiri doğruluğu ölçmez.

Ve üçünün altında Klarna dersi yatar: optimize ettiğin tek sayı maliyet veya otomasyon oranıysa, gerçek bir kalite gerilemesi gönderebilirsin ve müşteriler ve basın bunu senin için bulana kadar fark etmeyebilirsin.

## Fikir: dört kaldıraç, dört farklı hata modu

### Prompt caching

Prompt caching, tekrarlanan bir prompt prefix'i (system prompt, tool tanımları, uzun context) için modelin önceden hesaplanmış key-value durumunu yeniden kullanır, böylece sonraki istekler onu yeniden hesaplamayı atlar. Anthropic'in varsayılan cache'i 5 dakikalık bir TTL'ye sahiptir: bir cache write temel input fiyatının 1,25 katına mal olur, bir cache read (hit) 0,1 katına mal olur, cache'lenen kısımda %90 indirim. İsteğe bağlı 1 saatlik bir TTL yazmada 2 kat maliyete mal olur. Minimum cache'lenebilir prefix uzunluğu modele göre 512-4.096 token arasında değişir. TTL saati, cevap zamanında değil istek zamanında başlar. OpenAI'ın caching'i varsayılan olarak etkindir: cache okumaları indirimlidir (OpenAI'ın kılavuzu %90'a kadar indirim belirtir), açık breakpoint'ler için yazmalar 1,25 kat maliyete mal olur, ve minimum uzunluk/TTL model üretimine göre değişir (kabaca 5-30+ dakika, bazı modeller için 24 saate kadar).

Aritmetik şu: caching, bir prefix TTL içinde yazma primini amorti edecek kadar yeterince tekrar kullanıldığında ödeme yapar. Anthropic'in 5 dakikalık katmanında, başa baş noktası kabaca ikinci cache hit'te gelir. Belirli bir prefix için trafiğin beş dakikada bir istekten daha seyrekse, 1,25 kat yazma primini tekrar tekrar ödüyorsun ve 0,1 kat okuma indirimini asla toplayamıyorsun.

### Batch API'ler

Batch işleme gecikmeyi sabit bir indirimle takas eder: istekleri asenkron olarak gönder (JSONL olarak) ve sonuçları garantili bir pencere içinde geri al. OpenAI'ın Batch API'si input ve output token'larında %50 indirim verir, 24 saatlik bir tamamlanma penceresi (pratikte genelde daha hızlı), dosya başına 50.000 isteğe veya 200MB'a kadar, sonuçlar sınırlı bir süre için alınabilir. Webhook yoktur; poll edersin. Bu, yalnızca geciktirmeye tolere edebilen iş yüklerine yardımcı olur: gece sınıflandırma, embedding yenileme, eval çalıştırmaları, toplu içerik moderasyonu. Sohbet cevabı bekleyen bir müşteri için hiçbir şey yapmaz.

### LLM cascade'leri ve model routing

Bir cascade veya router, her sorguyu idare edebileceği düşünülen en ucuz modele gönderir, bir güven veya anlaşma sinyali düşük olduğunda sadece daha güçlü bir modele yükseltir. FrugalGPT (Chen, Zaharia, Zou, Stanford, 2023), bazı veri setlerinde %98'e kadar maliyet azaltımıyla GPT-4 seviyesinde doğruluğu eşleştiren bir LLM cascade gösterdi (ve eşit maliyette doğruluğu %4'e kadar iyileştirdi), sorgu başına hangi 3-model dizisini ve güven eşiklerini kullanacağını öğrenerek, 5 sağlayıcıdan 12 ticari API boyunca. RouteLLM (Ong et al., UC Berkeley/Anyscale, ICLR 2025), insan-tercihi verisinden güçlü ve zayıf bir model arasında bir router eğitir, bazı ayarlarda kaliteyi korurken 2 kattan fazla maliyet azaltımı bildirir, ve öğrenilen router'ın test zamanında farklı güçlü/zayıf çiftlere aktarıldığını gösterir.

Her iki makalenin paylaştığı tuzak: router'ı veya cascade'i eğitmek için etiketli veya tercih verisine ihtiyacın var, ve yanlış yönlendirilmiş zor bir sorgu kendi başına bir güvenilirlik hatasıdır, maliyet dashboard'undan ayrı izleme gerektiren bir hata.

### Semantic caching

Semantic caching, önceki bir prompt'a embedding benzerliğine göre bir cache'lenmiş cevabı anahtarlar, tam eşleşme yerine, böylece neredeyse aynı sorular yeni bir üretimi tetiklemek yerine eski bir cevabı yeniden kullanır. Risk, bazen semantic cache poisoning olarak adlandırılır: bir hit bir benzerlik yargısı olduğundan, bir kimlik eşleşmesi değil, bir yanlış veya bayat cache'lenmiş cevap, gelecekteki anlamsal olarak yakın ama aynı olmayan sorguların tüm "mahallesine" sunulur ("aboneliğimi iptal et" embedding uzayında "aboneliğimi durdur"a yakın oturur). Hata, standart dashboard'larda görünmezdir çünkü hit rate, gecikme ve hata oranının hepsi sağlıklı görünürken sunulan cevap yanlıştır.

Bu problem üzerine 2025/2026'da bir makale (FreshCache), cache yeniden kullanımını binary bir benzerlik eşiği olarak değil risk-sınırlı bir bayatlık-olasılığı tahmini olarak modeller, ve hash tespitli içerik değişikliklerinin sadece yaklaşık üçte birinin cevap doğruluğunu gerçekten değiştirdiğini bildirir, bu da naive TTL veya hash tabanlı geçersizleştirmenin doğruluk için gerçekte önemli olana kıyasla fazla geçersizleştirdiği anlamına gelir.

| Kaldıraç | Ne tasarruf eder | Ne riske eder | Nerede yardımcı olur |
|---|---|---|---|
| Prompt caching | Cache'lenen input token'larında %90'a kadar | Dengesiz prefix'lerden sessiz cache miss'leri | Sabit system prompt'lar, tool tanımları, uzun paylaşılan context |
| Batch API | Input/output'ta sabit %50 | Gecikme garantisi yok, sadece asenkron | Toplu sınıflandırma, eval çalıştırmaları, gece işleri |
| Cascade/router | Bazı benchmark'larda %98'e kadar, bazen bir doğruluk kazancıyla | Zayıf modelden zor sorgularda güvenle yanlış cevaplar | Belirgin kolay/zor ayrımıyla yüksek sorgu hacmi |
| Semantic cache | Bir hit'te üretimi tamamen atlar | Sorguların tüm bir mahallesine sunulan bayat veya yanlış cevaplar | Düşük riskli, yavaş değişen, kişiselleştirilmemiş sorular |

## Northwind'de pratikte

Northwind Supply'ın asistanı Desk'in çok farklı iki iş yükü var: gecikme-hassas bir bayi sohbeti ve Slack arayüzü, ve gelen destek e-postalarını gece boyunca sınıflandırıp etiketleyen gecikme-toleranslı bir batch işi.

İkisini ayırmakla başla. Gece e-posta sınıflandırmasını Batch API'ye taşı: bir saniyenin altında bir cevaba ihtiyacı yok, ve %50 indirim tüm işe uygulanır. Canlı bayi sohbetini batch'in yanına koyma; bir sipariş durumu cevabı bekleyen bir bayi 24 saat bekleyemez.

Sohbet yolunda, çoğu istekte aynı olan system prompt ve tool tanımları için prompt caching'i aç. Prefix'i herhangi bir dinamik şey için (bir istek ID'si, bir timestamp, kullanıcı bazlı bir selamlama) denetle ve cache breakpoint'inden önce değil sonra taşı. Çağrı başına cache_read ve cache_creation token sayılarını ölç; aynı prefix'e ikinci çağrıdan sonra read token'lar sıfırda kalıyorsa, cache hit almıyor demektir ve akış yukarısında byte-identity'i bozan bir şey var.

En yüksek hacimli, en az riskli sorgu sınıfı için bir cascade tanıt: "siparişim nerede", "hesap bakiyem ne", dahili API'lere karşı düz sorgulamalar. Bunları varsayılan olarak daha ucuz bir modele yönlendir, ve sorgu kredileri, geri ödemeleri veya ucuz modelin ayarlandığı lookup pattern'inin dışında herhangi bir şeye dokunduğunda daha güçlü modele yükselt. Bunu production'da güvenmeden önce, küçük bir etiketli eval seti kur (kasıtlı olarak zor olanları içeren 20-30 sorgu) ve router gönderilmeden önce ve sonra sadece doları değil doğruluğu da ölç.

Değişen Northwind'in fiyat listeleri ve iade politikası belgelerinden türetilen her şeyde semantic caching'e dikkat et. Politika sorularının cevaplarını embedding benzerliğiyle cache'liyorsan, cache key'ini belge versiyonuna veya kaynak digest'ine sınırla, böylece bir politika güncellemesi bağımlı cache girdilerini geçersizleştirir, günlerce bayat bir indirim veya iade penceresi canlı bırakmak yerine. Kişiselleştirilmiş herhangi bir şey için TTL'yi devre dışı bırak veya ağır şekilde kısalt (belirli bir bayinin sipariş durumu, kulağa benzer gelen başka bir bayinin sorusu için asla bir semantic-cache hit'i olmamalı).

Liderliğin belirlediği maliyet hedefi ne olursa olsun, kesmeye başlamadan önce onu bir kalite metriği ile eşleştir: harcamanın yanında takip edilen, routed/cached yol üzerinde örneklenmiş bir faithfulness veya correctness kontrolü. Klarna'nın dersi otomasyonun yanlış olması değildi, eşleştirilmiş, takip edilen bir kalite metriği olmadan raporlanan bir otomasyon-oranı veya maliyet-kaçınma sayısının, gerçek bir müşteri-deneyimi gerilemesini maskeleyebilen bir vanity metric olmasıydı.

## İyi mühendislerin bildiği

- İlk çağrıdan sonra sıfır olan bir cache hit rate neredeyse her zaman caching özelliğinin kendisindeki bir yapılandırma hatası değil, prefix'te bir byte-identity bozulması anlamına gelir; önce timestamp'leri, istek ID'lerini ve deterministik olmayan JSON sıralamasını kontrol et.
- Caching, TTL penceresine karşı trafik yoğunluğu yazma primini temizleyince ödeme yapar; 5 dakikalık bir TTL, Anthropic'in fiyatlandırmasında başa baş için beş dakika içinde kabaca bir ikinci hit'e ihtiyaç duyar.
- Bir router veya cascade'in maliyet dashboard'undan ayrı kendi evaline ihtiyacı var, çünkü yanlış yönlendirilmiş zor bir sorgu, gider sayılarının gösteremeyeceği sessiz bir doğruluk kaybıdır.
- Semantic cache doğruluğu, hit rate'e güvenerek değil, gerçek cevapları doğruluk için örnekleyerek kontrol edilmeli; zehirlenmiş bir cache her operasyonel metrikte mükemmel sağlıklı görünür.
- Doğru cevabın kimin sorduğuna veya altta yatan kaynağın şu anda ne dediğine bağlı olduğu her yerde semantic cache key'lerini belge versiyonuna, kaynak digest'ine veya tenant'a sınırla.
- Batch işleme sadece gecikme-toleranslı iş yükleri içindir; maliyet tasarrufu için kullanıcıya dönük bir yolu batch'e taşımak ürünü bozar.
- Takip edilen bir kalite karşı-metriği (CSAT, şikayet oranı, yükseltme oranı) olmayan bir otomasyon-oranı veya maliyet-kaçınma sayısı başarının kanıtı değildir, tersini gizleyebilen bir sayıdır.
- Satıcı-belgeli indirimlerden gerçek tasarruflar senin gerçek trafik şekline büyük ölçüde bağlıdır; bir fiyatlandırma sayfasındaki manşet yüzde bir tavan, bir garanti değil.

## Karar ver

Northwind'in Desk'in sohbet arayüzü ve gece e-posta sınıflandırma pipeline'ı boyunca aylık LLM faturası 75.000$, ve finans ölçülebilir bir kalite gerilemesi olmadan bunu %40 düşürmek istiyor. Şunlara sahipsin: kabaca 2.000 bayiye karışık kolay/zor sorgularla hizmet veren bir sohbet yolu, ve gelen tüm destek e-postalarını kategori ve aciliyete göre gece etiketleyen bir batch sınıflandırma işi. Masadaki seçenekler:

1. Tüm sohbet yolunu doğrudan daha ucuz bir modele geçir, ortaya çıkacak doğruluk düşüşünü kabul et ve bir ay şikayetten sonra yeniden değerlendir.
2. Sohbet yoluna prompt caching ekle, e-posta sınıflandırmasını Batch API'ye taşı ve model seçimini değiştirme.
3. Caching ve batch'e ek olarak sohbet yolu için bir cascade/router inşa et (rutin lookup'lar için ucuz model, kredileri veya anlaşmazlıkları içeren herhangi bir şey için daha güçlü modele yükselt).
4. Cache hit rate'ini ve maliyet tasarruflarını maksimize etmek için agresif bir benzerlik eşiği ile her iki iş yükünde semantic caching ekle.

Birini (veya bir kombinasyonu) seç ve bunu %40 hedefe, kalite-gerilemesi kısıtlamasına, ve çalışıp çalışmadığını bilmek için ilk iki haftada neyi ölçeceğine karşı gerekçelendir.

## Tek cümlelik özet

> Eşleştirilmiş bir kalite metriği olmadan bir LLM faturasını kesmek maliyeti kaldırmaz, sadece hatayı bütçenden müşterilerine taşır.

## Kontrol sorusu

Desk'in cascade'i şu anda sohbet sorgularının %70'ini ucuz bir modele ve %30'unu güçlü bir modele yönlendiriyor, ve planlandığı gibi aylık fatura düştü. Üç hafta sonra, yanlış sipariş toplamları hakkında bayi şikayetleri arttı, ama dashboard'ların (gecikme, hata oranı, maliyet) hepsi yeşil görünüyor. Router'ın sebep olup olmadığını bulmak için ne inşa edersin, ve önce ne kontrol edersin?

## Kaynaklar

- [Prompt caching | Claude docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · Anthropic · live docs · cache mechanics, TTL tiers, write/read multipliers
- [Prompt caching | OpenAI API](https://platform.openai.com/docs/guides/prompt-caching) · OpenAI · live docs · cache discount mechanics
- [OpenAI Batch API docs](https://developers.openai.com/api/docs/guides/batch) · OpenAI · live docs · 50% discount, 24h window, rate-limit pool
- [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) · Chen, Zaharia, Zou (Stanford) · 2023 · founding cascade paper, up to 98% cost reduction
- [RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) · Ong et al. (UC Berkeley/Anyscale), ICLR 2025 · learned router, >2x cost reduction
- [Risk-Constrained Freshness-Aware Semantic Caching for Open-Web Retrieval-Augmented LLMs](https://arxiv.org/html/2607.04281v1) · arXiv · 2025/2026 · semantic cache staleness risk quantified
- [Klarna plans to hire humans again, as new landmark survey reveals most AI projects fail to deliver](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/) · Fortune · May 2025 · CEO quote on cost vs. quality
- [Klarna CEO says AI helped company shrink workforce by 40%](https://www.cnbc.com/2025/05/14/klarna-ceo-says-ai-helped-company-shrink-workforce-by-40percent.html) · CNBC · May 2025 · headcount numbers
