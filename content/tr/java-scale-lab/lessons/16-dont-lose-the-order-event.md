# Lesson 16 · Bir fiş, görünmesi gereken iki yer

**Reading time:** 11 min · **Concept:** dual write problem, transactional outbox, Kafka topics and partitions
**Mission:** 16

## Problem

Bir sipariş verilir. Servisin iki ayrı şey yapar: siparişi Postgres'e kaydeder ve sistemin
diğer kısımlarının, bir depo feed'i, bir analitik işi, bir bildirim servisi, tepki
verebilmesi için "yeni bir sipariş oldu" diye ilan eder. Bunlar iki farklı sistemdir. Kayıt
başarılı olup ilan kaybolursa ne olur? İlan çıkar ama kayıt sonra başarısız olup geri alınırsa
ne olur? Her iki durumda da, downstream'deki bir şey artık gerçekle çelişir.

## Neden zor

Basit olması gerekiyormuş gibi geliyor: siparişi kaydet, sonra mesajı gönder. Ama "kaydet,
sonra gönder" iki ayrı eylemdir, birlikte başarılı veya başarısız olmalarını otomatik olarak
sağlayacak bir yol yoktur. İki adım arasındaki bir çökme, bir ağ aksaması veya yavaş bir
downstream sistem seni yukarıdaki iki bozuk durumdan birinde bırakır ve ikisi de açık bir bug
gibi görünmez. Buna **dual write problem** denir: aynı gerçeği, tek bir adımda birlikte
güncellenemeyen iki farklı sisteme yazmak.

## Fikir: mutfak fişi ve pano

Küçük bir fırın tezgahta sipariş alır ve arkada pişirir. Tezgah bir sipariş fişi yazar ve
ayrıca mutfağın başlaması için bir pişirme siparişini yüksek sesle söyler. Tezgahtar fişi
yazdıktan sonra tökezliyor ve bir saat boyunca duyuru yığınını düşürüyor diye hayal et. Fiş
var, sipariş "verilmiş" ama mutfak hiçbir zaman duymadı ve hiçbir şey pişmiyor. Veya tersi:
duyuru oluyor, mutfak pişirmeye başlıyor ve sonra tezgah müşterinin kartının reddedildiğini
fark ediyor ve fişi geçersiz kılıyor. Şimdi artık resmi olarak var olmayan bir sipariş için
ekmek pişiyor.

### Tek seferde, tek yere yazmak, yarım kalamasın diye

Fırının gerçekte kullandığı düzeltme şu: tezgahtar **aynı fişe iki şey yazıyor**, tek bir
hareketle: siparişin kendisi ve ona klipslenmiş, yırtılıp mutfağın izlediği bir panoya
iğnelenmiş bir kopya şerit. Siparişi yazmak ve şeridi iğnelemek tek bir eylem olarak, tek bir
kalemle, tek bir kağıt üzerinde gerçekleşir. Siparişin var olup şeridin var olmadığı veya
tersi bir an yoktur, çünkü bunlar aynı fiziksel yazmadır.

Meşgul tezgahtar değil, ayrı bir koşucu, her birkaç saniyede bir panonun yanından geçer, yeni
şeritleri alır ve mutfağa taşır. Koşucu tökezlerse, şerit hâlâ panodadır; bir sonraki
geçişinde alır.

### Senin servisindeki aynı numara: outbox tablosu

Bunu doğrudan çevir. Sipariş servisin, sipariş satırını ekleyen **aynı veritabanı
transaction'ı** içinde, bir `outbox` tablosuna da bir satır ekler: "sipariş 9001 oluşturuldu,
olay payload'ı burada". Her iki insert de tek bir transaction'ın parçası, dolayısıyla
Postgres ikisinin de birlikte commit olmasını veya birlikte geri alınmasını garanti eder, tam
olarak fişin ve şeridin aynı kağıt parçası olması gibi. Siparişin veritabanında, olayı
tanımlayan eşleşen bir satır olmadan var olduğu bir pencere yoktur, çünkü geri alınmış bir
transaction ikisini de siler ve commit edilmiş bir transaction ikisini de tutar.

Ayrı, küçük bir süreç, **outbox publisher**, outbox tablosundan yayınlanmamış satırları
okur (bu "koşucu"dur) ve onları ileriye, mesajlaşma sistemine gönderir. Bu süreç yarı yolda
çökerse, gönderilmemiş satırlar hâlâ tabloda oturur; bir sonraki çalıştığında onları yeniden
okur. Bu yaklaşımın bütününe **transactional outbox pattern** denir: yayınlaman gereken
gerçeği, iş değişikliğiyle aynı transaction'da kendi veritabanına yaz ve başka bir şeyin onu
daha sonra teslim etmesine izin ver.

### Bu lab'daki "duyuran" sistem nerede: Kafka

Outbox publisher'ın bu lab'da yazdığı mesajlaşma sistemi **Kafka**'dır. Ona dokunmadan önce
ihtiyacın olan üç kelime:

- Bir **topic**, "order-events" gibi, isimlendirilmiş, sıralı bir mesaj akışıdır. Siparişlerle
  ilgilenen her şey, doğrudan çağrılmak yerine o akıştan okur.
- Bir topic **partition**'lara bölünür: bağımsız, sıralı alt akışlar. "order-events"'in 6
  partition'ı varsa ve sistemin toplamda saniyede 60 olay gönderiyorsa, olaylar aralarında
  eşit dağılırsa kabaca her partition'a saniyede 10 olay iner. Sıralama sadece bir partition
  *içinde* garanti edilir, hepsinde birden değil, dolayısıyla aynı sipariş hakkındaki olaylar,
  aralarındaki sıralama önemliyse, aynı partition'a inmelidir (normalde siparişin id'sini
  key olarak göndererek).
- Bir **producer**, bir topic'e mesaj yazan herhangi bir şeydir. Bu lab'da outbox publisher
  producer'dır; mesajları sonunda kimin okuyacağını henüz bilmez veya önemsemez.

## Neden doğrudan publish edip tabloyu atlamıyoruz?

Kafka'yı sipariş-kaydetme kodunun içinden doğrudan çağırabilirdin, hiç outbox tablosu olmadan.
Çoğu zaman işe yarardı. Sorun tam olarak bu lesson'ın başındaki dual write problem'dir: veritabanı
commit'i ve Kafka gönderimi hâlâ bağımsız olarak başarılı veya başarısız olabilen iki ayrı
işlemdir. Outbox, yayınlamayı anlık yapmaz, yayınlama *kararını*, gerçeğin kendisiyle aynı
transaction'a bağlı ve kalıcı hale getirir, dolayısıyla yayınlama adımının kendisi biraz daha
sonra gerçekleşmek zorunda kalsa bile hiçbir şey kaybolmaz.

## Bununla nerede karşılaşırsın

- Bir yazmanın başka bir sisteme "bildirmesi" gerektiği her an: geçersiz kılınacak bir cache,
  güncellenecek bir arama indeksi, gönderilecek bir e-posta, çalınacak bir bildirim.
- Genel olarak event-driven mimariler: production'daki en güvenilir event yayınlama, bu pattern'ı
  veya ona eşdeğer bir şeyi farklı bir isim altında kullanır.
- "Sipariş var ama downstream'de hiçbir şey tepki vermedi"yi debug etmek: outbox satırının hiç
  yazılıp yazılmadığını ve publisher'ın gerçekten çalışıp çalışmadığını kontrol et.

## Tek cümlelik özet

> Bir gerçeği yazmak ve onu ilan etmek, bedava birlikte güncellenemeyen iki farklı sistemdir,
> dolayısıyla ilanı önce kendi veritabanına, aynı transaction'da yaz ve ayrı bir adımın onu
> daha sonra teslim etmesine izin ver.

## Kontrol sorusu

Outbox publisher'ın 10 yayınlanmamış satır okuyor, 7'sini Kafka'ya başarıyla gönderiyor, sonra
10'un hiçbirini gönderilmiş olarak işaretlemeden çöküyor. Publisher bir sonraki başladığında ve
yayınlanmamış satırları yeniden okuduğunda, zaten gönderilmiş o 7 olaya ne olur ve bunu güvenli
hale getirmek için alıcı tarafta neye ihtiyacın olur?