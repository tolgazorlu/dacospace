# Lesson 10 · MCP ve agent tedarik zinciri

**Reading time:** 20 min · **Module:** Security · **Concepts:** tool poisoning, rug pulls, rule-file backdoors, confused deputy, OAuth
**Cases:** mcp-tool-poisoning-rug-pull, rule-file-backdoor, github-mcp-private-repos, supabase-mcp-sql-leak

## Problem

Temmuz 2025'te Check Point Research, Cursor'da "MCPoison" lakaplı CVE-2025-54136'yı (CVSS 8.8) ifşa etti. Saldırı yolu şöyle: bir saldırgan, paylaşılan bir repoya zararsız görünen bir MCP server konfigürasyonu commit'ler. Bir geliştirici bunu inceler, güvenir ve onaylar. Günler veya haftalar sonra, yeni bir onay istemi olmadan ve editörde görünür bir değişiklik olmadan, saldırgan onaylanan konfigürasyonun komutunu sessizce kötü amaçlı bir komutla değiştirir. Cursor konfigürasyonları her kullanımda yeniden doğrulamıyordu, sadece ilk onay anında doğruluyordu; bu yüzden değişim, geliştiricinin haftalar önce verdiği tam güvenle, artık incelediği araç olmayan bir araç için çalıştı. Cursor 1.3'te düzeltildi (Temmuz 2025 sonu), artık her konfigürasyon değişikliğinde onayı yeniden tetikliyor. ([SecureW2](https://securew2.com/blog/mcp-rug-pull-attack))

Bu, Ders 08 ve 09'daki anlamda bir prompt injection değil. Hiç kimse modeli bir e-postayı yanlış okuması için kandırmadı. Zafiyet modelin bir katman altında, agent'ın araçlarının kendisinin nasıl güvenilir ilan edildiğinde ve bu güvenin hiç yeniden kontrol edilip edilmediğinde yaşıyor. MCP (Model Context Protocol), agent'ların server'lar arasında araçları nasıl keşfedip çağırdığını standartlaştırıyor ve bu arayüzü standartlaştırmak, saldırı için de yeni bir yer standartlaştırdı: herhangi bir kullanıcı görevi başlamadan önce araç tanımlarının kendisi.

## Neden zor

Üçüncü taraf bir dependency'yi denetleyen bir backend mühendisi, paket tedarik zinciri açısından düşünür: bir sürüm pinle, bir hash kontrol et, upgrade'de diff'i incele, belki bir lockfile kullan. Bu mental model, çoğu mühendisin ilk başta düşündüğünden daha doğrudan MCP server'larına taşınır, ve bu modelin taşınmadığı yerler tam olarak bu derste yer alan olayların yaşandığı yerler.

İlk boşluk: MCP'nin `tools/list` yanıtı, bir server'ın isimler, açıklamalar ve parametre şemalarıyla birlikte reklamını yaptığı araç listesi, modelin context'ine güvenilir operasyonel metadata gibi enjekte ediliyor, yeni bir dependency'nin kaynak kodunun gerektireceği şekilde incelenmesi gereken güvenilmeyen input olarak değil. Bir aracın *description* alanı, modelin okuması için düşünülmüş birkaç cümlelik doğal dil metni, context'teki başka herhangi bir metin gibi tam olarak gizli talimatlar taşıyabilir. Invariant Labs, Nisan 2025'te bunu resmen "Tool Poisoning" olarak adlandırdı: kötü amaçlı bir MCP server'ının açıklaması, yürütmesi değil, oturum başında yüklenen ve kullanıcının kendi isteğiyle aynı otoriteyle takip edilen düşmanca talimatlar taşıyor. Örnekleri, kullanıcıdan hiçbir doğrudan araç çağrısı olmadan mesaj geçmişini sızdıran, WhatsApp'a yakın, zehirlenmiş bir MCP server gösterdi; aracın kendi açıklaması sormayı kendisi yapıyordu. ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/))

İkinci boşluk, ve MCPoison'ın özellikle sömürdüğü boşluk, protokolün ilk onaydan sonra zorunlu bir yeniden doğrulaması olmaması ve araç açıklaması bütünlüğünün kriptografik bir attestation'ı olmaması. Bir paket lockfile'ı, her kurulumda diff'leyebileceğin bir hash pinler. MCP'de yapısal olarak buna eşdeğer hiçbir şey yok: bir server'ı onayladığında, protokol onayladığının değiştiğine dair yerleşik bir sinyal vermez. "Tool poisoning" bunu ilk temas noktasında sömürür. "Rug pull" onay ile sonraki kullanım arasındaki lifecycle boşluğunu sömürür. İkisi de aynı eksik özelliği sömürür: şu anda çalışan bir araç tanımına karşı diff'leyebileceğin yerel bir artifact yok.

Üçüncü boşluk, bu dersi Ders 07'nin blast-radius çerçevesine bağlıyor: bir MCP server'ının gerçek izin sınırını, açığa çıkardığı araç isimleri değil, elinde tuttuğu credential belirler. "Issue'ları oku" ve "tüm private repo'larını oku"nun aynı OAuth/PAT scope'undan erişilebilir olması, herhangi bir belirli kötü amaçlı prompt'tan bağımsız olarak zafiyetin kendisidir, çünkü agent'ın yetkinliği göreve hiçbir zaman gerçekten scope'lanmamıştı.

## Fikir: yetkinlik tedarik zincirinin kod tedarik zinciriyle aynı hata modları var, sadece daha az savunma ile

### Güven tesisine yönelik üç saldırı

| Attack | Mechanism | When it fires |
|---|---|---|
| Tool poisoning | Bir aracın açıklamasında, parametre isimlerinde, varsayılanlarında veya enum'larında gizlenmiş, keşif zamanında context'e yüklenen düşmanca talimatlar | İlk temas, kullanıcının görevi başlamadan önce |
| Rug pull | Bir araç onay anında temiz, sonrasında değiştiriliyor (uzak server değişikliği veya paylaşılan bir repodan yeniden senkronlanan bir konfigürasyon), çünkü MCP'nin zorunlu bir yeniden doğrulaması yok | Onaydan sonra, herhangi bir sonraki çağrıda |
| Tool shadowing | Kötü amaçlı bir server'ın açıklaması, agent'ın erişimi olan tamamen farklı, legitimate bir aracı nasıl kullandığını saptırıyor | Zehirlenmiş server ve legitimate araç aynı oturumda birlikte var olduğu her an |

2025/2026'daki bir benchmarking çalışması (dossier tarafından gösterge niteliğinde, bağımsız olarak yeniden doğrulanmamış kabul ediliyor), lab ortamında 45'ten fazla gerçek dünya MCP server'ında %60'ı aşan saldırı başarı oranları buldu; en yüksek performans gösteren model %72,8'e ulaştı. Ayrı, kontrollü bir cross-model çalışması, GPT-5.3, DeepSeek-V3 ve LLaMA-3.5'te baseline, savunmasız konfigürasyonlar altında denemelerin %36'sına kadarında güvensiz araç çağrıları buldu; senaryo başına saldırı başarı oranları rug pull için 0,59-0,73, shadowing için 0,75-0,97, tool poisoning için ise modele bağlı olarak 0,42-0,60 arasındaydı; önerilen katmanlı bir savunma (descriptor bütünlük doğrulaması, semantik vetting, runtime guardrail'leri) güvensiz çağrıları %15'e düşürürken block rate'i %74'e yükseltti; bu anlamlı bir iyileşme, ama aynı zamanda, bir kez daha, sıfır değil. ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/), [arXiv 2512.06556v2](https://arxiv.org/html/2512.06556v2))

### Rule file'lar: injection yüzeyi olarak konfigürasyon, MCP gerekmeden

Ders 08'deki rule-file backdoor da bu dersin çerçevesine giriyor, çünkü tool poisoning ile tam olarak aynı kök özelliği paylaşıyor: "kod" veya "kullanıcı input'u" değil "konfigürasyon" etiketli, modelin context'ine tam geliştirici otoritesiyle okunan, hiç kimsenin çalıştırılabilir kod kadar dikkatli incelemediği bir artifact. Pillar Security'nin Mart 2025 ifşası, AI coding assistant rule file'larının (`.cursor/rules`, Copilot özel talimatları), görünmez Unicode karakterleri dahil, bir agent'ı yerleştirilmiş zafiyetlere veya exfiltration mantığına yönlendiren ve üretilen kodun incelemede hâlâ legitimate görünmesini sağlayan gizli talimatlar taşıdığını gösterdi. Zehirlenmiş bir kurumsal rule-file reposu, onu import eden her aşağı akış projeyi bulaştırır; bu, paket yöneticisinin mevcut tooling'inin (checksum'lar, advisory veritabanları, lockfile'lar) bunu yakalaması olmadan, zehirlenmiş bir paylaşımlı kütüphane ile aynı tedarik zinciri şekli. ([Pillar Security via GlobeNewswire](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html))

### Confused deputy: agent altyapısında yeniden ortaya çıkan klasik bir zafiyet sınıfı

MCP'nin yetkilendirme modeli, tool poisoning'den ayrı, eşit derecede önemli bir risk yüzeyi ve hiçbir prompt injection gerektirmiyor. MCP spesifikasyonu, PKCE ile OAuth 2.1, audience-bound token'lar (RFC 8707 resource indicator'ları) gerektiriyor ve bir MCP server'ının bir client'ın token'ını değiştirmeden aşağı akış bir API'ye ilettiği "token passthrough"u açıkça yasaklıyor. Spesifikasyonun bunu bir SHOULD değil bir MUST yapmak zorunda kalmasının nedeni özgün, isimlendirilmiş bir saldırı zinciri: bir MCP proxy'de statik bir client ID, dinamik client registration ve eski bir consent çerezi ile birleşince, bir saldırganın bir kurbanın authorization code'unu, kurban yeni bir consent vermeden, saldırgan kontrolündeki bir redirect URI'ye yönlendirmesine izin veriyor. Bu, klasik confused-deputy zafiyeti (temsil ettiği taraftan daha fazla yetkiye sahip bir bileşen, o yetkiyi kötüye kullanması için kandırılıyor), agent altyapısında yeniden ortaya çıkıyor. ([MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices))

Tam per-client consent storage'ı, consent'ten önce server tarafında bağlanan state-parameter doğrulamasını ve audience kontrollerini uygulamak, naif bir OAuth passthrough'tan anlamlı ölçüde daha fazla implementasyon yükü getiriyor; bu da naif bir implementasyonun neden cazip olduğunun ve spesifikasyonun bunu takdire bırakmak yerine neden tamamen yasakladığının tam nedeni.

### GitHub ve Supabase MCP olayları, tedarik zinciri hataları olarak yeniden çerçevelenmiş

Ders 08 ve 09, GitHub MCP ve Supabase MCP olaylarını lethal trifecta ve exfiltration-channel lensinden ele aldı. Tedarik zinciri lensi her ikisine bir katman daha ekliyor: GitHub'ın kendi maintainer'ları, kamuya açık issue thread'inde, bunu ifşa edilebilir bir "zafiyet" olarak adlandırmaya karşı çıktı; bunun server'larına özgü belirli bir hata değil, "çok genel bir risk" olduğunu savundular, bu her lethal-trifecta-yetenekli araç kombinasyonu için doğru. ([github-mcp-server issue #844](https://github.com/github/github-mcp-server/issues/844)) Bu anlaşmazlığın kendisi bilgilendirici: MCP ekosisteminin "bu server'ın token scope'u tehlikeli bir kombinasyona izin veriyor"un yama uygulanacak bir bug mı yoksa geniş bir credential'ı bir agent'a bağlamanın içkin bir özelliği mi olduğuna henüz karar vermediğini gösteriyor; bu, her takımın bir MCP server'ı benimserken server server bazında kendisi vermek zorunda olduğu bir değer yargısı. Supabase'in General Analysis ifşasına verdiği yanıt, tersi bir çerçevelemeyi açıkça benimsedi; raporun riski abarttığını savunmak yerine, credential'ın scope'unu daraltan somut mitigasyonlar (read-only mod, proje scope'lama, kısıtlı özellik grupları) gönderdi. ([Defense in Depth for MCP Servers](https://supabase.com/blog/defense-in-depth-mcp))

### Savunulabilir bir MCP duruşu gerçekte neyi gerektiriyor

- **Onay anında tam araç tanımını hash-pinle** (isim, açıklama, input şeması) ve her çağrıdan önce, sadece ilk onayda değil, hash'i yeniden kontrol et. Bu, rug pull için doğrudan düzeltme, ve bir paket lockfile'ının sıradan dependency'ler için sana verdiği özelliğin tam karşılığı; MCP bunu sana varsayılan olarak vermiyor, yani client'ın bunu eklemesi gerekiyor. Önerilen ETDI protokol uzantısı ve birkaç üçüncü taraf MCP proxy'si bunu uyguluyor.
- **Her MCP server'ının credential'ını göreve scope'la, kolaylığa değil.** Belirli bir görevin gerektirdiği repo'lara scope'lanmış bir GitHub MCP server token'ı, org genelinde blanket erişim yerine, lethal-trifecta kombinasyonunu credential katmanında kaldırır, herhangi bir araç açıklamasının ne söylediğinden bağımsız olarak.
- **Tespit edilen herhangi bir drift'i, tersi kanıtlanana kadar, bulaşmış kabul et**, ve sessizce devam etmek yerine blokla. MCPoison pattern'i özellikle bu davranışın yokluğunu sömürdü.
- **Aynı oturumda hassas verinin bir okumasını takip eden herhangi bir yazma eylemi için yeniden onay iste**, onboarding'de bir kez verilen tek bir "Always Allow" yerine. Bu, Ders 07'nin adlandırdığı aynı approval-fatigue sorunu, özellikle MCP güven tesisi anına uygulanmış.
- **Rule file'ları ve paylaşılan konfigürasyonu kodla aynı inceleme çıtasıyla denetle**, özellikle görünmez Unicode ve sıra dışı formatlamayı tarayarak, ve provenance kontrolleri olmadan paylaşılan/kurumsal bir rule reposuna güvenme.
- **Daha basit entegrasyon yolu olsa da naif bir OAuth token-passthrough'u asla uygulama**; per-client consent storage'ını, audience-bound token'ları ve state-parameter doğrulamasını baştan inşa et, çünkü bunu bir confused-deputy olayından sonra geriye dönük eklemek çok daha maliyetli.

## Northwind'de pratikte

Desk'in kendi araçları ve Northwind'in mühendislerinin coding agent'larına bağladığı herhangi bir üçüncü taraf MCP server'ı, Desk'in kendisi bir first-party ürün olsa da, bu dersin olaylarıyla aynı tedarik zinciri risk kategorisinde oturuyor.

1. **Northwind'in mühendislik organizasyonu GitHub MCP server'ını veya benzeri geniş scope'lu bir aracı benimserse**, CI pipeline'ının kullandığı org genelindeki PAT'ı yeniden kullanmak yerine token'ları repo başına veya görev başına scope'la, ve aynı oturumda private verinin bir okumasını takip eden herhangi bir yazma eylemi öncesinde yeniden onay iste.
2. **Her üçüncü taraf MCP server'ının araç tanımlarını**, müşteri verisine yazma erişimi olan herhangi bir agent'ın önüne koymadan önce **hash-pinle**, ve yeniden kontrolü client'a inşa et, çünkü protokol bunu senin için yapmayacak.
3. **Desk'in kendi prompt template'lerini ve paylaşılan talimat belgelerini kod düzeyinde inceleme gerektiren konfigürasyon olarak ele al**, küçük, güvenilir bir inceleme grubu dışında biri tarafından düzenlenmişse özellikle anomali Unicode veya formatlama kontrol ederek.
4. **Desk'in platform ekibi native MCP desteği olmayan üçüncü taraf SaaS API'lerine erişimi aracılık eden dahili bir MCP proxy inşa ederse**, daha basit ama açıkça yasaklanmış token-passthrough kısayolu yerine tam OAuth 2.1 akışını (PKCE, audience-bound token'lar, per-client consent storage) uygula.
5. **"Geniş credential artı agent erişimi"nin o entegrasyon için kabul edilebilir olup olmadığına, satıcının çerçevelemesinin soruyu çözdüğünü varsaymak yerine, server server bazında açıkça karar ver.** GitHub ve Supabase bu soruyu kendi ürünleri için farklı yanıtladı; Northwind bunu Desk'in kendi entegrasyonları için yanıtlamak zorunda.

## İyi mühendislerin bildiği

- Bir MCP server'ını bir kez onaylamak, ona sonsuza kadar güvenmekle aynı şey değil. "Onboarding'de onaylandı"yı kalıcı sayan herhangi bir sistem, varsayılan olarak bunu yakalayacak bir lockfile olmadan, npm paketleri gibi tam olarak tedarik zinciri drift'ine karşı zayıf.
- Bir aracın açıklama alanı, yürütmesi kadar bir saldırı yüzeyi. Model onu, kullanıcının görevi başlamadan önce, context'teki başka herhangi bir şeyle aynı otoriteyle okur.
- Bir MCP server'ının gerçek izin sınırı, reklamını yaptığı araç isimleri değil, elinde tuttuğu credential'dır. "Issue'ları oku" ve "tüm private repo'ları oku"nun aynı token'dan erişilebilir olması, aracın isminden bağımsız olarak, zafiyetin kendisidir.
- Confused-deputy ve token-passthrough riskleri, prompt injection'dan tamamen bağımsız var oluyor; naif kısayoldan basitçe daha fazla iş gerektiren, iyi anlaşılmış bir düzeltmesi olan, yeni altyapıda yeniden ortaya çıkan klasik bir yetkilendirme hatası.
- Lethal-trifecta-yetenekli bir entegrasyonun "bir zafiyet" mi yoksa "kabul edilebilir içkin bir risk" mi sayıldığı, ilgili satıcılar arasında bile canlı bir anlaşmazlık; bir satıcının çerçevelemesinin senin kendi risk kararının yerini almasına izin verme.
- Konfigürasyon (rule file'lar, MCP araç açıklamaları, paylaşılan prompt template'leri), bir agent'ın context'ine girdiği anda çalıştırılabilir kodla aynı inceleme titizliğini hak ediyor, çünkü oraya girdikten sonra aynı otoriteyi taşıyor.
- Saldırı başarısını ölçülebilir şekilde azaltan savunmalar (hash-pinleme, descriptor vetting, runtime guardrail'leri) yayınlanan sayılarda hâlâ gerçek bir artık bırakıyor; bunları risk azaltımı olarak ele al, ortadan kaldırma olarak değil, Ders 08'deki prompt-injection filtreleriyle aynı ders.

## Karar ver

Northwind'in platform ekibi, 40 mühendisin Claude Code ve Cursor kullanarak şirketin dahili araçlarına (Jira, bir ticketing sistemi ve read-only bir analitik veritabanı) karşı MCP server erişimini nasıl yayacağına karar veriyor. Bu derste olan her şey göz önüne alındığında:

- **Seçenek A**: araç başına tek bir paylaşımlı MCP proxy server, platform ekibi tarafından bir kez onaylanmış, basitlik için arkasında geniş servis hesabı credential'ları ile.
- **Seçenek B**: proxy'nin arkasında mühendis başına, görev başına credential scope'lama, her oturum başında yeniden kontrol edilen hash-pinli araç tanımlarıyla, daha fazla operasyonel yük maliyetiyle.
- **Seçenek C**: Seçenek A, artı her MCP server'ının araç açıklamalarının üç aylık manuel güvenlik incelemesi.
- **Seçenek D**: paylaşılan proxy yok; her mühendis kendi MCP server bağlantılarını kendi credential'larıyla doğrudan kendisi konfigüre eder.

Birini seç, ve seçimin bu dersteki hangi belirli saldırıya (tool poisoning, rug pull, tool shadowing, confused deputy) karşı en zayıf olduğunu adlandır.

## Tek cümlelik özet

> MCP araç tanımları ve paylaşılan konfigürasyon, bir agent'ın context'ine girdiği anda geliştirici talimatlarıyla aynı otoriteyi taşır, bu yüzden diğer herhangi bir dependency gibi aynı tedarik zinciri disiplinine (pinleme, yeniden doğrulama, en az yetki credential'ları) ihtiyaçları var, protokolün bunların hiçbirini varsayılan olarak sana vermemesi ek karmaşıklığıyla.

## Kontrol sorusu

Bir Northwind mühendisi, altı hafta önce onayladığı üçüncü taraf bir Jira MCP server'ının az önce farklı davranmaya başladığını bildiriyor: bir ticket-creation aracı artık bir ticket "urgent" olarak etiketlendiğinde dış bir e-posta adresiyle bir yorum da ekliyor. Bu dersin çerçevesini kullanarak, bunun hangi belirli saldırıyla eşleştiğini, önce ne kontrol edeceğini ve araştırma ne bulursa bulsun Northwind'in MCP onay sürecinde ne değiştireceğini adlandır.

## Kaynaklar

- [MCP Tool Poisoning: Adversarial Hijacking of AI Agent Workflows](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/) · Cloud Security Alliance Research · 2025/2026 · consolidates tool poisoning, rug pull, and shadowing with benchmark numbers.
- [CVE-2025-54136 advisory context via SecureW2](https://securew2.com/blog/mcp-rug-pull-attack) · SecureW2 · 2025 · the Cursor "MCPoison" rug-pull vulnerability and the ETDI proposed fix.
- [GitHub issue #844, github-mcp-server](https://github.com/github/github-mcp-server/issues/844) · GitHub repo maintainers · ongoing · GitHub's own position that this is a general risk, not a specific vulnerability.
- [GitHub MCP Exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability) · Invariant Labs · 2025 · primary disclosure.
- [Supabase MCP can leak your entire SQL database](https://generalanalysis.com/blog/supabase-mcp-blog) · General Analysis · 2025 · the Supabase MCP incident.
- [Defense in Depth for MCP Servers](https://supabase.com/blog/defense-in-depth-mcp) · Supabase engineering blog · 2025 · Supabase's mitigations.
- [New Vulnerability in GitHub Copilot and Cursor: Rules File Backdoor](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html) · Pillar Security · 2025 · the rule-file backdoor disclosure.
- [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) · Model Context Protocol · 2025-11-25 revision · OAuth 2.1 requirements and the token-passthrough ban.
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices) · Model Context Protocol · same revision · the confused-deputy attack chain in detail.
- [arXiv 2512.06556v2](https://arxiv.org/html/2512.06556v2) · cross-model study · per-scenario attack success rates for rug pull, shadowing, and tool poisoning.