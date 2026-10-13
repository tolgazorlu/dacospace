# Lesson 05 · Duran loop'lar

**Reading time:** 14 min · **Module:** Agents · **Concepts:** step and cost budgets, stop conditions, runaway loops, durable execution
**Cases:** replit-production-db-deleted

## Problem

Haziran 2026'da Hacker News'te dolaşan bir hikaye (bir operatörün kendi anlatımı; birincil bir yazı bulamadık, bu yüzden detayları rapor edilmiş, doğrulanmış değil olarak ele al): gözetimsiz bırakılan, DN42 hobi ağına kaydolup tarama yapması gereken otonom bir agent bir hatayla karşılaştı ve durmak yerine, AWS faturası 6.531,30 dolara ulaşana kadar yinelenen CloudFormation stack'leri oluşturmaya devam etti. Her sayı doğru olsun olmasın, şekli tekrar göreceğin bir şekil.

Anlatılan mekanizmaya yakından bak, çünkü "agent çıldırdı"dan daha spesifik: çözülmemiş hata üzerindeki her retry, monitoring'e *çalışıyormuş* gibi göründü, *sıkışmış* değil, çünkü agent, bariz, aynı, tekrar eden bir hata yerine yeni, farklı şekilli ama eşit derecede bozuk kaynaklar üretmeye devam ediyordu. Naif bir "aynı retry'leri tespit et ve dur" kontrolü asla tetiklenmezdi, çünkü tek tek eylemlerin hiçbirinde özdeş bir şey yoktu. Belirli başarısız eylemin "yeni" görünüp görünmemesinden bağımsız bir step limiti, cost ceiling'i veya action rate üzerinde circuit breaker yoktu.

Lesson 03'teki Replit olayı aynı temel şekli farklı bir açıdan taşıyor: tek bir agent çağrısının ne yapabileceği üzerinde, agent'ın kendi yargısı dışında hiçbir şeyin uyguladığı bir hard limit yoktu.

Desk, bazı görevler için agent olarak çalışacak (Lesson 02). O loop'ların her biri, modelin zekasıyla hiçbir ilgisi olmayan bir soruya cevap gerektiriyor: bu loop ne zaman duracağını nasıl biliyor ve bunu, modelin kendi devam etme isteğinden bağımsız olarak kim veya ne uyguluyor?

## Neden zor

Bir backend mühendisinin bir loop'u sınırlama içgüdüsü, bilinen bir iteration sayısına sahip bir `for` loop'u veya kodun kontrol ettiği state'e karşı kontrol edilen bir `while` koşuludur. Bir agent loop'unun "sonraki adımı" model tarafından seçilir, bu da doğal sonlanma koşulunun, "görev bitti", modelin kendisinin yaptığı bir yargı olduğu anlamına gelir, ve baskı altındaki bir model (sıkışmış, kafası karışmış, veya sadece sürekli varyasyonlar deneyen) ne zaman durması gerektiğinin güvenilir bir yargıcı değildir.

Bu, retry'ler konusundaki alışılmış sezgiyi iki şekilde kırar:

- **"Her seferinde farklı bir şey deniyor" ilerleme gibi hissettirir, ve genellikle değildir.** İnsan mühendisler, çeşitli retry denemelerini adaptif problem çözme olarak görmeye eğitilmiştir. Çözülmemiş bir root cause ile karşı karşıya olan sınırsız bir agent loop'unda, yüzeysel olarak farklı eylemler, gerçek bir ilerleme olmadan, aynı hata etrafında gürültü olabilir, ve "özdeş tekrar eden eylemleri tespit et" üzerine kurulu monitoring bunu tamamen gözden kaçırır, DN42'nin gösterdiği gibi.
- **Billing uyarıları para zaten harcandıktan sonra çalar.** Bir cost dashboard'u veya billing uyarısı, bir sorunun olduğunu fark etmek için faydalı, ama önlemek için işe yaramaz, olay sonrası bir detektördür. "Bir uyarı kuralım" içgüdüsü bir koruma önlemi gibi hissettirir ama bir kontrol değildir; kontrolün, bir dashboard'da sonradan gözlemlenmek yerine, her ücretli eylemden önce kontrol edilerek execution path'in içinde olması gerekir.
- **Bir process crash, doğru bir durma ile aynı şey değildir.** Bir backend mühendisinin içgüdüsü, öldürülen bir process'in basitçe, temizce durduğu, hikaye biter şeklindedir. Görev ortasında öldürülen bir agent loop, yan etkilerini (yarım tool call'lar, yarı tamamlanmış state) belirsiz bir durumda bırakır, sistem açıkça doğru bir şekilde devam etmek veya geri almak için tasarlanmadıysa, ki düz process sonlandırması bunu sana bedava vermez.

## Fikir: bir loop'un bir şeyi yapmadan önce ne yapabileceğini sınırlamak

### Kod içinde uygulanan step ve cost budget'ları

Görev başına hard bir step sayısı ve görev başına hard bir spend ceiling, en ucuz, en etkili iki sınırdır, ve ikisinin de execution path içinde, bir sonraki LLM call'u veya tool call'u çalışmadan önce kontrol edilmesi gerekir, sonradan gözlemlenmek değil. "Her ücretli call'dan önce kontrol edilmiş" DN42 olayının root-cause analizinin doğrudan işaret ettiği spesifik disiplindir: action rate veya token velocity üzerinde bir circuit breaker, belirli başarısız eylemin "yeni" görünüp görünmemesinden bağımsız olarak tetiklenmelidir, çünkü eylemin yeniliği ilerleme kanıtı değildir.

| Kontrol | Ne yakalar | Tek başına neyi gözden kaçırır |
|---|---|---|
| Max step sayısı | Mantıklı bir görevden daha uzun çalışan herhangi bir loop | Küçük bir step sayısı içinde adım başına büyük miktarda harcayan bir loop |
| Max spend ceiling (call öncesi kontrol edilen) | Step sayısı veya eylem çeşitliliğinden bağımsız runaway maliyet | Adım başına ucuz ama gerçek dünyada hızlı zarar (silmeler) üreten bir loop |
| Billing uyarısı | Gerçek zamanlı hiçbir şey; sadece olay sonrası görünürlük | Her şeyi; bir detektör, bir kontrol değil |
| Tekrar eden hatalarda semantic-equivalence kontrolü | "Farklı görünen ama eşdeğer" tekrar eden hatalar (DN42'nin gerçek hata şekli) | Henüz görülmüş hiçbir şeyin tekrarı olmayan gerçekten yeni hatalar |
| Herhangi bir sınıra çarpınca human escalation | Modelin tek başına vermemesi gereken yargıyı bir kişinin vermesini sağlar | Gecikme; yanıt vermek için birinin uygun olması gerekir |

DN42 case'i, özellikle, özdeş retry tespitinden ayrı bir kontrol olarak semantic-equivalence kontrolü için argüman üretiyor: hataları kategoriye göre grupla (hatanın tam metni değil, türü) ve breaker'ı bir kategori içindeki tekrar eden hatalarda tetikle, tam string eşleşmesinde değil.

### Loop bağlamı için yeniden ele alınan idempotent tool'lar

Lesson 03, idempotency'i tool seviyesinde tanıttı. Durable-execution katmanı tarafından kesintiye uğratılabilen, retry edilebilen veya crash sonrası basitçe yeniden çalıştırılabilen bir loop'ta, idempotency, "tekrar çalıştır"ı "tekrar çalıştır ve yan etkiyi ikiye katla" yerine güvenli yapan şeydir. Bu, durable execution eklediğinde daha az değil daha çok önem kazanır, çünkü durable execution'ın tüm mekanizması activity'leri retry etmek ve replay etmektir.

### Durable execution: deterministic workflow, non-deterministic activity

Temporal gibi sistemler, agent orkestrasyonunu arasında sıkı bir sözleşme olan iki parçaya böler: orkestrasyon kodu ("LLM'yi çağır, bir tool call'u kontrol et, çalıştır, tekrarla" diyen loop) deterministic olmalıdır, kod içinde `random()` yok, `datetime.now()` yok, direkt I/O yok, gerçek yan etkiler (LLM call'ları, tool execution'ları) ise sonuçları append-only bir event history'ye kaydedilen "activity"ler içinde çalışır. Bir crash'te, workflow kayıtlı sonuçları yeniden çalıştırmak yerine replay eder, senin yazdığın özel checkpoint kodu olmadan kaldığı yerden tam olarak devam eder.

Bu, process crash'lerine karşı gerçek bir dayanıklılık satın alır, gerçek bir maliyetle: determinism sözleşmesi workflow kodunu nasıl yazdığını sınırlar, ve operasyonel overhead (Temporal'ın altyapısını çalıştırmak, programlama modelini öğrenmek) kısa, ucuz, düşük riskli agent run'ları için buna değmez. Bunu, run ortasında bir crash'in tüm ilerlemeyi kaybetmesinin veya restart'ta bir yan etkiyi sessizce ikiye katlamasının gerçekten maliyetli olduğu loop'lara ayır.

### Checkpointing ve human-in-the-loop kesintileri

LangGraph'ın daha hafif alternatifi, graph state'i her "super-step"te bir thread ID ile keylenen bir checkpointer üzerinden kalıcı hale getirir. Bir node içinde `interrupt()` çağırmak, dakikalardan aylara kadar süresiz olarak execution'u duraklatır, bir `Command(resume=...)` geri gönderilene kadar, bu noktada insanın girdisi enjekte edilerek sadece kesintiye uğrayan node, tüm graph değil, başından yeniden çalışır. Bu, Temporal'ın tam determinism sözleşmesinden anlamlı şekilde daha hafif bir taahhüttür, ama kalıcılık garantisi sadece seçtiğin checkpointer backend'i kadar güçlüdür; in-memory bir checkpointer, framework'ün varsayılanları ne önerirse önersin production-durable değildir.

## Northwind'de pratikte

Desk'in herhangi bir agent-şekilli parçası (Lesson 02'nin "çözülmemiş, çok adımlı support investigation" case'i) gerçek bir bayiye dokunmadan önce bu sınırlara ihtiyaç duyar:

1. **Konuşma başına çözüme kadar hard bir max-step sayısı**, tahmin edilmemiş, gerçek gözlenmiş görev uzunluklarından ayarlanmış; tipik bir late-shipment araştırmasının çözümü 4-6 tool call sürüyorsa, cap'i "sınırsız, modelin ne zaman bittiğini bildiğine güven" yerine 15 gibi bir şeye ayarla.
2. **Her LLM call'undan ve para harcayan her tool call'undan önce kontrol edilen görev başına bir dolar ceiling'i**, sonradan bir billing dashboard'una sadece loglamak değil; bu doğrudan DN42 dersi, kontrolün path içinde olması gerekir, uyarıda değil.
3. **Sadece özdeş-eylem detektörü değil, bir failure-category circuit breaker'ı**: `lookup_order`, "veri bulunamadı" olarak sınıflandırılan *herhangi bir* nedenle üst üste üç kez başarısız olursa, hepsi aynı temel veri eksikliğine çarpan üç farklı ifadeli sorgu denemesine izin vermek yerine bir insana escalate et.
4. **Yazma yapabilen her tool üzerinde idempotency key'leri** (kredi çıkarma, ticket oluşturma), böylece bir crash-and-resume döngüsünün altında yatan hangi durable-execution veya retry katmanı olursa olsun gerçek bir etkiyi iki kez uygulayamaz, Lesson 03'le tutarlı.
5. **Makul bir kişinin geri dönülemez diyeceği herhangi bir eylem üzerinde** (büyük krediler, hesap değişiklikleri), eylem çalışmadan önce kontrol edilen, sadece sonradan denetlenebilir değil, bir interrupt-tarzı mekanizma üzerinden **insan onay kapısı**, bir agent'ın "X'i yaptım" kendi raporunun X'in gerçekten güvenli bir şekilde gerçekleştiğine güvenmek için yeterli bir temel olmadığı Replit dersini doğrudan yansıtarak.

## İyi mühendislerin bildiği

- "Agent farklı bir şey denemeye devam etti" ilerleme yaptığının kanıtı değildir; hataları kategoriye göre grupla ve breaker'ı bir kategori içindeki tekrar eden hatalarda tetikle, DN42'nin olayının gösterdiği gibi, yanlışlıkla atlatmak için çok kolay olan tam eşleşme retry tespitinde değil.
- Cost koruma önlemleri execution path içinde uygulanmalı, her ücretli call'dan önce kontrol edilmeli; bir billing uyarısı zaten yapılmış zararın bir detektörüdür, onu önleyen bir kontrol değil.
- Loop ortasında bir process crash'i temiz bir durma değildir; durable execution veya eşdeğer bir checkpoint mekanizması olmadan, öldürülmüş ve yeniden başlatılmış bir agent'ın işi sessizce ikiye katlamak veya kaybetmek yerine doğru şekilde devam ettiğini varsayamazsın.
- Idempotency ve step/cost sınırları birbirini tamamlar, birbirinin yerine geçmez: sınırlar kötü bir loop'un ne kadar uzun çalışabileceğini sınırlar, idempotency her bir tekrarlanmış call'un ne kadar zarar verebileceğini sınırlar.
- Durable execution'ın determinism sözleşmesi (orkestrasyon kodunda `random()` yok, direkt I/O yok) loop'u nasıl yazdığına gerçek bir sınırdır, ve operasyonel maliyet sadece kaybedilen veya ikiye katlanan bir run'ın gerçekten maliyetli olduğu loop'lar için buna değer.
- Bir human-in-the-loop kesintisi sadece checkpointer backend'i kadar kalıcıdır; bir onay-bekleme adımının bir restart'tan sağ çıkmasına güvenmeden önce checkpointer'ının production-durable olduğunu, framework'ün kullanışlı varsayılanı değil, doğrula.
- "Bu loop nasıl durur"u, bir olay boşluğu görünür hale getirdikten sonra bağlanan bir koruma önlemi değil, ilk orkestrasyon kodu satırından önce cevaplanmış bir tasarım sorusu olarak ele al.

## Karar ver

Desk'in yeni "bir shipment sorununu araştır ve çöz" agent loop'u test'te iyi çalışıyor ama açık bir step cap'i yok, cost ceiling'i yok ve loop'u sonlandırmak için sorunun çözülüp çözülmediğine dair modelin kendi yargısına güveniyor. Bunu 2.000 bayinin hepsi için canlıya çıkmadan önce gözden geçiriyorsun. Seçenekler:

1. Olduğu gibi gönder, çünkü test henüz bir runaway loop göstermedi, ve bir şey olursa yakalamak için monitoring ekle.
2. Hard bir max-step sayısı (15 gibi) ve her ücretli call'dan önce kontrol edilen görev başına bir dolar ceiling'i ekle, ikisinden biri aşıldığında bir insana escalate et.
3. 2. seçeneği yap, ayrıca tool-call hatalarını kategoriye göre sınıflandır ve step cap'e bile ulaşılmadan önce aynı kategoride 3 hatada erken bir circuit breaker tetikle.
4. 3. seçeneği yap, ayrıca loop'u bir durable-execution katmanına sar böylece run ortasında bir crash yeniden başlamak yerine son tamamlanmış adımdan devam eder.

Seçimini, her ek katmanı inşa etmenin lansman takvimin içindeki maliyetine karşı ve DN42 olayının "monitoring onu yakalayacak" (seçenek 1) ifadesinin gerçekte neyi kapsamadığını özellikle gösterdiğine karşı gerekçelendir.

## Tek cümlelik özet

> Bir agent loop'u bir step cap'i, bir call-öncesi cost ceiling'i ve kod içinde uygulanan bir kategori-seviyesi hata circuit breaker'ına ihtiyaç duyar, çünkü "farklı bir şey deniyor" ilerleme gibi görünür ve billing uyarıları sana sadece para harcandıktan sonra söyler.

## Kontrol sorusu

Desk'in shipment-investigation agent'ı, production'da gerçek bir bayi ticket'ında, sorunu çözmeden yeni 15'lik max-step cap'ine ilk kez çarptı. Sistemde bir sonra ne olmalı (modelin reasoning'inde değil), ve cap'in çok düşük olup olmadığını yoksa görevin gerçekten insan yargısına ihtiyaç duyup duymadığını diagnose etmek için neyin loglanmasını isterdin?

## Kaynaklar

- [Of course you can build dynamic AI agents with Temporal](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal) · Temporal · 2025/2026 · deterministic-workflow/non-deterministic-activity ayrımı ve crash-resume mekaniği.
- [Interrupts (LangGraph docs)](https://docs.langchain.com/oss/python/langgraph/interrupts) · LangChain · 2025 · checkpoint'lenmiş human-in-the-loop pause/resume mekanizması.
- [Making it easier to build human-in-the-loop agents with interrupt](https://blog.langchain.com/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt) · LangChain · 2024 · kalıcılığı eklenti değil birinci sınıf bir unsur olarak ele almanın gerekçesi.
- [Vibe coding service Replit deleted production database](https://www.theregister.com/software/2025/07/21/vibe-coding-service-replit-deleted-production-database/719783) · The Register (Simon Sharwood) · Jul 21, 2025 · sınırsız yıkıcı eylem ve yanlış rollback iddiası hatası.