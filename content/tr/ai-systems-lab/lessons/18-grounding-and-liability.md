# Lesson 18 · Grounding, atıflar ve sorumluluk

**Reading time:** 20 min · **Module:** Knowledge · **Concepts:** faithfulness, citation checking, who is liable for the answer
**Cases:** mata-v-avianca, air-canada-bereavement-fare, cursor-support-bot-policy, stanford-legal-rag-hallucinations

## Problem

Kasım 2022'de Jake Moffatt, ailesinde bir ölümden sonra Air Canada'nın web sitesi chatbot'una
taziye ücretleri hakkında soru sordu. Chatbot ona şimdi rezervasyon yapıp taziye indirimini
geriye dönük olarak, 90 gün içinde, talep edebileceğini söyledi. Havayolunun aynı web sitesindeki
bağlantılı bir sayfada belirtilen gerçek politikası tam tersini söylüyordu: taziye ücretleri
yolculuktan önce talep edilmelidir. Air Canada iadeyi reddetti ve British Columbia'nın Civil
Resolution Tribunal'ı önünde, chatbot'un şirketin sorumlu tutulamayacağı ayrı bir yasal varlık
olduğunu etkin bir şekilde savundu. Tribunal bunu "dikkat çekici bir sunum" olarak nitelendirdi,
reddetti ve Air Canada'yı ihmalkar yanlış beyandan sorumlu buldu; Moffatt'a C$812,02 tazminat
artı faiz ve ücretler verdi. ([CanLII decision](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html),
[law firm summary](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot))

Dolar tutarı önemsizdir. Emsal değildir: bir şirket, müşteriye yönelik AI'ının söylediği şeyden,
statik web içeriğiyle aynı özen standardına göre yasal olarak sorumludur. "Onu chatbot söyledi,
biz değil" bir savunma olarak başarısız oldu ve başka herhangi bir yerde başarılı olmasını
bekleyecek bir neden yok.

## Neden zor

Bir backend mühendisinin içgüdüsü, doğruluk ve sorumluluğu model kalitesinin alt akışı olarak
düşünmektir: daha iyi bir model kullan, daha iyi bir prompt yaz ve risk düşer. Bu lesson'ın
kapsamındaki dört vaka, sorumluluğun daha dar ve daha yapısal bir şeyi takip ettiğini gösteriyor:
sistemin bir kullanıcıya belirttiği belirli bir iddianın, şirketin gerçekten kontrol ettiği
yetkili bir kaynağa dayanıp dayanmadığı ve kullanıcı buna göre hareket etmeden önce bu
dayanmayı kimsenin kontrol edip etmediği. Daha iyi bir model, kontrolü hiç zorlamamış bir
mimariyi düzeltmez.

İkinci tuzak, ikisi de "grounding hataları" olarak adlandırılan ama farklı düzeltmelere ihtiyaç
duyan iki farklı şeyi birbirine karıştırmaktır. Biri bir **atıf varlığı** sorunudur: hiç var
olmayan uydurma bir kaynak, Mata v. Avianca'daki gibi; burada avukat Steven Schwartz, federal bir
mahkeme sunumu için dava hukuku araştırmak amacıyla hiçbir retrieval grounding'i olmadan ChatGPT'yi
kullandı. Dilekçe, icat edilmiş dava numaraları, hakimler ve alıntılanan kararlarla altı uydurma
mahkeme kararına atıf yaptı; Schwartz hatta ChatGPT'ye davaları doğrulamasını istedi ve o, bunların
gerçek olduğunu yanlış şekilde onayladı. Yargıç Castel, Schwartz'ı, yardımcı avukatını ve
firmalarını müştereken $5.000 para cezasına çarptırdı.
([Wikipedia summary of the opinion](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.)) Bu, katı
anlamda bir RAG hatası değildi: bu, retrieval grounding ve atıf doğrulamasının özellikle önlemesi
gereken şeydir, ve bu da tam olarak bu davanın, sonradan gelen her "RAG halüsinasyonu ortadan
kaldırır" pazarlama iddiası için referans noktası haline gelmesinin nedenidir. Onu ortadan
kaldırmadı; en baştan hiç mevcut değildi.

Diğeri bir **atıf desteği** sorunudur, uygunsuz grounding olarak da adlandırılır: sistem, gerçek,
alınabilir bir dokümana atıf yapar ve o doküman, kendisine atfedilen belirli iddiayı gerçekte
desteklemez. Stanford'un ticari hukuki RAG araçları üzerindeki kontrollü çalışması, Mata-tarzı
uydurmadan kaçınmak için özellikle inşa edilmiş sistemlerin içinde bu tam örüntüyü buldu; araçlar
büyük ölçüde gerçek dokümanlara atıf yaparken bile zamanın 17-34%'inde halüsinasyon gördü.
([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1)) Bir sistem, "bu atıf gerçek bir şeye
çözümleniyor mu" kontrolünü geçebilir ve hâlâ kullanıcıyı yarı yolda bırakabilir, çünkü kimse
atıf yapılan pasajın cevabın iddia ettiği şeyi söyleyip söylemediğini kontrol etmedi.

Üçüncü bir tuzak, ikisinden de farklı: dayanakları olan, doğru görünen bir cevap, ama hiçbir
şeye hiç dayanmayan, çünkü sistem en baştan cevabını belirli bir kaynağa dayandırmaya hiç
zorlanmadı. Air Canada'nın chatbot'u uydurma bir dokümana atıf yapmıyordu ve gerçek bir dokümanı
yanlış okumuyordu; hiç retrieval-ve-doğrulama adımı olmadan, şirketin aynı sitedeki kendi
yayınlanmış politikasıyla doğrudan çelişen, makul görünen bir süreç açıklaması üretti. Nisan
2025'teki Cursor destek bot olayı aynı şekle sahip: Cursor kod editörünün kullanıcıları cihaz
değiştirirken oturumlarının kapatıldığını fark etti ve "Sam" adlı bir AI destek ajanı bir
kullanıcıya bunun yeni bir "abonelik başına bir cihaz" politikası altında beklenen bir davranış
olduğunu söyledi. Böyle bir politika mevcut değildi; gerçek neden ilgisiz bir oturum-güvenliği
hatasıydı. Uydurma açıklama Reddit ve Hacker News'te yayıldı ve Cursor'un kurucu ortağı kamuya
açık olarak düzeltmeden önce gerçek abonelik iptallerini tetikledi.
([Ars Technica](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/))
Kullanıcılar "Sam"ın bir insan olduğuna inanıyordu; bot'un AI olduğu belirtilmemişti ve hiçbir
şey, kaydı olmayan bir politika hakkında soru sorulduğunda "bilmiyorum" demesini kısıtlamıyordu.

## Fikir: üç farklı hata sınıfı, üç farklı savunma

| Failure class | Example | What catches it |
|---|---|---|
| Citation existence (fabrication) | Mata v. Avianca: six invented cases | Any real retrieval step against a queryable index of real documents (even a basic lookup would have caught this; there was none) |
| Citation support (improper grounding) | Legal RAG tools citing real cases that don't support the claim | Claim-level entailment check: does the specific cited passage actually say what the answer attributes to it, not just "does the citation resolve to something real" |
| Ungrounded generation (no forced citation at all) | Air Canada bereavement policy; Cursor's "Sam" | A hard constraint: the system is not allowed to state a policy-bearing fact without quoting or directly deriving it from a specific retrieved source, and must say "I don't know, let me check" when it cannot |

### Üretim-tarafı metrik olarak Faithfulness

RAGAS'ın Faithfulness metriği (Lesson 15), üçüncü satırı işlevselleştirir: bir cevabı tek tek
iddialara ayrıştırır ve her birini retrieval edilmiş bağlama karşı kontrol eder; bu, hem Air
Canada'nın hem de Cursor'un sergilediği tam olarak "kendinden emin ama dayanaksız" örüntüsünü
yakalar. Tek başına, iddianın gerçekten *retrieval edilen* parça tarafından kabul edildiği ama o
parçanın kaynak dokümanının bağlamda gerçekte kastettiği şey tarafından değil olduğu atıf-desteği
hatalarını yakalamayacaktır; bu, Stanford'un araştırmacılarının ticari araçlardaki uygunsuz
grounding'i bulmak için elle inşa etmek zorunda kaldığı türden, ayrı bir kaynak-düzeyi entailment
kontrolüne ihtiyaç duyar.

### Kim sorumlu ve "AI söyledi" bir savunma olarak neden başarısız olmayı sürdürüyor

Moffatt v. Air Canada üzerindeki iki bağımsız hukuki analiz aynı muhakemede birleşiyor: bir
şirketin chatbot ifadeleri, statik web sayfalarıyla aynı özen görevine sahip olarak şirketin kendi
beyanları gibi ele alınır, çünkü müşterinin bakış açısından iki yüzey arasında anlamlı bir fark
yoktur.
([Forbes reporting](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/),
[AI & Society, Springer, peer-reviewed analysis](https://link.springer.com/article/10.1007/s00146-024-02096-7))
Tribunal özellikle, Air Canada'nın statik sayfanın chatbot'tan neden daha güvenilir sayılması
gerektiğini veya bir müşterinin şirketin kendi web sitesinin bir bölümünü diğeriyle çapraz
kontrol etmesinin neden beklenmesi gerektiğini hiç açıklamadığını not etti. Pratik çıkarım:
bir şirket, farklı, daha hızlı hareket eden bir ekip tarafından inşa edilip gönderilmiş olsa da,
bir AI asistanını dokümantasyonundan daha düşük riskli bir iletişim kanalı olarak ele alamaz,
ne yasal olarak ne de operasyonel olarak.

### Düzenlenmiş-alan doğrulama kapıları

Stanford'un hukuki RAG tedarikçileri hakkındaki kendi argümanı genelleşiyor: şeffaf, üçüncü
tarafça denetlenebilir benchmark yapmak, herhangi bir "halüsinasyonsuz" pazarlama iddiasından
önce gelmelidir, çünkü halüsinasyonun kesin, çürütülebilir bir tanımı olmadan iddia, tedarikçinin
dışında kimse tarafından kontrol edilemez. ([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1))
Bunu mühendislik kontrolüne çevirirsek: düzenlenmiş veya sonuçları olan bir yüzeye giden herhangi
bir çıktı (bir mahkeme sunumu, bir iade kararı, kamuya açık bir politika beyanı), modelin kötü
olduğu için değil, şimdiye kadar incelenen hiçbir alanda, retrieval grounding'inin tek başına
halüsinasyonu sıfıra sürdüğünün gösterilmemiş olduğu için, yayınlanmadan önce açık bir insan
doğrulama kapısına ihtiyaç duyar.

## Northwind'de pratikte

Desk krediler verir, iade politikası aktarır ve bayilerin finansal olarak hareket edeceği bayi
sorularını yanıtlar. Bu cevapların herhangi biri bir bayiye ulaşmadan önce:

1. Desk'in her cevap kategorisini sonuca göre sınıflandır: bilgilendirici (genel ürün soruları),
   finansal (kredi tutarları, iade uygunluğu) ve politika-beyan eden (iade pencereleri, sözleşme
   şartları). Sadece birinci kategori özgürce üretmeye izin verilmeli; diğer ikisi retrieval-only
   olmalı, yani Desk, belirli retrieval edilmiş bir maddeden alıntı yapar veya doğrudan türetir ve
   hiçbir madde iddiayı doğrudan desteklemiyorsa cevap vermeyi reddeder.
2. Her finansal ve politika-beyan eden cevap üzerinde, sadece lansmanında değil sürekli olarak,
   özellikle Air Canada/Cursor hata örüntüsünü hedefleyen bir Faithfulness kontrolü çalıştır:
   doğrudan kaynağı olmayan kendinden emin bir iddia.
3. Finansal cevaplar için (kredi tutarları), sadece bir atıf-varlığı kontrolü değil, bir
   atıf-desteği kontrolü ekle: Desk'in belirttiği belirli dolar tutarının veya yüzdenin,
   retrieval edilmiş fiyatlandırma veya sözleşme dokümanında gerçekten göründüğünü doğrula,
   Stanford'un araştırmacılarının atıf yapılan hukuki pasajların kendilerine atfedilen iddiaları
   gerçekten desteklediğini kontrol etmek zorunda kaldığı gibi.
4. Desk'in bir bayiye yaptığı beyanın Northwind'de kime ait olduğuna açık ve yazılı olarak karar
   ver. Air Canada emsali, Desk'in altındaki modeli kimin inşa ettiğinden bağımsız olarak, bunun
   bir tedarikçi değil, "AI" değil, Northwind olduğunu söylüyor. Hukuk ve destek liderliğinin
   bunu bir olaydan önce, sonra değil bilmesini sağla.
5. Desk'in bir AI asistanı olduğunu, bir kişi olmadığını, her etkileşimde açıkla. Cursor'un olayı,
   özellikle kullanıcıların "Sam"ın insan olduğuna inanması ve onun uydurma politikasını gerçek
   bir destek ajanından yetkili bir beyan olarak ele alması nedeniyle daha da kötü hale geldi.

## İyi mühendislerin bildiği

- Gerçek bir atıf, doğru bir iddianın kanıtı değildir. Mata v. Avianca bir uydurma sorunudur;
  Stanford'un hukuki RAG çalışması bir destek sorunudur; çıktıdan benzer görünürler ama farklı
  dedektörlere ihtiyaç duyarlar.
- "Onu chatbot söyledi, biz değil" bir sorumluluk savunması olarak, bir mahkeme huzurunda, zaten
  bir kez başarısız oldu; bu argümanın şirketin için işe yarayacağını varsayarak inşa etmek,
  test edilmemiş bir teoriye değil, yerleşik bir emsale karşı bir bahistir.
- Faithfulness (iddia-düzeyinde grounding) dayanaksız üretimi yakalar; doğru alınmış bir kaynağın
  yanlış yorumlanmasıyla gerekçelendirilen bir iddiayı yakalamaz. Düzenlenmiş bir alanda her iki
  kontrol de gereklidir.
- Bir sorumluluk reddi beyanı, bir doğrulama kapısının yerine geçmez. Bu lesson'daki dört vakadan
  hiçbiri bir uyarı etiketi eklenerek düzeltilmedi; sistemin, belirttiği her gerçeği gerçek bir
  kaynağa dayandırmasını ya da cevap vermeyi reddetmesini gerektiriyorlardı.
- Bir destek veya politika-cevaplayan AI ajanını dokümantasyonundan daha düşük riskli bir yüzey
  olarak ele almak, tam olarak hem Air Canada hem de Cursor olaylarını üreten boşluktur; düzeltme,
  teknik olduğu kadar organizaseldir (Desk'in ne söylemesine izin verildiğine kim imza atar).
- Bir ajanın bir kişi değil AI olduğunu açıklamak, kullanıcıların yanlış bir cevaba nasıl tepki
  verdiğini değiştirir; Cursor'un olayı, özellikle kullanıcılar "Sam" adlı bir insanın gerçek bir
  politikayı doğruladığına inandığı için tırmandı.
- "Halüsinasyonsuz", bir tedarikçi bunun arkasındaki benchmark'ı ve tanımı yayınlayana kadar bir
  mühendislik şartnamesi değil, bir pazarlama iddiasıdır; sıfatına güvenmeden önce metodolojiyi
  talep et, bir tedarikçi için olduğu kadar kendi sisteminin iddiaları için de.

## Karar ver

Desk yeni bir yeteneğe sahip olacak: belirli bir faturanın bir erken-ödeme indirimine uygun olup
olmadığı hakkında bayi sorularını yanıtlama, bu fatura tarihine, ödeme tarihine ve bayinin
sözleşmesindeki kademeli bir indirim tarifesine bağlı bir hesaplama. Desk'in bunu nasıl ele
alacağına ilişkin seçenekler: (a) Desk'in cevabı retrieval edilmiş sözleşme metni ve fatura
verisinden, bir Faithfulness kontrolünü sonradan bir koruma olarak kullanarak üretmesine izin
ver; (b) Desk'in tam kademe kuralını ve fatura tarihlerini retrieval etmesini ve indirimi
serbest-metin üretimi yerine deterministik bir fonksiyon çağrısıyla hesaplamasını, gereken bir
alan eksikse "bunu kontrol etmesi için bir insan alayım"a geri dönmesini gerektir; (c) Desk'in
sadece bilgilendirici olarak cevap vermesini sağla ("işte indirim tarifesi, hesaplayabilirsin")
ve asla belirli bir dolar tutarı belirtmesin. Birini seç ve bunu sadece doğruluğa değil, bu
lesson'daki sorumluluk muhakemesine karşı gerekçelendir.

## Tek cümlelik özet

> Retrieval grounding, kendinden emin bir cevap ile doğru bir cevap arasındaki boşluğu azaltır
> ama ortadan kaldırmaz ve Air Canada kararı, bir şirketin, AI asistanının yaptığı her iddiaya
> dokümantasyonuyla aynı özen görevini taşıdığını belirler; dolayısıyla atıf varlığı, atıf desteği
> ve zorlanmış grounding, sonuçları olan bir cevap bir kullanıcıya ulaşmadan önce her biri kendi
> kontrolüne ihtiyaç duyar.

## Kontrol sorusu

Northwind'in hukuk ekibi, Desk'in iade-politikası cevaplarının neden hem bir Faithfulness
kontrolüne hem de ayrı bir atıf-desteği kontrolüne ihtiyaç duyduğunu soruyor; cevabın retrieval
edilmiş bağlama dayandığını zaten doğruladığı için Faithfulness'ın tek başına yeterli olması
gerektiğini savunuyorlar. Bu lesson'dan atıf varlığı, atıf desteği ve dayanaksız üretim arasındaki
ayrımı kullanarak, Faithfulness'ın tek başına kaçıracağı belirli hata senaryosunu açıkla.

## Kaynaklar

- [Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html) · BC Civil Resolution Tribunal · Feb 2024 · the primary liability ruling.
- [BC Tribunal Finds Air Canada Liable For Inaccurate Advice Given By Website Chatbot](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot) · Deeth Williams Wall · 2024 · legal-analysis summary.
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024 · tribunal reasoning in detail.
- [Air Canada's chatbot illustrates persistent agency and responsibility gap problems for AI](https://link.springer.com/article/10.1007/s00146-024-02096-7) · AI & Society (Springer) · 2024 · peer-reviewed analysis.
- [Mata v. Avianca, Inc., 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.) · S.D.N.Y. · decided Jun 2023 · the fabricated-citation sanctions case.
- [Company apologizes after AI support agent invents policy that causes user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025 · the Cursor "Sam" incident.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh et al. (Stanford RegLab/HAI, Yale) · 2024 · the improper-grounding failure mode and hallucination-rate numbers.
