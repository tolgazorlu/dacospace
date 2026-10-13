# Case · Stanford'ın hukuki AI araştırma araçları çalışması (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** "hallucination-free" diye pazarlanan ticari araçlarda %17-34 hallucination oranı

## Sistem

LexisNexis'in Lexis+ AI ve Thomson Reuters'ın Westlaw AI-Assisted Research / Ask Practical Law AI ürünleri, ikisi de RAG tabanlı ve ikisi de düz bir chatbot'a kıyasla halüsinasyonu azalttığı veya ortadan kaldırdığı iddiasıyla pazarlanan ticari hukuki araştırma ürünleri. Stanford RegLab/HAI ve Yale'deki araştırmacılar bu iddiayı test etmek için 200'den fazla hukuki sorgu içeren, önceden kayıtlı bir benchmark oluşturdu.

## Ne gözlendi

Pazarlama iddialarına rağmen, RAG tabanlı üç aracın hepsi sorguların anlamlı bir kısmında yanlış veya dayanaksız cevaplar üretti.

## Dur ve düşün

1. Hukuki bir RAG aracı cevabı için gerçek, erişilebilir bir davayı kaynak gösteriyor. Bu, cevabın doğru olduğuna yeterli kanıt mı? Başka ne kontrol etmen gerekir?
2. "Hallucination-free" özgün, çürütülebilir bir iddia. Bir satıcının, dışarıdan birinin bunu gerçekten doğrulayabilmesi için ne yayınlaması gerekir?
3. RAG araçları halen zamanın %17-34'ünde halüsinasyon görüyorsa, bu RAG'ın "halüsinasyonu çözer" ile "hiçbir şey yapmaz" arasındaki spektrumda nerede durduğu konusunda ne ima ediyor?

## Gerçekte ne oldu

Çalışma, üç aracın da "zamanın %17 ile %33'ü arasında halüsinasyon gördüğünü" buldu; Westlaw'ın AI-Assisted Research'ü yaklaşık %34 ile, Lexis+ AI ise sorguların yaklaşık %65'ini tam doğru cevaplayarak en doğru araç oldu. Karşılaştırma için, aynı araştırma grubunun önceki çalışması genel amaçlı chatbot'ların (GPT-4, retrieval olmadan) hukuki sorgularda zamanın %58-82'sinde halüsinasyon gördüğünü bulmuştu. ([arXiv paper](https://arxiv.org/html/2405.20362v1); [Stanford HAI summary](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries))

Makale, düpedüz uydurmanın ötesinde daha ince bir hata modunu belgeliyor: "improper grounding", yani aracın gerçek, erişilebilir bir belgeyi kaynak göstermesi ama o belgenin kaynak gösterildiği özgün iddiayı gerçekte desteklememesi. "Gerçek bir kaynağa link verdi mi" şeklinde naif bir kontrol bunu tamamen gözden kaçırır, çünkü citation çözümleniyor. Hukuki retrieval doğası gereği zor: yüzeysel olarak birbirine benzeyen birçok dava arasında en iyi tek otoriteyi bulmak, ve bozulmuş veya yargı bölgesine özgü hukuku doğru ele almak; ikisi de retriever'ın gerçek ama bu iddia için yanlış bir belgeyi yüzeye çıkarabileceği tam da o noktalar.

## Kök nedenler

**Teknik:** retrieval grounding halüsinasyonu azaltır ama yapısal olarak ortadan kaldırmaz; bir retriever, kendisine atfedilen iddiayı desteklemeyen gerçek bir belge döndürebilir ve aşağı akışta hiçbir şey iddia düzeyinde retrieved kaynağa karşı entailment kontrolü yapmaz.

**Organizasyonel:** satıcılar bu araçları, iddiayı destekleyen şeffaf, üçüncü taraf denetlenebilir bir benchmark olmadan ve iddianın tutulabileceği kesin bir "halüsinasyon" tanımı olmadan "hallucination-free" diye pazarladı.

## Neyle önlenebilirdi

- **Claim-level entailment checking**, sadece citation'ın gerçek bir belgeye çözümlendiğini değil, yapılan özgün iddianın retrieved pasajdan gerçekten çıktığını doğrulamak. Bu, basit bir "citation var mı" kontrolünden daha maliyetli ama improper grounding'i yakalayan tek şey.
- "Hallucination-free" pazarlama iddiaları yapılmadan önce **şeffaf, üçüncü taraf denetlenebilir benchmark**, iddianın test edilebileceği kesin, çürütülebilir bir halüsinasyon tanımıyla birlikte.
- RAG'ı riski önemli ölçüde azaltan ama ortadan kaldırmayan bir şey olarak ele alarak, **bir dosyaya veya ücret ödeyen bir müşterinin güven kararına ulaşmadan önce her hukuki citation'ın insan tarafından gözden geçirilmesi**.

## Senin sistemin için ders

- RAG halüsinasyonu azaltır ama ortadan kaldırmaz; doğru görünen bir citation, doğru bir iddianın kanıtı değildir.
- Kaynak gösterilen pasajın, sadece citation'ın gerçek, erişilebilir bir belgeye çözümlendiğini değil, yapılan özgün iddiayı gerçekten desteklediğini doğrula; bir sistem naif bir citation kontrolünü geçip hâlâ yanlış olabilir.
- Herhangi bir satıcının "hallucination-free" veya benzer kesin bir iddiasını, terimin kesin bir tanımıyla şeffaf, üçüncü taraf denetlenebilir bir benchmark tarafından desteklenmediği sürece doğrulanamayan pazarlama dili olarak ele al.
- Alanın regüle edilmiş veya yüksek riskliyse, retrieval sistemi ne kadar iyi olursa olsun, AI tarafından üretilen her citation için güvenilmeden önce bir insan gözden geçirme adımı bütçele.

## Kaynaklar

- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh, Surani, Dahl, Suzgun, Manning, Ho (Stanford RegLab/HAI, Yale) · 2024 preprint, JELS 2025
- [AI on Trial: Legal Models Hallucinate in 1 out of 6 (or More) Benchmarking Queries](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries) · Stanford HAI · 2024