# Lesson 15 · RAG ve başarısızlık noktaları

**Reading time:** 19 min · **Module:** Knowledge · **Concepts:** retrieval-augmented generation, the seven failure points, retrieval metrics
**Cases:** nyc-mycity-chatbot, stanford-legal-rag-hallucinations

## Problem

Ekim 2023'te New York City'nin Teknoloji ve İnovasyon Ofisi, küçük işletme sahiplerinin şehir
düzenlemelerinde yol bulmasına yardımcı olması amaçlanan, Azure tabanlı bir chatbot olan MyCity Business
Assistant'ı başlattı. Mart 2024'te The Markup'ın araştırması, bot'un işletme sahiplerine ev sahiplerinin
Section 8 konut kuponlarını kabul etmek zorunda olmadığını (yanlış ve NYC yasası altında yasa dışı
ayrımcılık), bir restoranın tamamen nakitsiz çalışabileceğini (yanlış, 2020 şehir meclisi yasası nakit
kabul etmeyi şart koşuyor) ve işverenlerin çalışan bahşişlerinden kesinti alabileceğini (yanlış, federal
yasa altında yasa dışı) söylediğini buldu. On farklı personel üyesi soran kişi, kupon sorusunda aynı
yanlış cevabı aldı. Şehrin hatalar gösterildikten sonraki yanıtı bir uyarı eklemek ve bot'u çalışır
halde bırakmaktı. Bir takip testi, bot'un kendi yeni uyarısından habersiz olduğunu buldu.
([The Markup](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law),
[THE CITY takip araştırması](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information))

Bot, şehrin bilgilendirici sayfalarına dayandırılmıştı. Retrieval'ı vardı. Yine de insanlara, birbirinden
bağımsız birçok soran kişi genelinde tutarlı bir şekilde yasayı çiğnemelerini güvenle söyledi. Üzerinde
durulması gereken ayrıntı bu tutarlılık: bu, bir retry'ın düzeltebileceği tek seferlik bir halüsinasyon
değildi. Pipeline'da güvenilir biçimde yanlış olan bir şey vardı.

## Neden zor

Veritabanları ve arama indeksleriyle eğitilmiş bir backend mühendisinin içgüdüsü şudur: "doğru belge
indekste varsa, sistem onu bulur, bulursa da cevap doğru olur." RAG (retrieval-augmented generation:
bir sorgu için ilgili belgeleri getir, sonra onlara koşullu bir cevap üret), bir arama motoru ile bir
metin üreticisi arasında bir join gibi görünür. Tek bir başarısızlık yüzeyi değildir, en az ikidir ve
birbirinden bağımsız olarak başarısız olurlar.

Retrieval başarılı olabilirken generation başarısız olabilir: doğru chunk context window'da vardır ve
model yine de onu görmezden gelir, yanlış okur veya alınan metin tarafından gerçekte desteklenmeyen,
kulağa makul gelen bir ayrıntıyla doldurur. Generation iyi görünebilirken retrieval sessizce
başarısız olmuş olabilir: model yanlış chunk'tan, ya da soruyu gerçekte cevaplayan hiçbir chunk'tan
akıcı, güvenli bir cevap üretir ve çıktıda hiçbir şey ters bir şey olduğunu işaret etmez.
Akıcılık ve doğruluk, tam da önemli olan durumlarda birbiriyle ilişkisizdir.

İyi bir mühendisin içgüdüleri için daha derin sorun şu: bir RAG sistemi, kullanıcılar gerçek
sorgularla gelmeden önce tam olarak doğrulanamaz ve sağlamlığı lansmanda "tamamlanmaz", corpus, sorgu
dağılımı ve model altında değişirken sistemin ömrü boyunca evrilir. Bu, RAG başarısızlıklarının ilk
sistematik ampirik çalışmasının (üç üretim vaka çalışması üzerine kurulu: Barnett, Kurniawan, Thudumu,
Brannelly, Abdelrazek, Deakin University) doğrudan bir bulgusudur. Sonuçları: doğrulama ancak işletim
sırasında mümkündür. ([arXiv:2401.05856](https://arxiv.org/html/2401.05856v1)) Bu, bir RAG lansmanını
bir test suite'i olan bir REST endpoint'i göndermek gibi ele alıp bittiğini söylemeye karşı bir argümandır.
Sürekli değerlendirme altyapısını sonradan eklenecek bir şey değil, ilk gün gereksinimi olarak
görmek için bir argümandır.

## Fikir: yedi başarısızlık noktası, iki aşama

Barnett ve diğerlerinin taksonomisi başarısızlıkları, pipeline'ın kaynaklandıkları aşamasına eşler.

**Indexing zamanı başarısızlıkları** herhangi bir sorgu sorulmadan önce gerçekleşir.

- *Eksik içerik.* Corpus'ta soruyu cevaplayan hiçbir belge yoktur. Sistem ya modelin genel eğitiminden
  bir cevap uydurur (genel, genellikle yanlış, hukuki veya politika kulaklı bir ifade) ya da iyi
  tasarlanmışsa bilmediğini söyler. MyCity'nin konut ve bahşiş hukukundaki yanlış cevapları bununla
  tutarlı görünüyor: corpus'un açıkça taşımadığı veya retriever'ın yüzeye çıkarmadığı belirli bir
  düzenlemenin yerini tutan genel, kulağa makul gelen hukuki dil.

**Retrieval zamanı başarısızlıkları** sorgu ile context window arasında gerçekleşir.

- *Kaçırılan top-k.* Doğru chunk indekste vardır ama getirilen sete girmeye yetecek kadar yüksek
  sıralanmaz.
- *Context'te değil (konsolidasyon başarısızlığı).* Doğru chunk getirilir, ama modele gönderilen
  nihai context'in montajı sırasında kaybolur, kırpılır veya alt sıraya düşürülür, böylece generation
  adımına hiçbir zaman gerçekten ulaşmaz.

**Generation zamanı başarısızlıkları** model getirilen context'e sahip olduktan sonra gerçekleşir.

- *Yanlış format.* Model açık bir format talimatını görmezden gelir (zorunlu bir alıntı stili, bir
  JSON şeması, zorunlu bir uyarı).
- *Yanlış özgünlük düzeyi.* Cevap ya fazla geneldir (sorunun tam bir sayı veya tarih gerektirdiği
  yerde belirsiz bir özet) ya da fazla özgündür (kaynak tarafından gerçekte desteklenmeyen uydurma
  bir kesinlik).
- *Eksik.* Gereken bilgi getirilen context'te vardı, ama modelin cevabı sadece bir kısmını kapsıyor,
  çoğunlukla sorunun kendisi birkaç alt soruyu birleştirdiği için.

Yedisinin de kesiştiği ikinci, bağımsız bir eksen var: retrieval kalitesi ve generation kalitesi
ölçülmesi gereken farklı şeylerdir ve birini ölçmek diğeri hakkında neredeyse hiçbir şey söylemez.
RAGAS çerçevesi (Es, James, Espinosa-Anke, Schockaert, EACL 2024), elle etiketlenmiş altın cevaplar
olmadan sürekli çalışabilen, referans gerektirmeyen, LLM tarafından yargılanan metriklerle bu ayrımı
formelleştirir:

| Metric | Stage | Question it answers |
|---|---|---|
| Recall@k | Retrieval | Bilinen-ilgili chunk top k sonuçta çıktı mı? |
| nDCG | Retrieval | İlgili sonuçlar sadece dahil edilmekle kalmayıp doğru şekilde de mi sıralandı? |
| Context Relevance / Precision | Retrieval | Getirilen context sadece gerekeni mi içerdi? |
| Faithfulness | Generation | Cevaptaki her iddia, getirilen context'ten çıkarılabilir mi? |
| Answer Relevance | Generation | Cevap, doğruluğundan bağımsız olarak sorulan soruyu ele alıyor mu? |

RAGAS'ın kendi insan-uyumu testinde (WikiEval), faithfulness skorlaması zamanın %95'inde insan
yargısıyla eşleşti, naif bir GPT-score temeline göre bu oran %72'ydi.
([arXiv:2309.15217](https://arxiv.org/html/2309.15217v1)) Bu fark, "gerçek görünen bir kaynak alıntıladı
mı" sorusunun bir faithfulness kontrolünün yerini neden tutamadığını gösterir: güvenli, iyi formatlanmış
bir cevap naif kontrolü geçer ve gerçek kontrolü başarısız olur.

Kalan sorunun ölçeği, özellikle onu çözmek için inşa edilmiş alanlarda bile, insanı düşündürücü.
Stanford RegLab ve HAI, 200'den fazla hukuki sorgudan oluşan ön kayıtlı bir benchmark inşa etti ve
ticari RAG tabanlı hukuki araştırma araçlarını test etti (LexisNexis'in Lexis+ AI'sı, Thomson Reuters'ın
Ask Practical Law AI'sı ve Westlaw AI-Assisted Research'ü), hepsi doğrulanmış hukuki veritabanlarına
dayandırıldığını ve bazıları açıkça "halüsinasyon-free" olduğunu iddia ediyordu. Her araç zamanın
%17 ile %33'ü arasında halüsinasyon gördü; Westlaw'ın AI-Assisted Research'ü yaklaşık %34 halüsinasyon
gördü ve en iyi performans gösteren (Lexis+ AI) sorguların yalnızca yaklaşık %65'ini tamamen doğru
cevapladı.
([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1),
[Stanford HAI özeti](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries))
Bu, aynı araştırma grubunun daha önceki çalışmasındaki, hiç retrieval'ı olmayan genel amaçlı bir
chatbot'un hukuki soruları cevaplamasından (%58-82 halüsinasyon oranı) çok daha iyi, ama sıfır değil
ve "halüsinasyon-free" pazarlamasının vaat ettiği şey değil.

Makale, yazarların **uygunsuz grounding** olarak adlandırdığı daha ince bir başarısızlığı adlandırıyor:
araç gerçek, getirilebilir bir belge alıntılıyor, ama o belge iddia edilen spesifik talebi gerçekte
desteklemiyor. Sadece "bu alıntı gerçek bir belgeye çözülüyor mu" diye doğrulayan bir kontrol bu
durumu geçer. Yalnızca claim seviyesinde bir entailment kontrolü (alıntılanan pasaj gerçekten cevabın
iddia ettiği şeyi söylüyor mu) bunu yakalar. Bu, Faithfulness'ın kapatmak için tasarlandığı tam boşluktur
ve bir URL geçerlilik kontrolünün kapattığı boşluk değildir.

## Northwind'de pratikte

Desk, Northwind Supply'ın asistanı, bayi sorularını fiyat listelerinden, iade politikasından ve
sözleşmelerden cevaplıyor. Desk'in RAG pipeline'ının herhangi bir sürümünü lansmana hazır olarak ele
almadan önce:

1. Yedi başarısızlık noktasının her birini ayrı ayrı test eden etiketli bir eval seti oluştur, tek bir
   genel "sorular sor ve cevaplara göz atarak bak" geçişi değil. Corpus'un gerçekten cevaplayamadığı en
   az birkaç soru ekle (eksik içerik yolunun, uydurma bir politika yerine dürüst bir "bilmiyorum"
   üretip üretmediğini test etmek için).
2. Her eval çalıştırmasında retrieval ve generation'ı iki ayrı skor olarak ölç: retrieval'da Recall@k,
   generation'da Faithfulness ve Answer Relevance. Birinde diğeri olmadan bir gerileme, pipeline'ın
   tam olarak hangi yarısını debug edeceğini sana söyler.
3. Lansman eval setini bir zemin olarak ele al, bir tavan olarak değil. Barnett ve diğerlerinin ana
   uyarısı, production trafiğinin lansman öncesi setin hiç öngöremediği başarısızlık modlarını yüzeye
   çıkaracağıdır; gerçek Desk sorgularının sürekli örneklenmesini, sadece gönderim anında değil, aynı
   Faithfulness kontrolüne sürekli çalışacak şekilde bağla.
4. İade politikasına, iade uygunluğuna veya sözleşme şartlarına dokunan herhangi bir cevap için,
   özellikle yanlış özgünlük düzeyi başarısızlık modunu test et: Desk, getirilen fiyat listesinde veya
   sözleşme maddesinde kelimesi kelimesine bulunmayan bir dolar tutarı, tarih veya yüzde ifade ediyor mu?

## İyi mühendislerin bildiği

- Mükemmel retrieval'a sahip ve üzerine halüsinasyon gören bir model içeren bir RAG sistemi yine de
  başarısız olacaktır; retrieval kalitesi gereklidir ama yeterli değildir ve ikisi bağımsız olarak
  skorlanmalıdır.
- "Bir kaynak alıntıladı" ile "kaynak bu spesifik ifadeyi destekliyor" aynı iddia değildir. Uygunsuz
  grounding bir URL kontrolünü geçer ve claim seviyesinde bir entailment kontrolünü başarısız olur.
- Sabit bir lansman öncesi test suite'ini geçen bir RAG lansmanı doğrulanmış değildir, sadece
  örneklenmiştir. Barnett ve diğerlerinin kendi çerçevelemesi: doğrulama ancak işletim sırasında
  mümkündür.
- Birçok bağımsız soran kişi genelinde tutarlı yanlış cevaplar (MyCity'deki gibi), tek bir kötü
  cevaptan daha güçlü bir sistemik pipeline kusuru sinyalidir; tekrarlanabilirliği gürültü değil bir
  şiddet çoğaltıcısı olarak ele al.
- Satıcı kendi değerlendirme metodolojisini yayınlamadıkça "halüsinasyon-free" çürütülebilir bir iddia
  değildir. Üçüncü taraf bir RAG aracına güvenmeden önce sıfatı değil metodolojiyi talep et.
- Eksik içerik başarısızlıkları ve retrieval sıralama başarısızlıkları dışarıdan aynı görünür (cevap
  yanlıştır) ama zıt düzeltmeler gerektirir: corpus'a belge eklemek ile retriever'ı ayarlamak veya
  yeniden sıralamak. Yama yapmadan önce teşhis koy.
- Bir uyarı ("cevaplar yanlış olabilir") yüksek riskli bir alanda doğruluğun yerini tutmaz. NYC bir
  uyarı ekledi ve altta yatan başarısızlık modu aynı yanlış cevapları üretmeye devam etti.

## Karar ver

Northwind, ürün kategorisine ve bazen bayi sözleşme katmanına göre değişen iade uygunluk pencereleri
dahil, bayi karşılı sorular için Desk'i lansmana hazırlanıyor. Lansmandan önce tam olarak bir
değerlendirme altyapısı parçası inşa etmek için bütçen var: ya (a) getirilen context'te kelimesi
kelimesine bulunmayan belirli bir sayı, tarih veya uygunluk kuralı içeren herhangi bir cevabı işaretleyen
claim seviyesinde bir Faithfulness kontrolcüsü, ya da (b) doğru iade politikası chunk'ının, örneklenmiş
bir gerçek bayi sorusu setinde top 5 getirilen sonuçta görünmediğinde uyaran bir Recall@k monitörü.
Lansmandan önce ikisini de inşa edemezsin. Önce hangisini inşa edersin ve bu arada hangi başarısızlık
modunun riskini açıkça kabul ediyorsun?

## Tek cümlelik özet

> RAG başarısızlıkları indexing, retrieval ve generation genelinde en az yedi farklı noktaya ayrılır
> ve bir sistem halüsinasyon görürken mükemmel retrieval yapabildiğinden (veya güvenli görünürken kötü
> retrieval yapabildiğinden), retrieval kalitesi ve generation kalitesi, nihai cevabın ne kadar akıcı
> kulağa geldiğinden çıkarılmak yerine iki ayrı, sürekli skor olarak ölçülmelidir.

## Kontrol sorusu

Northwind'in destek ekibi, Desk'in üç farklı bayiye "iade edilmiş bir bağlantı elemanı paletinin
yeniden stoklama ücreti nedir" sorusuna, hepsi tam bir güvenle ve hiç çekincesiz sunulmuş, birbiriyle
çelişen üç farklı cevap verdiğini bildiriyor. Bu derste kullanılan taksonomiyi kullanarak, bu
semptomun ardındaki en olası iki farklı kök nedeni adlandır ve bir düzeltmeye karar vermeden önce
onları ayırt etmek için çalıştıracağın bir tanılamayı tarif et.

## Kaynaklar

- [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/html/2401.05856v1) · Barnett et al., Deakin Univ. · Jan 2024 · the failure-point taxonomy this lesson is built on.
- [RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/html/2309.15217v1) · Es, James, Espinosa-Anke, Schockaert · 2023/EACL 2024 · Faithfulness, Answer Relevance, Context Relevance definitions and the WikiEval alignment numbers.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh, Surani, Dahl, Suzgun, Manning, Ho (Stanford RegLab/HAI, Yale) · 2024 · the 17-34% legal RAG hallucination rates and the "improper grounding" failure mode.
- [AI on Trial: Legal Models Hallucinate in 1 out of 6 (or More) Benchmarking Queries](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries) · Stanford HAI · 2024 · plain-language summary of the above.
- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · Mar 2024 · the MyCity incident, primary investigation.
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · Apr 2024 · the disclaimer-did-not-help follow-up.
