# Case · Bilerek zafiyetli kod yazan config dosyası (2025)

**Category:** Security · **Lessons:** 08, 21 · **Severity:** konfigürasyonda gizli talimatlar, özel erişim gerekmiyor

## Sistem

GitHub Copilot ve Cursor gibi AI coding assistant'lar, kod üretimini yönlendirmek için "rule file"ları (Cursor'un `.cursor/rules`, Copilot'un custom instructions) modelin bağlamına okur: house style, tercih edilen kütüphaneler, mimari konvansiyonlar. Ekipler genellikle rule file'ları projeler arasında paylaşır, bazen bunları paylaşılan bir dahili repodan çekerek her projenin aynı konvansiyonları almasını sağlar.

## Ne gözlendi

Pillar Security, Mart 2025'te bu rule file'ların gizli talimatlar, hatta görünmez Unicode karakterleri taşıyacak şekilde değiştirilebildiğini ve bunların agent'ı, bir insan gözden geçirenin gözünde meşru görünen kod üretirken, planlanmış zafiyetler veya veri sızdırma mantığı (ortam değişkenlerini, veritabanı kimlik bilgilerini, API anahtarlarını sızdırma) içeren kod üretmeye sessizce yönlendirdiğini ifşa etti.

## Dur ve düşün

1. Bir rule file konfigürasyondur, kod değil. Ekibinin review süreci konfigürasyon dosyalarına, o dosyaların etkilediği koda uyguladığından ne kadar farklı uygulanıyor?
2. Bir rule file'daki talimat görünmezse (gizli Unicode, alışılmadık formatlama), normal bir code review bunun neyini yakalar, neyini tamamen gözden kaçırır?
3. Kurumsal bir rule-file reposu birçok proje arasında paylaşılıyorsa, o paylaşılan dosya zehirlendiği anda downstream'deki her projeye ne olur?

## Gerçekte ne oldu

Rule file'lar, geliştirici tarafından yazılmış talimatlarla aynı yetkiyle modelin bağlamına okunur, ama ayarlar gibi görünüp mantık gibi görünmedikleri için review sırasında yürütülebilir koda göre çok daha az dikkatle ele alınır. Pillar Security'nin ifşası, bir saldırganın normal bir editörde veya diff görünümünde görünmeyen karakterler dahil talimatlar gömebileceğini ve bunların agent'ı, üretilen kodun görünür, insan tarafından incelenebilir kısımları sıradan görünürken, sessizce zafiyet eken (güvensiz varsayılanlar, eksik doğrulama) veya sızdırma mantığı (bir log satırına gizli bilgi yazmak, dışa bir çağrı, saldırganın sonradan kazıdığı bir yorum) üreten kod yazmaya sevk ettiğini gösterdi ([Pillar Security via GlobeNewswire](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html)).

İfşa, saldırı gereksinimlerini "özel ayrıcalıklar, yönetici erişimi veya sofistike araçlar" gerektirmediği şeklinde tanımlıyor; bu, saldırı yüzeyinin bir katılımcının sıradan bir pull request üzerinden gönderebileceği konfigürasyon olmasıyla uyumlu. Gerçek dünyadaki istismar için doğrulanabilir sayısal bir yaygınlık rakamı birincil ifşadan çıkarılamadı.

Kurumsal ölçekte asıl önemli olan ikinci derece etki: paylaşılan bir kurumsal rule-file reposu, bir kez zehirlendiğinde, onu import eden her downstream projesini bulaştırır; bu da tek bir başarılı saldırıyı saldırgandan ek bir çaba gerektirmeden tüm bir organizasyonun kod tabanına çarpar.

## Kök nedenler

**Teknik.** Rule file'lar, modelin bağlamına güvenilir talimatlar olarak girer; modelin işleyişinde "bu kuralı geliştirici yazdı" ile "bu rule file'a başka birinin katkısı bu kuralı yazdı" arasında hiçbir ayrım yok. Görünmez Unicode karakterleri, doğası itibarıyla görsel bir diff'in veya hızlı bir insan göz taramasının ortaya çıkaramayacağı bir şey.

**Organizasyonel.** Çoğu ekibin code review pratikleri, yürütülebilir koda gerçek bir dikkat, konfigürasyon dosyalarına, formatlama kurallarına ve linter ayarlarına ise çok daha hafif, genelde hiç dikkat uygulamaz; çünkü bunlar tarihsel olarak düşük riskli kabul edildi. Bir LLM konfigürasyonu üretilen mantığı şekillendirme gücüne sahip talimatlar olarak okuduğu anda bu varsayım artık geçerli değil.

## Neyle önlenebilirdi

- Rule file'ları yürütülebilir kodla aynı review titizliğiyle denetle: paylaşılan bir rule file'daki herhangi bir değişiklik için bir kaynak dosyadaki gibi review, diff ve onay zorunlu kıl. Düşük maliyet, bu saldırının çalışmasına yol açan boşluğu doğrudan kapatır.
- Rule file'ları merge edilmeden veya import edilmeden önce özellikle görünmez Unicode ve alışılmadık formatlama için tara; çünkü bu, normal bir görsel review'ı yenen bir saldırı tekniği. Bir linter veya pre-commit kontrolüyle otomatikleştirmesi ucuz.
- Paylaşılan veya kurumsal rule-file repolarını kaynak kontrolü olmadan (doğrulanmış kaynak, imzalı commit'ler veya en azından bilinen-iyi bir hash) import etme; denetlenmemiş harici bir rule file'ı denetlenmemiş harici bir bağımlılıkla aynı şekilde ele al.

## Senin sistemin için ders

- AI coding assistant'ının bağlamına "kod" veya "kullanıcı girdisi" olarak değil "konfigürasyon" olarak giren her artifact'i (rule file'lar, lint konfigleri, custom instructions, bir repodan yüklenen system prompt'lar) tespit et ve bunların yürütülebilir kodla aynı review barını geçtiğini doğrula.
- Coding agent'ının talimat olarak okuduğu her dosya için CI pipeline'ına görünmez Unicode ve anormal formatlama için otomatik bir tarama ekle.
- Organizasyonun paylaşılan bir rule-file reposu tutuyorsa, ona yapılan değişiklikleri paylaşılan bir kütüphaneye yapılan değişiklikler gibi ele al: review edilmiş, versiyonlanmış ve denetlenebilir, rastgele düzenlenmemiş.
- Mevcut code review tooling'inin görünmez Unicode'u gerçekten görünür render edip etmediğini sor; etmiyorsa, temiz görünen bir diff temiz bir dosyanın kanıtı değildir.
- Buradaki zarar ölçeğinin tek bir dosyadan değil tekrar kullanımdan geldiğini unutma: birçok ekip tarafından import edilen zehirli bir rule file, saldırgandan ekstra bir çaba gerektirmeden ona güvenen her projede tek bir başarılı saldırıyı çarpar. Paylaşılan konfigürasyon için review çabasını, ne kadar zararsız göründüğüne değil, kaç downstream projenin ona bağımlı olduğuna orantılı bütçele.

## Kaynaklar

- [New Vulnerability in GitHub Copilot and Cursor: Rules File Backdoor](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html) · Pillar Security · 18 Mar 2025