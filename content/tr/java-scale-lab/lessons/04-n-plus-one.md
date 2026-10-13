# Lesson 04 · Bir request, çok sorgu

**Reading time:** 9 min · **Concept:** N+1 queries, Hibernate lazy loading, fetch join / entity graph, batch fetching
**Mission:** 04

## Problem

Bir bayi, son order'larını görmek için `GET /api/dealers/{id}/orders`'ı açıyor. Bir HTTP request,
bir tıklama. Query log'u izliyorsun ve o tek tıklama için onlarca SQL ifadesi geçiyor. Kimse kasıtlı
olarak onlarca sorgu yazmadı. Kimse database'i çağıran bir loop yazmadı bile. Kod tamamen mantıklı
görünüyor. Ama işte oradalar.

## Neden zor

Hibernate'in işi Java object'lerini satırlara ve geri çevirmektir, ve bir database call'unun tam
olarak nerede olduğunu gizlemekte iyidir. `order.getItems()` yazarsın ve normal bir list üzerinde
normal bir getter gibi görünür. Değildir. O list'e ilk dokunduğunda, Hibernate onu doldurmak için
sessizce bir sorgu çalıştırır. `order.getItems()` satırını okuyarak, bu satırın bedava olup olmadığını
veya Postgres'e bir round trip'e mal olup olmadığını anlayamazsın. Maliyet kodda görünmez ve query
log'unda çok görünürdür.

## Fikir: her tek item için arka odayı arayan dükkan

Bir bayinin tezgahta son birkaç order'ını isteyişini hayal et. Sen, tezgahtar, order listesini
raftan alıyorsun: tek bir gidiş. İyi. Şimdi her order için, bayi içinde ne olduğunu görmek istiyor.
Her order için, arka odaya gidip o order'ın item'larını getiriyorsun. Bu order başına bir gidiş.
Sonra, her item için, bayi sadece bir ürün ID'si değil ürün adını istiyor. Her item için, o ürüne
bakmak için arka odaya tekrar gidiyorsun. Bu item başına bir gidiş.

Bir soru sordun ("order'larım") ve bir gidiş, artı order başına bir gidiş, artı item başına bir
gidiş yaptın. Bu şekil, **ana liste için bir sorgu, sonra dokunduğun her ilişkili satır için bir
sorgu daha**, **N+1 problemi** olarak adlandırılır: N parent satırı almak için 1 sorgu, sonra her
birinin altındakileri doldurmak için N (veya daha fazla) ek sorgu.

### Küçük sayılarla saymak

Bir bayinin 3 order'ı olduğunu ve her order'ın 2 item'ı olduğunu varsayalım:

1. 1 sorgu: 3 order'ı al.
2. 3 sorgu: her order için, item'larını getir (çünkü item koleksiyonu **lazy**, yani Hibernate
   onu order'la birlikte yüklemez, sadece kod onu ilk okuduğunda yükler).
3. 6 sorgu: toplam 6 item'ın her biri için, ürününü getir (bu da lazy, item başına bir ürün
   lookup'u).

Toplam: 1 + 3 + 6 = **10 sorgu**, 3 order için. Şimdi 30 fatura ve her birinde 3 satır olan bir
fatura ekranı al. Aynı şekil: 1 + 30 + 90 = **121 sorgu**, bir ekran için. Kullanıcı bir soru sordu.
Database 121 kez cevap verdi.

### Hibernate bunu neden varsayılan olarak yapar

Lazy loading iyi bir nedenle var: her order otomatik olarak her item'ı ve her ürünü her seferinde
çekseydi, sadece order toplamlarını gösteren ekranlar için ihtiyacından çok daha fazla veri
yüklerdin. Lazy loading doğru varsayılan. Problem item'ların lazy yüklenmesi değil. Problem,
onların **hepsini aynı anda** değil, **bir loop içinde, parent başına bir tane** yüklenmesi.

### Üç çıkış yolu

- **Fetch join**: order'ları ve item'larını bir join kullanarak tek bir sorguda iste, böylece
  Hibernate ihtiyaç duyduğu her şeyi bir-artı-yirmi round trip yerine bir round trip'te alır.
- **Entity graph**: Hibernate'e önceden "bir order yüklerken, item'larını ve ürünlerini de yükle"
  de, bir sorguya bağlı adlandırılmış bir plan olarak, her seferinde join'i elle yazmak yerine.
- **Batch fetching**: join'i düzeltmek yerine, Hibernate'e "aynı türden birkaç item'ı lazy-load
  etmen gerektiğinde, bunu, satır başına bir sorgu yerine, tek bir `WHERE id IN (...)` sorgusuyla,
  mesela 20'lik batch'ler halinde yap" de. N+1 şeklini tamamen kaldırmaz, ama 40 sorguyu 2'ye
  çevirir.

Her tool farklı bir trade-off yapar: bir fetch join, bir parent'ın çok çocuğu olduğunda duplicate
parent satırları döndürebilir, ve hepsine ihtiyaç duymayan bir ekran için her şeyi eagerly yüklemek
diğer yönde iş harcar. Tek bir doğru cevap yok, sadece "bu belirli ekran gerçekte neye ihtiyaç
duyuyor" var.

## Bununla nerede karşılaşırsın

- Bir parent'ı çocuklarıyla gösteren herhangi bir liste ekranı: item'larıyla order'lar,
  satırlarıyla faturalar, mesajlarıyla chat'ler. İzole halde hızlı görünen yavaş hissettiren bir
  ekranın en yaygın nedenlerinden biri.
- Code review: database-backed entity'ler üzerinde bir `for` loop içinde çağrılan bir getter
  görmek her zaman bir ikinci bakışa değer.
- Query log ve trace: lab'ın dashboard'u sana art arda, loop iteration'ı başına bir tane,
  birbirine çok benzeyen span göstererek, bu N+1'in parmak izidir.

## Tek cümlelik özet

> N+1, liste için bir sorgu artı bir loop içinde dokunduğun her ilişkili satır için bir sorgu daha
> demektir; düzeltme her zaman, satır başına bir yerine bir veya iki round trip'te ihtiyacın
> olanı istemektir.

## Kontrol sorusu

Bir ekran 15 fatura yüklüyor, ve her faturanın her biri ürünü aranması gereken 4 satır item'ı
var. Kod item'ları fatura başına ve ürünleri satır item başına, birer birer, lazy-load ediyorsa,
bu ekran toplamda kaç SQL sorgusu çalıştırır? Bu sayıyı 1'e yakın bir yere indirecek tek bir
değişiklik ne olur?