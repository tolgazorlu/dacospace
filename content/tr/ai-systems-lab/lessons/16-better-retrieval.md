# Lesson 16 · Daha iyi retrieval

**Reading time:** 19 min · **Module:** Knowledge · **Concepts:** hybrid search, reranking, chunking, contextual retrieval
**Cases:** stanford-legal-rag-hallucinations

## Problem

Diyelim ki Northwind Supply'ın bayi-destek ekibi, Desk'in ilk retrieval pipeline'ını çoğu RAG
tutorial'ının gösterdiği şekilde inşa ediyor: dokümanları sabit 512-token parçalara böl, hazır bir
modelle embed et, bir vektör veritabanında sakla ve her sorgu için kosinüs benzerliğine göre en
yakın 5 komşuyu getir. Genel sorularda, "iade politikanız ne" gibi, aşağı yukarı çalışır. Spesifik
sorularda çöker: bir bayi bir sevkiyattaki "hata kodu TS-451" hakkında soru sorar ve retriever,
TS-451'i tam olarak tanımlayan paragrafı kaçırıp genel olarak sevkiyat takibi hakkında parçalar
döndürür, çünkü bir embedding modeli nadir bir alfanümerik kodu sorgunun tek en önemli token'ı
olarak değil gürültü olarak ele alır.

Bu embedding modelindeki bir hata değil. Dense retrieval'ın nasıl çalıştığının öngörülebilir bir
özelliğidir ve naif bir RAG pipeline'ındaki, sistemin ne kadar iyi olabileceğinin tavanını, altındaki
dil modelinin ne kadar iyi olduğundan bağımsız olarak sessizce belirleyen birkaç varsayılan
seçimden biridir. "Araç çözülmüş olarak pazarlanıyor, kontrollü çalışma gerçek bir boşluk buluyor"
örüntüsünün aynısı pipeline'ın öteki ucunda da ortaya çıkar: Stanford RegLab'ın ticari hukuki RAG
araçları üzerindeki çalışması, her cevabı retrieval edilmiş dava hukukuna özellikle dayandırmak için
inşa edilmiş sistemlerde bile 17-34% halüsinasyon oranı buldu. ([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1))
Bu kalan hatanın bir kısmı, sadece üretime değil, retrieval kalitesinin kendisine dek izlenebilir.
Daha iyi retrieval halüsinasyonu imkansız kılmaz, ama boşluğun büyük ve ölçülebilir bir kısmını
kapatır.

## Neden zor

Daha önce full-text search inşa etmiş bir backend mühendisinin burada gerçek, kullanışlı bir sezgisi
vardır ve o sezgi aynı zamanda tuzakların da yerdir. Lexical search (BM25: doygunluk ve uzunluk
normalizasyonlu TF-IDF tabanlı sıralama) tanıdıktır ve "bu zaten fazladan adımlarla Elasticsearch"
içgüdüsü yarı yarıya doğrudur. Eksik olan yarı, dense embedding'lerin ve lexical search'ün *karşıt*
sorgu türlerinde başarısız olmasıdır ve çoğu mühendis, diğerinin güçlerini sessizce dışlamış
olduğunu fark etmeden birini seçer. Dense embedding'ler eş anlamlı kelime ve paraphrase üzerinde
("fee" vs "charge") genelleşir ama nadir, tam token'ları (SKU'lar, hata kodları, dava numaraları,
bazı modellerde insan adları) bulanıklaştırır veya yok sayar. BM25, tam eşleşmeleri mükemmel
yakalar ama anlam kavramı yoktur: bir eş anlamlı kelime ya da farklı sözlerle sorulmuş bir soru hiç
kredi almaz. Hiçbiri kesin olarak daha iyi değildir; birbirini tamamlarlar ve bu, sadece birini
çalıştıran bir üretim sisteminin, belirli bir sorgu sınıfını kazara değil tasarım gereği
başarısızlığa bıraktığı anlamına gelir.

Chunking de aynı tuzağa sahiptir: tek bir config parametresi (chunk boyutu) gibi görünür ve
gerçekte her workload için farklı bir optimumdur. 64'ten 1024 token'a kadar dört veri kümesi
üzerinde taranan bir chunk boyutu çalışması, cevap yoğunluğuna bağlı olarak zıt optimumlar buldu:
SQuAD (kısa, gerçek-tabanlı cevaplar) 64 token'da (64,1% Recall@1) tepe yaptı ve daha büyük
parçalar önemli olan tek cümlenin etrafına gürültü eklediği için 512 token'a kadar 10-15% recall
*kaybetti*; TechQA (uzun, açıklama-ağırlıklı teknik cevaplar) tersine gitti, 64 token'da 4,8%
Recall@1'den 1024 token'da 71,5%'e yükseldi, çünkü cevabın kendisinin tutarlı olması için çevresindeki
bağlama ihtiyacı vardı. ([arXiv:2505.21700](https://arxiv.org/html/2505.21700v1)) Bir tutorial'dan
kopyalanacak tek bir "en iyi" chunk boyutu yoktur; doğru değer, spesifik dokümanlarının cevapları
nasıl taşıdığına bağlıdır.

## Fikir: birbirini güçlendiren dört kaldıraç

### Hybrid search: BM25 artı embedding'ler, sıraya göre birleştirilmiş

Aynı korpus üzerinde paralel olarak bir lexical (BM25) indeks ve bir dense embedding indeksi
çalıştır, her birinden adayları getir ve iki sıralanmış listeyi, tipik olarak her öğenin ham
skoru yerine her listedeki *sıra konumuna* göre sonuçları birleştiren Reciprocal Rank Fusion (RRF)
ile birleştir. Bu önemlidir çünkü BM25 skorları sınırsızdır ve embedding kosinüs benzerlikleri
-1 ile 1 arasında sınırlıdır; ham sayıları doğrudan karşılaştırmak, uyumsuz ölçekleri
karşılaştırmaktır ve RRF bunu tamamen aşar. Kombinasyon, tutarlı şekilde tek bir retriever'ı tek
başına geçer. ([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** indeksleme ve sorgu altyapısını kabaca ikiye katlar (iki indeks, bir birleştirme
adımı). Kazancın büyüklüğü alana bağlıdır: sorgular tam tanımlayıcı içerdiğinde (hukuki atıflar,
ürün SKU'ları, hata kodları) daha büyüktür, hiçbir şeyin tam bir lexical eşleşmeye ihtiyacı
olmadığı tamamen anlamsal, konuşma dili sorgu setlerinde daha küçüktür.

### Reranking: daha az aday üzerinde ikinci, daha maliyetli bir geçiş

Bir cross-encoder reranker, sorguyu ve her aday parçayı (bir bi-encoder embedding modelinin
dokümanları önceden bir kez, sorguları ise ayrı ayrı istek zamanında embed ettiği gibi, bağımsız
değil) birlikte, ortaklaşa kodlar. Ortak kodlama önemli ölçüde daha doğru bir ilgi skoru üretir,
ama tüm korpus üzerinde çalıştırmak için çok yavaştır; bu yüzden reranking her zaman, daha ucuz
bir ilk aşama retriever tarafından zaten ortaya çıkarılmış küçük bir aday kümesine (tipik olarak
en üstteki 20-150) uygulanan bir ikinci aşamadır.

Anthropic'in kendi ölçümü, teknikleri üst üste istifleyip her kombinasyonun en üstteki 20 parça
retrieval hata oranını 5,7% temel çizgiye karşı karşılaştırarak:

| Pipeline | Top-20 retrieval failure rate | Reduction vs. baseline |
|---|---|---|
| Baseline (embeddings only) | 5.7% |, |
| + Contextual Embeddings | 3.7% | 35% |
| + Contextual Embeddings + Contextual BM25 | 2.9% | 49% |
| + reranking (Cohere) | 1.9% | 67% |

([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** her aday parça istek zamanında skorlanır, bu gerçek bir gecikme ve sorgu başına
maliyet ekler. Reranking bu yığındaki en büyük tek artımlı iyileştirmeyi satın alır, ama bunu
sadece indeksleme zamanında değil, her istekte hissettiğin adımdır da.

### Chunking stratejisi: bölmeyi, cevapların dokümanlarda nasıl yaşadığına uydur

Chunk boyutunun ötesinde, bir dokümanın *nasıl* bölündüğü, parçaların büyüklüğü kadar önemlidir.
Altı alanda 36 chunking yöntemini kapsayan büyük ölçekli bir benchmark, içerik-farkında,
yapı-farkında chunking'in (rastgele bir karakter sayısı yerine paragraf veya bölüm sınırları
boyunca bölme) naif sabit-boyutlu chunking'i önemli ölçüde geride bıraktığını buldu: paragraf-grubu
chunking nDCG@5 ≈ 0,459 skorladı, naif sabit-boyutlu bölme için 0,244'ün altına karşı; ve makalenin
asıl bulgusu, chunking yöntemi ile embedding modeli kalitesinin, birbirinin yerine geçilebilir
değil *tamamlayıcı* kazançlar sağladığı, yani daha iyi bir embedding modelinin kötü bir chunking
stratejisini kurtarmadığıdır. ([arXiv:2603.06976](https://arxiv.org/abs/2603.06976))

**Trade-off:** daha küçük, yapı-farkında parçalar, doküman başına daha fazla parça anlamına
gelir, bu da indeks boyutunu, ön işleme maliyetini ve daha büyük bir aday küme üzerinden sorgu
zamanı gecikmesini yükseltir.

### Contextual Retrieval: her parçaya kaybettiği bağlamı geri ver

Standart chunking, bir okuyucunun (veya bir retriever'ın) bir cümlenin hangi "şirket"ten veya
hangi "o çeyrek"ten bahsettiğini bilmek için gereken çevresel bağlamı ortadan kaldırır. Contextual
Retrieval (Anthropic), embed edilmeden ve BM25 indeksine girmeden önce her parça için bir LLM'in
kısa (50-100 token) açıklayıcı bir blurb üretmesini sağlar; böylece parçanın kendisi artık daha
önce çevresindeki metnin sağladığı bağlamı taşır. Bu, prompt caching ile indeksleme zamanında bir
kez çalıştığı için, Anthropic'in kendi rakamları tek seferlik maliyeti milyon doküman token'ı başına
$1,02 olarak koyuyor (8k-token kaynak dokümanlardan 800-token parçalar varsayılarak).
([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** chunking sınırları veya stratejisi değiştiğinde yeniden indekslemeyi (ve her
parçanın bağlamsal blurb'unu yeniden üretmeyi) gerektirir; Anthropic, kazancın büyüklüğünün
hangi embedding modelini kullandığına bağlı olduğunu buldu (kendi testlerinde Gemini ve Voyage
embedding'leri en çok fayda gördü).

### Dört kaldıraç nasıl birbirini güçlendirir

Yukarıdaki tablo noktayı zaten gösteriyor: bunlar rakip seçenekler değil, birbirini güçlendirirler.
Hybrid search ve contextual retrieval, aday kümeye ne girdiğini iyileştirir; reranking, o kümeden
son bağlama neyin hayatta kaldığını iyileştirir; chunking stratejisi, her bireysel adayın en baştan
ne kadar sinyal taşıdığını belirler. Bunlardan birini atlamak, belirli, tanımlanabilir bir sorgu
hatası sınıfını masada bırakmak demektir.

## Northwind'de pratikte

Desk'in korpusu çok farklı doküman şekillerini karıştırır: kısa, tam-tanımlayıcı içerik (SKU'lar,
sipariş numaraları, hata kodları) ve uzun, açıklama-ağırlıklı içerik (sözleşme şartları, iade
politikası gerekçesi). Bu sırayla inşa et:

1. Tek bir chunking stratejisi seçmeden önce korpusu içerik şekline göre ayır. SKU ve hata-kodu
   referans materyali, kısa, tam-sınırlı parçalar kullanmalı (chunk-boyutu çalışmasının SQuAD
   ucuna daha yakın); sözleşme ve politika metni, bir maddeyi bütün tutan daha büyük,
   yapı-farkında parçalar kullanmalı.
2. İlk günden itibaren embedding indeksinin yanına bir BM25 indeksi ekle, özellikle bayi sorularının
   düzenli olarak bir embedding modelinin gürültü olarak ele alacağı tam sipariş numaraları ve
   SKU'lar içermesi nedeniyle. RRF ile birleştir.
3. Reranking'i, sadece hybrid search'ün tek başına retrieval değerlendirme çıtanı geçip geçmediğini
   ölçtükten sonra ekle; bu, sorgu başına en maliyetli kaldıraçtır, dolayısıyla onu son harca ve
   Desk'in gerçek trafiği için gecikmesine değip değmediğini doğrula.
4. Contextual Retrieval'ı, korpus ve chunking stratejisi oturduktan sonra tekrar bakılacak bir
   ön işleme yatırımı olarak ele al, çünkü herhangi bir chunking değişikliğinde yeniden
   üretilmesi gerekir.

## İyi mühendislerin bildiği

- Dense embedding'ler ve BM25, karşıt sorgu türlerinde başarısız olur; sadece birini çalıştırmak,
  sonradan keşfettiğin bir gözetim değil, bilinen bir sorgu sınıfını başarısızlığa bırakan bir
  tasarım kararıdır.
- Evrensel en iyi chunk boyutu yoktur. Doğru boyut, dokümanlarının soruları bir cümlede mi yoksa
  bir paragrafta mı cevapladığına bağlıdır ve bu, bir blog yazısından kopyalanacak bir sabit değil,
  içeriğinin bir özelliğidir.
- Reranking, Anthropic'in kendi istiflenmiş ölçümünde en büyük tek iyileştirmeyi verir (onsuz 49%'a
  karşı 67%), ama aynı zamanda sorgu başına en çok maliyeti olan kaldıraçtır; bir inşada son sıraya
  koy, ilk sıraya değil.
- Daha iyi bir embedding modeli, daha iyi chunking'in yerine geçmez. 36-yöntemli chunking
  çalışması, iki kazancın tamamlayıcı olduğunu buldu; bu da bir model yükseltmesi kovalarken naif
  sabit-boyutlu chunking göndermeye devam eden ekiplerin ayrı, bağımsız bir kazancı talep
  etmeden bıraktığı anlamına gelir.
- RRF, sıralanmış listeleri konuma göre birleştirir, çünkü özellikle BM25 ve kosinüs-benzerliği
  skorları uyumsuz ölçeklerde yaşar; ham skorları doğrudan birleştirmek, bir basitleştirme değil
  sessiz bir doğruluk hatasıdır.
- Contextual Retrieval, her chunking değişikliğinde gerçek bir yeniden indeksleme maliyeti olan bir
  ön-işleme-zamanı düzeltmesidir; bir prompt değişikliği gibi üzerinde iterasyon yapması ücretsiz
  değildir.
- Düzenlenmiş bir alandaki (özellikle grounding etrafında inşa edilmiş hukuki RAG araçları) en iyi
  mühendislikle yapılmış retrieval yığını bile hâlâ gerçek bir kalan halüsinasyon oranı gösterir;
  daha iyi retrieval boşluğu daraltır, sıfıra kapatmaz; bu yüzden üretim tarafındaki sadakat
  kontrolleri (Lesson 15) bu yazıdaki her retrieval kaldıracı çekildikten sonra da gereklidir.

## Karar ver

Desk'in retrieval değerlendirmesi iki ayrı sorun gösteriyor: tam bir sipariş numarası veya SKU
içeren sorular için Recall@5 zayıf (62%) ve uzun, nüanslı uygunluk dili içeren sözleşme şartları
hakkındaki sorular için Faithfulness zayıf (71%). Bir sonraki incelemeden önce bir sprintin var.
Seçenek A: SKU/sipariş-numarası hatalarını doğrudan hedefleyen bir BM25 indeksi ve RRF birleştirme
ekle. Seçenek B: mevcut sadece-embedding retriever üzerine bir reranking aşaması ekle, bu her iki
sorgu türüne biraz yardımcı olur ama hedeflenmiş bir düzeltme kadar kesin değil. Seçenek C:
sözleşme korpusu için chunking'i, yapı-farkında, bölüm-sınırı bölme kullanacak şekilde yeniden
tasarla. Bu sprint için birini seç ve ölçülen iki sorundan hangisini bilerek bir sonraki sprinte
kadar çözülmemiş bıraktığını belirt.

## Tek cümlelik özet

> Hybrid search, reranking, chunking stratejisi ve contextual retrieval, retrieval kalitesindeki
> belirli, ölçülebilir bir boşluğu kapatır; rakip olmak yerine birbirini güçlendirirler ve
> hiçbiri, kendi korpusunun sorgu ve içerik şekline karşı kontrol etmeden kopyalanabilecek
> evrensel bir varsayılan değildir.

## Kontrol sorusu

Northwind, yüksek derecede teknik, çok sayfalı kurulum kılavuzları içeren yeni bir ürün hattı
ekliyor ve bunlar hakkındaki bayi soruları, korpusun geri kalanından çok daha kötü olan Recall@5
30%'in altında gelmeye başlıyor. Bu lesson'dan chunk boyutu ve içerik şekli hakkında bildiklerini
kullanarak, önce kontrol edilecek en olası tek yapılandırma hatası nedir ve bunu hangi deney
doğrulardı?

## Kaynaklar

- [Introducing Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) · Anthropic Engineering · Sep 2024 · the stacked retrieval failure-rate numbers, RRF rationale, and the $1.02/M token contextual retrieval cost.
- [Rethinking Chunk Size for Long-Document Retrieval: A Multi-Dataset Analysis](https://arxiv.org/html/2505.21700v1) · arXiv preprint · May 2025 · the chunk-size sweep across SQuAD, TechQA, COVID-QA, NewsQA.
- [A Systematic Investigation of Document Chunking Strategies and Embedding Sensitivity](https://arxiv.org/abs/2603.06976) · Shaukat, Adnan, Kuhn · 2026 preprint · the 36-method chunking taxonomy and the complementary-gains finding.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh et al. (Stanford RegLab/HAI, Yale) · 2024 · residual hallucination even in retrieval-grounded commercial tools.
