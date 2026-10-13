# Lesson 17 · İzinler belgeyi takip eder

**Reading time:** 18 min · **Module:** Knowledge · **Concepts:** permission-aware retrieval, oversharing, tenant isolation
**Cases:** m365-copilot-oversharing

## Problem

Organizasyonlar Microsoft 365 Copilot'u devreye aldıkça, birçoğu bunun maaş verilerini, gizli
hukuki dosyaları ve strateji belgelerini, teknik olarak "görüntüleme" erişimine sahip ama
pratikte o dosyaları bulmaya hiçbir zaman izin verilmemesi gereken son kullanıcılara
sunabildiğini keşfetti. Altta yatan sebep yeni değildi: yıllarca süren izin verici varsayılan
SharePoint paylaşımı (genel siteler, varsayılan "herkes" bağlantıları, eksik hassasiyet
etiketleri), birçok çalışanın zaten hassas içeriğe gizli, nominal erişime sahip olduğu anlamına
geliyordu. Ticaret basınında alıntılanan 132 BT liderinin katıldığı bir Gartner anketi, veri
fazla-paylaşımı kaygılarının katılımcıların %40'ının Copilot lansmanını üç ay veya daha fazla
geciktirmesine neden olduğunu ve %64'ünün bilgi-yönetişimi ve güvenlik incelemesinin önemli
zaman ve kaynak gerektirdiğini söylediğini buldu.
([Computerworld](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html))

Microsoft'un kendi belgeleri, bunun Copilot'un erişim kontrolünü atlatması olmadığını açıkça
belirtiyor: Semantic Index "her bireyin erişebildiği verileri sunar", mevcut M365 izin modelini
kullanarak.
([Microsoft Learn](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy))
İki şey de aynı anda doğru ve bu, bu case'i basit bir yazılım hatasından ziyade öğretici yapan
tam olarak bu: Copilot var olan erişim kontrolünü uyguladı ve var olan erişim kontrolü, kimsenin
daha önce fark etmediği bir şekilde çoktan bozuktu, çünkü fazla-paylaşılan bir dosyayı gözatarak
bulmak, onun var olduğunu bilmeyi ve doğrudan onu aramayı gerektiriyordu. Doğal dil sorgusuyla
bir semantik arama katmanı, aynı gizli fazla-maruziyeti, doğru soruyu ifade edebilen herkes
tarafından ölçekte keşfedilebilir bir şeye dönüştürdü.

## Neden zor

Yetkilendirme mantığı inşa eden bir backend mühendisi tek bir sınıra aşinadır: bu kullanıcının bu
kaynağa erişim izni var mı, okuma zamanında kontrol edilir, veri katmanı tarafından uygulanır.
RAG ikinci bir sınır ekler ve benzer görünür ama gerçekte farklı bir soru: bir kullanıcı
asistanı sorgulamaya yetkiliyse, corpus'taki milyonlarca belgeden hangileri onun spesifik
sorgusunda retrieval için *aday* olmalı. Bu iki kontrolü birbirine karıştırmak, fazla-paylaşımı
etkinleştiren tam olarak hatadır. "Kullanıcının organizasyonunun bir Copilot lisansı var" iddiası,
"bu spesifik belge bu spesifik kullanıcı tarafından alınabilir olmalı" iddiasıyla aynı değildir ve
sadece birincisini kontrol eden bir sistem erişim kontrolü yapmıyor, kimlik doğrulama yapıyor.

"Role göre" filtreleme içgüdüsü sorunu katmerleştirir. Role dayalı filtreleme temiz, güncel
rol-belge eşlemeleri varsayar; çoğu kurumsal belge deposu, üzerine bir RAG sistemi inşa
edilmeden önce yıllarca izin borcu biriktirir; klasörler "sadece bu proje için" paylaşılır ve
hiç paylaşımdan kaldırılmaz, siteler bir geçiş sırasında genel olarak işaretlenir ve bir daha
kapatılmaz, hassasiyet etiketleri çoğu yazarın atladığı opsiyonel metadata'dır. Bu veriye yüz
değerinde güvenen bir RAG retriever'ı, o kayma yıllarının her birini devralır ve bunların
hepsini aynı anda, canlıya geçtiği gün devralır.

İkinci açık olmayan tuzak zamansaldır: izin durumu değişir (biri bir projeden ayrılır, bir
sözleşmecinin erişimi iptal edilir, bir belgenin hassasiyet etiketi değişir), ama bir vektör
indeksi tipik olarak bir kez inşa edilir ve bir programa göre yenilenir. İzin kontrolü, sorgu
zamanındaki canlı izin sistemine karşı değil, indeksleme zamanında indekse gömülen bir anlık
görüntüye karşı yapılıyorsa, dün erişimi iptal edilmiş bir kullanıcı, dosyaya doğrudan gözatma
bunu doğru şekilde reddedecek olsa bile, bugün asistan üzerinden içeriği hâlâ alabilir.

## Fikir: access control index anında konan bir etiket değil, retrieval anında uygulanan bir filtre

### Permission-aware retrieval (ACL ile filtrelenen RAG)

Bir kurumsal RAG sistemi, retrieval adaylarını, relevance sıralamasından önce, sonra değil,
istek yapan kullanıcının gerçek belge-seviyesi izinlerine göre sorgu zamanında filtrelemelidir.
Ayrım önemli: sıralamadan sonra filtreleme, yasak bir belgenin hâlâ bir top-k slotunu
işgal edebileceği ve geç atılabileceği, retrieval bütçesini harcadığı ve filtrenin aşağı akışın
herhangi bir yerinde bir hatası varsa sızıntı riski taşıdığı anlamına gelir; sıralamadan önce
filtreleme, yasak belgenin hiçbir zaman aday bile olmadığı anlamına gelir.

### İki ayrı kontrol isteyen iki ayrı soru

"Bu kullanıcının bu belgeye nominal erişimi var mı" ve "bu belge herkesin doğal dil
istemiyle kolayca keşfedilebilir olmalı mı" farklı risk eşikleridir ve Microsoft'un kendi
olay-sonrası aracı bu ayrımı açıkça yansıtıyor. Restricted Content Discovery, yöneticilerin bir
siteyi özellikle AI retrieval'dan hariç tutmasına, dosyayı URL ile doğrudan açabilenleri
değiştirmeden, izin verir; bu hızlı ve geri alınabilir. Altta yatan izin durumunu düzeltmek
("herkes" varsayılanlarını kaldırmak, genel siteleri denetlemek, hassasiyet etiketleri
uygulamak) daha yavaştır ve yapısal olarak doğrudur, çünkü aynı zamanda AI dışı maruziyeti de
düzeltir (dosyanın var olduğunu zaten bilen herkes zaten her zaman onu açabiliyordu). İkisine de
ihtiyaç var; hiçbiri diğerinin yerine geçmez.

| Control | Speed | What it actually fixes |
|---|---|---|
| Restricted Content Discovery (exclude from AI retrieval) | Hızlı, geri alınabilir | Sadece AI tarafından yüzeye çıkan keşfedilebilirlik; dosya bağlantıya sahip herkes tarafından hâlâ açılabilir |
| Site/permission audit (remove default-everyone, add sensitivity labels) | Yavaş, yapısal | Altta yatan erişim-kontrol borcu, AI retrieval ve diğer her erişim yolu için |

### Gerçek zamanlı ACL lookup ve eskimiş snapshot

Canlı bir izin sistemine karşı sorgu bazında izin filtrelemesi uygulamak, her retrieval
çağrısına gerçek zamanlı arama gecikmesi ekler. İndeksleme zamanında bir izin anlık görüntüsünü
indekse gömmek, sorgu bazında daha ucuzdur ama yukarıdaki eskime sorununu tam olarak riske eder:
erişimi dün geri alınmış bir kullanıcının içeriği hâlâ alması. Burada bedava bir seçenek yok; takas,
gecikme ve altyapı karmaşıklığı ile tolere etmeye razı olduğun eskime penceresi arasındadır ve bu
pencere, indeksin nasıl yeniden inşa edildiğinin bir kazası değil, yüksek sesle belirtilen bilinçli
bir seçim olmalıdır.

### Tenant isolation, aynı problemin daha sert bir sınırdaki hali

Yukarıdakilerin hepsi bir organizasyonun kendi çalışanları içinde geçerlidir. Multi-tenant
sistemler (paylaşılan altyapıdan birçok ayrı müşteri organizasyonuna hizmet veren bir SaaS ürünü)
kesinlikle daha zor bir versiyonla karşı karşıya: bir çalışanın belgesini başka bir çalışana
sızdıran bir retrieval hatası kötü bir gün; Tenant A'nın belgesini Tenant B'nin alınan bağlamına
sızdıran bir retrieval hatası bir ihlal bildirimi, bir sözleşme ihlali ve muhtemelen düzenleyici
bir olaydır. Tasarım çıkarımı, tenant izolasyonunun veri katmanında sert bir sınır olarak
uygulanması gerektiğidir (ayrı indeksler veya herhangi bir sorgu yolu tarafından atlanamayan
zorunlu bir tenant-id filtresi), bir retrieval fonksiyonunun sadece kontrol etmesi gerektiğini
hatırlaması beklenen opsiyonel bir metadata alanı olarak değil.

## Northwind'de pratikte

Desk, aynı altta yatan belge deposuna karşı gerçekten iki farklı popülasyona hizmet ediyor:
2.000 bayi müşterisi (her biri sadece kendi sözleşmesini, fiyat katmanını ve sipariş geçmişini
görmeli) ve Slack üzerinden 600 Northwind çalışanı (daha geniş dahili erişime sahip, ama sınırsız
erişim değil: maaş, hukuk ve İK belgeleri çoğu için de alınabilir olmamalı).

1. Bayi-yönlü Desk'i ve çalışan-yönlü Desk'i bir izin gradyanına sahip tek bir asistan olarak değil,
   iki tenant sınırı olarak ele al. Bayi-yönlü indeks, veri katmanında sert bir bayi-başına filtre
   uygulamalıdır (bayi A'nın sorgusu bayi B'nin sözleşmesine etiketlenmiş bir parçayı asla alamaz),
   gelecekteki bir refactor'ün yanlışlıkla atlayabileceği bir uygulama-seviyesi "if" ifadesi olarak
   değil, multi-tenant bir SaaS veritabanında tenant'ları izole ettiğin aynı şekilde.
2. Çalışan-yönlü Slack versiyonunu başlatmadan önce, Northwind'in belge deposunda "nominal erişimi
   var" ile "bir Slack sorgusu tarafından keşfedilebilir olmalı" arasındaki ayrımı, M365 Copilot
   olayının açığa çıkardığı tam ayrımı, ayıran bir izin denetimi çalıştır. Bunu lansmandan önce yap,
   bir şikayetten sonra değil.
3. Desk'in retrieval filtresinin sorgu bazında canlı bir izin sistemini mi yoksa bir programa göre
   yenilenen bir izin anlık görüntüsünü mü kontrol ettiğine açıkça karar ver ve belgele, ve sonuncusu
   ise maksimum eskime penceresinin ne olduğuna ve bunun Northwind'in veri hassasiyeti için kabul
   edilebilir olup olmadığına.
4. Desk için Restricted Content Discovery'nin eşdeğerini inşa et: biri bir fazla-paylaşım kaygısı
   işaretlediği anda, tam bir izin düzeltme projesinden ayrı ve ondan daha hızlı, spesifik bir
   belge veya klasörü retrieval adaylığından çıkarmanın hızlı, geri alınabilir bir yolu.
5. Her kullanıcının sorgularının gerçekte ne yüzeye çıkardığını kaydet, böylece bir fazla-paylaşım
   olayı, sadece önceden teoride önlenmek yerine, olduktan sonra tespit edilebilir ve kapsamı
   belirlenebilir.

## İyi mühendislerin bildiği

- "Asistanı kullanmaya erişimi var" ve "bu belge bu kullanıcı tarafından alınabilir olmalı" iki
  farklı yetkilendirme kontrolüdür; sadece birincisini uygulayan bir sistem hiç belge-seviyesi
  erişim kontrolü yapmıyor demektir.
- İzin borcu (eskimiş paylaşım ayarları, eksik hassasiyet etiketleri) RAG sisteminden öncedir ve
  gün birinden toptan devralınır; lansman öncesi bir izin denetimi opsiyonel hijyen değildir, gerçek
  güvenlik kontrolüdür.
- Bir doğal dil arama katmanı yeni erişim yaratmaz, mevcut erişimi bulmayı kolaylaştırır; bu
  yeniden çerçeveleme, kimin sorumlu tutulduğu (Microsoft'un kendi belirttiği pozisyonda AI
  tedarikçisi değil, platform sahipleri) ve gerçek düzeltmenin neye benzediği için önemlidir.
- AI keşfedilebilirliğini kısıtlamak ve altta yatan izinleri düzeltmek, farklı zaman çizelgelerine
  sahip farklı projelerdir; hızlı, geri alınabilir olanı önce göndermek meşru bir ara hafifletmedir,
  yavaş, yapısal olanın yerine geçen bir şey değildir.
- Eskimiş bir indeks anlık görüntüsüne karşı kontrol edilen bir izin filtresi, iptal edilmiş
  erişimin asistan üzerinden hâlâ çalıştığı bir eskime penceresine sahiptir; bu pencereyi örtük
  bırakma, bir sayı olarak belirt.
- Bir AI retrieval katmanı için multi-tenant izolasyon, multi-tenant bir veritabanı şemasının
  alacağı aynı sert-sınır muamelesini (ayrı indeksler veya zorunlu, atlanamaz tenant filtreleri)
  hak eder; uygulama kodundaki bir "if" ifadesi yapısal bir sınırın yerine geçmez.
- Her sorgunun kullanıcı bazında gerçekte ne aldığını kaydetmek, "filtrenin işe yaradığını umuyoruz"u
  "filtrenin ne yaptığını kanıtlayabiliriz"e dönüştüren şeydir ve lansman öncesi testinin
  kaçırdığı bir fazla-paylaşım olayını tespit etmenin tek yoludur.

## Karar ver

Northwind'in hukuk ekibi, Desk'in çalışan Slack versiyonunun bir ticaret fuarı gösterimi için altı
hafta içinde canlı olmasını istiyor. Dahili belge deposunun (SharePoint-eşdeğeri) izin denetimin,
klasörlerin kabaca %15'inin aşırı geniş "herkes" paylaşımına sahip olduğunu, çoğunlukla iki yıldır
kimsenin dokunmadığı eski proje klasörlerinde, buluyor ve hepsini düzgün şekilde düzeltmek
(sahipliği yeniden kapsamlandırmak, hassasiyet etiketleri eklemek) tahmini on hafta BT çalışması
gerektiriyor. Seçenekler: (a) tam düzeltme bitene kadar lansmanı geciktir, (b) zamanında başlat ama
düzeltme tamamlanana kadar işaretlenen her klasöre Restricted-Content-Discovery tarzı bir
hariç tutma uygula, (c) hiçbir değişiklik yapmadan zamanında başlat, Desk'i sorgulayan çalışanların
%15'e takılmayacağına bahis oyna, (d) tüm belge deposu yerine sadece önceden onaylanmış bir
klasör allowlist'ini indeksleyen azaltılmış kapsamlı bir Desk başlat. Birini seç ve hangi kalıntı
riski kabul ettiğini belirt.

## Tek cümlelik özet

> Permission-aware retrieval, bir index-time etiketi veya bir organizasyon-seviyesi lisans kontrolü
> değil, gerçek belge-seviyesi erişime karşı bir query-time filtresidir ve Copilot fazla-paylaşım
> bölümü, önceden var olan izin borcunun, bir doğal dil arama katmanı üzerine oturduğu anda çok
> daha büyük bir ölçekte istismar edilebilir hale geldiğini gösteriyor.

## Kontrol sorusu

Finans departmanındaki bir Northwind çalışanı, Desk'e Slack üzerinden "bölgesel yöneticiler
tarafından işaretlenen Q3 bayi iade istisnalarını özetle" diye soruyor. Desk üç belgeyi alıyor ve
özetliyor, bunlardan biri bir bölgesel yöneticinin performans değerlendirmesi hakkında bir taslak
İK memosu olup rastlantısal olarak Q3 iade istisnalarından bahsediyor. Çalışanın İK erişimi yok.
Bu lesson'ın erişim-kontrolü soruları arasındaki ayrımını kullanarak, hangi kontrolün bunu
önlemesi gerektiğini ve retrieval pipeline'ının hangi aşamasına ait olduğunu açıkla.

## Kaynaklar

- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024 · the oversharing mechanism, the Gartner survey figures, and Microsoft's Restricted Content Discovery / Purview response.
- [Data, Privacy, and Security for Microsoft Copilot](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) · Microsoft Learn · current · the stated design intent that the Semantic Index respects the identity-based access boundary.