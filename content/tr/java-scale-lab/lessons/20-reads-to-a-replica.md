# Lesson 20 · Okumalar bir replica'ya gider

**Reading time:** 11 min · **Concept:** primary/replica, replication lag, read-your-writes, routing reads
**Mission:** 20

## Problem

Tek Postgres instance'ın meşgul: `GET /api/products` ve `GET /api/dealers/{id}/orders` read-only ve sürekli çalışıyor, ama verileri gerçekten değiştiren write'larla, `POST /api/orders`, aynı connection'lar ve aynı CPU için rekabet ediyorlar. İlkinin canlı bir kopyası olan ikinci bir Postgres instance ekliyorsun ve okumaların çoğunu oraya gönderiyorsun. Fiyat listeleri hızlanıyor. Sonra bir bayi sipariş veriyor, hemen "siparişlerim"i açıp geçtiğini kontrol ediyor, ve görmüyor. Support bir ticket alıyor: "uygulama siparişimi kaybetti". Sipariş database'de, tamamen güvende oturuyor. Sadece henüz kopyaya ulaşmadı.

## Neden zor

Okumaları write'lardan ayırmak bedava kapasite gibi görünür: iki kat database, iki kat throughput. Biraz eski veri okuyan kısım için bu doğrudur. Bir kullanıcı kendi çok yeni write'ını okuyup hemen görmeyi beklediği anda bedava değildir. Sistem şimdi "orders tablosu"nun eventually ama anında değil anlaşan iki farklı versiyonuna sahip, ve istek başına hangi versiyonun hangi okumaya görünmesine izin verildiğine karar vermen gerekiyor.

## Fikir: sahibin defteri ve kasiyerin fotokopisi

Sadece sahibin yazdığı bir sipariş defteri olan küçük bir fırın düşün: her satış önce oraya, sırayla yazılır. Tezgahtaki müşteriler sahibi beklemiyor; bunun yerine, kasiyer defterin bir **fotokopisini** tutuyor, ki sahip bunu her birkaç saniyede bir, boş bir dakikası olduğunda yeniden kopyalıyor. Çoğu soru, "12 numaralı bayi geçen hafta ne aldı", fotokopiden gayet iyi cevaplanabilir, ve şimdi sahip yeni siparişleri almaya odaklanmakta özgür.

Database terimleriyle, sahibin defteri **primary**'dir: write'ları kabul eden tek kopya. Kasiyerin fotokopisi bir **replica**'dır: otomatik olarak güncel tutulan ama sadece okuma kabul eden bir kopya. "Sahibin yazdığı" ile "fotokopinin gösterdiği" arasındaki boşluğa **replication lag** denir, genellikle bir saniyenin bir kesri ama asla tam olarak sıfır değil.

### Boşluk ısırdığında

Replica'nın primary'nin genellikle 300 ms gerisinde olduğunu söyle. Bir bayi 10:00:00.000'da sipariş veriyor. Write anında primary'ye iniyor. Fotokopi 10:00:00.300 civarında yetişiyor. Bayinin uygulaması 10:00:00.100'de replica'ya yönlendirilmiş `GET /api/dealers/{id}/orders`'ı çağırırsa, yeni sipariş basitçe orada değildir: kasiyer o sayfayı henüz yeniden kopyalamamıştır. Kırk saniye sonra aynı çağrı gayet iyi çalışır. Veri hiçbir zaman kaybolmadı. Okuma sadece çok erken geldi.

Bu özel beklenti, "az önce yazdığım şeyi hemen görmeliyim", **read-your-writes** olarak adlandırılır. Bu, düz bir replica'nın sana verdiği bir garanti değildir. Onu bilerek eklemen gerekir.

### Read-your-writes'ı korumanın üç yolu

1. **O bir okumayı primary'ye yönlendir.** Bir write'tan hemen sonra, az önce yazdığın şeyi replica'dan değil primary'den oku. Lab'da bu şu anlama gelir: `POST /api/orders` başarılı olduktan sonra, *o* sipariş için confirmation ekranı primary'den okur, bayinin az önce değiştirmediği genel sipariş geçmişi listesi hâlâ replica'dan okuyabilir.
2. **Replica'nın yetişmesini bekle**, sonra oku. Çalışır, ama şimdi bayinin ekranı database'inin iç bakım işini bekliyor, ki bu bir replica'ya sahip olmanın amacının bir kısmını yeniyor.
3. **Zaten sahip olduğun veriyi döndür.** `POST /api/orders`'ın yanıtı az önce oluşturduğun siparişi zaten içeriyor. Bir sonraki ekran bu yanıttan, taze bir okuma yerine, inşa edilebilirse, kaygı duyulacak hiçbir lag yoktur. Çoğu zaman en ucuz düzeltme, az önce söylendiğin bir şey için database'i tekrar sormamaktır.

Bunların hiçbiri replication lag'i sıfır yapmaz. Seni mahcup edecek belirli okumaları, hiçbir zaman geride olmayan tek yere gönderirler: primary.

### Neyin nereye gideceğine karar vermek

Her okumanın lag'den kaçması gerekmez. **Fiyat listesi** (`GET /api/products`) nadiren değişir ve herkes tarafından okunur; bir bayinin yarım saniye eski bir fiyat görmesi neredeyse hiç önemli değildir, dolayısıyla replica için mükemmel bir uyum, ve ayrıca en çok yük altındaki endpoint, dolayısıyla onu primary'den taşımak en çok rahatlamayı satın alır. **Sipariş verdikten hemen sonraki sipariş geçmişi** tam tersidir: nadir, ve staleness'ın fark edecek olan tek kişiye tam olarak görünür olduğu an. Uyguladığın kural: endpoint hangisi olduğuna değil, buradaki eski bir cevabın ne kadara mal olacağına göre yönlendirmek.

## Boşluğu beklediğinden büyük yapabilecek şey

Replication lag sabit bir sayı değildir. Primary bir kerede çok write yaptığında (bir kampanya günü saniyede birçok sipariş geldiğinde), primary ile replica arasındaki network yavaş veya tıkalı olduğunda, veya replica'nın kendisi ağır bir okumayı yanıtlamakla meşgul olup yeniden kopyalamada geri kaldığında büyür. Herhangi bir trafiği bir replica'ya yönlendirdiğinde replication lag için bir dashboard paneli opsiyonel değildir: sessizce 30 saniye geride kalmış bir replica, 30 saniye yanlış cevaplar veriyordur, ve normal bir yanıtta çağırana bunu söyleyen hiçbir şey yoktur.

## Bununla nerede karşılaşırsın

- Herhangi bir read-after-write ekranı: "sepete ekle, sonra sepete bak", "bir yorum gönder, sonra thread'de gör", "sipariş ver, sonra geçmişimde gör".
- Write'ları ölçeklemeden önce okumaları ölçeklemek: çoğu sistemin write'tan çok daha fazla okuması vardır, dolayısıyla bir replica genellikle index'ler ve caching'den sonraki en ucuz adımdır, primary'yi sharding yapmak değil.
- "Veri gayet iyiydi, replica sadece gerideydi"in gerçek root cause olduğu, veri kaybı olmadığı incident review'ları.

## Tek cümlelik özet

> Bir replica sana küçük, asla tam sıfır olmayan bir gecikme karşılığında daha fazla okuma kapasitesi verir, dolayısıyla iş hangi okumaların bu gecikmeye tolere edebileceğine karar vermek ve tolere edemeyen azını primary'ye geri yönlendirmektir.

## Kontrol sorusu

Replica'nın lag'i genellikle 150 ms ama bir kampanyanın sipariş patlaması sırasında 2 saniyeye çıkıyor. Bir bayi patlama sırasında sipariş veriyor ve confirmation sayfası sipariş listesini 500 ms sonra replica'dan okuyor. Siparişlerini görecekler mi? Replica'yı kapatmadan, bunu garanti etmek için yapabileceğin en küçük değişiklik nedir?