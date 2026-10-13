# Lesson 19 · Neden yavaş: flame graph'lar

**Reading time:** 13 min · **Concept:** CPU vs wall-clock profiling, flame graphs, allocation, GC pressure
**Mission:** 19

## Problem

Yavaş bir istek için trace faydasız bir şey gösteriyor: bir span, `loadProduct`, 40 ms'lik bir istekten 38 ms harcadı, ve Postgres içinde gerçek sorgu sadece 4 ms sürdü. Peki diğer 34 ms nereye gitti? Trace sana *hangi metodun* yavaş olduğunu söyler. Size o metodun zamanı yakarken *ne yaptığını* söylemez. Bunun için farklı bir araca ihtiyacın var: bir profiler.

## Neden zor

"Yavaş"ın dışarıdan birbirinin aynı görünen en az üç farklı sebebi var: CPU bir şey hesaplamakla meşgul, CPU başka bir şeyi (bir lock, bir disk, başka bir thread) beklerken boşta, veya kod garbage collector'ın her şeyi temizlemek için sürekli araya girmesine sebep olacak kadar çok kısa ömürlü garbage üretiyor. Yanlışını düzeltmek bir gün harcar. Bir metodun içinde *zamanın gerçekte nereye gittiğini*, CPU'nun ne yaptığına göre, örnek örnek ayrıştırılmış gösteren bir araca ihtiyacın var.

## Fikir: bir günün işini bloklara yığmak

Profiler'ı bir an için unut. Bir isteği kendin bir kronometre ve bir not defteriyle zamanladığını düşün, her metoda girdiğinde ve çıktığında yazdığını:

```
enter handleRequest        t=0
  enter validate           t=0
  leave validate           t=2
  enter loadProduct        t=2
    enter queryDb          t=2
    leave queryDb          t=7
    enter computeDiscount  t=7
    leave computeDiscount  t=37
  leave loadProduct        t=37
  enter serialize          t=37
  leave serialize          t=40
leave handleRequest        t=40
```

Şimdi bunu yığılmış çubuklar olarak çiz, her metot için bir çubuk, genişlik giriş ile çıkış arasındaki zamanla orantılı, iç içe geçmeye göre yığılmış (kim kimi çağırdı):

```
|--------------------------- handleRequest (40ms) ---------------------------|
|-val-|------------------ loadProduct (35ms) -------------------|---serial---|
      |-queryDb (5ms)-|------ computeDiscount (30ms) -----------|
```

Bu resim bir **flame graph**'tır: her çubuk call stack'teki bir fonksiyondur, x ekseni zamandır (veya örneklerin yüzdesidir), ve bir çubuğun genişliği o fonksiyonun ve çağırdığı her şeyin toplamdan ne kadar sorumlu olduğunu söyler. Uzun, dar bir sivri uç derin çağıran ama az maliyetli bir metottur. Alttaki kısa, çok geniş bir çubuk zamanın gerçekte yaşadığı yerdir: burada, `computeDiscount` 40 ms'nin 30'unda, tüm isteğin dörtte üçü.

Tek bir istek için bunu kendi elinle inşa ettin. Lab'da, Pyroscope aynı resmi saniyede binlerce gerçek istekten, çalışan her thread'in stack'ini saniyede birkaç kez örnekleyerek ve her fonksiyonun ne sıklıkla göründüğünü sayarak inşa ediyor. Yavaş olan bir fonksiyon daha çok örnekte görünür, böylece daha geniş bir çubuk alır. Kronometre yok, manuel not defteri yok, aynı fikir.

### Onu okumak

- **Genişlik** önemli olan şeydir. Herhangi bir derinlikteki geniş bir çubuk zamanın gittiği yerdir, stack'in üstünde mi yoksa beş çağrı derinde gömülü mü olduğu fark etmez.
- **Yükseklik** (derinlik) sadece çağrı zincirini söyler: kim kimi çağırdı. Uzun bir stack mutlaka yavaş bir stack değildir.
- Geniş bir çubuğa tıkla ve o yeni "tam genişlik" olur: call tree'nin o kısmına, bir fotoğrafa zoom yapar gibi zoom yaparsın.

## Neden zor, ikinci bölüm: örnekler gerçekte neyi ölçüyor?

İşte insanları yanıltan kısım. Bir profiler iki farklı şeyi örnekleyebilir, ve bunlar aynı yavaş metot hakkında farklı hikayeler anlatır.

**CPU (on-CPU) profiling** sadece bir thread gerçekten bir CPU core'unda çalışırken bir örnek alır. `computeDiscount` sıkı bir döngüde aritmetik yapıyorsa, her örnek onu yakalar, ve geniş bir çubuk olarak görünür: CPU gerçekten hesaplamakla meşgul.

**Wall-clock (off-CPU) profiling** bir thread'i çalışıyor olsun olmasın örnekler: bir lock'ta bloklanmış, bir socket read'i beklerken, thread scheduler tarafından park edilmiş. `computeDiscount` o 30 ms'yi başka bir thread'in tuttuğu bir `synchronized` bloğu beklemekle geçirdiyse, bir CPU profile bunu neredeyse hiç göstermez, çünkü thread CPU'yu kullanmıyordu. Bir wall-clock profile aynı geniş çubuğu gösterir, ama zaman çalışıyor değil bekliyor olarak etiketlenir.

Aynı 30 ms, aynı metot, iki tamamen farklı düzeltme: CPU-bound bir hot spot daha iyi bir algoritma veya istek başına daha az iş gerektirir; bir lock-wait daha hızlı bir döngü değil, daha az contention gerektirir. Neyi optimize edeceğine karar vermeden önce her zaman hangi tür profile'a baktığını kontrol et. Lab'daki Pyroscope her ikisini de gösterebilir; dashboard panelinin başlığı hangisini okuduğunu söyler.

## Allocation ve GC pressure

Ne CPU zamanının ne de bekleme zamanının tek başına iyi açıklayamadığı üçüncü bir "yavaş" türü var: uygulama CPU zamanını sürekli küçük, kısa ömürlü nesneler oluşturmakla geçiriyor, ve JVM'in garbage collector'ı bunları temizlemek için dünyayı (veya en azından bir kısmını) durdurmak zorunda kalıyor. Buna **GC pressure** denir: garbage collection'ın bozuk olduğu anlamına gelmez, uygulamanın o kadar çok garbage ürettiği, o kadar hızlı ki, onu toplamanın gerçek bir maliyet haline geldiği anlamına gelir.

Her tabağın sonradan atılan taze bir tabakta servis edildiği bir mutfak düşün. Bir yemek, sorun yok. Saatte bin yemek, ve şimdi birinin sürekli depoya tabak için koşması ve çöpün her birkaç dakikada bir dışarı çıkarılması gerekiyor, pişirmekle hiçbir ilgisi olmayan ama ondan zaman çalan bir iş. Bir **allocation profile** (bu da örneklerden inşa edilmiş, bu kez "hangi kod satırı az önce bir nesne oluşturdu" örneklerinden) sana tam olarak hangi metodun garbage ürettiğini gösterir: genellikle bir döngünün yeniden kullanabileceği yerde istek başına aynı küçük listeyi veya string'i tekrar tekrar inşa ediyordur. Allocation'lar için flame graph CPU zamanı için olanla tam olarak aynı görünür, sadece genişlik "burada ayrılan byte" değil "burada harcanan zaman" anlamına gelir.

GC pressure'ı dashboard'da bir testere dişi olarak göreceksin: nesneler yığıldıkça heap kullanımı tırmanır, sonra collector çalıştığında sert bir şekilde düşer, ve çalışırken uygulama thread'leri kısa süre durduğu için request latency'si yükselir. CPU kullanımı yüksekse ama CPU flame graph'ında tek bir metot hakim değilse, sonra allocation profile'ı ve GC pause metriklerini kontrol et: CPU işine değil garbage toplamakla meşgul olabilir.

## Bununla nerede karşılaşırsın

- "Database sorgunun hızlı olduğunu söylüyor ama endpoint yavaş": zaman Java kodunda bir yerde, ve bir CPU veya wall-clock profile sana nerede olduğunu gösterecek tek şey.
- Sıcak bir yol için code review: "bu döngü öğe başına yeni bir nesne mi ayırıyor?" kod hiç production'a ulaşmadan önce sorulması makul bir soru.
- Bir düzeltmeden sonra bir metodun iki versiyonunu karşılaştırmak: geniş çubuk gerçekten daraldı mı, yoksa sadece call tree'de başka bir yere mi taşındı?

## Tek cümlelik özet

> Bir flame graph binlerce stack örneğini genişliği zaman (veya byte) olan yığılmış çubuklara çevirir, böylece en derin çubuk değil en geniş çubuk bir isteğin zamanının gerçekte nereye gittiğini söyler, ve bu çubuğun bir CPU hot spot, bir lock wait, veya garbage collection olması düzeltmeyi değiştirir.

## Kontrol sorusu

Bir profiler, `parseCampaignPrices`'ı bir CPU profile'ında toplam istek zamanının %60'ında en geniş çubuk olarak gösteriyor, aynı endpoint'in bir wall-clock profile'ı ise `parseCampaignPrices`'ı sadece %8'de gösteriyor. Bu uyuşmazlık metodun gerçekte ne yaptığı hakkında ne söylüyor, ve algoritmasını optimize edip etmemeye karar vermek için hangi profile'a güvenirsin?