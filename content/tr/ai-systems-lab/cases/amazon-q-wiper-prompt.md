# Case · Bir kodlama ajanının kendi güncellemesine gömülü wiper prompt'u (2025)

**Category:** Security · **Lessons:** 10, 07, 21 · **Severity:** supply-chain compromise, yıkıcı AWS CLI payload'ı, CVE-2025-8217

## Sistem

VS Code için Amazon Q Developer eklentisi, `aws-toolkit-vscode` deposunun bir parçası olarak açık kaynak haline getirilmiş, yaklaşık 950.000 kurulumu olan bir AI kodlama ajanıdır. Çoğu kodlama ajanı gibi, doğal dilde talimat verilerek kendisini kullanan geliştirici adına shell ve bulut CLI komutları çalıştırabilir, bu da o makinede yapılandırılmış herhangi bir AWS profiline karşı çalışmayı da kapsar.

## Ne gözlendi

17 Temmuz 2025'te eklentinin 1.84.0 sürümü VS Code Marketplace'e herkese açık olarak yayınlandı. İçinde, ajana "bir sistemi yaklaşık fabrika ayarlarına döndür ve dosya sistemi ile bulut kaynaklarını sil" talimatını veren enjekte edilmiş bir prompt bulunuyordu. AWS, güvenliği ihlal edilmiş derlemeyi geri çekti ve yaklaşık iki gün içinde bir düzeltme yayınladı.

## Dur ve düşün

1. Saldırgan son kullanıcının ajanla olan konuşmasını hedeflemedi. Kötü niyetli talimat sistemde gerçekte nereden kaynaklandı ve bu, "prompt injection"ın neyi kapsaması gerektiği konusunda ne anlama geliyor?
2. Payload gerçek AWS CLI komutları içeriyordu (`ec2 terminate-instances`, `s3 rm`, `iam delete-user`). Bu komutların, kurban güncellemeyi kurduğu anda onun AWS hesabına karşı başarıyla çalışabilmesi için teknik olarak ne doğru olması gerekirdi?
3. AWS, yıkıcı kodda bir sözdizimi hatası olduğunu ve müşteri kaynaklarına karşı hiçbir zaman çalışmadığını söyledi. Sözdizimi doğru olsaydı, "ajan bu talimatı aldı" ile "ajan onu çalıştırdı" arasında hangi tek kontrol (varsa) durmuş olurdu?

## Gerçekte ne oldu

Bu, bir son kullanıcının konuşmasına karşı yapılan bir prompt injection değildi; ajanın kendi dağıtım hattının bir supply-chain ihlaliydi. Bir saldırgan, uygun olmayan, aşırı yetkili bir CodeBuild/GitHub token'ı kullanarak 13 Temmuz 2025'te açık kaynak `aws-toolkit-vscode` deposuna doğrudan bir prompt commit etti. Build hattı, kötü niyetli dosyayı yalnızca `STAGE=prod` olduğunda production build'ine aktarıyordu, bu nedenle production olmayan ortamlarda yapılan testlerden kaçındı ([BleepingComputer/404 Media](https://bleepingcomputer.com/news/security/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands/amp)).

Enjekte edilen prompt, ajana kurbanın kendi yapılandırılmış profillerine karşı yıkıcı AWS CLI komutları çalıştırmasını söylüyordu: EC2 instance'larını sonlandırma, S3 bucket'larını silme, IAM kullanıcılarını silme. AWS'nin güvenlik bülteni, yıkıcı kodun bir sözdizimi hatası içerdiğini ve gerçek dünyada hiçbir müşteri kaynağına karşı hiçbir zaman çalışmadığını belirtiyor ([AWS Security Bulletin AWS-2025-015](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/)). 404 Media'nın bildirdiğine göre saldırganın kendi beyan ettiği pozisyon, payload'un kasıtlı olarak işlevsiz hale getirildiği ve gerçek bir saldırı yerine bir "AI security theater" gösterisi olarak tasarlandığıydı. Güvenliği ihlal edilmiş build, AWS onu geri çekip 1.85.0 sürümünü yayınlamadan önce yaklaşık iki gün (17-19 Temmuz) canlı kaldı. Olay CVE-2025-8217 olarak izleniyor.

Bunun açığa çıkardığı tasarım kusuru, belirli payload'un hatasının altında yatıyor: düz doğal dilde talimat verilebilen, hiçbir zorunlu insan onay kapısı olmadan geri dönüşü olmayan shell ve bulut CLI işlemleri çalıştırabilen bir kodlama ajanı. Bu özel sözdizimi hatası kimseyi kurtarmış olsun ya da olmasın, mimari aynı talimatın doğru yazılmış bir sürümünün gözetimsiz çalışmasına izin verirdi.

## Kök nedenler

**Teknik.** Aşırı yetkili bir CI/CD token'ı, dışarıdan bir katkıcının production build'leri besleyen bir depoya doğrudan commit etmesine izin verdi; build hattı da belirli bir stage flag'i altında kötü niyetli değişiklikleri production artifact'ine yönlendirerek production olmayan testlerden kaçındı. Bunun altında: ajanın kendisinin, toplu silme veya bulut tasfiyesi komutları için zorunlu bir onay kapısı yoktu.

**Organizasyonel.** AWS'nin gerçek kök neden olarak gösterdiği token kapsamı, bir görev ayrımı boşluğunu yansıtıyor: dış bir katkıcının birleştirdiği kod, production'a neyin gideceğini de kontrol edebilmemeliydi, ama bu hatta edebiliyordu.

## Neyle önlenebilirdi

- CI/CD token'larının en az ayrıcalık kapsamı, AWS'nin açıkça belirttiği düzeltme, böylece dış bir katkının içeriği ne olursa olsun production build yapılandırmasına ulaşamaz. En yüksek etkiye sahip olanı ve burada gerçekten başarısız olan kontrol budur.
- Kodu birleştirebilen kişiler ve token'lar ile production'a neyin gideceğine karar veren pipeline aşaması arasında görev ayrımı. Orta düzeyde organizasyonel maliyet, olgun yazılım tedarik zincirlerinde standart uygulama.
- Talimatın ajanın bağlamına nasıl girdiğinden bağımsız olarak, bir ajan toplu silme veya bulut tasfiyesi komutlarını çalıştırmadan önce zorunlu bir insan onayı veya dry-run adımı. Yukarı akıştaki her savunma başarısız olsa bile etki alanını sınırlayan kontrol budur.

## Senin sistemin için ders

- Kodlama ajanının kendi CI/CD hattını ve token'larını, sadece son kullanıcıların ona yazdığı prompt'ları değil, ajanın saldırı yüzeyinin bir parçası olarak ele al; bu olay bir kullanıcı konuşmasında değil, build hattında başladı.
- Geliştiricilerinin shell veya bulut CLI erişimiyle çalıştırdığı herhangi bir aracın production build'ine giren kodu kimin birleştirebildiğini ve kimlik bilgilerinin gerçekte hangi kapsamı taşıdığını denetle.
- Bu payload'un doğru yazılmış bir sürümünün bile durdurulabilmesi için, herhangi bir ajan tetiklemeli toplu silme veya altyapı tasfiyesi komutunun çalışmasından önce atlanamaz bir insan onayı veya dry-run kapısı gerektir.
- "Yıkıcı kodda bir hata vardı" ifadesinin tekrarlanabilir bir güvenlik marjı olduğunu varsayma; işe yarayan saldırı sürümü için tasarla.

## Kaynaklar

- [Amazon AI coding agent hacked to inject data wiping commands](https://bleepingcomputer.com/news/security/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands/amp) · BleepingComputer, citing 404 Media · Jul 2025
- [AWS Security Bulletin AWS-2025-015](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/) · AWS · Jul 2025
