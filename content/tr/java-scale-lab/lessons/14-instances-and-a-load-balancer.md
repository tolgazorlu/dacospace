# Lesson 14 · Üç kasa ve kapıdaki bir yönetici

**Reading time:** 12 min · **Concept:** stateless service, horizontal scaling, load balancing algorithms, health checks
**Mission:** 14

## Problem

Sipariş servisiniz bir makinede çalışıyor. Kampanya günü geldi, trafik üçe katlandı ve o tek
makine tıkandı: CPU sabitlenmiş, Tomcat thread'leri dolu, bayiler timeout alıyor. Bugün makineyi
daha hızlı yapamazsınız. Yapabileceğiniz şey, onun üç kopyasını çalıştırmak ve kapıya her bayinin
hangi kopyaya gideceğine karar veren birini koymak.

O "kapıdaki biri", bir **load balancer**: servisinizin birkaç kopyasının önünde oturan ve her
gelen request'i onlardan birine yönlendiren bir bileşen.

## Neden zor

Üç kopya çalıştırmak "sadece üç kez başlat" gibi geliyor, ama iki şey sessizce bunu bozabilir.
İlki, herhangi bir kopya bir bayi hakkında bir şeyi (sepeti, son araması) kendi hafızasında
hatırlıyorsa, o bayi her zaman aynı kopyaya inmek zorundadır, yoksa verisi kapıya kimin cevap
verdiğine bağlı olarak kaybolur. İkincisi, üç kopyadan biri zaten zorlanıyorsa, sabit bir rotasyon
üzerinde ona daha fazla trafik yönlendirmek onu daha iyi değil, daha kötü hale getirir.

## Fikir: bir fırıncıda üç kasa

Her biri bir fırıncı tarafından çalıştırılan, arkalarında aynı fırından ve aynı tarif
defterinden hizmet veren üç servis kasası olan bir fırın düşünün. Girişte bir yönetici duruyor ve
her müşteriyi bir kasaya gönderiyor.

### Üç kasanın yalnızca "kimsenin müşterisi" olmadığında yardım etmesi

Diyelim ki kasa 2, sıradaki müşterinin geçen seferinde "her zamanki"ni sipariş ettiğini fırıncının
kafasında hatırlıyor ve orada canlı bir hesap tutuyor. Şimdi o müşteri her zaman kasa 2'ye gitmek
zorunda. Kasa 2 meşgulse, kasa 1 ve 3 boş olsa bile bekliyor. Daha kötüsü, kasa 2'nin fırıncısı
hasta olup eve giderse, o müşterinin hesabı gitmiş olur.

Düzeltme: bir müşterinin ihtiyaç duyduğu hiçbir şey sadece bir fırıncının kafasında yaşamıyor.
Hesap, üç kasanın da arkasındaki ortak bir panoya (veritabanı) ya da müşterinin yanında taşıdığı
bir karta (request'in kendisindeki bir token) yazılıyor. Hangi kasadaki herhangi bir fırıncı,
herhangi bir müşteriye hizmet edebilir, çünkü hiçbir kasa onlar hakkında özel durum tutmuyor.

Bu şekilde inşa edilmiş bir servis **stateless**'tır: herhangi bir instance herhangi bir request'i
işleyebilir, çünkü sonraki bir request'in ihtiyaç duyduğu hiçbir şey sadece o instance'ın
hafızasında yaşamıyor. Bayi sipariş servisinizin üç kasanın çalışması için zaten stateless olması
gerekiyor: stok sayıları ve sipariş geçmişi bir Java field'inde değil Postgres'te yaşıyor.
Stateless bir servisin daha fazla yükü karşılamak için daha fazla kopyasını çalıştırmak
**horizontal scaling**'tir, tek bir daha büyük makine almanın (vertical scaling) karşıtı olarak.

### Yönetici kimin nereye gideceğine nasıl karar verir

**Siz** yöneticisiniz. Müşteriler gelmeye devam ediyor ve her biri için, siparişlerinin ne kadar
süreceğini bilmeden, anında bir kasa seçmek zorundasınız. Bazı stratejiler:

- **Round robin**: kasa 1, sonra 2, sonra 3, sonra tekrar 1, ne olursa olsun. Basit, ve her
  sipariş kabaca aynı süreyi alıyorsa adil. Arka arkaya dokuz müşteri, her kasaya tam olarak 3
  verir.
- **Least connections**: bir sonraki müşteriyi şu anda hizmet alan en az kişiye sahip olan
  kasaya gönder. Bu, siparişler eşit olmadığında adapte olur: kasa 2 büyük bir düğün pastası
  siparişi alan birini aldıysa, round robin ona hala daha fazla müşteri gönderirdi; least
  connections göndermezdi.
- **Weighted**: bir kasada daha yavaş bir çırak fırıncı varsa, ona daha küçük bir pay verin,
  deneyimli fırıncıların aldığı her iki müşteriye karşı bir müşteri gibi.

Lab'ınızın load balancer'ı aynı şekilde üç uygulama instance'ının önünde oturur: hangi request'in
tek satırlık bir fiyat araması ve hangisinin stok kontrolü ve ödeme çağrısıyla yavaş bir sipariş
olduğunu bilmez. Least-connections tarzı routing buna adapte olur; saf round robin olmaz.

### Yönetici hasta bir fırıncıyı da fark etmek zorunda

Kasa 3'teki bir fırıncı bayılırsa, yönetici boş bir kasanın önünde on kişi daha birikmeden önce
değil, hemen oraya müşteri göndermeyi durdurmak zorundadır. Load balancer bunu bir **health
check** ile yapar: periyodik olarak her instance'a basit bir soru sorar, genellikle küçük bir
`/health` veya `/actuator/health` endpoint'ini çağırarak, ve hızlı bir "evet, iyiyim" bekler.
Arka arkaya yeterince check'i kaçırırsa load balancer, o instance tekrar cevap verene kadar ona
yeni request yönlendirmeyi durdurur. 5 saniyede bir check, yöneticinin dakikada on iki kez kasaya
göz atması anlamına gelir, ki bu genellikle struggling bir instance'a ekstra probe trafiği ile
vurmadan bir problemi yakalamak için yeterlidir.

Health check'ler, "bu instance sağlıklı mı" sorusunun kulağa geldiğinden daha dar bir soruya
cevap verir. Yaygın bir bölünme: **liveness** ("süreç hala çalışıyor mu, yoksa yeniden
başlatılmalı mı") ve **readiness** ("şu anda trafik alabiliyor mu, örneğin veritabanına
bağlanmayı bitirdi mi"). Yeni bir instance canlı olabilir ama henüz hazır olmayabilir. Lab'da
daha sonra graceful restart'lara baktığınızda bu bölünmeyle tekrar karşılaşacaksınız.

### Üç kasaya bölünemeyen şeyler

Üç instance her şeyi üçe katlamaz. Arkalarında bir Postgres veritabanı paylaşırlar; onun
connection pool'u, lesson 02'den, hala tek bir paylaşılan kaynaktır ve `λ_max = pool / W` hala
geçerlidir, sadece şimdi üç instance (varsayılan olarak) her biri 10'luk üç ayrı pool'dan
çekiyor, aynı veritabanı için rekabet ediyor. Üç instance ayrıca, lesson 13'ten, her instance'ın
kendi hafızasında tutulan tenant başı bir rate limiter'ı da düzeltmez: kasalar arasında zıplayan
bir bayi her birinde taze bir bucket alır, limiti tamamen etkisiz kılar. Bu, tam olarak bir rate
limit veya cache gibi paylaşılan state'in, Redis gibi tüm instance'ların birlikte görebildiği bir
şeyde olması gerekip, hiçbir instance'ın kendi hafızasında olmaması gerektiği içindir.

## Bununla nerede karşılaşırsın

- Herhangi bir "scale out" konuşması: instance eklemek sadece gerçekten bottleneck olan kısma
  yardımcı olur; paylaşılan bir veritabanı veya cache sizi hala sınırlayabilir.
- Rolling deployment'lar: yeni kod bir instance'a tek seferde gider, başlangıçta health check'ini
  başarısız kılar, böylece load balancer ona trafik göndermeden önce bekler.
- "Sadece bazı kullanıcılar için bozuldu" incident review'ları: genellikle bir kullanıcıyı tek
  bir instance'a bağlayan kazara bir state'in işaretidir.

## Tek cümlelik özet

> Horizontal scaling sadece her instance birbirinin yerine kullanılabiliyorsa işe yarar, bu da
> bir request'in ihtiyaç duyduğu tüm state'in veritabanında veya cache'te yaşadığı, asla sadece
> bir instance'ın hafızasında olmadığı anlamına gelir.

## Kontrol sorusu

Bir load balancer'ın arkasında round robin kullanan 4 instance çalıştırıyorsunuz. Instance 2, bir
yanlış yapılandırma nedeniyle diğer üçünden request başına iki kat daha yavaş. 20 request sıkı
round-robin sırasıyla geldikten sonra, instance 2 kendi payını bitirdi mi, geride mi kaldı, yoksa
önde mi, ve hangi routing stratejisi problemi önlerdi?