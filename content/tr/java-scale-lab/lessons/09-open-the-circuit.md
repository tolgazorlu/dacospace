# Lesson 09 · Devreyi aç

**Reading time:** 13 min · **Concept:** circuit breaker states (closed/open/half-open), failure rate threshold, bulkhead, fallback
**Mission:** 09

## Problem

Geçen mission'da sipariş servisine, ilk hatada vazgeçmek yerine başarısız bir ödeme çağrısını
tekrar denemesini öğrettin. Bu, ara sıra görülen aksaklıklarda işe yaradı. Şimdi ödeme
sağlayıcısının aksamadığını, iki dakika boyunca düzgünce çöktüğünü hayal et: her çağrı kendi tam
timeout'undan sonra zaman aşımına uğruyor. Bunun üstüne her retry de zaman aşımına uğruyor.
Şimdi her birinin başarısız olmadan önce "timeout kere retry" saniye harcadığı request'lerin var
ve her bir saniye için bir thread, eğer çağrı transaction'ın içindeyse bir veritabanı bağlantısı
da tutuyorlar. Ölü bir sağlayıcının iki dakikası, kendi servisinin siparişler ve bir thread ya da
bağlantıya ihtiyaç duyan her şey için kullanılamaz olduğu birkaç dakika üretebilir.

Retry yapmak, hata nadir olduğunda mantıklıydı. Hata kesin olduğunda işleri kötüleştiriyor.

## Neden zor

Şu anda kodunda, "sağlayıcı bir kere hata verdi, şanssızlık" ile "sağlayıcı son 30 saniyedeki
her çağrıda hata verdi, çöktü" durumlarını ayırt eden hiçbir şey yok. Bir retry politikası,
sadece önündeki çağrıya bakar. Ölü bir bağımlılığı dövmeyi durdurmak için, o çağrı daha
başlamadan önce yakın geçmişi hatırlayan ve *bir sonraki* çağrı için bu geçmişe dayanarak karar
veren bir şeye ihtiyacın var. Bu şeyin kendi kendine toparlanması da gerekiyor: hiç kimse
sağlayıcı geri geldiğinde sadece bir anahtarı tekrar açmak için sabah 3'te çağrılmak istemez.

## Fikir: atan bir sigorta

Bu örüntüyü evindeki sigorta kutundan tanıyorsun. Çok fazla akım geçiyor, sigorta atıyor ve bir
tel aşırı ısınmadan önce, kasıtlı olarak, tüm devre ölüyor. Orada durup kabloları parmağınla test
etmiyorsun; sigorta otomatik olarak atar ve her şey güvenli olduğunda sen tekrar sıfırlarsın. Bir
yazılımdaki **circuit breaker**, tam olarak kontrol etmediğin bir çağrının önüne konan aynı
sigortadır.

Bir circuit breaker'ın üç durumu var:

- **Closed**: normal çalışma. Çağrılar sağlayıcıya ulaşır ve breaker sessizce yakın pencerede
  kaç tanesinin başarılı, kaç tanesinin başarısız olduğunu sayar.
- **Open**: sigorta atmış. Yeni çağrılar sağlayıcıya hiç ulaşmaz; breaker açık kaldığı sürece
  anında başarısız olurlar (ya da bir **fallback** çalıştırırlar, aşağıda daha fazlası var).
- **Half-open**: bir soğuma süresinden sonra, breaker sağlayıcının toparlanıp toparlanmadığını
  görmek için, henüz tam trafiğe bağlanmadan, küçük sayıda çağrının test olarak geçmesine izin
  verir.

### Ne zaman atacağına karar vermek: hata oranı eşiği

Diyelim breaker'ın ödeme sağlayıcısına yapılan son 10 çağrıyı izlediğini ve %50 ya da daha
fazlası başarısız olduğunda attığını varsayalım. İki pencereyi adım adım izle:

```
Window A (calls 1-10):   F F S S S S S S S S   -> 2 failures out of 10 = 20%
Window B (calls 11-20):  F F F F F F S S S S   -> 6 failures out of 10 = 60%
```

%20, %50 eşiğinin altında, bu yüzden window A'dan sonra breaker **closed** kalır. %60 onun
üstünde, bu yüzden window B'nin bir yerinde breaker **open**'a atar. O noktadan sonra,
sağlayıcıya yapılan çağrılar durur; her request, hiçbir zaman kazanamayacağı bir timeout'u
beklemek yerine anında bir cevap alır.

### Toparlanmayı test etmek: half-open

Diyelim 30 saniyelik bir soğumadan sonra, breaker **half-open**'a geçer ve, belki 3 tane,
bir avuç deneme çağrısının geçmesine izin verir. O 3 çağrının 2'si başarılı olursa, breaker
sağlayıcının tekrar sağlıklı olduğuna karar verir ve **closed**'a geri döner, normal trafiği
sürdürür. Bunun yerine 3'ün 2'si hâlâ başarısız olursa, breaker hiçbir şeyin değişmediğini
öğrenmiş olur ve doğrudan başka bir soğuma için **open**'a döner. Deneme çağrıları, hâlâ belki
bozuk olan sağlayıcının aldığı tek trafiktir, bu yüzden half-open bir breaker, dizginlenmemiş
retry'ların yaptığı gibi bir kesintiyi daha kötü yapamaz.

Breaker'ın gerçekte ne yaptığına dikkat et: "bu tek çağrı başarısız mı oldu?" sorusunu "bu
*bağımlılık* başarısız oluyor mu?" sorusuna çeviriyor ve asıl önemli olan soru olan ikincisi
üzerinde hareket ediyor.

## Bulkhead: bir sızıntının gemiyi batırmasını durdurmak

Bir circuit breaker seni ölü bir sağlayıcıyı çağırmaktan korur. Kendi başına, lesson 07'nin
tarif ettiği gibi, hâlâ her thread'ini emen *yavaş* bir sağlayıcıdan seni korumaz. Bunun için
gemi tasarımından ödünç alınan bir **bulkhead** istersin: geminin gövdesi su geçirmez bölmelere
ayrıldığında, bir bölmedeki delik sadece o bölmeyi su altında bırakır, tüm gemiyi değil.

Servisine uygulandığında, bulkhead, ödeme sağlayıcısına yapılan çağrılara, `GET /api/products`
ya da `GET /api/dealers/{id}/orders`'a hizmet veren pool'dan ayrı, kendi sınırlı thread (ya da
permit) pool'unu vermek demektir. Ödeme sağlayıcısı yavaşlarsa, *kendi* küçük pool'unu
tüketebilir, ama fiyat listesi endpoint'i kendi çalışan thread setini korur ve sipariş
vermeyen bayilere bile cevap vermeye devam eder. Bir bulkhead olmadan, mücadele eden tek bir
bağımlılık, tam olarak paylaşılan Tomcat thread pool'u üzerinden gördüğün gibi, onunla hiçbir
ilgisi olmayan endpoint'leri sessizce açlığa sürükleyebilir.

## Fallback: sigorta açıkken ne cevap verirsin?

Açık bir breaker hâlâ *bir şey* döndürmek zorunda. Hiçbir şey yapmamak ya da ele alınmamış bir
500 fırlatmak, kaçırılmış bir fırsattır: sağlayıcının ulaşılamaz olduğunu zaten biliyorsun, bu
yüzden yanıtı kasıtlı olarak seçebilirsin. Bir **fallback**, bir kaza yerine bu kasıtlı seçimdir.
Her gün kullandığın uygulamalardan tanıyacağın seçenekler:

- Net, hızlı bir hata döndür: saniyelerce asılı kalıp sonra yine de başarısız olan bir request
  yerine "Ödeme geçici olarak kullanılamıyor, lütfen kısa süre sonra tekrar deneyin".
- Bayatlık kabul edilebilir ve doğruluk risk altında değilken, zaten sahip olduğun önceden
  cache'lenmiş bir fiyat gibi güvenli bir şey servis et.
- İşlemi düşür: işin bu değişimle rahatsa, siparişi "doğrulama bekliyor" olarak kabul et ve
  ödemeyi daha sonra halledet.

Bir fallback'in asla yapmaması gereken şey, para hareket ettiren bir işlemde sessizce başarıyı
taklit etmektir. `POST /api/orders` için, "hızlı ve net başarısız ol" neredeyse her zaman doğru
fallback'tir; sahte bir "sipariş verildi" yanıtı dürüst bir hatadan daha kötü olurdu.

## Bununla nerede karşılaşırsın

- İşletmediğin bir bağımlılığa yapılan herhangi bir çağrı: bir ödeme sağlayıcısı, bir kargo
  ücreti API'si, başka bir ekibin internal servisi.
- Spring Boot'un resilience desteği bunu doğrudan annotation'larla tanımlamana izin verir ve
  Resilience4j altında circuit breaker implementasyonunu sağlar.
- Olay yazıları: "the breaker opened at 09:14 and absorbed the outage" diye yazabilmek
  istediğin cümledir, "her thread dört dakika boyunca bloke kaldı" yerine.

## Tek cümlelik özet

> Bir circuit breaker, "bu tek çağrı başarısız mı oluyor?" sorusunu "bu bağımlılık başarısız
> oluyor mu?" sorusuna çevirir ve öyle olduğunda, trafik göndermeyi durdurur, toparlanmayı
> half-open bir durumla dikkatlice test eder ve o arada her çağrıyı kasıtlı olarak seçtiğin bir
> fallback ile yanıtlar.

## Kontrol sorusu

Bir breaker son 10 çağrıyı izliyor ve %50 hata eşiğinde atıyor. Mevcut pencerede, son 10
çağrının 4'ü başarısız oldu. Breaker şu anda açık mı kapalı mı? 3 deneme çağrısını test eden
half-open durumdaysa ve ilk 2'si başarılı olup 3'üncüsü başarısız olursa, sırada ne olmalı ve
testi birkaç çağrıyla sınırlamak neden önemli?