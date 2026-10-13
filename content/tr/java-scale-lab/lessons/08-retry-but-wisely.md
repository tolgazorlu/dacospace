# Lesson 08 · Retry, ama akıllıca

**Reading time:** 11 min · **Concept:** transient vs permanent errors, exponential backoff, jitter, retry amplification, retry budget, idempotent retries
**Mission:** 08

## Problem

Timeout'lar eklersin (lesson 07), böylece ödeme sağlayıcısına yapılan çağrılar artık asılı kalmak
yerine hızlı başarısız olur. İyi. İlk içgüdün her başarısızlığı hemen retry etmektir, çünkü eminsin
ikinci deneme geçecektir. Bazen gerçekten geçer. Sağlayıcı gerçekten zorlanıyorken, her bayiden,
her başarısız çağrı için hemen retry etmek, hiçbir şey yapmamaktan çok daha kötü bir şey yapar: zaten
fazla yük altında başarısız olan bir sağlayıcıya daha fazla yük bindirir.

## Neden zor

Bir retry tamamen savunmacı görünür, dezavantajı olmayan bir güvenlik ağı gibi: ilk deneme çalıştıysa
retry hiç tetiklenmez, o zaman onun olmasında ne zararı var? Zarar tam da retry'ları istemeni sağlayan
koşulda ortaya çıkar: sağlayıcı zaten zorlanıyorken. Bu da tam olarak eşzamanlı bir retry selinin en
fazla hasarı verdiği an olur, bu da özellik hakkında akıl yürüttüğün anın tam tersidir.

## Fikir: sonunda açılacak bir kapıya vurmak

### Her başarısızlık bir retry'ı hak etmez

Önce, gerçekte neyin başarısız olduğuna karar ver. Bir **geçici (transient) hata**, biraz sonra
basitçe yeniden denersen başarılı olması muhtemel olan bir hatadır: bir ağ aksaklığı, kısa süreli
bir 503, anlık bir yükselmenin yarattığı bir timeout. Bir **kalıcı (permanent) hata**, her retry
ettiğinde tam olarak aynı şekilde başarısız olur: isteğin kendisi hatalı olduğu için bir 400, kimlik
bilgileri yanlış olduğu için bir 401, yetersiz bakiye nedeniyle reddedilen bir kart. Kalıcı bir hatayı
retry etmek zaman harcar, bir thread harcar ve bayiye uygulamanın "hayır" demesinin yavaş olduğu
dışında hiçbir şey öğretmez. Yalnızca ilk türü retry et.

### Exponential backoff: her seferinde daha uzun bekle, aynı süreyi değil

Bir kapıya vurduğunu düşün. Kimse açmıyor. Hemen, aynı hızda, sonsuza kadar tekrar vurmak mantıklı
mı? Hayır: şu anda kimse evde değilse, bir saniye sonra vurmak bunu nadiren değiştirir. Bir süre
beklemek, sonra biraz daha uzun, sonra daha da uzun beklemek daha mantıklıdır, aşırı yüklenmiş olan
şeye gerçekten toparlanma zamanı verir. **Exponential backoff**, denemeler arasındaki beklemeyi
ikiye katlar (veya başka şekilde çarpar): dene, 200 ms bekle, dene, 400 ms bekle, dene, 800 ms bekle
ve böyle gider, kaç kez başarısız olduğundan bağımsız olarak her 200 ms'de bir retry etmek yerine.

### Jitter: herkesin aynı anda vurmasına izin verme

Şimdi, ödeme çağrıları aynı anda başarısız olan yüz bayiyi düşün, çünkü sağlayıcının bir kötü saniyesi
oldu. Düz exponential backoff ile, yüzü de tam olarak 200 ms bekler ve sonra hepsi tam olarak aynı
anda, tek bir sivri uç olarak retry eder. Bu tek senkronize sivri uç, orijinal aşırı yüklenme kadar
kötü olabilir. **Jitter**, her beklemeye küçük bir rastgele miktar eklemek anlamına gelir, böylece
yüz istemci tam olarak 200 ms'de retry etmek yerine, mesela 150 ile 250 ms arasında yayılır. Yayılmış
bir retry dalgası, toparlanan bir sistem için tek bir sivri uçtan çok daha yumuşaktır.

### Retry amplification: fark etmediğin çarpma işlemi

Bir bayinin telefon uygulaması başarısız bir isteği en fazla 3 kez retry etsin. Sipariş servisin de,
her deneme için ödeme sağlayıcısına kendi çağrısını en fazla 3 kez retry etsin. Bir bayinin tek bir
dokunuşu artık ödeme sağlayıcısına ulaşan `3 x 3 = 9` gerçek çağrıya dönüşebilir. Sağlayıcı fazla
yükten dolayı başarısız oluyorsa, sadece o tek dokunuş için, o tek bayiden, dokuz katı trafik
göndermiş oldun. Bir çağrı zincirinin her katmanındaki retry'ların birbiriyle çarpıldığı bu kümülatif
etki **retry amplification**'dır ve bir "resilience" özelliğinin kısa bir aksaklığı tam bir kesintiye
dönüştürmesinin en yaygın tek yoludur.

### Retry budget: ne kadar retry'a izin verildiğine bir tavan

Bir **retry budget**, retry'ların eklemesine izin verilen ek yüke bir tavan koyar, örneğin "retry'lar
herhangi bir dakikada normal trafiğin %10'unu aşamaz". Bütçe tükendiğinde, daha fazla başarısızlık
retry edilmek yerine hemen çağırana döndürülür, bu sert gelse de sağlayıcıyı tam olarak yukarıdaki
kümülatif etkiden korur. Bir bütçe olmadan, "en fazla 3 kez retry et" ifadesi, başarısızlıklar
izole değil yaygın olduğunda toplam ek yük için bir üst sınır taşımaz.

### Yalnızca tekrarlanması güvenli olanı retry et

Yukarıdakilerin herhangi biri önemli olmadan önce bir soru daha sor: bu çağrı gerçekten sağlayıcıya
ulaştıysa ve karttan çekim yaptıysa, ama yanıt dönüş yolunda kaybolduysa (mesela çekim başarılı
olduktan sonra bağlantı düştüyse), retry etmek güvenli mi? Aynı sipariş için bir kartı ikinci kez
çekmek zamanlama sıkıntısı değil, gerçek bir çift çekimdir. Bir işlem, iki kez çalıştırılmasının
bir kez çalıştırılmasıyla aynı etkiye sahip olduğunda **idempotent**'tir; sadece idempotent işlemler
kör bir şekilde retry edilmesi güvenlidir. Birinci denemeyi ikinci denemeden ayıran hiçbir şey
olmayan düz bir "bu sipariş için bu kartı çek" çağrısı, yazıldığı gibi retry edilmesi güvenli değildir.
Onu güvenli hale getirmek, sağlayıcının "bu tam isteği zaten işledim"i tanıması için bir yol
gerektirir, bu da sonraki bir derste ele alınacak bir problem; şimdilik taşıyacağın kural şu: bir
retry eklemeden önce, iki kez retry etmenin gerçekte bir kez yapmakla eşdeğer olup olmadığını kontrol
et.

## Bununla nerede karşılaşırsın

- `@Retryable` ile sarılmış herhangi bir HTTP client: anotasyonu eklemek kolaydır, gerçek işin
  bulunduğu yer hangi hataların, kaç denemenin ve hangi backoff'un olduğuna dair yargıdır.
- Retry'lar devreye girdikten sonra bir kesintinin daha iyi değil daha kötü hale geldiği olay
  incelemeleri: neredeyse her zaman backoff'suz, jitter'sız ve budget'siz, üçünün de aynı anda eksik
  olduğu bir karışım.
- Bir hoptan daha derin herhangi bir çağrı zinciri: her hop'un retry politikasının uzak uçta neye
  çarpıldığını sor.

## Tek cümlelik özet

> Retry'lar yalnızca geçici bir başarısızlığa yardımcı olur ve yalnızca backoff yaptıklarında,
> jitter ile yayıldıklarında, bir budget'ın altında kaldıklarında ve iki kez çalıştırılması güvenli
> bir işleme uygulandıklarında; aksi halde zorlanan bir sağlayıcıyı boğulan bir sağlayıcıya çevirirler.

## Kontrol sorusu

Bir mobil uygulama başarısız bir isteği en fazla 2 kez retry ediyor ve çağırdığı backend servis, her
deneme için kendi aşağı akış ödeme çağrısını en fazla 4 kez retry ediyor. Ödeme sağlayıcısı şu anda
aşırı yük nedeniyle her çağrıyı reddediyorsa, mobil uygulamaya yapılan tek bir dokunuş o sağlayıcıya
karşı kaç gerçek çağrı üretebilir? Backoff ve jitter eklemek bu toplam çağrı sayısını değiştirir mi?
