---
id: job-scheduler
title: Cron gibi çalışan dağıtık bir job scheduler tasarla
level: mid
topics: [distributed-systems, fault-tolerance, leader-election, scheduling]
minutes: 45
---

## Prompt

Şirket genelindeki takımların "bu script'i 5 dakikada bir çalıştır" ya da
"bu raporu her gün gece 2'de çalıştır" gibi periyodik job'lar planlaması
gerekiyor ve bir sunucu çökse bile her job'un planlanan her zamanda tam
olarak bir kez çalıştığından emin olunması isteniyor. Bu scheduling
sistemini tasarla.

## Clarifications

- **Ölçek?** 100.000 kayıtlı job, dakikada birden ayda bire kadar değişen schedule'lar.
- **Tetiklenme oranı?** Peak'te saatte yaklaşık 40.000 job tetiklemesi, saniyede kabaca 11.
- **Çalışma süresi?** Job'ların çoğu 30 saniyenin altında bitiyor, ama yüzde 2'si 2 saate kadar çalışıyor.
- **Delivery garantisi?** Her planlanmış tetiklemenin tam olarak bir yürütmeyle sonuçlanması gerekiyor; ne sıfır ne de duplicate çalışma kabul edilebilir.
- **Worker filosu?** Job'ları çekip çalıştıran 500 worker node; herhangi bir worker herhangi bir job'ı çalıştırabilir.
- **Hata toleransı?** Bir worker çalışma sırasında ölürse job'ın failed olarak algılanması ve 2 dakika içinde retry edilmesi gerekiyor.
- **Misfire politikası?** Scheduler'ın kendisi 10 dakika down kalırsa, o pencerede vadesi gelen job'lar recovery'de bir kez çalışmalı; sessizce atlanmamalı ya da birden çok kez çalıştırılmamalı.

## Follow-ups

- İki scheduler instance'ı, kısa bir network partition yüzünden aynı dakikada aynı job'ı tetiklemekten kendilerini sorumlu sanıyor. Duplicate tetiklemeyi nasıl önlersin?
- Bir worker 2 saatlik bir job'ı alıyor, 90 dakika çalışıyor ve sonra crash oluyor. Sistem bunu nasıl algılar ve kısmi ilerleme önemliyse baştan tekrar çalıştırmaktan nasıl kaçınır?
- Scheduler 10 dakika down kaldı ve 400 tetikleme kaçırıldı. Recovery mantığının neyi kaç kez çalıştıracağına tam olarak nasıl karar verdiğini adım adım anlat.
- 1 milyon kayıtlı job'a ve saniye bazında granülariteye sahip schedule'lara ölçekle. Tasarımının hangi kısmının değişmesi gerekir?
- Bir takımın "job'ım neden gece 2'de çalışmadı" sorusunu, scheduler'ın tüm internal'larına erişim vermeden nasıl debug etmesini sağlarsın?

## Rubric

- Belirli bir job'ı ne zaman tetikleyeceğine tam olarak tek bir node'un karar vermesini sağlamak için leader election ya da sharded ownership kullanır (birden çok scheduler'ın bağımsızca aynı job'ı tetiklemesi değil).
- Ana trade-off'u açıkça söyler: exactly-once delivery'i sıkı şekilde garanti etmek pahalıdır, bu yüzden gerçek sistemlerin çoğu at-least-once tetikleme artı idempotent job yürütmeyi hedefler; aday hangisini seçtiğini ve nedenini belirtmeli.
- Kalıcı bir schedule store tanımlar (sadece in-memory değil), böylece scheduler restart'ları vadesi gelen ya da yaklaşan job'ların takibini kaybetmez.
- Heartbeat'ler ya da lease timeout'ları üzerinden worker tarafında hata algılamayı, belirtilen 2 dakikalık pencere içinde tanımlı bir aksiyonla (retry, alert ya da failed işaretleme) ele alır.
- Misfire/catch-up senaryosunu açıkça ele alır: belirsiz bırakmak yerine net bir politika (recovery'de bir kez çalıştır, atla ya da kaçırılanların tümünü çalıştır).
- Scheduling kararını (job X ne zaman tetiklenmeli) job yürütmesinden (işi gerçekten yapan bir worker) bağımsız ölçeklenebilir konular olarak ayırır.
- Retry'ların ya da duplicate tetiklemelerin downstream'de duplicate yan etkilere yol açmaması için planlanmış her tetikleme için idempotency key'den ya da dedup token'ından bahseder.

## Pitfalls

- Koordinasyon olmadan birden çok scheduler instance'ı çalıştırmak, bu da sadece hatalarda değil normal çalışmada bile duplicate tetiklemelere yol açar.
- Koordinasyon maliyetini kabul etmeden ya da idempotent at-least-once yürütmeye geri dönmeden "exactly once"ı kolayca başarılabilir gibi iddia etmek.
- Schedule'ın ve tetikleme geçmişinin kalıcı persistence'ı olmaması, scheduler crash'inden sonra recovery'yi tanımsız bırakır.
- Misfire/catch-up politikasını tamamen görmezden gelmek, kaçırılan tetikleme davranışını belirtilmemiş bırakır.
