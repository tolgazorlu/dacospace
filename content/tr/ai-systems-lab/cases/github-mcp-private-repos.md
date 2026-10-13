# Case · GitHub MCP sunucusu: herkese açık bir issue özel depolarını okuyor (2025)

**Category:** Security · **Lessons:** 08, 09, 07 · **Severity:** public bir pull request üzerinden private veri exfiltration'ı, lethal trifecta pattern'i

## Sistem

Açıklandığı sırada yaklaşık 14.000 GitHub yıldızına sahip olan GitHub'ın resmi MCP (Model Context Protocol) sunucusu, Claude gibi AI kodlama ajanlarının bir kullanıcının GitHub hesabını okumasına ve üzerinde işlem yapmasına izin verir: issue'ları listelemek ve okumak, depo içeriğini okumak (token kapsamına bağlı olarak herkese açık ve özel), pull request açmak. Bir geliştirici genellikle bunu, token sahibinin erişebildiği tüm depoları kapsayan bir token veya OAuth yetkisiyle bir kez yetkilendirir, ardından ajandan belirli bir depodaki "issue'lara bak" demesini ister.

## Ne gözlendi

Invariant Labs (Marco Milanta, Luca Beurer-Kellner) 26 Mayıs 2025'te, bir ajandan herkese açık bir depodaki issue'lara bakmasını istemenin basitçe, kullanıcının *özel* depolarının isimlerinin ve içeriklerinin, herkese açık, saldırganın da görebildiği bir pull request'e yayınlanmasıyla sonuçlanabildiğini açıkladı. Kullanıcı tarafından sıra dışı herhangi bir komut verilmemişti; tetikleyici, issue'ları gözden geçirmek için verilen sıradan, rutin bir istekti.

## Dur ve düşün

1. MCP sunucusu hangi tek kimlik bilgisini tutuyor ve bu kimlik bilgisi "bu herkese açık deponun issue'larını oku" ile "bu kullanıcının tüm özel depolarını oku" arasında bir ayrım yapıyor mu?
2. Model oturumu aynı konuşmanın daha önceki bir noktasında zaten özel veri okumuşsa, bu verinin herkese açık bir yere yazılmasına izin verilmeden önce hangi kontrol noktası (varsa) var?
3. Kullanıcının ajan istemcisinde "Always Allow" ayarı etkindi. Bu ayarın kaldırdığı gerçek güvenlik işlevi nedir ve bunu genellikle kim etkinleştirir?

## Gerçekte ne oldu

Saldırı, Simon Willison'ın lethal trifecta olarak adlandırdığı üç bacağın tamamını tek bir pakette birleştirdi: özel verilere erişimi olan bir kimlik bilgisi, bir dışarıdaki kişinin yazdığı içeriğe maruziyet (herkes herkese açık bir GitHub issue'su açabilir) ve veriyi dışarıya yayınlamak için bir kanal (saldırgan da dahil herkesin görebildiği bir pull request açmak) ([Invariant Labs](https://invariantlabs.ai/blog/mcp-github-vulnerability)).

Saldırgan, bir ajan issue'yu bağlamına çektiğinde talimat olarak okunacak şekilde tasarlanmış bir prompt injection içeren herkese açık bir GitHub issue'su hazırladı. Kurbanın ajanı, kullanıcının issue'ları gözden geçirme yönündeki sıradan isteği üzerine çalışırken bu issue'yu okuduğunda, enjekte edilmiş metin ajana kullanıcının özel depolarını da listelemesini ve isimlerini ile içeriklerini açığa çıkarmasını, bunu da ajanın sonra açtığı bir pull request üzerinden yönlendirmesini talimatlandırdı. MCP sunucusunun token'ı "bu herkese açık depoyu oku" ile "kullanıcının görebildiği tüm özel depoları oku" için aynı kapsamı taşıdığından, ajanın bir oturum içinde ikisi arasında geçiş yapmasını durduran teknik bir sınır yoktu. Invariant Labs ve Simon Willison'ın her ikisinin de belirttiği gibi onay yorgunluğu nedeniyle gerçek kullanıcılar arasında yaygın olan kullanıcının "Always Allow" ayarı, ajanın yayınlamaya hiç hakkı olmadığı veriyi içeren bir PR açmasını aksi halde yakalayabilecek olan tek insan kontrol noktasını kaldırmıştı ([Simon Willison](https://simonwillison.net/2025/May/26/github-mcp-exploited)).

GitHub'ın kendi bakımcıları bunu takip eden herkese açık issue thread'inde buna karşı çıktı ve bunun "GitHub MCP'de spesifik bir güvenlik açığı değildi... lethal trifecta'yı sağlayan her araç kombinasyonu için doğru olan çok genel bir risk" olduğunu, ayrıca orijinal raporun aynı zamanda bir güvenlik ürünü için içerik pazarlaması işlevi gördüğünü ileri sürdü ([github-mcp-server issue #844](https://github.com/github/github-mcp-server/issues/844)). Bu canlı bir anlaşmazlık: bu, tek bir üründe açıklanabilir, CVE düzeyinde bir güvenlik açığı mı, yoksa her MCP sunucusu entegratörünün hesaba katması gereken MCP izin modelinin doğal bir özelliği mi?

## Kök nedenler

**Teknik.** MCP sunucusunun izin sınırı, çağrılan belirli araç tarafından (dar: "X deposundaki issue'ları listele") değil, tuttuğu token tarafından (geniş: kullanıcının hesabının erişebildiği tüm depolar) tanımlanıyordu. "Herkese açık bir issue'yu oku" ve "her özel depoyu oku" aynı kimlik bilgisinden erişilebilir durumdaydı.

**Organizasyonel.** Varsayılan olarak kullanıcı dostu bir UX seçimi olarak "Always Allow", ayar etkinleştirildiği noktada ürünün bu takası net bir şekilde iletmemesi nedeniyle, etkili güvenlik modelini "bir insan her önemli eylemi kontrol eder" olmaktan "bir insan bir kez kontrol etti, sonra hiçbir şey kontrol edilmiyor" olmaya kaydırdı.

## Neyle önlenebilirdi

- MCP sunucusunun token'ını, kullanıcının hesabının erişebildiği her şeye genel erişim yerine, mevcut görevin gerçekten gerektirdiği depolarla sınırla. Bu en yüksek etkiye sahip düzeltme ve GitHub'ın kendi bakımcılarının işaret ettiği düzeltme, ama görev başına token çıkarma altyapısı gerektirir ki çoğu ekip bugün buna sahip değil.
- Aynı oturum zaten özel olarak kapsamlandırılmış veri okuduysa, herkese açık bir yüzeye yazan herhangi bir araç çağrısı (bir PR açmak, bir yorum göndermek) için yeniden onay gerektir. Orta düzeyde mühendislik maliyeti, prompt injection'ı genel olarak çözmeye gerek kalmadan bu spesifik toksik akış kalıbını yakalar.
- Araca özel yapılandırma için bir "lockdown mode" sun, GitHub'ın kendi nihai önlemi, buna ek olarak herkese açık bir depoya dokunan herhangi bir araç çağrısında secret-scanning. Üretici düzeyinde düzeltme, benimseyen ekiplere açık.
- "Always Allow"u, tam olarak neyi devre dışı bıraktığı konusunda kendi uyarısına ihtiyaç duyan bir ayar olarak ele al ve varsayılan olarak ne kadar agresif şekilde otomatik etkinleştirilebildiğini sınırlamayı düşün.

## Senin sistemin için ders

- MCP entegrasyonlarındaki tek bir kimlik bilgisinin gerçekte neye izin verdiğini, ajanının "çağırması gerektiği" varsayılan araç isimlerinden bağımsız olarak denetle; bir token özel ve herkese açık kapsamı birden kapsıyorsa, güvenlik açığı zaten mevcuttur.
- Ajan istemcinde "Always Allow"un bir karşılığı olup olmadığını, kullanıcılarının kaçının bunu etkinleştirdiğini ve bunun önemli yazma eylemleri için tek insan kontrol noktanı sessizce kaldırıp kaldırmadığını kontrol et.
- Özel veri okumanın ve herkese açık bir yüzeye yazmanın birlikte gerçekleştiği herhangi bir oturumu, olay sonrasında tespit edebilen telemetri inşa et; her toksik akışı önleyemeyebilirsin ama onları bulabilmelisin.
- Bunu, GitHub'ın sunucusuna özgü tek seferlik bir hata olarak değil, stack'indeki herhangi bir lethal-trifecta şeklindeki araç kombinasyonunun genel bir özelliği olarak ele al.

## Kaynaklar

- [GitHub MCP Exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability) · Invariant Labs · 26 May 2025
- [GitHub MCP Exploited: Accessing private repositories via MCP](https://simonwillison.net/2025/May/26/github-mcp-exploited) · Simon Willison · 26 May 2025
- [GitHub issue #844, github-mcp-server](https://github.com/github/github-mcp-server/issues/844) · GitHub repo maintainers · ongoing thread
