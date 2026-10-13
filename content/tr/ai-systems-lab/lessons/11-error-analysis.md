# Lesson 11 · Evals'tan önce hata analizi

**Reading time:** 18 min · **Module:** Evals · **Concepts:** trace review, failure taxonomy, golden datasets, criteria drift
**Cases:** anthropic-three-bugs-postmortem

## Problem

Ağustos başı ile Eylül 2025 başı arasında, Claude kullanıcıları modelin daha kötü hissettirdiğini bildirmeye başladı: yanlış dilde token'lar, bozuk sözdizimi, bozulmuş muhakeme. Anthropic sonunda üst üste yığılmış üç ayrı, örtüşen altyapı bug'ı buldu: kısa bağlamlı istekleri yanlış sunucu havuzuna gönderen bir routing hatası (Sonnet 4 isteklerinin %16'sına kadar çıkıyordu), çıktı token'larını bozan bir TPU yanlış konfigürasyonu ve bir sampling optimizasyonunda gizli bir compiler bug'ı. Bu lesson için en önemli itiraf bug listesi değil. Anthropic'in kendi postmortem'inden şu cümle: "çalıştırdığımız evaluation'lar, Claude genellikle izole hatalardan iyi toparlandığı için, kullanıcıların bildirdiği bozulmayı basitçe yakalamadı." ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

Sektördeki muhtemelen en iyi dahili eval suite'ine sahip bir frontier lab, eval'leri yanlış şeyi ölçtüğü için haftalarca bozulmuş kaliteyi sevk etti. Kullanıcılar arızayı önce buldu, ürünü fiilen kullanarak ve bir şeylerin ters olduğunu fark ederek. Dashboard'unun söylediği ile kullanıcılarının yaşadığı arasındaki bu boşluk, bu lesson'ın konusu.

## Neden zor

Backend mühendisliğinden geliyorsan, bir şey bozulduğunda içgüdün onu yeniden üreten bir test yazmak, sonra geri gelmesini önleyen bir regresyon testi yazmaktır. Bu içgüdü, "bozuk"un neye benzediğini zaten bildiğini varsayar: bir 500 status kodu, yanlış bir satır sayısı, bir değer olması gereken yerde bir null.

LLM çıktısı bu şekilde arızalanmaz. "Ince bir şekilde daha kötü", "teknik olarak doğru ama yardımcı değil", "doğru cevap, yanlış ton", "doğru policy'yi alıntılıyor ama yanlış durumda uyguluyor" şeklinde arızalanır. Henüz görmediğin bir arıza modu için bir assertion yazamazsın ve işin rahatsız edici kısmı burada: gerçek transkriptlerden bir yığını baştan sona okuyana kadar uygulamanın gerçek arıza modlarını bilemezsin. Genel benchmark'lar (MMLU tarzı doğruluk, toplu helpfulness skorları), senin spesifik iade bot'unun senin spesifik edge case'lerini yanlış ele alıp almadığı hakkında neredeyse hiçbir şey söylemez. Hamel Husain'in çerçevelemesi açık: hata analizini atlamak, LLM eval'leri inşa eden ekiplerde en yaygın arıza modudur, çünkü ekipler gözlemledikleri problemler yerine var olduğunu varsaydıkları problemler için otomatik kontroller yazmaya doğrudan atlıyor. ([Hamel Husain, Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/))

Diğer tarafta bekleyen ikinci bir tuzak var. Çıktıları puanlamaya oturduğunda bile, girdiğin rubrik gerçek verilerle karşılaşınca hayatta kalmayacak. Shreya Shankar ve meslektaşları, LLM evaluator'ları inşa eden pratisyenleri inceledi ve çıktıları görmeden önce puanlama kriterleri yazanların, fiilen puanlamaya başladıktan sonra bu kriterleri sürekli olarak gözden geçirdiklerini buldu. Buna "kriter kayması" (criteria drift) adını verdiler: gerçekten neye önem verdiğini bir toplantı odasında spesifikasyon yazarak değil puanlayarak öğrenirsin. ([Who Validates the Validators?](https://arxiv.org/abs/2404.12272)) Bu, çoğu mühendislik ekibinin çalışmaya nasıl eğitildiğiyle çelişir: kabul kriterlerini yaz, sonra buna karşı test et. Açık uçlu LLM çıktısı için, kabul kriteri gerçek örnekleri puanlamadan önce bir spesifikasyon değil bir hipotezdir.

## İdea: transkriptleri on-call'daki bir mühendis gibi oku

### Açık kodlama, sonra eksenel kodlama

Hata analizi gösterişsiz ve manuel: gerçek transkriptlerden bir örnek çekersin (Hamel kabaca 100 ile başlamayı, en az 30'unun kişisel olarak senin tarafından okunup not alınmasını, delege edilmeden, öneriyor) ve her biri için neyin, varsa, yanlış gittiğine dair açık uçlu bir not yazarsın. Henüz kategori yok, rubrik yok, sadece gözlem: "cevap 2023 fiyat listesini 2024 yerine alıntıladı", "agent sipariş numarasını iki kez sordu", "bayi üzgünken ton küçümseyiciydi". Bu açık kodlamadır.

Yeterince not biriktirdiğinde, bunları daha küçük bir isimlendirilmiş arıza kategorisi kümesine kümelersin: bu eksenel kodlamadır. Çıktı, senin ürününe özel bir arıza taksonomisidir, şuna benzer bir şey: yanlış belge retrieval'ı, policy yanlış uygulaması, ton uyumsuzluğu, eksik tool call sırası, halüsinasyon içeren sipariş numarası. Genel bir "helpfulness skoru" değil, bu taksonomi, neler için otomatik kontroller inşa edeceğini söyler. ([Evals FAQ, error analysis](https://hamel.dev/blog/posts/evals-faq/))

Hamel'in alan kılavuzu bunun pratikte ne kazandırdığını belgeliyor: bir danışmanlık projesinde, sistematik hata analizi bir ürün metriğini bir model yükseltmesiyle değil, genel bir dashboard'un ortalayarak gözden kaçırdığı belirli, tekrarlayan arıza sınıflarını bulup düzelterek %33'ten %95'e taşıdı. ([A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/))

### Golden dataset'ler ve regresyon testi

Bir taksonomin olduğunda, bir golden dataset küratörlüğü yaparsın: sadece kolay happy-path durumları değil, bulduğun her arıza kategorisinden örnekler içermesi için kasıtlı olarak inşa edilmiş, versiyonlanmış bir (girdi, beklenen çıktı veya puanlama kriteri) çiftleri kümesi. Bu küme, bir test suite'i gibi CI'a bağlanır: golden set'teki skoru düşüren bir pull request build'i başarısız kılar.

Golden set, ne kadar güncel olduğu kadar iyidir. Altı ay eski trafikten inşa edilmiş bir küme, ürününüz, kullanıcılarınız veya arıza modlarınız değiştikçe production kalitesini tahmin etmeyi durdurur; bu dataset kaymasıdır (dataset drift) ve "eval skorumuz aylardır yeşil" ifadesinin bazen sağlıklı bir üründen çok bayat bir eval'in işareti olmasının nedeni budur.

### Kriter kayması çözülecek bir bug değil, kalıcı bir durumdur

Kriter kayması görevin bir özelliği olduğu için, tek seferlik bir hata değil, doğru yanıt proseduraldir: hata analizini bir ritimde yeniden çalıştır (Evals FAQ'ın önerdiği sezgisel kural her iki-dört haftada 100+ taze transkript gözden geçirmek), rubrikin değişmesini bekle ve bir skor düşüşünün gerçek bir regresyon mu yoksa bir rubrik güncellemesi mi olduğunu söyleyebilmek için bunu bir changelog ile versiyonla.

| Yaklaşım | Neyi yakalar | Neyi kaçırır | Maliyet |
|---|---|---|---|
| Genel toplu benchmark (MMLU tarzı, karışık helpfulness skoru) | Kaba yetenek regresyonları | Uygulamaya özgü arıza modları, "izole hatalardan toparlanan" sessiz bozulma | Çalıştırması düşük, yanlış güvende yüksek |
| Gerçek transkriptler üzerinde manuel hata analizi | Ürününün gerçek arıza taksonomisi | Doğası gereği hiçbir şeyi, ama sadece headcount'la ölçeklenmez | Review başına yüksek, ön yüklü |
| CI'da golden-set regresyon testi | Tekrarlayan bilinen arıza modları | Kümenin dışındaki yeni arıza modları (dataset drift) | Kurulduktan sonra düşük, yenilenme gerektirir |
| Sürekli production örneklemesi | Golden set'in hiç öngöremediği kayma ve arızalar | Bir örnekleme stratejisi ve judge-maliyet disiplini gerektirir | Sürekli, trafikle ölçeklenir |

## Northwind'de pratikte

Northwind'in bayi asistanı Desk, iki aydır "%94 helpful" gösteren bir kalite dashboard'una sahip. Bir bayi arayıp Desk'in aynı iade için iki kez 400 dolarlık kredi verdiğinden şikayet ediyor. Dashboard bunu hiç işaretlemedi.

İşlem sırası:

1. Dashboard'a güvenme ve sadece şikayete de güvenme. Son iki haftadan, kredi veren konuşmalara ağırlıklı, 100 gerçek Desk transkripti çek ve yeni bir metrik yazmadan önce 30'unu bizzat kendin oku.
2. Her transkript için açık uçlu notlar yaz: Desk ne yaptı, bayi ne istedi, tuhaf bir şey var mı. 1-5 puanlama dürtüsüne karşı koy; sadece betimle.
3. Notları kümele. Northwind'de bu şu kategorileri ortaya çıkarabilir: timeout sonrası retry'da çift kredi verilmesi, yanlış sipariş ID'sine karşı uygulanan kredi, doğru kredi ama audit trail için açılmamış ticket, bayi zaten sinirliyken ton sorunları.
4. En çok maliyete yol açan iki veya üç kategoriyi seç (çift krediler doğrudan finansal kayıp; eksik audit ticket'ları bir uyumluluk riski) ve bayinin bildirdiği çift-kredi transkripti dahil, her kategori için 20-30 örneklik bir golden set inşa et.
5. Mekanik arıza için ucuz, deterministik bir kontrolü (araç log'u bir oturumda aynı sipariş ID'si için iki `issue_credit` çağrısı gösterdi mi) bir LLM judge değil bir trajectory assertion olarak CI'a bağla. Judge'ı ton gibi gerçekten açık uçlu kalite sorular için ayır.
6. Takımın takvimine, 1-3 adımlarını taze transkriptler üzerinde yeniden çalıştırmak için düzenli bir 3 haftalık blok koy. Bu ay inşa edilen taksonomi, Desk bir sonraki özelliği sevk ettiğinde eksik kalacak.

## İyi mühendislerin bildiği

- Yeşil bir dashboard ve bir kullanıcı şikayeti çelişen sinyaller değildir; genellikle kullanıcının yanlış olduğu değil, dashboard'ın yanlış şeyi ölçtüğü anlamına gelir. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- Bir transkriptte kişisel olarak okumadığın bir arıza modu için eval yazamazsın. Gözlemden önce otomatikleştirmek, nadiren arızalanan şeyleri ölçen eval'ler üretir.
- Henüz gerçek çıktılara bakılmadan bir planlama toplantısında yazılmış rubrikler hipotezdir. İlk puanlama geçişinden sonra bunları revize etmeyi bekle ve bu revizyon için bütçe ayır, scope creep olarak değil. ([Who Validates the Validators?](https://arxiv.org/abs/2404.12272))
- Mekanik, kontrol edilebilir arızalar (agent bir tool'u iki kez çağırdı mı, gerekli bir adımı atladı mı), ucuz kod assertion'larına aittir. LLM judge'ları ton veya yardımseverlik gibi gerçekten subjektif kalite boyutları için ayır.
- "İzole hatalardan iyi toparlanmak" tam olarak toplu bir skorun gerçek, kalıcı bir kusuru gizlemesini sağlayan özelliktir. Eval'in sadece birçok deneme üzerinden ortalanmış final cevap doğruluğunu ölçüyorsa, gizli kalan bir kuyruk bug'ı haftalarca production'da yaşayabilir. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- Bir golden set bir anlık görüntüdür, mutlak gerçek değil. Yaşını, cache'lenmiş bir değerin yaşını ele aldığın gibi ele al: bayat cache'ler yanlış cevapları kendinden emin şekilde sunar.
- Gerçek bir projede bir metriği %33'ten %95'e taşımak, daha büyük bir modelden veya daha akıllı bir prompt'tan değil, sistematik hata analizinden geldi. ([Field Guide](https://hamel.dev/blog/posts/field-guide/))
- Hata analizi daha fazla reviewer ekleyerek sonsuza kadar ölçeklenmez. Hacim büyüdükçe tooling'e ihtiyacın var: hızlı, bu iş için amaca özel bir veri görüntüleyici, bu görev için genel bir analitik dashboard'ını geride bırakır.

## Karar ver

Northwind yönetimi, Desk'in dashboard'unda %92'lik bir "kalite skoru" (tek bir karışık LLM-judge rakamı) görüyor ve ayrı olarak, bu hafta yanlış kredi miktarlarına dair üç bayi şikayeti. Bir sonraki planlama review'una kadar bir sprintin var. Birini seç ve diğer üçüne karşı gerekçelendir:

(a) %92 dashboard skoruna güven; binlerce konuşmadan üç şikayet gürültüdür, bu sprint hiçbir eylem gerekmez.
(b) Hiçbir şikayet transkriptini okumadan, en son değişken olduğu için geçen haftaki prompt değişikliğini hemen geri al.
(c) Üç şikayetin arkasındaki ham transkriptleri artı güncel kredi veren konuşmalardan rastgele bir örneği çek, bizzat oku ve geri alma, yama veya yeni bir kontrol ekleme kararı vermeden önce bir arıza taksonomisi inşa et.
(d) Mevcut LLM judge'a yeni bir genel "doğruluk" kriteri ekle ve rakamın değişip değişmediğini görmek için bunu aynı %92 skorlu dataset'e karşı yeniden çalıştır.

## Tek cümlelik özet

> Tek bir otomatik eval inşa etmeden önce, 100 gerçek transkripti bizzat oku; çünkü bir dashboard henüz kimsenin aramadığı bir arıza modunu ölçemez.

## Kontrol sorusu

Northwind, Desk'e sesli destek ekledi (bayiler Slack kullanmak yerine arayabiliyor). Metin transkriptlerinden inşa edilmiş mevcut golden set hâlâ her hafta %96 puanlıyor, ama sesli kanal şikayetleri artıyor. Ne yaparsın ve mevcut golden set'teki yeşil bir skor bu soruyu neden çözmüyor?

## Kaynaklar

- [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · Hamel Husain · Mar 2025 · The canonical framing of error analysis as the step most teams skip.
- [AI Evals: Everything You Need to Know (Evals FAQ)](https://hamel.dev/blog/posts/evals-faq/) · Hamel Husain & Shreya Shankar · ongoing · Methodology for sample sizes and re-run cadence.
- [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) · Hamel Husain · Mar 2025 · The 33% to 95% case study from manual error analysis.
- [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) · Shankar et al., UIST 2024 · Origin of "criteria drift."
- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, Sam McAllister · Sep 17, 2025 · "Evals didn't capture the degradation users were reporting."