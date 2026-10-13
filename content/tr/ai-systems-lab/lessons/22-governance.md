# Lesson 22 · Mühendisler için governance

**Reading time:** 19 min · **Module:** Production · **Concepts:** EU AI Act, NIST AI RMF, ISO/IEC 42001, PII and retention
**Cases:** nyc-mycity-chatbot

## Problem

Ekim 2023'te New York City'nin Teknoloji ve İnovasyon Ofisi, işletme sahiplerinin şehir
düzenlemelerinde yol bulmasına yardımcı olmak için Microsoft Azure tabanlı bir chatbot, MyCity
Business Assistant'ı başlattı. Mart 2024'te The Markup'ın araştırması, bu chatbot'un kullanıcılara ev
sahiplerinin Section 8 konut kuponlarını kabul etmek zorunda olmadığını (yanlış, NYC İnsan Hakları
Yasası altında yasa dışı ayrımcılık), bir restoranın tamamen nakitsiz çalışabileceğini (yanlış, 2020
şehir meclisi yasası nakit kabul etmeyi şart koşuyor) ve işverenlerin çalışan bahşişlerinden kesinti
alabileceğini (yanlış, federal yasa altında yasa dışı) söylediğini buldu. Şehir, hatalar gösterildikten
sonra chatbot'u çevrimiçi tuttu ve sadece bir uyarı ekledi. THE CITY'nin yaptığı bir takip araştırması,
chatbot'un kendi uyarısından bile habersiz olduğunu buldu.

Bu bir ürün problemi (Lesson 18'de ele alınıyor, grounding ve alıntılar) ve aynı zamanda bir
governance problemi: görünüşe göre kimsenin, halka göndermeden önce sistemin bilinen-doğru hukuki
cevaplara karşı adversarial testi geçmesini gerektiren bir ön-lansman süreci yoktu ve kimsenin,
bağımsız test edenler tutarlı, tekrarlanan hukuki hatalar belgeledikten sonra sistemi kaldırmak için
tanımlanmış bir tetikleyicisi yoktu. Governance, tam da bu boşluğu bir olay haber hikayesi olmadan
önce yakalaması gereken katmandır ve bu ders, bu katmanın bir mühendisten, bir avukattan değil,
gerçekte ne gerektirdiğiyle ilgilidir.

## Neden zor

Çoğu backend mühendisinin, bitişik alanlardan (SOC 2, GDPR, PCI DSS) bir ölçüde compliance maruziyeti
vardır ve içgüdü, AI governance'ı daha fazlasıymış gibi ele almaktır: bir checklist, bir satıcı aracı,
yılda bir denetim. Bu içgüdü, bu alana özgü iki şeyi hafife alır.

Birincisi, hukuki manzara gerçekten hareket halinde, henüz oturmuş değil. EU AI Act, gerçek para
cezaları olan bağlayıcı bir düzenlemedir, kendisi de zaten bir kez değiştirilmiş (2026 "Digital
Omnibus" ertelemeleri) çok yıllı bir takvime kademeli olarak giriyor. NIST'in AI RMF'si ve ISO/IEC
42001 ise yasa yoluyla değil, satın alma gereksinimleri ve sigorta underwriting'i yoluyla fiilen
zorunlu hale gelen gönüllü çerçevelerdir. "ISO 42001 sertifikalıyız" ifadesini "EU AI Act'e uyumluyuz"
ile eşdeğer sayan bir mühendis, bir düzenleyicinin savunma olarak kabul etmeyeceği bir kategori hatası
yapmıştır.

İkincisi ve günlük mühendislik işine daha doğrudan ilgili olanı: mahkemeler, bir şirketin kendi
chatbot'unun söylediğinden, statik web sayfalarıyla aynı özen yükümlülüğüyle sorumlu olduğunu çoktan
belirledi; "bunu AI söyledi, biz değil" savunması yok. Bu, bir AI sisteminin gözetimsiz olarak neyi
üretmesine izin verildiğine dair her tasarım kararının, o sırada kimse öyle etiketlemese bile, hukuki
sonuçları olan bir governance kararı olduğu anlamına gelir.

## Fikir: bağlayıcı yasa, gönüllü çerçeveler ve kendi maruziyetin

### EU AI Act: bağlayıcı, kademeli ve zaten bir kez değiştirilmiş

EU AI Act (Regulation (EU) 2024/1689), 1 Ağustos 2024'te yürürlüğe girdi ve aşamalı olarak uygulanıyor:
yasaklı uygulamalar ve AI okuryazarlığı yükümlülükleri 2 Şubat 2025'ten itibaren; genel amaçlı AI
model yükümlülükleri 2 Ağustos 2025'ten itibaren; şeffaflık yükümlülüklerinin büyük kısmı ve genel
uygulama 2 Ağustos 2026'dan itibaren; Annex III yüksek riskli yükümlülükler 2 Aralık 2027'ye ve Annex I
ürün gömülü yüksek riskli yükümlülükler 2 Ağustos 2028'e ertelendi (her ikisi de 2026 Digital Omnibus
değişikliğiyle daha önceki 2026/2027 tarihlerinden ertelendi). En ciddi ihlaller (yasaklı
uygulamalar) için maksimum ceza: 35 milyon Euro veya küresel yıllık cironun %7'si, hangisi daha
yüksekse.

Yasanın zorladığı pratik mühendislik sorusu şu: sistemin hangi risk katmanına giriyor? Annex III
altında yüksek riskli olan veya genel amaçlı AI model sağlayıcı yükümlülüklerine giren bir sistem,
ikisinden de olmayan bir sistemden farklı ve daha ağır yükümlülükler taşır. Bu sınıflandırma tek
seferlik bir karar değildir; yeni bir özellik bir sistemi daha yüksek bir katmana taşıyabilir ve
şirket içinde birinin, sadece ilk lansmanda değil, devam eden bir şekilde yeniden sınıflandırmanın
sahibi olması gerekir.

### NIST AI 600-1: gönüllü, adı belirtilmiş bir risk listesi

NIST AI 600-1 (Temmuz 2024), temel AI RMF 1.0'a özel bir generative AI profili eki, gönüllü bir
destekleyici belgedir. Konfabülasyon/halüsinasyon, CBRN uplift, veri gizliliği, bilgi güvenliği,
insan-AI yapılandırması gibi 12 generative-AI'ye özgü risk kategorisini, spekülatif gelecek-sistem
risklerini açıkça hariç tutan sınırlı, kanıta dayalı bir liste olarak adlandırır ve önerilen eylemleri
RMF'nin Govern/Map/Measure/Manage fonksiyonlarına eşler. Temel çerçevenin yerini tutmaz ve uyumsuzluk
için hiçbir para cezası taşımaz; gücü yasadan değil, satın alma ve denetim beklentilerinden gelir.

### ISO/IEC 42001: modeli değil organizasyonu sertifikalandırmak

Aralık 2023'te yayınlanan ISO/IEC 42001:2023, Annex SL altında ISO 27001 gibi yapılandırılmış ilk
sertifikalanabilir AI yönetim sistemi standardıdır (AIMS). Belgelenmiş AI risk değerlendirmesi, risk
tedavisi ve bir etki değerlendirme süreci gerektirir. Sertifikasyon, bir organizasyonun yönetim
sistemine, yani şirketin AI sistemlerini yönettiği sürece uygulanır, belirli bir modele veya ürüne
değil. Bir sertifika, herhangi bir özelliğin güvenli olduğu veya EU AI Act'e uyumlu olduğu anlamına
gelmez; organizasyonun AI riskini yönetmek için belgelenmiş bir süreci olduğu anlamına gelir.

### Hangi çerçeve olursa olsun geçerli olan sorumluluk emsali

Yukarıdaki çerçevelerin herhangi birinden bağımsız olarak, mahkeme ve kurul kararları, bir mühendisin
kafasında taşıması gereken temel maruziyeti çoktan belirledi: bir şirketin müşteriye dönük AI
sisteminin belirttiği her şey, şirketin kendi beyanı olarak ele alınır ve sıradan ihmal ve yanlış
beyan hukuku uygulanır. Bunun yürürlüğe girmesi için EU AI Act, NIST veya ISO 42001'in var olması
gerekmedi; yeni bir tür ifade üreten sisteme uygulanan genel hukuki ilkedir. NYC'nin MyCity chatbot'u,
devlet hizmetlerine özgü bir düzenleyici gri bölgede çalıştı, ama altta yatan ilke, halka açık bir
AI'dan gelen güvenli yanlış ifadelerin operatör için gerçek maruziyet yaratması (hukuki sorumluluk ya
da itibar), Air Canada'yı ısıran ve Chevrolet'in bayisini de ısırmaya çok yaklaşan ilkenin aynısıdır.

### Veri saklama ve PII, mühendislerin gerçekte uyguladığı kısım

Üçüncü taraf bir LLM API'sine gönderilen prompt'lar ve completion'lar, varsayılan olarak sağlayıcı
tarafından loglanır ve bir süre saklanır, aksi açıkça yapılandırılmadıkça PII maruziyeti, celp ve ihlal
yüzeyi riski yaratır. Anthropic'in varsayılanı: girdiler ve çıktılar, işaretlenmedikçe 30 gün içinde
otomatik silinir (işaretlenen içerik 2 yıla kadar, trust/safety sınıflandırıcı skorları 7 yıla kadar).
Zero Data Retention (ZDR), onay gerektiren, organizasyon bazlı bir düzenlemedir; bu düzenleme altında
prompt'lar ve yanıtlar, yanıt döndükten sonra beklemede saklanmaz, ama her özelliği kapsamaz, Files
API veya Batch sonuçları gibi stateful özellikler hariç tutulur ve daha yeni "Covered Models" ZDR
müşterileri için bile zorunlu 30 günlük saklama gerektirebilir. Daha sıkı saklama, ihlal ve celp
yüzeyini azaltır ama sağlayıcının kötüye kullanımı geriye dönük soruşturma yeteneğini de kaldırır ve
bazı gelişmiş veya güvenlik kapılı modeller ZDR altında basitçe mevcut olmayabilir.

| Instrument | Binding? | Applies to | What it actually requires |
|---|---|---|---|
| EU AI Act | Evet, gerçek para cezaları | EU kullanıcılarına hizmet veren sistemler, risk katmanına göre kademeli | Risk sınıflandırması, son tarihe göre kademeli uyum yükümlülükleri |
| NIST AI 600-1 | Hayır, gönüllü | Satın alma baskısı yoluyla herhangi bir GenAI sistemi | Govern/Map/Measure/Manage'e eşlenen 12 adlandırılmış risk kategorisi |
| ISO/IEC 42001 | Hayır, gönüllü (sertifikalanabilir) | Organizasyonun AI yönetim sistemi | Belgelenmiş risk değerlendirme ve tedavi süreci |
| Data retention config (e.g. ZDR) | Sözleşmesel, sağlayıcıya özgü | Üçüncü taraf bir LLM'e yapılan herhangi bir API çağrısı | Çağrı sonrası prompt'lara/completion'lara ne olacağını kontrol eder |
| General negligence/misrepresentation law | Evet, içtihat hukuku | AI üretimli olsun olmasın, herhangi bir halka açık ifade | Şirket chatbot'unun söylediğinin sahibidir, AI'ya özgü savunma yok |

## Northwind'de pratikte

Northwind'in hukuk ekibi, 2.000 bayi müşterisi ve çalışanlar tarafından Slack üzerinden kullanılan
Desk'in "EU AI Act'e uyumlu" olup olmadığını ve şirketin ISO/IEC 42001 sertifikasyonuna ihtiyacı olup
olmadığını soruyor. İlk iş evet veya hayır cevaplamak değil, sınıflandırmadır: Desk'in bayi karşılı
özellik seti (iç belgelerden soruları cevaplamak, siparişleri aramak, bir limite kadar kredi vermek,
ticket açmak), Annex III yüksek riskli yükümlülükler altına mı giriyor, genel amaçlı AI model sağlayıcı
yükümlülükleri altına mı (olası değil, Northwind bir model sağlayıcısı değil bir deployer), yoksa
hiçbirine mi? Bu sınıflandırma kararının şirket içinde bir sahibi olması gerekir ve Desk yeni bir
yetenek kazandığında onu yeniden çalıştırmak için bir süreç gerekir, çünkü hukuki etkisi olan otomatik
bir karar eklemek (örneğin bir eşiğin üzerindeki bir kredi talebini otomatik olarak reddetmek)
sınıflandırmayı değiştirebilir.

Ayrı olarak, ISO/IEC 42001 ve NIST AI 600-1'i gerçekte oldukları şey olarak ele al: yararlı dahili
disiplin ve bir satın alma/denetim sinyali, EU AI Act sınıflandırma çalışması için bir ikame değil.
Northwind ISO 42001 sertifikasyonuna girişirse, Northwind'in AI riski değerlendirmesi ve tedavisi için
belgelenmiş bir süreci olduğunu sertifikalandırır, Desk'in kredi verme özelliğinin yasal olarak Act'e
uyumlu olduğunu sertifikalandırmaz.

Saklama konusunda: Desk'in konuşmalarının, bayi belge sorgularının, çalışan Slack mesajlarının
gerçekte LLM sağlayıcısına ne gönderildiğini ve sağlayıcının varsayılan saklamasının ne olduğunu
denetle. Çalışan Slack erişiminin şirketin belge deposuna dokunduğunu ve bayi etkileşimlerinin hesap
ve sipariş ayrıntıları içerebileceğini göz önüne alarak, bu trafik için Zero Data Retention veya eşdeğer
bir düzenlemenin gerekip gerekmediğine açıkça karar ver, bunun aynı zamanda sağlayıcının gelecekteki
bir kötüye kullanım olayını araştırmaya yardım etme yeteneğini de kaldırdığını anlayarak; bu gerçek bir
takas, saf bir güvenlik kazancı değil.

Ve yukarıdaki her çerçeveden bağımsız olarak, Desk'in ürettiği ifadeleri şirketin web sitesine verdiği
aynı editoryal kontrolle ele al: Desk'in ürettiği herhangi bir politika, fiyatlandırma veya hukuki
iddia, northwindsupply.com'daki bir sayfayla aynı hesap verebilirliğe sahip olmalıdır, çünkü bir kurul
veya mahkeme ikisi arasında bir ayrım yapmayacaktır. Belgelenmiş, tekrarlanan hukuki hatalardan sonra
sadece bir uyarıyla çevrimiçi bırakılan MyCity dersi, tekrarlanmaması gereken spesifik hatadır: bir
uyarı bir düzeltme değildir ve belgelenmiş, tutarlı yanlış cevaplara doğru yanıt, altta yatan grounding
düzeltilene kadar özelliği kaldırmak veya sadece-retrieval moduna kısıtlamaktır (Lesson 18 bunu nasıl
yapacağını ele alıyor).

## İyi mühendislerin bildiği

- "Uyumlu" ikili bir özellik değildir; sorulan spesifik düzenleme altında bir risk katmanı
  sınıflandırmasıyla başlar ve sistem yetenek kazandığında bu sınıflandırma değişebilir.
- Gönüllü bir çerçeve (NIST AI RMF, ISO 42001) ve bağlayıcı bir düzenleme (EU AI Act) birbirinin
  ikamesi değildir; birinde sertifikasyon, diğerine uyum hakkında hiçbir şey söylemez.
- ISO/IEC 42001 organizasyonun yönetim sistemini sertifikalandırır, herhangi bir belirli modeli veya
  özelliği değil; bir sertifikanın ürün düzeyinde bir uyum garantisiyle karıştırılmasına izin verme.
- Mahkemeler, bir şirketin chatbot ifadelerini çoktan şirketin kendi beyanları olarak ele alıyor; bu
  sorumluluk, herhangi bir AI'ya özgü düzenlemenin henüz uygulanıp uygulanmadığından bağımsız olarak
  var.
- Bir uyarı bir doğruluk düzeltmesi değildir; NYC'nin kendi deneyimi, belgelenmiş hatalardan sonra
  eklenen bir uyarının, altta yatan yanlış cevapların kullanıcılara ulaşmaya devam etmesini
  durdurmadığını gösteriyor.
- Sağlayıcı düzeyindeki veri saklama varsayılanları (30 gün, işaretlenmiş içerik için daha uzun),
  açıkça aksi yapılandırılmadıkça geçerlidir; bir saklama politikasının seni koruduğunu varsaymadan
  önce trafiğinin gerçekte neyi gönderdiğini bil.
- Zero Data Retention gerçek bir takastır, ücretsiz bir güvenlik yükseltmesi değil: sağlayıcının
  hesabındaki kötüye kullanımı geriye dönük soruşturma yeteneğini kaldırır.
- Şirket içinde birinin, AI risk sınıflandırmasının açık, devam eden sahipliğini üstlenmesi gerekir;
  bu tek seferlik bir lansman günü kararı değildir.

## Karar ver

Northwind'in hukuk ekibi bu çeyrekte bir öneri istiyor: ISO/IEC 42001 sertifikasyonuna girişmek, Desk
için bir EU AI Act risk sınıflandırması yapmak, ikisini de yapmak veya sınırlı compliance bütçesi ve
Desk'in şu anda bir pilotta EU bayi müşterilerine hizmet vermesi göz önüne alınarak henüz hiçbirini
yapmamak. Seçenekler:

1. ISO/IEC 42001 sertifikasyonuna önce girişmek, resmi bir Act sınıflandırması yapılmadan önce bile
   EU müşterilerine ve ortaklara governance olgunluğunu gösterdiği gerekçesiyle.
2. Desk'in belirli özellikleri (kredi verme, belge retrieval'ı, ticket oluşturma) için önce EU AI Act
   risk sınıflandırmasını yapmak ve sınıflandırma gerçek hukuki maruziyeti netleştirene kadar ISO
   42001'i ertelemek.
3. İkisini paralel yapmak, ISO 42001'i dahili süreç disiplini, Act sınıflandırmasını da hukuki açıdan
   taşıyıcı egzersiz olarak ele alıp birleşik maliyeti kabul etmek.
4. Desk hâlâ sınırlı EU bayi hacmine sahip bir pilot olduğu için her ikisini de şimdilik ertelemek ve
   pilot ölçeklendiğinde yeniden ele almak.

Birini seç ve gerekçelendir, her aracın gerçekte neyi garantilediği arasındaki farkı hukuk ekibine
nasıl anlatacağını da dahil ederek.

## Tek cümlelik özet

> Gönüllü çerçeveler sürecini sertifikalandırır, bağlayıcı düzenleme para cezasını taşır ve mahkemeler
> hangisi geçerli olursa olsun chatbot'unun sözlerinin şirketinin sözleri olduğuna çoktan karar verdi.

## Kontrol sorusu

Northwind, bir risk skoru eşiğinin üzerindeki kredi taleplerini hiçbir insan incelemesi olmadan
otomatik olarak reddeden yeni bir Desk yeteneği ekliyor. Hukuk, bunun Desk'in EU AI Act risk
sınıflandırmasını değiştirip değiştirmediğini soruyor. Ne kontrol ederdin ve Northwind içinde kim
bundan sonra cevabın sahibi olmalı?

## Kaynaklar

- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · 29 Mar 2024 · primary investigative report
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · 2 Apr 2024 · confirms the city kept the bot running after being shown the errors
- [Timeline for the Implementation of the EU AI Act](https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act) · European Commission AI Act Service Desk · live · staged obligation dates including 2026 Digital Omnibus deferrals
- [Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile (NIST AI 600-1)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) · NIST · July 2024 · 12 named GenAI risk categories
- [ISO/IEC 42001:2023](https://www.iso.org/standard/42001) · ISO/IEC · published Dec 2023 · first certifiable AI management system standard
- [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) · Anthropic · live docs · zero data retention scope and exclusions
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024 · the chatbot-as-company-statement liability precedent
