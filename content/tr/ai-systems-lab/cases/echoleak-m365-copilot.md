# Case · EchoLeak: Microsoft 365 Copilot'tan tıklamasız veri hırsızlığı (2025)

**Category:** Security · **Lessons:** 08, 09 · **Severity:** sıfır tıklamalı veri exfiltration'ı, CVE-2025-32711, CVSS 9.3

## Sistem

Microsoft 365 Copilot, Outlook, OneDrive, SharePoint ve Teams'e gömülü bir asistan. Çalışanın kendi e-postasını, dosyalarını ve sohbet geçmişini çekerek (bir RAG pipeline'ı) soruları yanıtlıyor ve yanıtını oluşturuyor; bu yanıt, Copilot arayüzünde otomatik render edilen markdown linkler ve görseller içerebiliyor. Copilot etkin olan herhangi bir çalışan e-posta alabilir ve Copilot, kullanıcının gelen kutusunu çekilebilir bağlamının bir parçası olarak ele alır.

## Ne gözlendi

Aim Labs, Ocak 2025'te bir zafiyeti Microsoft'a özel olarak bildirdi. Microsoft, Mayıs 2025'te sunucu taraflı bir düzeltme yayınladı ve danışma belgesi (CVE-2025-32711) 11 Haziran 2025'te 9.3 CVSS puanıyla kamuya açıklandı. Bildirilen etki: bir saldırgan, tek bir e-posta göndererek Copilot'u kurbanın kendi Microsoft 365 hesabından hassas veri sızdırmaya zorlayabiliyordu. Kurbanın o e-postada herhangi bir şeyi açması, okuması veya tıklaması gerekmiyordu.

## Dur ve düşün

1. Saldırganın kurbandan sıfır etkileşim gerektirdiği bir durumda, saldırganın kontrolündeki içerik modelin bağlamına fiilen nereden girer ve Copilot'un bunu veri yerine talimat olarak ele alması için ne yanlış gitmesi gerekir?
2. Copilot'un çıktısı, kullanıcıya gösterilmeden önce bir markdown link filtresinden geçiyor. Bir filtre yaygın durumu yakalarsa, hangi bozuk veya alternatif sözdizimi sınıflarını gözden kaçırabilir?
3. Copilot özel veriyi çekip saldırganın okuyabileceği bir yere koymak istediğinde, gerçek ağ isteği neye benziyor ve tarayıcı önce kullanıcıya sormadan bunu neden yapıyor?

## Gerçekte ne oldu

Saldırı üç aşamalı bir zincirdi; bağımsız bir akademik vaka çalışması ([arXiv 2509.10540](https://arxiv.org/pdf/2509.10540)) tarafından detaylıca yeniden kurgulandı ve BleepingComputer'ın Aim Security'nin ifşasına dair haberiyle ([BleepingComputer](https://www.bleepingcomputer.com/news/security/zero-click-ai-data-leak-flaw-uncovered-in-microsoft-365-copilot/)) doğrulandı.

Birincisi, saldırganın e-postası, enjekte edilen talimatları AI'a değil insan alıcısına hitap ediyormuş gibi ifade etti. Microsoft'un çapraz-prompt-enjeksiyonu (XPIA) sınıflandırıcısı, açıkça LLM'e hitap eden talimatları yakalayacak şekilde ayarlanmıştı, bu yüzden sıradan bir yazışma gibi okunan bir ifade bu filtreyi atlattı.

İkincisi, enjekte edilen talimatlar Copilot'un bağlamına girdikten sonra (kullanıcı daha sonra Copilot'a o e-postayı içeri çeken bir şey sorduğunda RAG retrieval yoluyla), model görünür şekilde şüpheli bir link olmadan veri sızdırmanın bir yolunu bulması gerekiyordu. Copilot'un çıktı filtresi, `[text](url)` biçimindeki satır içi markdown linklerini ayıklıyordu. Link metni ve URL'nin ayrı tanımlandığı referans tipi linkleri tanımıyordu: çıktının başka bir yerinde `[ref]: https://attacker.example` bildirimiyle birlikte `[text][ref]`. Bu ikinci biçim filtrelemeden dokunulmadan geçti.

Üçüncüsü, saldırganın tarayıcının sızdırma isteğini hiç tıklama olmadan ateşlemesi gerekiyordu. Copilot, çalınan verinin bir sorgu parametresi olarak eklendiği, saldırganın URL'sini işaret eden bir markdown görsel referansı yayınlamaya zorlandı. Markdown görsel sözdizimi otomatik olarak getirir: istemci, yanıt render edildiği anda kullanıcı hiçbir eylem yapmadan görsel URL'sini ister. Saldırganın URL'si, Copilot'un izinli Content-Security-Policy alan adı listesinde zaten bulunan bir Microsoft Teams URL önizleme uç noktasıydı, dolayısıyla istek dahili görünüyordu ve engellenmedi; bu uç nokta harici bir hedefe proxy yapacak şekilde kullanılabilse de.

Aim Labs, altta yatan hatayı bir "LLM Scope Violation" (LLM kapsam ihlali) olarak kategorize etti: RAG retrieval adımı, güvenilmeyen içeriği (saldırganın e-postası) kullanıcının kendi dahili verisiyle aynı bağlama, aynı güven seviyesiyle çekti.

## Kök nedenler

**Teknik.** XPIA sınıflandırıcısı, prompt injection'ı "AI'a hitap eden talimatlar" olarak modelledi ve sıradan, insan tarafından okunabilir metin gibi ifade edilen enjeksiyonları gözden kaçırdı. Çıktı filtresi bir markdown link sözdizimini listeledi ve eşit derecede standart olan ikinci bir sözdizimini kaçırdı. CSP allowlist'i, aynı satıcıya ait bir uç noktaya, bunun keyfi harici URL'ler için açık bir proxy olarak kullanılamayacağını doğrulamadan, varsayılan olarak güvenli kabul etti.

**Organizasyonel.** Bu üç katmanın (sınıflandırıcı, filtre, CSP) her biri biraz bağımsız olarak inşa edildi ve gözden geçirildi; hiçbir ekip "bir saldırgan tüm istek-yanıt döngüsünü uçtan uca kontrol ederse bu savunma zinciri tutar mı" sorusunu sormuş gibi görünmüyor. Markdown render'ının güvenlik incelemesi, "linkleri ayıklıyoruz" ifadesini, tüm markdown grameri enumere etmeden yeterli kabul etti.

## Neyle önlenebilirdi

- İçeriği, alım anında kaynağına göre talimat taşıyan ve veri taşıyan olarak ayır (dış, güvenilmeyen gönderenden mi geldiğini yoksa dahili, doğrulanmış kaynaklardan mı geldiğini etiketle), böylece RAG retrieval dışarıdan içeriğe örtük olarak dahili veriyle aynı yetkiyi vermez. En yüksek kazanım, en yüksek mühendislik maliyeti: retrieval pipeline'ının kendisine dokunuyor.
- Çıktı filtresini sadece yaygın durum değil, sabit bir sözdizimi varyantı korpusuyla test edilmiş, tam markdown grameri (satır içi linkler, referans tipi linkler, HTML gömülü linkler, her biçimdeki görseller) üzerine inşa et. Orta maliyet, markdown render eden herhangi bir asistan için standart olmalı.
- İstemci arayüzündeki otomatik görsel getirmeyi sorgulanması gereken bir özellik olarak ele al, varsayım olarak değil: uzak görselleri hiçbir zaman otomatik getirmeyen bir asistan bu özel mekanizma üzerinden tıklamasız bir sızdırma kanalı olarak kullanılamaz. Düşük maliyet, bir miktar UX cilası kaybı.
- Aynı satıcıya ait veya "dahili görünen" uç noktaları, keyfi harici URL'lere açık bir proxy olarak kötüye kullanılamayacağını doğrulamadan bir CSP allowlist'ine eklemeyin. Tasarım zamanında yapılırsa düşük maliyetli, sonradan eklemek pahalı.

## Senin sistemin için ders

- Asistanının çıktısının geçtiği her markdown ve HTML render yolunu enumere et ve filtreni "güvenli" demeden önce her birini sadece satır içi linkler değil, referans tipi linklere karşı da test et.
- Asistanın bir dış kişinin yazabileceği içerik üzerinde RAG yapıyorsa (destek talepleri, e-postalar, kamuya açık belgeler), bunların herhangi birinin talimat içerebileceğini varsay ve retrieval pipeline'ın boyunca kaynağı etiketle, böylece downstream kod dış içeriği dahili içerikten farklı ele alabilir.
- İstemcinin, model çıktısından kullanıcı tıklaması olmadan görselleri veya diğer uzak kaynakları otomatik getirip getirmediğini kontrol et. Getiriyorsa, başka ne düzeltirsen düzelt bu kalıcı bir tıklamasız sızdırma kanalıdır.
- CSP veya egress allowlist'ini, genel bir proxy, önizleme veya yönlendirme uç noktası olan herhangi bir girdi için denetle; saldırganların önce aradığı girdiler bunlardır.

## Kaynaklar

- [EchoLeak: The First Real-World Zero-Click Prompt Injection Exploit in a Production LLM System](https://arxiv.org/pdf/2509.10540) · akademik vaka çalışması · Eylül 2025
- [Zero-click AI data leak flaw uncovered in Microsoft 365 Copilot](https://www.bleepingcomputer.com/news/security/zero-click-ai-data-leak-flaw-uncovered-in-microsoft-365-copilot/) · BleepingComputer, Aim Security'ye atfen · Haziran 2025