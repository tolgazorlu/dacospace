# Lesson 11 · Fiyat listesi cache'i

**Reading time:** 11 min · **Concept:** Redis, cache-aside, TTL, what to cache, staleness
**Mission:** 11

## Problem

Her hafta içi 09:00'da, bayiler siparişlerini aramadan önce fiyatları kontrol etmek için uygulamayı
açıyor. `GET /api/products?category=` aynı sorguyu sürekli çalıştırıyor, genelde her bayinin önce
baktığı aynı 20 kampanya ürünü için. Veritabanı, dealer 12 için az önce hesapladığı cevabın, bir
dakika sonra dealer 850'nin soracağı cevabın tam olarak aynısı olduğunu bilmiyor. Aralarında fiyat
listesinde hiçbir şey değişmemiş olsa bile her seferinde sıfırdan yeniden hesaplıyor.

## Neden zor

Veritabanı, şu anda doğru olduğuna tam olarak güvenebileceğin tek yer, çünkü her yazma oradan
geçiyor. Bu güvenilirlik aynı zamanda maliyeti: şu anda doğru olmak, bin okumanın üst üste aynı
soruyu sorması durumunda bile her tek okuma için gerçek iş yapmak demek. Çoğu okumanın
veritabanından çok daha hızlı bir yerden yanıtlanmasını istiyorsun, sessizce bayilere yanlış
fiyatlar beslemeden.

## İdea: tezgaha yapıştırılmış basılı bir liste

Fiyat listesinin günde bir kez değişebildiği küçük bir dükkan düşün. Dükkancı, bir müşteri "bu ne
kadar?" diye her sorduğunda arka ofise gidip deftere bakmıyor. Bunun yerine, sabah bir kez listeyi
basıyor ve tezgaha yapıştırıyor. Müşteriler bantı okuyor. Dükkancı gerçekten bir fiyatı
güncellediğinde, ara sıra, yeni bir kopya basıyorlar.

O yapıştırılmış liste bir **cache**'tir: bir cevabın, onu üreten pahalı işi tekrar yapmak zorunda
kalmayasın diye ucuz ve hızlı okunan bir yerde tutulan bir kopyası. Lab'ında, bu cache **Redis**'tir,
Postgres veritabanının yanında duran ve bir okuma için hiçbir zaman diske dokunmadığı için milisaniyenin
çok altında yanıt veren bellek içi bir veri deposu.

### Cache-aside: önce bandı kontrol et, sonra defteri

Uygulayacağın kalıba **cache-aside** denir ve Java servisinin her tek istekte dükkancıyı oynadığı
dükkan hikayesinin tam aynısı gibi okunur:

1. "Flour" kategorisi için bir istek gelir. Önce, Redis'te `products:category:flour` gibi bir anahtara
   bak.
2. **Hit (isabet)**: anahtar oradadır. Döndür. Veritabanına hiç dokunulmaz.
3. **Miss (ıskalama)**: anahtar orada değildir. Postgres'i gerçekten sorgula, cevabı al, o anahtar
   altında Redis'e yaz, sonra çağırana döndür.

Cache boşaldıktan sonra "flour" soran ilk bayi, bir veritabanı sorgusunun tam maliyetini öder ve
cevabı tezgaha yapıştırılmış bırakarak sonraki herkese de iyilik yapar. Bant inene kadar ondan
sonraki her bayi, bunu mikrosaniyelerde okur.

```java
String key = "products:category:" + category;
String cached = redis.get(key);
if (cached != null) {
    return cached;                       // hit
}
String fresh = productRepository.findByCategory(category);  // miss: ask the database
redis.set(key, fresh, Duration.ofSeconds(60));               // tape it up
return fresh;
```

### TTL: bandı ne kadar süre güveneceğine karar vermek

Hiç kimse o fiyat listesini sonsuza kadar yapıştırmadı; yenisiyle değiştiriliyor. Bir cache girdisi
bir **TTL** (time-to-live, yaşam süresi) alır, bundan sonra Redis onu basitçe unutur. 60 saniyelik
bir TTL şu anlama gelir: bu cevaba bir dakikaya kadar güven, sonra at ki bir sonraki istek
veritabanına geri gidip şu anki gerçeği her ne ise alsın. TTL'yi, güvenli hissettiren bir sayı
seçerek değil, "bayat bir fiyat önemli hale gelmeden önce bir bayinin önünde gerçekte ne kadar
oturabilir?" diye sorarak seç.

### Bantta ne durmalı, ne durmamalı

Fiyat listesi, özel bir nedenle cache'leme için iyi bir aday: yazıldığından çok daha sık okunuyor ve
soran her bayi için aynı cevap doğru. Bunu `GET /api/dealers/{id}/orders` ile karşılaştır, bir
bayinin kendi son siparişleri. O cevap her bayi için farklıdır, anahtar başına çok daha az sıklıkta
okunur ve az önce sipariş veren bir bayi, bunu bir TTL süresince beklemeden hemen görmeyi bekler.
O endpoint'i aynı şekilde cache'lemek büyük ölçüde Redis belleğini çarpar ve ara sıra bir bayiye az
önce verdiği siparişi eksik bir liste gösterir. Pratik kural: değiştiğinden çok daha sık okunan ve
TTL ne kadar çalışırsa çalışsın bayatlığıyla rahat olduğun veriyi cache'le.

### Bayatlık (staleness), ödediğin bedeldir

Bir cache, "şu an" konusunda hiçbir zaman mükemmel dürüst değildir. Postgres'te bir fiyatın
değiştiği an ile cache'lenmiş kopyanın süresinin dolduğu an arasında, bazı bayiler eski fiyatı
görür. O boşluk **staleness**'tir (bayatlık). 60 saniyelik bir TTL ve başka hiçbir mekanizma
olmadan, en kötü durumda bir bayi 60 saniyeye kadar güncelliğini kaybetmiş bir fiyat görebilir. Bir
fiyat değişikliği cache'lenmiş bir girdinin yazıldığı anda gerçekleşirse, ortalama olarak bir bayi,
girdi doğal olarak süresi dolup yenilenene kadar TTL'nin kabaca yarısı kadar bayat bir fiyat görür.
Bu, bilerek yaptığın takas: bayiler mikrosaniyelerde cevap alır, karşılığında fiyatlar gerçekliğin
bir TTL'ye kadar arkasında kalabilir.

Bazı veriler için saniyeler düzeyindeki bayatlık bile kabul edilemezse, bir bayinin kendi mevcut
stok rezervasyonu gibi, dürüst cevap: onu cache'leme ya da TTL'yi beklemek yerine yazma gerçekleştiği
anda cache'lenmiş girdiyi geçersiz kıl. Caching, tüm servis için çevirdiğin bir anahtar değil, veri
parçası başına verdiğin bir seçimdir.

## Bununla nerede karşılaşırsın

- Okuma ağırlıklı, nadiren değişen, paylaşılan her cevap: fiyat listeleri, ürün katalogları,
  konfigürasyon, feature flag'ler.
- "Fiyat güncellemesi neden bir dakika görünmedi" sorusu, bütün bir ekibe TTL'nin ne anlama
  geldiğini öğreten, genelde zor yoldan öğretilen destek ticket'ıdır.
- Eklediğin her cache, yanıtlamak zorunda olduğun bir soru da yaratır: altta yatan veri değiştiğinde
  bu anahtarı kim güncelliyor veya siliyor ve "endişelenmeye değer kadar bayat" ne kadar bayat?

## Tek cümlelik özet

> Bir cache-aside Redis cache'i, tekrarlayan, paylaşılan okumaları veritabanı yerine bellekten
> yanıtlar; bedeli, cache'lemek için seçtiğin veri için bilerek seçtiğin bir TTL'lik bayatlıktır.

## Kontrol sorusu

Bir ürünün fiyatı Postgres'te 09:00:00'da değişiyor. Kategorisi için cache'lenmiş girdi 60 saniyelik
bir TTL ile 08:59:40'ta son kez yazılmıştı. En erken hangi saatte, o kategoriyi okuyan bir bayi yeni
fiyatı görecek ve 09:00:10'da onu okuyan bir bayi kabaca kaç saniye bayatlık yaşadı?