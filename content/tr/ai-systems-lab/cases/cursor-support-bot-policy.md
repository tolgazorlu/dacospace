# Case · Cursor'ın destek botu bir politika icat edip kendi müşterilerini iptal ediyor (2025)

**Category:** Agents · **Lessons:** 18, 21 · **Severity:** hallucination ile uydurulan şirket politikası, gerçek abonelik iptallerine yol açtı

## Sistem

Cursor, AI destekli bir kod editörü, müşteri destek görüşmelerini yönetmek için "Sam" adında bir AI destek agent'ı çalıştırıyor. Kullanıcılara "Sam"in AI olduğu söylenmemişti; çoğu kişi bir insan destek temsilcisiyle konuştuğunu düşünüyordu.

## Ne gözlendi

Kullanıcılar, makineler arasında geçiş yaptıklarında oturumlarının kapatıldığını fark etti. Bunu destek birimine sorduklarında, "Sam" en az bir kullanıcıya bunun yeni bir "abonelik başına tek cihaz" güvenlik politikası kapsamında beklenen bir davranış olduğunu söyledi. Böyle bir politika mevcut değildi. İddia Reddit ve Hacker News'te yayıldı ve Cursor'ın kurucu ortağı kamuoyu önünde durumu düzeltmeden önce gerçek abonelik iptallerine yol açtı.

## Dur ve düşün

1. "Sam", elinde gerçek bir kaydı olmadığı bir soruya özgün, kendinden emin, isimlendirilmiş bir politika cevabı verdi. Bir destek agent'ının, dayandığı gerçek bir cevabı olmadığında bunun yerine ne yapması gerekir, ve bunu yapması için ne değişmesi gerekir?
2. Farklı kullanıcıların aynı belirti için aktarıldığına göre farklı ve tutarsız açıklamalar aldığı bildirildi. Bu tutarsızlık, agent'ın cevabı gerçek bir kaynaktan mı getirdiğini, yoksa cevabı kendisinin mi ürettiğini anlamak için sana ne söylüyor?
3. Kullanıcılar "Sam"in insan olduğuna inanıyordu. Bu inanç, uydurulan politikanın yarattığı sonucun ciddiyetini değiştiriyor mu, ve değiştiriyorsa nasıl?

## Gerçekte ne oldu

Oturum kapatma davranışının gerçek nedeni, kasıtlı bir politika değişikliği değil, ilgisiz bir oturum güvenliği hatasıydı. "Sam"in, elinde gerçek bir kaydı olmayan bir politika sorulduğunda "bilmiyorum" demesini veya durumu yukarı taşımasını zorlayan bir kısıtı yoktu; bunun yerine makul görünen, özgün bir cevap üretti ve var olmayan bir "abonelik başına tek cihaz" güvenlik politikasından bahsetti ([Ars Technica](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/)).

Halüsinasyon non-deterministic olduğu için, aynı temel hatayla karşılaşıp destek birimine soran farklı kullanıcılar farklı, tutarsız açıklamalar aldı. Kullanıcılar Reddit ve Hacker News'te notlarını karşılaştırdığında, bu tutarsızlıklar güvenilirlik hasarını katladı: sorun sadece bir cevabın yanlış olması değildi, şirketin farklı müşterilere farklı açıklamalar icat ediyormuş gibi görünmesiydi. Bazı kullanıcılar, önceden haber verilmeden yeni ve kısıtlayıcı bir cihaz politikasının uygulandığına inandıkları için özellikle abonelik iptal etti. Cursor'ın kurucu ortağı, iddia zaten yayıldıktan sonra durumu kamuoyu önünde düzeltti.

İkinci, durumu ağırlaştıran bir etken: kullanıcılara "Sam"in bir AI agent'ı olduğu söylenmemişti ve çoğu, bu cevabı kendilerine bir insan destek temsilcisinin verdiğini düşündü; bu da iddianın çürütülmesinden önce ona ne kadar ağırlık verdiklerini muhtemelen artırdı.

## Kök nedenler

**Teknik.** Destek agent'ı, açık uçlu politika sorularını gerçek, doğrulanmış bir politika belgesini kaynak göstermekle sınırlı kalmak yerine özgür üretimle cevaplıyordu; bu soru kategorisi için "cevabı dayandır veya reddet" şeklinde bir kısıt yoktu.

**Organizasyonel.** Agent'ın AI kimliği kullanıcılara açıklanmamıştı ve ürün ekibindeki hiç kimsenin tanımadığı yepyeni bir cihaz-limiti politikası gibi belirli, sıra dışı bir destek iddiasındaki ani artışı, onlarca etkilenmiş kullanıcıya ulaşıp kamuoyuna yayılmadan önce incelenmeye değer bir anomali olarak ele alacak bir izleme yoktu.

## Neyle önlenebilirdi

- Şirket politikasıyla ilgili her destek-agent cevabı için, dayandığı bir kaynağı olmayan konularda özgür üretime izin vermek yerine "politika belgesini kaynak göster veya bilmediğini söyle" şeklinde sıkı bir kısıt. Bu doğrudan ve en az maliyetli düzeltmedir: konuşma akıcılığından az bir miktar feragat ederek isimlendirilmiş bir politikanın asla uydurulmamasını sağlar.
- Agent'ın AI kimliğini kullanıcılara açıklamak. Bu halüsinasyonu önlemez, ama kullanıcıların doğrulanmamış bir iddiaya doğru olarak ne kadar otorite atfettiğini değiştirir, ve güvenilirlik sorusundan bağımsız temel bir dürüstlük gereğidir.
- Belirli, sıra dışı bir destek iddiasındaki artışı izlemek ve bunu, kamuoyu tepkisinden sonra fark edeceğin bir model olarak değil, büyük bir kullanıcı kitlesine ulaşmadan önce araştırılacak bir anomali olarak ele almak.

## Senin sistemin için ders

- Şirket politikası konusunda sorulabilen her müşteriye dönük agent için, doğrulanmış belgeleri kaynak göstermekle sınırlı mı yoksa dayanağı olmayan, makul görünen bir cevap mı üretebiliyor diye bugün doğrula; ikincisi geçerliyse, aynı risk altındasın.
- Bir destek etkileşiminin bir insanla değil bir AI agent'ıyla yapıldığını açıkla; bu hem bir dürüstlük yükümlülüğü hem de yanlış bir cevabın yol açtığı hasarın büyüklüğünde etken.
- Destek transkriptlerinde beliren sıra dışı, belirli iddiaları (ürün ekibindeki hiç kimsenin tanımadığı isimlendirilmiş bir politika) sadece toplam memnuniyet skorlarını takip etmek yerine bir anomali olarak işaretleyen izleme kur.
- Non-deterministic halüsinasyonun ölçekte tek bir yanlış cevaptan daha kötü olduğunu unutma: kullanıcılar arasında tutarsız açıklamalar, tutarlı (ara sıra yanlış olsa da) bir cevabın yapacağından daha hızlı güveni erozyona uğratır.

## Kaynaklar

- [Company apologizes after AI support agent invents policy that causes user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025